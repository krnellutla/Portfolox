# Portfolix (Blueflutes)

Multi-tenant photography portfolio CMS, client proofing platform, and print-commerce studio built as a **pnpm + Turborepo** TypeScript monorepo.

## Core Capabilities

- **Multi-Tenant Portfolios & Hierarchical CMS**: Strict custom-domain host resolution (`tenant_domains`) paired with PostgreSQL Row-Level Security (`withTenant`) and nested category/album trees (`nodes`).
- **Media Upload & Variant Engine**: Presigned S3/MinIO/Supabase direct uploads processed asynchronously via Sharp + BullMQ (or inline in serverless mode) into responsive image variants.
- **Google Photos Import & Auto-Categorization**: Bulk album sync and automated category classification from Studio Dashboard.
- **Client Proofing & Print Commerce**: Share-token proofing galleries alongside print SKU selection, guest cookie carts (`cart_session`), and integer-cent order totals.
- **Passwordless Auth**: 6-digit Email OTP (Resend) and WebAuthn Passkeys (`@simplewebauthn/server`) backed by rotating refresh token families, plus a Tauri v2 desktop shell.

---

## Monorepo Layout

| Workspace / Path | Package Name | Responsibility |
| :--- | :--- | :--- |
| `apps/web` | `@blueflutes/web` | React 18 + Vite + Tailwind CSS v4 portfolio viewer, Studio CMS, proofing & checkout SPA. |
| `apps/api` | `@blueflutes/api` | Express 4 REST API, Drizzle ORM + Postgres RLS data layer, OTP/Passkey auth, Sharp/BullMQ media pipeline. |
| `apps/desktop` | `@blueflutes/desktop` | Tauri v2 native desktop shell wrapping `@blueflutes/web` with OS secure refresh-token storage. |
| `packages/shared` | `@blueflutes/shared` | Shared Zod schemas, response `{ data, error }` envelope types, and DTO validators. |
| `api/[...path].ts` | — | Vercel serverless catch-all entrypoint forwarding `/api/*` requests to Express. |

---

## 5-Minute Local Quickstart

**Prerequisites**: Node.js `>=20.18.0`, `pnpm@9.15.0` (`npm`/`yarn` are not used), Docker (for local Postgres 16 + MinIO).

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment variables
cp .env.example .env
cp apps/api/.env.example apps/api/.env
# Fill in JWT_SECRET, RESEND_API_KEY, and storage credentials as needed

# 3. Start local Postgres 16 and MinIO
docker compose up -d postgres minio minio-init

# 4. Bootstrap non-superuser DB role, run migrations, and seed sample data
pnpm --filter @blueflutes/api db:bootstrap-roles
pnpm --filter @blueflutes/api db:migrate
pnpm --filter @blueflutes/api db:seed

# 5. Start API (:3001) and Web (:5173) dev servers
pnpm dev
```

For production deployment (Vercel + Supabase poolers) and Tauri desktop builds, see [05 — Developer Setup & Runbook](./docs/05-DEVELOPER-SETUP-AND-RUNBOOK.md).

---

## Developer & Application Documentation (`/docs`)

All technical and product documentation lives under `/docs`:

| Guide | Topics Covered |
| :--- | :--- |
| [01 — Architecture & Stack](./docs/01-ARCHITECTURE-AND-STACK.md) | Monorepo structure, Vercel + Express topology, middleware & deployment architecture. |
| [02 — Database Schema & Multi-Tenancy](./docs/02-DATABASE-SCHEMA-AND-MULTI-TENANCY.md) | PostgreSQL 16 + Drizzle schema, 12 schema modules (18 tables), Row-Level Security (`withTenant`), startup assertions. |
| [03 — Media & Google Photos Pipeline](./docs/03-MEDIA-AND-GOOGLE-PHOTOS-PIPELINE.md) | Presigned uploads, Sharp variant generation, BullMQ/inline queue, Google Photos import & auto-categorization. |
| [04 — API & Auth Contracts](./docs/04-API-AND-AUTH-CONTRACTS.md) | All 21 routers, `{ data, error }` envelope, Email OTP + WebAuthn Passkeys, refresh rotation, Zod env config. |
| [05 — Developer Setup & Runbook](./docs/05-DEVELOPER-SETUP-AND-RUNBOOK.md) | Local onboarding, DB CLI scripts, testing, Vercel + Supabase dual-pooler deployment, troubleshooting. |
| [06 — Frontend & User Manual](./docs/06-FRONTEND-AND-USER-MANUAL.md) | React Router v6 routes, `apiFetch` refresh, Zustand + TanStack Query `qk`, Studio & client user workflows. |
| [docs/design/](./docs/design/design-system-overview.md) | Archived UX handoff bundle (`design-system-overview.md`, `revisions-history.md`, `initial-api-spec.md`, `build-prompts.md`). |
| [CLAUDE.md](./CLAUDE.md) | Repository engineering conventions and working agreements. |

---

## Common Commands

```bash
pnpm dev                               # Start API & Web dev servers
pnpm build                             # Build all packages & apps via Turborepo
pnpm -r typecheck                      # TypeScript check across all workspaces
pnpm -r lint                           # ESLint across all workspaces
pnpm --filter @blueflutes/shared test  # Run shared schema unit tests
pnpm --filter @blueflutes/web test     # Run web unit tests
pnpm --filter @blueflutes/api test     # Run API Vitest suite
pnpm format                            # Prettier format workspace
```
