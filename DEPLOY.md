# Deploying Portfolix to portfolix.tinkeryard.dev

Stack: Supabase (Postgres + Storage), one Render web service (nginx + API in one container), GitHub sign-in.

How requests flow: the browser calls `https://portfolix.tinkeryard.dev/api/...`. nginx in the container
proxies `/api/*` to the API and keeps the browser's `Host` header, so the API picks the tenant from
`portfolix.tinkeryard.dev` in the `tenant_domains` table. If that row is missing, every request is a 404.

## 1. Supabase
1. Create a project. Save the database password.
2. **Direct connection** (Project Settings, Database, port 5432): this is `DATABASE_MIGRATION_URL`.
3. **Transaction pooler** (port 6543): this is the base for `DATABASE_URL`, but the user must be the app role:
   `postgres://blueflutes_app.<project-ref>:<DB_APP_ROLE_PASSWORD>@<pooler-host>:6543/postgres`.
4. Storage: create a **public** bucket named `portfolix`. Under Storage, S3 Connection, create an access key.
   - `STORAGE_ENDPOINT` = `https://<project-ref>.storage.supabase.co/storage/v1/s3`
   - `STORAGE_REGION` = your project's region (for example `us-east-1`)
   - `STORAGE_PUBLIC_BASE_URL` = `https://<project-ref>.supabase.co/storage/v1/object/public/portfolix`
   - `STORAGE_ORIGIN` = `https://<project-ref>.supabase.co`

## 2. Set up the database (run once, from your machine)
Put the values in a local file that is never committed, `.env.supabase`:
```
DATABASE_MIGRATION_URL=...        # direct, port 5432, user postgres
DATABASE_URL=...                  # pooler, user blueflutes_app.<ref>
DB_APP_ROLE=blueflutes_app
DB_APP_ROLE_PASSWORD=...          # choose a long random password
JWT_SECRET=...                    # any 32+ characters; not used by these commands
```
Then, in this order (the role must exist before the grants migration):
```bash
set -a; . ./.env.supabase; set +a
pnpm --filter @blueflutes/api db:bootstrap-roles
pnpm --filter @blueflutes/api db:migrate
TENANT_NAME="Portfolix" TENANT_HOST=portfolix.tinkeryard.dev pnpm --filter @blueflutes/api db:create-tenant
```
Check that Supabase accepted the restricted role: the API refuses to start if its database role can bypass
row-level security (`assert-runtime-role`), so a bad role shows up as a boot error, not silent data leakage.

## 3. GitHub OAuth app
github.com/settings/developers, New OAuth App:
- Homepage URL: `https://portfolix.tinkeryard.dev`
- Authorization callback URL: `https://portfolix.tinkeryard.dev/api/auth/github/callback`

Keep the client ID and secret for step 4.

## 4. Render
1. New, Blueprint, pick this repo and the `deploy/render` branch. Render reads `render.yaml`.
2. Fill the secrets it asks for: both database URLs, `DB_APP_ROLE_PASSWORD`, the GitHub ID and secret,
   and the storage values from step 1. `JWT_SECRET` is generated for you.
3. Wait for the first deploy. `https://<service>.onrender.com/api/health` should return 200.
   The free plan sleeps when idle, so the first request after a pause takes about a minute.

## 5. Domain
1. In Vercel, project `geo-mvp-tracker`, Settings, Domains: remove `portfolix.tinkeryard.dev`
   (it is attached there today, which is why the subdomain returns 404).
2. In Render, service Settings, Custom Domains: add `portfolix.tinkeryard.dev`. Render shows a CNAME target.
3. In Vercel, Domains, `tinkeryard.dev`, DNS Records: add `portfolix` CNAME pointing at that target.
4. Wait for Render to issue the certificate, then open https://portfolix.tinkeryard.dev.

## What changed in the code for this
- `AUTH_COOKIE_PATH` (default `/auth`): set to `/api/auth` so the refresh cookie is sent behind the `/api` prefix.
- The web app accepts `VITE_API_BASE_URL=/api` (path prefix) as well as an absolute URL.
- Both Dockerfiles built the old `@portfoliohub/*` package names; fixed to `@blueflutes/*`.
- `Dockerfile.render`, `deploy/`, `render.yaml`: single-container deploy.
- `db:create-tenant`: creates a tenant for a real host (the seed script only creates `localhost`).

## Not covered
- Google sign-in (add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, plus a Google OAuth client).
- Chat over WebSocket: the web client opens `/ws`, but the API has no WebSocket server yet.
- The free Render plan has no persistent disk and sleeps when idle.
