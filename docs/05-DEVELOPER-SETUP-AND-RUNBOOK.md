# 05 — Developer Setup & Operations Runbook

This runbook covers local environment setup, database CLI operations, testing, production deployment (Vercel + Supabase), the Tauri v2 desktop build, and common troubleshooting steps.

---

## 1. Prerequisites

| Tool | Version / Requirement | Notes |
| :--- | :--- | :--- |
| **Node.js** | `>=20.18.0` (Node `22` recommended for Vercel parity) | Enforced in root `package.json`. |
| **pnpm** | `9.15.0` | Enforced via `"packageManager": "pnpm@9.15.0"`. Do not use `npm` or `yarn`. |
| **PostgreSQL** | Postgres 16 | Provided locally via `docker-compose.yml` (`postgres:16-alpine`) or native Postgres / Supabase. |
| **Object Storage** | MinIO (local) or S3 / Supabase Storage | Provided locally via `docker-compose.yml` (`minio` + `minio-init`), or set `STORAGE_PROVIDER=fake` for isolated testing. |

---

## 2. 5-Minute Local Setup

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Configure Environment Files

1. **Root `.env`** (used by `docker-compose.yml`): copy `.env.example` to `.env` and populate local secrets (`POSTGRES_PASSWORD`, `DB_APP_ROLE`, `DB_APP_ROLE_PASSWORD`, `JWT_SECRET`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `STORAGE_*`).
2. **API `.env`**: copy `apps/api/.env.example` to `apps/api/.env` and ensure `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `JWT_SECRET`, and `RESEND_API_KEY` are set (see [04 — API & Auth Contracts](./04-API-AND-AUTH-CONTRACTS.md#5-validated-environment-contract-appsapisrcconfigenvts)).

### Step 3: Start Backing Services

Using Docker Compose:

```bash
docker compose up -d postgres minio minio-init
```

*(To run the full containerized stack including API on port `3001` and Web on port `8080`, run `docker compose up -d`.)*

### Step 4: Bootstrap Roles, Migrate & Seed

Run the API database scripts in order:

```bash
pnpm --filter @blueflutes/api db:bootstrap-roles
pnpm --filter @blueflutes/api db:migrate
pnpm --filter @blueflutes/api db:seed
```

### Step 5: Start Development Servers

```bash
pnpm dev
```

Turborepo starts workspace dev tasks in parallel:
- **API (`@blueflutes/api`)**: `tsx watch src/index.ts` on `http://localhost:3001`
- **Web (`@blueflutes/web`)**: Vite dev server on `http://localhost:5173`

---

## 3. Database & Tenant CLI Reference

All CLI scripts are defined in `apps/api/package.json` and reside under `apps/api/src/scripts/`:

| Command | Script Path | Purpose |
| :--- | :--- | :--- |
| `pnpm --filter @blueflutes/api db:bootstrap-roles` | `apps/api/src/scripts/bootstrap-roles.ts` | Creates or updates the non-superuser `DB_APP_ROLE` (`blueflutes_app`) with `NOBYPASSRLS`. |
| `pnpm --filter @blueflutes/api db:migrate` | `apps/api/src/scripts/migrate.ts` | Applies pending SQL migrations in `apps/api/src/db/migrations/` using `DATABASE_MIGRATION_URL`. |
| `pnpm --filter @blueflutes/api db:seed` | `apps/api/src/scripts/seed.ts` | Populates sample tenant data, nodes, and galleries for local development. |
| `pnpm --filter @blueflutes/api db:create-tenant` | `apps/api/src/scripts/create-tenant.ts` | Creates a new tenant record (`TENANT_NAME`) and primary host mapping (`TENANT_HOST`). |
| `pnpm --filter @blueflutes/api db:add-domain` | `apps/api/src/scripts/add-domain.ts` | Attaches an additional custom domain host to an existing tenant in `tenant_domains`. |
| `pnpm --filter @blueflutes/api db:generate` | Drizzle Kit | Generates new SQL migration files from `apps/api/src/db/schema/*.ts`. |

---

## 4. Build, Verification & Test Commands

Run workspace-wide checks from the repository root (`turbo.json` & root `package.json`):

```bash
pnpm -r typecheck
pnpm -r lint
pnpm --filter @blueflutes/shared test
pnpm --filter @blueflutes/web test
pnpm --filter @blueflutes/api test
```

Formatting and full workspace production build:

```bash
pnpm format
pnpm build
```

---

## 5. Production Deployment Runbook (Vercel + Supabase)

Portfolix is configured for unified frontend + serverless API hosting on Vercel (`portfolix.tinkeryard.dev`) backed by Supabase PostgreSQL and S3-compatible Supabase Storage.

### 5.1 Vercel Project Configuration (`vercel.json`)

- **Framework Preset**: Vite (`"framework": "vite"`, `"outputDirectory": "apps/web/dist"`; set Framework to `Other` if overriding manually in Vercel dashboard)
- **Node Version**: `22`
- **Install Command**: `pnpm install --frozen-lockfile`
- **Build Command**:

```bash
pnpm --filter @blueflutes/shared build && pnpm --filter @blueflutes/api build && pnpm --filter @blueflutes/web build
```

- **Serverless API Entrypoint (`api/[...path].ts`)**:
  - Strips the `/api` path prefix and forwards requests directly to the Express `app`.
  - Configured in `vercel.json` with `"memory": 1024`, `"maxDuration": 60`, and `"includeFiles": "node_modules/@img/**"` so native `sharp` binaries are bundled for image processing.
- **SPA Routing & Headers (`vercel.json`)**:
  - Rewrites non-API routes `/((?!api(?:/|$)).*)` to `/index.html`.
  - Applies CSP / security headers and immutable caching on `/assets/(.*)`.

### 5.2 Supabase Dual-Pooler Database Architecture

Supabase exposes separate connection poolers; keep runtime and migration URLs strictly isolated:

1. **`DATABASE_URL` (Runtime API)**:
   - Connect via Supabase **Transaction Pooler on port `6543`** using the restricted runtime role (`blueflutes_app.<ref>`).
   - Set `DB_POOL_MAX=2` in Vercel serverless environment variables to avoid exhausting session slots across concurrent Lambdas.
2. **`DATABASE_MIGRATION_URL` (Migrations & Bootstrap Only)**:
   - Connect via Supabase **Session Pooler on port `5432`** using the privileged migration role (`postgres.<ref>`).
   - Do **not** configure the web runtime to use the privileged migration role; API startup enforces `assertRuntimeRoleSafe(pool)` and will refuse to boot with a superuser or `BYPASSRLS` role.

Run production migrations and tenant provisioning from your workstation by overriding local dotenv lookup:

```bash
DOTENV_CONFIG_PATH=/dev/null DATABASE_MIGRATION_URL="<supabase-session-pooler-5432-url>" pnpm --filter @blueflutes/api db:migrate
```

Create the production tenant and bind the custom domain:

```bash
TENANT_NAME="Portfolix" TENANT_HOST="portfolix.tinkeryard.dev" pnpm --filter @blueflutes/api db:create-tenant
```

### 5.3 Critical Production Environment Variables

In addition to secrets (`DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`), verify these deployment-specific settings in Vercel:

| Variable | Production Value | Why It Matters |
| :--- | :--- | :--- |
| `AUTH_COOKIE_PATH` | `/api/auth` | Aligns the `httpOnly` refresh cookie path with Vercel's `/api/*` rewrite prefix. |
| `VITE_API_BASE_URL` | `/api` | Routes frontend `apiFetch` calls through the same-origin Vercel serverless function. |
| `WEB_APP_URL` | `https://portfolix.tinkeryard.dev` | Canonical web origin for auth links. |
| `WEBAUTHN_RP_ID` | `portfolix.tinkeryard.dev` | Must match the production domain for passkey registration & verification. |
| `WEBAUTHN_ORIGINS` | `https://portfolix.tinkeryard.dev` | Expected WebAuthn origin(s). |
| `DB_POOL_MAX` | `2` | Caps per-function connection count behind Supabase transaction pooling. |
| `QUEUE_PROVIDER` | `inline` | Serverless deployments run Sharp processing synchronously unless a persistent Redis + BullMQ worker is provisioned. |
| `STORAGE_PROVIDER` | `s3` (or `supabase`) | Configures object storage adapter (`Portfolix` bucket, e.g., `ap-southeast-1`, with `STORAGE_ENDPOINT` and `STORAGE_PUBLIC_BASE_URL`). |

---

## 6. Tauri Desktop App (`apps/desktop`)

Portfolix ships a **Tauri v2** desktop shell (`@blueflutes/desktop` in `apps/desktop/`, configured via `apps/desktop/src-tauri/tauri.conf.json`) that wraps `@blueflutes/web`.

- **Build & Dev Pipeline**: Coordinated via `turbo.json` tasks `@blueflutes/web#build:desktop` and `@blueflutes/desktop#build:desktop`:
  - Dev mode: `pnpm --filter @blueflutes/web dev` + `pnpm --filter @blueflutes/desktop dev` (requires Rust toolchain via `rustup`).
  - Installer build: `cp apps/web/.env.desktop.example apps/web/.env.desktop.local && pnpm --filter @blueflutes/desktop build:desktop`.
- **Desktop Auth, Deep Links & Keyring**: When `apps/web/src/lib/platform.ts` detects a desktop runtime, `apps/web/src/lib/secure-storage.ts` persists refresh tokens in OS keychain storage (`tauri-plugin-keyring-api`), handles `blueflutes://auth/callback` deep links, and sends refresh tokens via the `X-Refresh-Token` header rather than browser `httpOnly` cookies.
- **Quickstart**: See [apps/desktop/README.md](../apps/desktop/README.md).

---

## 7. Troubleshooting FAQ

| Symptom | Root Cause | Resolution |
| :--- | :--- | :--- |
| **API exits on boot with runtime role or RLS assertion failure** | `assertRuntimeRoleSafe(pool)` detected `SUPERUSER`/`BYPASSRLS`, or `assertTenantTablesRlsEnforced(pool)` detected missing RLS policies. | Run `db:bootstrap-roles` and `db:migrate`, and verify `DATABASE_URL` uses `blueflutes_app` rather than `postgres`. |
| **Tenant resolution error on request** | `findTenantByHost` executes a strict `tenant_domains JOIN tenants WHERE td.host = $1` lookup with no subdomain or default slug fallback. | Register the exact request hostname (`localhost`, `portfolix.tinkeryard.dev`, etc.) via `db:create-tenant` or `db:add-domain`. |
| **Session refresh returns 401 on Vercel despite successful OTP/Passkey login** | `AUTH_COOKIE_PATH` still set to `/auth` while requests arrive under `/api/auth`. | Set `AUTH_COOKIE_PATH=/api/auth` and redeploy. |
| **Image upload finalize crashes in Vercel function** | `sharp` native `@img/*` bindings omitted from serverless bundle. | Ensure `vercel.json` retains `"includeFiles": "node_modules/@img/**"`. |
| **Google Photos "Connect" link fails in Dashboard / Upload UI** | `apps/api/src/routes/auth.ts` removed `/auth/google` when migrating Studio auth to Email OTP + Passkeys. | Use Email OTP / Passkeys for Studio sign-in; Google Photos sync operates on accounts with tokens present in `google_oauth_tokens`. |
