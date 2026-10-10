# Deployment — portfolix.tinkeryard.dev

## Architecture

One Vercel project serves both the React SPA and the Express API:

```
Browser → portfolix.tinkeryard.dev
  /api/*  → Vercel serverless function (api/index.ts)
            Strips /api prefix, calls Express app.
            Host header = portfolix.tinkeryard.dev (preserved by Vercel).
            Tenant is resolved from req.headers.host — no X-Forwarded-Host trust.
  /*      → apps/web/dist static SPA (index.html fallback for client-side routing)
```

## Vercel project settings

| Setting | Value |
|---|---|
| Framework | Other (no framework detection) |
| Root directory | `.` (repo root) |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm --filter @blueflutes/shared build && pnpm --filter @blueflutes/api build && pnpm --filter @blueflutes/web build` |
| Output directory | `apps/web/dist` |
| Node version | 22 |

Build settings and rewrites are in `vercel.json` — do not override them in the dashboard.

## Domain migration (one-time, dashboard only)

1. Open the **geo-mvp-tracker** project → Settings → Domains  
   → find `portfolix.tinkeryard.dev` → **Remove**
2. Open the **new Blueflutes project** → Settings → Domains  
   → **Add** `portfolix.tinkeryard.dev`  
   DNS already uses Vercel nameservers — no DNS record change needed.

## Environment variables (set in Vercel dashboard → Settings → Environment Variables)

Set all of the following for the **Production** environment.  
Mark secrets (JWT_SECRET, DB passwords, OAuth secrets, storage keys) as **Sensitive**.

```
NODE_ENV=production

# Database — Supabase transaction pooler (port 6543) for runtime
DATABASE_URL=postgresql://blueflutes_app.pxvyvkmjpomwpwcpgjwu:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
# Session pooler (port 5432) satisfies config validation; migrations run locally
DATABASE_MIGRATION_URL=postgresql://postgres.pxvyvkmjpomwpwcpgjwu:<password>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres

DB_APP_ROLE=blueflutes_app
DB_POOL_MAX=2

# Auth
JWT_SECRET=<openssl rand -base64 36>
GITHUB_CLIENT_ID=Ov23li6yA85mi2YcWLzh
GITHUB_CLIENT_SECRET=<from GitHub OAuth app>
OAUTH_REDIRECT_BASE_URL=https://portfolix.tinkeryard.dev/api
WEB_APP_URL=https://portfolix.tinkeryard.dev
AUTH_COOKIE_PATH=/api/auth

# Storage (Supabase S3-compatible)
STORAGE_PROVIDER=s3
STORAGE_BUCKET=Portfolix
STORAGE_REGION=ap-southeast-1
STORAGE_ENDPOINT=https://pxvyvkmjpomwpwcpgjwu.storage.supabase.co/storage/v1/s3
STORAGE_PUBLIC_BASE_URL=https://pxvyvkmjpomwpwcpgjwu.supabase.co/storage/v1/object/public/Portfolix
STORAGE_ACCESS_KEY_ID=<Supabase storage access key>
STORAGE_SECRET_ACCESS_KEY=<Supabase storage secret key>

# Frontend (build-time)
VITE_API_BASE_URL=/api
```

Generate JWT_SECRET locally:
```bash
openssl rand -base64 36
```

## GitHub OAuth callback URL

The GitHub OAuth app callback must be exactly:
```
https://portfolix.tinkeryard.dev/api/auth/github/callback
```

## Image processing

`POST /api/media/confirm` runs `sharp` synchronously before responding.  
Vercel `maxDuration` for the function is 60 seconds (set in `vercel.json`).

## Health check

```
GET https://portfolix.tinkeryard.dev/api/health
```
Should return `200 { "data": { "status": "ok" }, "error": null }`.

## Running migrations

Always run migrations locally against the session pooler, never from a serverless function:

```bash
DOTENV_CONFIG_PATH=/dev/null \
  DATABASE_MIGRATION_URL=<session-pooler-url> \
  pnpm --filter @blueflutes/api db:migrate
```

## Tenant

The tenant for `portfolix.tinkeryard.dev` is seeded in Supabase (ap-southeast-1).  
To add a new tenant:
```bash
DOTENV_CONFIG_PATH=/dev/null \
  DATABASE_MIGRATION_URL=<session-pooler-url> \
  pnpm --filter @blueflutes/api db:create-tenant
```
