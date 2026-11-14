# 01 — Architecture & Monorepo Code Walkthrough

This chapter is the architectural blueprint and file-by-file code walkthrough for **Portfolix (Blueflutes)**—a multi-tenant photographer portfolio, client proofing, print commerce, and Studio CMS platform delivered from a single codebase for both Web and Tauri Desktop.

---

## 1. Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| **Monorepo** | `pnpm` workspaces (`9.15.0`) + Turborepo (`turbo.json`) | Coordinated build, lint, typecheck, and test graph (`Node >= 20.18`) |
| **Shared Contracts** | `@blueflutes/shared` (Zod v3 + TypeScript) | Single source of truth for API envelopes, DTO schemas, error codes, and photo categories |
| **Backend API** | Express 4 (`apps/api`, TypeScript, ESM) | Host-resolved multi-tenant API, Vercel serverless handler (`api/[...path].ts`), and local HTTP server |
| **Database & Isolation** | PostgreSQL 16 + Drizzle ORM + RLS (`FORCE ROW LEVEL SECURITY`) | Shared schema partitioned by `tenant_id` via transaction-local `app.tenant_id` |
| **Auth** | Email OTP (Resend), WebAuthn Passkeys (`@simplewebauthn/server`), HS256 JWT (`jose`) + Rotating Refresh Tokens | Passwordless Studio authentication with single-use refresh token rotation and reuse detection |
| **Media Pipeline** | S3-compatible / Supabase Storage (`@aws-sdk/client-s3`) + `sharp` + optional BullMQ / Redis | Direct-to-storage presigned uploads, WebP responsive variants (`256px`–`2048px`), synthetic transforms |
| **Google Photos Sync** | Google Photos Library API + OAuth2 refresh (`apps/api/src/services/google-photos.ts`) | Paginated album import and rule-based auto-categorization into hierarchical folder nodes |
| **Frontend Web** | React 18 + Vite 6 + Tailwind CSS v4 (`@theme`) + React Router v6 | Public portfolio, client proofing, print cart/checkout, and Studio CMS |
| **Client State** | TanStack Query v5 + Zustand v5 | Server cache (`qk` key factory) + lightweight UI/session/cart/media stores |
| **Desktop Shell** | Tauri v2 (`apps/desktop`) | Native macOS/Windows/Linux wrapper with OS keychain (`tauri-plugin-keyring`), deep links, and auto-updater |

---

## 2. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Clients["Client Applications"]
        Web["Browser SPA (apps/web)"]
        Desktop["Tauri v2 Desktop (apps/desktop)"]
    end

    subgraph Edge["Edge / Routing Layer"]
        Vercel["Vercel Static + /api/* Rewrite"]
        ViteProxy["Vite Dev Proxy (localhost:5173 -> :3001)"]
    end

    subgraph Backend["Express API Server (apps/api/src/app.ts)"]
        SecLog["securityHeaders -> requestLogging -> json -> cookieParser"]
        Health["GET /health"]
        TenantMW["resolveTenant (Host header -> tenant_domains)"]
        AuthMW["requireAuth (Bearer JWT == req.tenant.id)"]
        WithTenant["withTenant(pool, tenantId, fn) -> BEGIN + set_config('app.tenant_id')"]
    end

    subgraph Data["Persistence & External Services"]
        PG["PostgreSQL 16 (blueflutes_app NOBYPASSRLS + FORCE RLS)"]
        Storage["S3 / MinIO / Supabase Storage"]
        Redis["Redis (Optional: Gallery Cache + BullMQ)"]
        Resend["Resend API (Email OTP)"]
        GPhotos["Google Photos Library API"]
    end

    Web -->|Same-origin| Edge
    Desktop -->|CORS + X-Refresh-Token| Backend
    Vercel -->|api/[...path].ts| SecLog
    ViteProxy --> SecLog

    SecLog --> Health
    Health --> TenantMW
    TenantMW -->|tx via app.tenant_id| AuthMW
    AuthMW --> WithTenant
    WithTenant --> PG

    WithTenant --> Storage
    WithTenant --> Redis
    WithTenant --> Resend
    WithTenant --> GPhotos
```

---

## 3. Monorepo Workspace Layout

The repository is organized as a `pnpm` workspace (`pnpm-workspace.yaml` includes `apps/*` and `packages/*`):

```text
.
├── api/
│   └── [...path].ts              # Vercel Serverless catch-all entrypoint (strips /api prefix)
├── apps/
│   ├── api/                      # Backend REST API, Drizzle schema, migrations, CLI scripts & BullMQ worker
│   ├── desktop/                  # Tauri v2 native wrapper (Rust core + capabilities + updater config)
│   └── web/                      # React 18 SPA shared by both web and desktop builds
├── docs/                         # Developer & Application Bible (this folder)
│   └── design/                   # Canonical UX design system specs & revision history
├── packages/
│   └── shared/                   # @blueflutes/shared — Zod schemas, types, envelope & slug helpers
├── CLAUDE.md                     # Architectural invariants & engineering rules (keep at root)
├── docker-compose.yml            # Local Postgres 16 + MinIO + API + Nginx Web stack
├── pnpm-workspace.yaml           # Monorepo workspace definition
├── turbo.json                    # Build / typecheck / lint / test pipeline DAG
└── vercel.json                   # Vercel SPA rewrites, security headers & serverless memory/timeout settings
```

---

## 4. Directory-by-Directory Code Walkthrough

### 4.1 Shared Contracts (`packages/shared/src/`)

Every data boundary—from Express `validate(...)` middleware to client `apiFetch(..., schema)`—shares Zod schemas exported by `packages/shared/src/index.ts`.

- [`packages/shared/src/envelope.ts`](../packages/shared/src/envelope.ts): Defines `ErrorCode`, `apiErrorSchema`, and the standard `ApiEnvelope<T>` interface (`{ data: T | null, error: ApiError | null }`).
- [`packages/shared/src/types.ts`](../packages/shared/src/types.ts): Shared helper types (e.g., inferred types and common aliases).
- [`packages/shared/src/lib/slug.ts`](../packages/shared/src/lib/slug.ts): Deterministic URL-safe `slugify()` used when creating hierarchical folder/gallery/page nodes.
- [`packages/shared/src/schemas/`](../packages/shared/src/schemas/): Domain Zod contracts imported by both `apps/api` and `apps/web`:
  - **Tenancy & Auth**: `tenant.ts`, `tenant-domain.ts`, `tenant-settings.ts`, `user.ts`, `token.ts`, `auth.ts` (`otpRequestSchema`, `otpVerifySchema`, `refreshResponseSchema`), `passkey.ts`.
  - **Hierarchy & Media**: `node.ts` (`folder` | `gallery` | `page`), `media-asset.ts` (`ALLOWED_MIME_TYPES`, `presignRequestSchema`, `confirmRequestSchema`, `mediaAssetWithVariantsSchema`).
  - **Google Photos Sync**: `google-photos.ts` (`PHOTO_CATEGORIES`, `googleAlbumSchema`, `googleSyncResultSchema`, `googleSyncAllResultSchema`, `autoCategorizeResultSchema`).
  - **Studio, Discovery & Commerce**: `photo.ts`, `gallery.ts`, `photographer.ts`, `commerce.ts` (`AddToCartSchema`, `CheckoutSessionSchema`, `OrderV2Schema`), `analytics.ts`, `plan.ts`, `search.ts`, `collection.ts`, `comment.ts`, `community.ts`, `conversation.ts`.

### 4.2 Backend API (`apps/api/src/`)

| Path | Responsibility |
|---|---|
| `src/index.ts` | Local/container HTTP boot entrypoint. Runs `assertRuntimeRoleSafe(pool)` and `assertTenantTablesRlsEnforced(pool)` **before** binding `env.PORT`, guaranteeing fail-fast startup if RLS is misconfigured. |
| `src/app.ts` | Pure Express factory `createApp(dbPool, storageProvider, enqueue)` + default `app` export (imported directly by `api/[...path].ts` on Vercel and by Vitest integration tests). |
| `src/config/env.ts` | Boot-time Zod validation (`envSchema.parse(process.env)`). Enforces conditionally required env vars for `STORAGE_PROVIDER` (`s3` vs `supabase`) and `QUEUE_PROVIDER` (`bullmq` requires `REDIS_URL`). |
| `src/db/client.ts` | Creates the `pg.Pool` (`pool`) and Drizzle client (`db`). Uses strict TLS in production (`ssl: true`) and `{ rejectUnauthorized: false }` in local development. |
| `src/db/with-tenant.ts` | Transaction wrapper `withTenant(pool, tenantId, fn)` setting transaction-local `app.tenant_id`. |
| `src/db/assert-runtime-role.ts` | Boot checks ensuring `current_user` is neither `SUPERUSER` nor `BYPASSRLS`, and all core tenant tables carry `FORCE ROW LEVEL SECURITY`. |
| `src/db/schema/` | 12 Drizzle schema modules defining 18 PostgreSQL tables. |
| `src/db/migrations/` | Sequential SQL migrations `0000`–`0019` (applied via `src/scripts/migrate.ts`). |
| `src/middleware/` | `security-headers.ts` (Helmet CSP/HSTS), `request-logging.ts` (`pino-http`), `resolve-tenant.ts` (Host lookup), `cors.ts`, `rate-limit.ts`, `require-auth.ts` (JWT check), `error-handler.ts`. |
| `src/routes/` | 21 modular Express routers split into unauthenticated auth routes, public portfolio/commerce routes, and `requireAuth`-protected Studio routes. |
| `src/services/` | Domain business logic: `otp.ts`, `passkeys.ts`, `email.ts`, `users.ts`, `tenant-resolution.ts`, `google-photos.ts`, `cache/gallery-cache.ts`, `media/` (`processor.ts`, `queue.ts`, `worker.ts`, `variant-specs.ts`), and `storage/` (`S3StorageProvider`, `SupabaseStorageProvider`, `FakeStorageProvider`). |
| `src/lib/` | `app-error.ts`, `async-handler.ts`, `validate.ts`, `jwt.ts` (`jose`), `refresh-tokens.ts`, `cookies.ts`, `desktop-auth.ts`, `logger.ts` (`pino`), and `payment/` (payment processor interface + stub). |
| `src/scripts/` | Operational CLI tools: `bootstrap-roles.ts`, `migrate.ts`, `seed.ts`, `create-tenant.ts`, `add-domain.ts`. |

### 4.3 Serverless Entry Point (`api/[...path].ts`) & Proxy Rules

- **Production (Vercel)**: Browser requests `/api/*` on `https://portfolix.tinkeryard.dev`. Vercel routes `/api/*` to [`api/[...path].ts`](../api/[...path].ts), which strips the leading `/api` prefix (e.g. `/api/nodes` becomes `/nodes`) while preserving the original `Host` header, then delegates to `app(req, res)`. All non-`/api/*` paths rewrite to `apps/web/dist/index.html` (`vercel.json`).
- **Local Development (`apps/web/vite.config.ts`)**: The Vite dev server listens on `http://localhost:5173` and proxies API route prefixes directly (`^/(auth|health|nodes|media|discover|photographers|photos|search|plans|community|conversations|client|me|tenant-settings|galleries|analytics|studio-orders|google-photos)(/|$)`) with `changeOrigin: false` so `req.headers.host` stays `localhost` (matching the seeded `localhost` domain in `tenant_domains`).

### 4.4 Frontend Web App (`apps/web/src/`)

| Path | Responsibility |
|---|---|
| `src/main.tsx` | Mounts React `QueryClientProvider` and attaches global capture-phase `contextmenu` and `dragstart` listeners on `<img>` tags to deter casual image saving. |
| `src/App.tsx` | Configures `BrowserRouter`, wraps the tree in `SessionProvider` and `ThemeProvider`, defines lazy-loaded routes for Public, Studio (`RequireAuth`), and Client Proofing screens, plus `MobileTabBar`. |
| `src/api/client.ts` | Core `apiFetch()` client with in-memory `accessToken`, single-flight `refreshAccessToken()` deduplication on HTTP `401`, and Tauri `X-Refresh-Token` header injection. |
| `src/api/*.ts` | Domain-specific API modules (`auth.ts`, `passkeys.ts`, `nodes.ts`, `media.ts`, `google-photos.ts`, `commerce.ts`, `client-gallery.ts`, etc.) that parse every response with Zod schemas from `@blueflutes/shared`. |
| `src/auth/` | `SessionProvider.tsx` (silent refresh on app boot) and `RequireAuth.tsx` (redirects unauthenticated users to `/login`). |
| `src/stores/` | Zustand stores: `auth-store.ts` (session status + user profile—never stores raw JWT), `nodes-store.ts` (tree CRUD + optimistic reorder), `media-store.ts` (upload queue + polling + optimistic delete/move), `cartStore.ts`, `ui-store.ts`. |
| `src/pages/` | Core portfolio viewer (`pages/viewer/PortfolioViewer.tsx`, `ClientGallery.tsx`), auth screens (`pages/login/Login.tsx`, `AuthCallback.tsx`, `ClientLogin.tsx`), and legacy dashboard components (`pages/dashboard/`). |
| `src/features/` | Modern feature modules: `studio/` (`DashboardPage`, `UploadPage`, `GalleryBuilderPage`, `AnalyticsPage`, `OrdersPage`, `settings/*`), `discover/`, `search/`, `portfolio/`, `lightbox/`, `client/`, `checkout/`, `community/`, `chat/`, `collections/`, `pricing/`, `onboarding/`. |
| `src/components/` | `ThemeProvider.tsx`, `nav/` (`TopNav`, `MobileTabBar`, `TenantHeader`, `TenantFooter`), `photo/` (`PhotoGrid`, `PhotoTile`, `FavoriteButton`), `ui/` (`ResponsiveImage`, `Button`, `StateView`, `Skeleton`, etc.). |
| `src/index.css` | Tailwind CSS v4 `@theme` design tokens (`--color-paper`, `--color-ink`, `--color-accent`, `--font-serif`, etc.) and `.photo-protected` CSS rules. |

### 4.5 Desktop Shell (`apps/desktop/`)

- [`apps/desktop/src-tauri/tauri.conf.json`](../apps/desktop/src-tauri/tauri.conf.json): Bundles `apps/web/dist`, enables `blueflutes://` deep links, sets strict desktop CSP (`connect-src` restricted to Tauri IPC + API origin), and verifies release updates via Ed25519/Minisign `pubkey`.
- [`apps/web/src/lib/secure-storage.ts`](../apps/web/src/lib/secure-storage.ts): Wraps `tauri-plugin-keyring-api` (`service = 'com.blueflutes.desktop'`, `account = 'refresh_token'`) so refresh tokens never touch plain disk files on desktop.

---

## 5. End-to-End API Request Lifecycle (`apps/api/src/app.ts`)

Every HTTP request entering Express executes in this strict sequence:

1. **`securityHeaders` (`helmet`)**: Sets CSP, `Referrer-Policy`, `X-Content-Type-Options`, and production HSTS (`maxAge: 2 years`).
2. **`requestLogging` (`pino-http`)**: Assigns a structured request ID and logs method/path/status/duration without PII or Authorization/Cookie tokens.
3. **`express.json()` & `cookieParser()`**: Parses JSON bodies and `httpOnly` cookies (`refresh_token`, `cart_session`, `gallery_<token>_unlocked`). Note: `/webhooks/payments` registers its own `express.raw({ type: 'application/json' })` body parser.
4. **`healthRouter` (`GET /health`)**: Responds immediately with `{ data: { status: 'ok' }, error: null }` **before** tenant resolution so orchestrator/Vercel health probes work without a registered domain.
5. **`resolveTenant(dbPool)`**: Normalizes `req.headers.host` (lowercased, port stripped), queries `tenant_domains JOIN tenants`, attaches `req.tenant` and `req.withTenant`, or throws a generic `404 Tenant not found for this host`.
6. **`corsMiddleware`**: Enforces a deny-by-default allowlist driven by `CORS_ALLOWED_ORIGINS` (used by Tauri origins `tauri://localhost` and `http://tauri.localhost`; browser web requests are same-origin).
7. **`authRateLimit` + `authRouter` + `passkeysRouter`**: Applies `10 req / 15 min per IP` to `/auth/*`, plus `3 req / 10 min per ip:email` on `/auth/otp/request`.
8. **Public Read & Commerce Routers**: `nodesRouter`, `createMediaPublicRouter`, `discoverRouter`, `photographersRouter`, `createPhotosRouter`, `searchRouter`, `plansRouter`, `communityRouter`, `conversationsRouter`, `clientGalleryRouter`, `commerceRouter`, and `tenantSettingsPublicRouter`.
9. **`requireAuth` + `writeRateLimit`**: Extracts `Authorization: Bearer <jwt>`, verifies HS256 signature and expiration, **and confirms `payload.tenantId === req.tenant.id`** (blocking cross-tenant token replay). Applies `60 req / min per IP`.
10. **Protected Studio Routers**: `/health/queue`, `/media/*` writes & `/media/manage`, `/nodes` writes, `/me`, `/me/settings*`, `/me/galleries*`, `/me/analytics*`, `/me/orders*`, and `/me/google-photos/*`.
11. **404 Catch-All & `errorHandler`**: Translates `AppError`, `ZodError`, and unexpected exceptions into `{ data: null, error: { code, message } }`.

