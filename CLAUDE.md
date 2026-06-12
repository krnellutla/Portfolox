# PortfolioHub

Multi-tenant portfolio platform. One React codebase serves web and desktop (Tauri) clients. Tenants are isolated via Postgres Row-Level Security and resolved by host/domain.

---

## Stack (LOCKED — do not substitute or re-litigate)

- **Monorepo:** pnpm workspaces + Turborepo
  - `packages/shared` — Zod schemas, shared TypeScript types, API contracts
  - `apps/api` — Express + TypeScript
  - `apps/web` — Vite + React 18 + TypeScript + Tailwind CSS
  - `apps/desktop` — Tauri 2.x wrapping `apps/web`
- **Database:** PostgreSQL, Drizzle ORM, Drizzle Kit for migrations (version-controlled, env-based config, no hardcoded paths)
- **Multi-tenancy:** shared schema + Row-Level Security; every tenant-scoped table has `tenant_id`
- **Tenant resolution:** host-based, via `tenant_domains` lookup table, resolved in middleware before anything else
- **Auth:** OAuth 2.0 (Google, GitHub) → backend issues JWT access token + refresh token with rotation
  - Web: access token in memory, refresh token in httpOnly Secure cookie
  - Desktop: tokens in OS secure storage (keychain) via Tauri plugin
- **Validation/types:** Zod everywhere — single source of truth shared across API and clients
- **State management:** Zustand
- **Routing:** React Router (public + protected routes, lazy-loaded code splitting)
- **Package manager:** pnpm ONLY. Never npm or yarn.

## Conventions (always follow)

- 12-factor: all config via environment variables; separate dev/staging/production configs; no secrets in code
- Standardized JSON envelope on every API response: `{ "data": ..., "error": { "code", "message" } | null }`
- Middleware order: tenant resolution → auth validation → request logging → routes → error handler
- RESTful route groups: `/auth/*`, `/nodes/*`, `/media/*`, `/profile/*`
- `media_assets` stores cloud-storage URLs and metadata only — never binary data in Postgres
- `nodes` table models folder/gallery hierarchy as an adjacency list (`parent_id`)
- Indexed lookups for tenant resolution (`tenant_domains.host` unique index)
- Connection pooling for all DB access (cloud-ready)
- Component architecture: presentational + container split; typed API service layer in the client
- Structured JSON logging (request id, tenant id, no PII/tokens in logs)
- Security defaults: CORS allowlist per tenant domain, CSP, HTTPS enforcement, rate limiting, Zod request validation on every endpoint
- Tests: TDD for auth/token and tenant-isolation logic; target 80% coverage on `apps/api`
- Commit after every working slice; conventional commit messages

---

## PHASE 1 — Foundation (current)

Goal: monorepo scaffold, multi-tenant DB + API, OAuth/JWT auth, admin dashboard + public viewer, desktop wrap, production hardening.

### Milestone 1.1 — Monorepo skeleton
- pnpm workspaces + Turborepo pipeline (build, dev, lint, test, typecheck)
- `packages/shared` exporting Zod schemas + inferred types for: User, Tenant, TenantDomain, Token, Node, MediaAsset
- Shared strict `tsconfig` base; ESLint + Prettier
- **Done when:** `pnpm build` and `pnpm typecheck` pass across all workspaces; shared types import cleanly into a stub api/web app.

### Milestone 1.2 — Database schema & migrations
- Drizzle schema: `tenants`, `tenant_domains` (unique host index), `users`, `tokens` (refresh-token rotation fields), `nodes` (adjacency list), `media_assets` (URL + metadata only)
- RLS policies on all tenant-scoped tables keyed to `tenant_id` (set via `SET LOCAL` per request/transaction)
- Drizzle Kit migrations committed to the repo; seed script for a dev tenant
- Connection pooling configured from env vars
- **Done when:** migrations run clean on a fresh Postgres; an RLS test proves tenant A cannot read tenant B's rows.

### Milestone 1.3 — API foundation
- Express + TypeScript scaffold in `apps/api`
- Tenant-resolution middleware: Host header → `tenant_domains` lookup → attach tenant context → set RLS tenant for the request
- Global error handler emitting the standard JSON envelope with consistent error codes
- Request logging middleware (structured, request id, tenant id)
- Health endpoint; Zod validation wrapper for request bodies/params
- **Done when:** requests against two different hosts resolve to different tenants; unknown host returns a clean 404 envelope.

### Milestone 1.4 — Auth vertical slice
- OAuth 2.0 routes for Google and GitHub: sign-in/sign-up, callback → user upsert (tenant-scoped) → token issuance
- JWT access token (short-lived) + refresh token with rotation; reuse detection invalidates the family
- `/auth/refresh`, `/auth/logout` (revokes refresh token server-side)
- Web: httpOnly Secure SameSite cookie for refresh, access token returned in body
- TDD this milestone: expired refresh, reused rotated token, cross-tenant token use, logout invalidation
- **Done when:** full OAuth round-trip works locally for both providers; token edge-case tests pass; security review complete.

### Milestone 1.5 — Web frontend
- Vite + React 18 + Tailwind in `apps/web`; React Router with public/protected routes; lazy-loaded route chunks
- Typed API client in `packages/shared` or `apps/web/src/api` using Zod contracts
- Auth flow: OAuth buttons → callback handling → in-memory access token + silent refresh
- Admin Dashboard shell: sidebar, header, main content area; Zustand store for session/UI state
- Public Portfolio Viewer: read-only gallery grid rendering the node hierarchy
- **Done when:** login → dashboard → logout works end-to-end against the local API; public viewer renders seeded gallery data without auth.

### Milestone 1.6 — Desktop wrap (Tauri 2.x)
- `apps/desktop` Tauri 2.x project loading the shared React app
- Platform detection for OS-specific features; window management (size, min dims, titlebar)
- Secure token storage via OS keychain plugin (no tokens on disk in plaintext)
- Local file picker wired up (stub handler — actual media upload is Phase 2)
- Auto-update mechanism configured (Tauri updater)
- **Done when:** desktop app builds and runs on macOS, completes the auth flow, and persists session via keychain.

### Milestone 1.7 — Production hardening
- Dockerfiles for api/web; docker-compose for local dev (api + postgres); K8s/managed-container ready
- Security headers: CORS per-tenant allowlist, CSP, HSTS/HTTPS enforcement
- Rate limiting on auth and write endpoints
- Env-based config validated at boot with Zod (fail fast on missing vars)
- Structured logging finalized for cloud observability
- **Done when:** `docker compose up` runs the full stack locally; security review and verification loop pass.

---

## PHASE 2 — Media pipeline (next, not yet specced in detail)
- Media upload flow: desktop/web file picker → presigned cloud-storage upload → `media_assets` record
- Image processing (thumbnails, responsive variants)
- Node/gallery CRUD in admin dashboard (drag-drop ordering, nesting)

## PHASE 3 — Tenant experience
- Custom domain onboarding + verification flow
- Theming per tenant; public viewer polish (lightbox, SEO/meta)
- Visitor analytics basics

## PHASE 4 — Scale & operations
- CI/CD pipeline; staging environment
- Backups, monitoring/alerting, performance budgets
- Billing/plan tiers (if commercialized)

> Phases 2–4 are directional. Do not start them without an explicit instruction; flesh out their milestones when Phase 1 closes.

---

## Working agreement for Claude Code

- Always `/plan` a milestone before writing code; wait for approval of the plan.
- One milestone (or smaller slice) per session where practical; commit at every green state.
- Run the security-reviewer agent on: tenant middleware, RLS policies, auth/token logic, CORS config.
- Use `/tdd` for auth and tenant-isolation logic.
- Run `/code-review` before declaring any milestone done; `/verify` at milestone boundaries.
- Never weaken RLS, widen CORS, log tokens/PII, or swap stack choices to "simplify."
