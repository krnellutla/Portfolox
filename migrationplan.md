# Blueflutes → Supabase Migration Plan

> Generated 2026-06-26. Covers auth, storage, database, and Express API layer.

---

## Executive Summary

Blueflutes's multi-tenancy is driven by a server-set per-transaction GUC (`app.tenant_id` via `set_config(...)`) resolved from the HTTP Host header — the opposite shape from Supabase's native model where clients talk directly to Postgres carrying a user JWT.

**Recommendation: adopt Supabase as managed infrastructure (Postgres + Auth + Storage + CDN), keep `apps/api` (Express) as the sole data plane.** This is "Path A."

Phases 1 (DB) and 2 (Storage) are low-risk mechanical swaps. Phase 3 (Auth) is the high-risk phase and requires careful handling around the httpOnly cookie regression and the global vs. tenant-scoped user identity split. Recommended sequencing lets you gain managed infrastructure benefits incrementally.

---

## Path A (Recommended) vs Path B (Rejected)

| | Path A — Supabase as infra, Express as data plane | Path B — Client-direct Supabase |
|---|---|---|
| DB access | Express via restricted role + `withTenant` | `supabase-js` from browser/desktop |
| RLS keying | `app.tenant_id` GUC (unchanged) | `auth.jwt()->>'tenant_id'` (rewrite all policies) |
| Tenant resolution | Host header in middleware (unchanged) | Impossible in-DB |
| FORCE RLS guarantee | Preserved | Broken for any `service_role` path |
| Express survives | Yes | Mostly deleted |
| CLAUDE.md compliance | Compliant | Violates "never weaken RLS" |

---

## Subsystem 1 — Database (lowest risk, migrate first)

### What survives unchanged

- All Drizzle schema files (`tenants`, `tenant_domains`, `users`, `nodes`, `media_assets`, `media_variants`)
- `apps/api/src/db/with-tenant.ts` — `set_config('app.tenant_id', $1, true)` is transaction-local and pooler-safe with Supabase's Supavisor
- `apps/api/src/db/migrations/0001_rls_policies.sql` and `current_tenant_id()` function
- `apps/api/src/middleware/resolve-tenant.ts` and tenant resolution middleware
- `pg_advisory_xact_lock` calls in media routes — transaction-scoped, pooler-safe
- Drizzle Kit migrations and `apps/api/src/scripts/migrate.ts`

### What must change

- **`DATABASE_URL`**: migrations → Supabase direct (port 5432); runtime pool → Supabase pooler (port 6543)
- **`0002_roles.sql` + `bootstrap-roles.ts`**: verify the `NOSUPERUSER NOBYPASSRLS` custom role (`blueflutes_app`) can be created on Supabase (validate in Phase 0 spike). Do not run the Express pool as `postgres`, `authenticated`, or `service_role` — all three undermine FORCE-RLS
- **PostgREST hardening**: add `REVOKE` on all tenant tables from `anon`/`authenticated` to block PostgREST bypass. The existing fail-closed behavior (requests without `app.tenant_id` return zero rows) is a useful backstop but not sufficient alone

### Verification gate

`apps/api/test/rls-isolation.test.ts` must pass against the Supabase instance before proceeding. That test is the correctness oracle for this layer.

---

## Subsystem 2 — Storage (clean swap, migrate second)

The `StorageProvider` interface at `apps/api/src/services/storage/provider.ts` was designed for exactly this.

### What survives unchanged

- The entire upload choreography: presign → XHR PUT → confirm → `processing` → enqueue (all routes call only interface methods)
- The sharp pipeline (`processor.ts`) and queue (`queue.ts`)
- Storage key namespace: `tenants/{tenantId}/nodes/{nodeId}/{assetId}/original.{ext}` and variant paths — keep this exact scheme, it maps directly onto Supabase Storage object paths
- All `media-*.test.ts` tests

### What changes

Add `SupabaseStorageProvider implements StorageProvider` alongside `s3-provider.ts` and `fake-provider.ts`:

| Interface method | Supabase equivalent |
|---|---|
| `presignUpload` | `storage.from(bucket).createSignedUploadUrl(path)` |
| `putObject` | `storage.from(bucket).upload(path, buffer)` |
| `getObject` | `storage.from(bucket).download(path)` |
| `deleteObject` | `storage.from(bucket).remove([path])` |
| `getPublicUrl` | `storage.from(bucket).getPublicUrl(path)` |

Flip the storage factory in `apps/api/src/services/storage/index.ts` via env var.

### Bucket strategy: one bucket, tenant-prefixed paths

Reject per-tenant and per-node buckets. One bucket matches the existing key scheme verbatim, requires zero provisioning on tenant onboarding, and tenant isolation is already enforced upstream (Express only ever issues signed URLs scoped to the resolved tenant's prefix). Revisit per-tenant buckets only if a compliance requirement demands it in Phase 4+.

**Bucket access**: make it private. For publicly-viewable portfolio images, use the CDN public URL returned by `getPublicUrl`. Storage RLS is not the primary isolation mechanism — Express + signed URLs are.

### Object migration script

Existing S3 objects can be copied verbatim (key scheme is identical); only the base URL in `media_assets.url` needs rewriting. One reversible SQL migration does this.

**Net effect: one new file, one env-var flip, nothing else changes.**

---

## Subsystem 3 — Auth (highest risk, migrate third)

The current system (`jwt.ts`, `refresh-tokens.ts`, `require-auth.ts`, `routes/auth.ts`, `oauth-providers.ts`) is a complete custom OAuth→JWT→rotating-refresh implementation. Supabase Auth (GoTrue) replaces most of it, but three structural mismatches must be resolved.

### Mismatch 1 — `auth.users` is project-global; `public.users` is tenant-scoped

**Problem**: Supabase's `auth.users` has one row per email per project. It cannot natively express "the same email is a distinct member of tenant A and tenant B."

**Resolution**: split identity from membership.
- `auth.users` (Supabase-owned) = global identity / credentials
- Keep `public.users` as a tenant-scoped membership/profile table; add `auth_user_id uuid` column referencing `auth.users(id)`
- A single `auth.users` row can have multiple `public.users` rows (one per tenant)
- The existing tenant-scoped RLS on `public.users` stays exactly as written

### Mismatch 2 — tenant must stay host-derived, not user-derived

The middleware order in `app.ts` (tenant resolution → auth) is what saves us:

1. `resolve-tenant.ts` resolves `req.tenant.id` from the Host header — **unchanged**
2. Rewritten `require-auth.ts` verifies the Supabase JWT, extracts `sub`, then performs membership lookup `(auth_user_id = sub AND tenant_id = req.tenant.id)`. No membership row → 401

This structurally reproduces the current cross-tenant-token rejection. Do not put `tenant_id` in the Supabase JWT as the source of truth — at most cache it in `app_metadata` as a hint, but always re-verify membership against the host-resolved tenant.

### Mismatch 3 — refresh rotation

GoTrue implements refresh-token rotation with reuse detection natively. The `tokens` table and `refresh-tokens.ts` (family rotation, reuse → family revoke) are **obsolete** — retire them once Supabase Auth is the sole issuer. Keep the behavioral test checklist (expired refresh, reuse detection, cross-tenant rejection, logout invalidation) verified against GoTrue at the boundary.

### ⚠️ Critical: web SPA session regression

Default `supabase-js` stores sessions in `localStorage` (JS-readable). This **regresses** from the current posture (access token in memory, refresh token in httpOnly Secure cookie).

**Fix**: keep Express in the auth path. Express performs the OAuth code exchange with Supabase and sets the session into httpOnly cookies using `@supabase/ssr`'s cookie storage adapter bound to Express req/res. `require-auth.ts` reads the access token from the cookie/Authorization header.

> **This is a hard requirement, not a default. Never let tokens land in localStorage.**

### Desktop (Tauri)

Wrap the existing keychain functions in `apps/web/src/lib/secure-storage.ts` (`getRefreshToken`/`setRefreshToken`/`clearRefreshToken`) as a `supabase-js` `auth.storage` adapter. The OS keychain integration (`tauri-plugin-keyring-api`) survives; only what it stores changes (a Supabase session blob instead of our opaque refresh token). The `X-Refresh-Token` header special-casing in `client.ts` can be retired.

### Files retired

- `apps/api/src/lib/jwt.ts`
- `apps/api/src/lib/refresh-tokens.ts`
- `apps/api/src/lib/oauth-providers.ts`
- `apps/api/src/lib/oauth-profile.ts`
- Most of `apps/api/src/routes/auth.ts`
- `tokens` Drizzle schema + its migration
- `apps/api/src/lib/cookies.ts` (or repurposed for the Supabase cookie adapter)

### Files rewritten

- `apps/api/src/middleware/require-auth.ts` — verify Supabase JWT + membership lookup
- `apps/api/src/services/users.ts` — upsert keyed on `auth_user_id`
- `apps/web/src/auth/SessionProvider.tsx`
- `apps/web/src/api/auth.ts`
- `apps/web/src/lib/secure-storage.ts` — keychain → supabase storage adapter

---

## Subsystem 4 — Express API layer

**Express survives as the keystone of Path A.** The following logic is irreducibly server-side:

1. **Host-based tenant resolution** (`resolve-tenant.ts`) — no in-database equivalent; `supabase-js` clients can't be trusted to assert their own tenant
2. **`withTenant` transaction wrapper** — the entire RLS scheme depends on a trusted process setting `app.tenant_id` per transaction with the restricted role
3. **Media processing** (`processor.ts`, `queue.ts`, sharp) — CPU-bound native work. Edge Functions (Deno, short-lived) are a poor fit for sharp + large buffers. Keep in Express or a dedicated worker container
4. **Node move cycle guard** and position-compaction logic — multi-statement transactional invariants that belong in trusted server code

Edge Functions are an option for new, thin, stateless endpoints later (webhook receiver, custom-domain verification in Phase 3+) but should not re-home any of the above.

---

## Migration Phases

Each phase leaves the app fully running.

### Phase 0 — Spike & guardrails (no production change)

- Provision a Supabase project
- Verify three platform assumptions:
  - (a) A `NOSUPERUSER NOBYPASSRLS` custom role can be created and granted table privileges
  - (b) `set_config('app.tenant_id', $1, true)` works correctly through the transaction pooler (Supavisor)
  - (c) Drizzle Kit migrations apply cleanly on Supabase's Postgres
- Run `apps/api/test/rls-isolation.test.ts` against Supabase
- **Exit gate**: all three confirmed, RLS isolation test green

### Phase 1 — Database host swap

Scope: DB migrates, nothing else. Express still issues its own JWTs; Storage still S3/local.

Steps:
1. Repoint `DATABASE_URL` (migrations → port 5432, runtime → pooler 6543)
2. Run `bootstrap-roles` script to create restricted role
3. Run Drizzle migrations on Supabase
4. Add `REVOKE` from `anon`/`authenticated` on tenant tables
5. Update `docker-compose.yml` to retain local Postgres for offline dev, pointing `DATABASE_URL` at Supabase for staging/prod

**Exit gate**: full existing API test suite green against Supabase Postgres; manual login→dashboard→logout works.

### Phase 2 — Storage backend swap (independent of Phase 3)

Steps:
1. Add `apps/api/src/services/storage/supabase-provider.ts` implementing `StorageProvider`
2. Wire into `apps/api/src/services/storage/index.ts` factory behind `STORAGE_BACKEND=supabase` env var
3. Create Supabase Storage bucket; configure as private with CDN public URLs
4. Copy existing objects from S3/local into Supabase bucket (key paths are identical)
5. Run a migration to rewrite `media_assets.url` base URL
6. Flip env var in staging → verify → flip in production

**Exit gate**: upload→confirm→process→variants→public viewer render works end-to-end; `media-delete.test.ts` and `media-move.test.ts` green.

### Phase 3 — Auth provider swap (independent of Phase 2, highest risk)

Steps:
1. Add nullable `auth_user_id uuid` column to `public.users` (backfill-friendly, no NOT NULL yet)
2. Stand up Supabase Auth with Google + GitHub providers configured
3. Implement Express-mediated `@supabase/ssr` httpOnly cookie exchange
4. Implement Tauri keychain storage adapter wrapping `secure-storage.ts`
5. Rewrite `require-auth.ts` (Supabase JWT verification + membership lookup)
6. Rewrite `services/users.ts` (upsert keyed on `auth_user_id`)
7. Update web `SessionProvider.tsx` and `api/auth.ts`
8. Deploy behind a feature flag; new logins use Supabase, existing sessions drain naturally (short access-token TTL)
9. Once drained: add `NOT NULL` constraint to `auth_user_id`, delete `tokens` table + custom JWT/refresh code
10. Security review per CLAUDE.md on `require-auth.ts` + membership lookup

**Exit gate**: full auth behavioral checklist passes (expired refresh, reuse detection, cross-tenant rejection, logout invalidation, desktop keychain persistence); security review complete.

### Phase 4 — Cleanup

- Remove S3 provider and `LOCAL_STORAGE_PATH` env vars
- Remove custom auth files listed in "Files retired" above
- Remove `tokens` Drizzle schema + migration
- Update docker-compose and CI env examples

---

## Risk Register

| # | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | Web SPA session regresses from httpOnly cookie to `localStorage` (XSS exposure) | High | High if defaults used | Hard requirement: Express-mediated `@supabase/ssr` httpOnly cookie exchange. Never store tokens in localStorage. |
| R2 | `auth.users` (global) vs `public.users` (tenant-scoped) identity collision | High | Certain | Split identity/membership: `auth_user_id` FK + tenant-scoped `public.users`; resolve membership per request against host-resolved tenant |
| R3 | `NOSUPERUSER NOBYPASSRLS` custom role not creatable on Supabase | High | Low–Med | Validate in Phase 0 spike. If blocked, fall back to `NOBYPASSRLS` role via Supabase SQL editor |
| R4 | `service_role` / PostgREST silently bypasses RLS | High | Med | Never use `service_role` for tenant data; `REVOKE` tenant tables from `anon`/`authenticated`; rely on `current_tenant_id()` failing closed as a backstop |
| R5 | Sharp media processing has no good managed home (Edge Functions unsuitable) | Med | Certain | Keep in Express / dedicated worker container; do not port to Edge Functions |
| R6 | Transaction pooler incompatibility with `set_config` + advisory locks | High | Low | Both are transaction-scoped and pooler-safe; confirm in Phase 0 |
| R7 | Desktop offline / Tauri keychain disruption | Med | Med | Wrap existing keychain funcs as supabase-js storage adapter; OS-keychain persistence survives |
| R8 | Host-based multi-tenancy broken if anyone adopts client-direct `supabase-js` | Critical | Low (if Path A enforced) | Hard rule: clients never get supabase-js DB credentials; all tenant data flows through Express. Document alongside CLAUDE.md. |
| R9 | Data migration of existing objects/rows (URL rewrites, user backfill) | Med | Med | Identical storage key scheme means only base-URL rewrite; `auth_user_id` backfilled on first login via upsert. Reversible migrations. |
| R10 | Vendor lock-in / cost at scale (Storage egress, Auth MAU pricing) | Med | Med | `StorageProvider` interface keeps storage swappable; Drizzle keeps DB portable; only Auth becomes genuinely Supabase-coupled |
| R11 | Local dev story changes (docker-compose Postgres) | Low | High | Keep `fake-provider` + local Postgres for offline dev; use Supabase for shared staging/prod |

---

## Files: Change vs Survive (quick reference)

### Survive unchanged

- `apps/api/src/db/with-tenant.ts`
- `apps/api/src/db/migrations/0001_rls_policies.sql`
- `apps/api/src/middleware/resolve-tenant.ts`
- `apps/api/src/services/tenant-resolution.ts`
- `apps/api/src/routes/media.ts`
- `apps/api/src/services/media/processor.ts`
- `apps/api/src/services/media/queue.ts`
- `apps/api/src/services/storage/provider.ts` (interface)
- All Drizzle schema files for `tenants`, `tenant_domains`, `nodes`, `media_assets`, `media_variants`
- All node write routes and position-compaction logic

### Change

- `apps/api/src/db/client.ts` — connection target
- `apps/api/src/db/migrations/0002_roles.sql` + `bootstrap-roles.ts` — Supabase role model
- `apps/api/src/services/storage/index.ts` — add `SupabaseStorageProvider` factory branch
- `apps/api/src/middleware/require-auth.ts` — Supabase JWT verification + membership lookup
- `apps/api/src/services/users.ts` — upsert keyed on `auth_user_id`
- `apps/web/src/auth/SessionProvider.tsx`
- `apps/web/src/api/auth.ts`
- `apps/web/src/api/client.ts`
- `apps/web/src/lib/secure-storage.ts` — keychain → supabase-js storage adapter

### Retire

- `apps/api/src/lib/jwt.ts`
- `apps/api/src/lib/refresh-tokens.ts`
- `apps/api/src/lib/oauth-providers.ts`
- `apps/api/src/lib/oauth-profile.ts`
- Most of `apps/api/src/routes/auth.ts`
- `tokens` Drizzle schema + migration
