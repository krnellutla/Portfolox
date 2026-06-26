# Blueflutes

A multi-tenant photographer portfolio platform. One React codebase serves both web and desktop (Tauri) clients. Tenants are isolated via PostgreSQL Row-Level Security and resolved by host/domain.

---

## Stack

| Layer | Tech |
|-------|------|
| Monorepo | pnpm workspaces + Turborepo |
| API | Express + TypeScript |
| Web | Vite + React 18 + Tailwind CSS v4 |
| Desktop | Tauri 2.x (wraps the web app) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | OAuth 2.0 (Google, GitHub) → JWT access + refresh tokens |
| Validation | Zod (shared across API and clients) |
| State | Zustand |
| Routing | React Router (lazy-loaded code splitting) |

---

## Features

### Multi-tenancy
- Shared PostgreSQL schema with Row-Level Security on every tenant-scoped table
- Host-based tenant resolution via `tenant_domains` lookup (unique index on `host`)
- RLS enforced by a restricted runtime role (`NOBYPASSRLS`) — assertions run at boot
- Tenant context set via `SET LOCAL` per request/transaction

### Authentication
- OAuth 2.0 with Google and GitHub
- JWT access tokens (15 min TTL, in-memory on client) + refresh tokens with rotation
- Reuse detection: consuming a rotated token invalidates the entire family
- Web: httpOnly Secure SameSite cookie for refresh token
- Desktop: OS keychain storage via Tauri keychain plugin; deep-link OAuth callback (`blueflutes://auth/callback`)
- `/auth/refresh`, `/auth/logout` (server-side revocation)

### API
- Express + TypeScript with standardised JSON envelope on every response: `{ data, error: { code, message } | null }`
- Middleware order: security headers → request logging → tenant resolution → CORS → rate limiting → auth routes → public routes → requireAuth → 404 → error handler
- Structured JSON logging (pino) with request ID, tenant ID; no PII or tokens in logs
- Zod validation on every endpoint request body/params
- Health endpoint at `GET /health`

### Security
- **Helmet** — CSP, HSTS (production), X-Content-Type-Options, X-Frame-Options, Referrer-Policy
- **Rate limiting** — auth endpoints: 10 req / 15 min per IP; write endpoints: 60 req / min per IP (via `express-rate-limit`, `trust proxy=1` for correct IP keying behind nginx)
- **CORS** — per-tenant allowlist via `CORS_ALLOWED_ORIGINS` env var; defaults to deny-all
- **HTTPS** enforced by HSTS in production
- 12-factor config: all secrets via env vars, Zod-validated at boot (fail fast)

### Data Model
- `tenants`, `tenant_domains` — multi-tenancy backbone
- `users`, `tokens` — auth with refresh token rotation fields
- `nodes` — folder/gallery hierarchy as adjacency list (`parent_id`)
- `media_assets` — cloud-storage URLs + metadata only (no binary data in DB)

### Web UI — 15 screens

| Screen | Route | Description |
|--------|-------|-------------|
| Discover | `/discover` | Hero, search, category chips, featured photographers, fresh frames |
| Search & filter | `/search` | Sidebar facets (style, color, location), active chips, 4-col photo grid |
| Portfolio | `/portfolio/:handle` | Cover band, avatar, stats bar, gallery chips, 5-col photo grid |
| Lightbox | `/lightbox` | Dark surface, EXIF panel, print buy block, comments thread |
| Community | `/community` | Spaces sidebar, composer, feed, trending tags, active-now rail |
| Chat | `/chat` | Conversation list, message bubbles, typing indicator, mock WS layer |
| Collections | `/collections` | 4-col collection grid + liked photos |
| Pricing | `/pricing` | Monthly/annual toggle, 3-col plan grid, print options |
| Client gallery | `/client/:shareToken` | Private proofing, multi-select, favorites, floating action pill |
| Onboarding | `/onboarding` | 4-step flow: account → plan → studio setup → done |
| Studio Dashboard | `/studio/dashboard` | KPI cards, revenue bar chart, recent sales, top galleries |
| Analytics | `/studio/analytics` | Range segmented, top frames table with sparklines, conversion funnel, top buyers |
| Upload & manage | `/studio/upload` | Drag-drop zone, live progress queue, frames management table |
| Gallery Builder | `/studio/builder` | Drag-to-reorder via `@dnd-kit/sortable`, settings panel |
| Mobile / responsive | — | `MobileTabBar` at `<md`, grid collapses, full responsive coverage |

### Desktop (Tauri 2.x)
- Wraps the shared React web app — no duplicated UI code
- OS keychain token storage (no plaintext tokens on disk)
- Window management (size, min dimensions, titlebar)
- Local file picker stub (Phase 2: media upload)
- Auto-updater configured (Tauri updater)

---

## Project Structure

```
.
├── apps/
│   ├── api/          # Express + TypeScript API
│   ├── web/          # Vite + React 18 + Tailwind CSS v4
│   └── desktop/      # Tauri 2.x desktop wrapper
├── packages/
│   └── shared/       # Zod schemas, shared TypeScript types, API contracts
├── docker-compose.yml
└── .env.example
```

---

## Getting Started

### Prerequisites
- Node.js 22+
- pnpm 9+
- PostgreSQL 16 (or Docker)

### Local development

```bash
# Install dependencies
pnpm install

# Copy env and fill in values
cp apps/api/.env.example apps/api/.env

# Start Postgres (Docker)
docker run --name blueflutes-pg -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -d postgres:16

# Bootstrap DB roles, run migrations, and seed dev data
pnpm --filter @blueflutes/api db:bootstrap-roles
pnpm --filter @blueflutes/api db:migrate
pnpm --filter @blueflutes/api db:seed

# Start all services in watch mode
pnpm dev
```

Web app: http://localhost:5173  
API: http://localhost:3001

### Docker (full stack)

```bash
cp .env.example .env   # fill in POSTGRES_PASSWORD, JWT_SECRET, DB_APP_ROLE_PASSWORD
docker compose up
```

Web: http://localhost:8080  
API: http://localhost:3001

### Run tests

```bash
pnpm test                             # all workspaces
pnpm --filter @blueflutes/api test  # API only (76 tests)
```

### Build

```bash
pnpm build      # all workspaces
pnpm typecheck  # TypeScript across all workspaces
```

---

## Environment Variables

See [`apps/api/.env.example`](apps/api/.env.example) for the full annotated list.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Runtime connection (non-superuser, NOBYPASSRLS role) |
| `DATABASE_MIGRATION_URL` | Migration connection (schema owner) |
| `JWT_SECRET` | HS256 signing key — min 32 characters |
| `CORS_ALLOWED_ORIGINS` | Comma-separated extra origins (e.g. `tauri://localhost`) |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth app credentials |
| `GITHUB_CLIENT_ID/SECRET` | GitHub OAuth app credentials |
| `DESKTOP_AUTH_REDIRECT_URL` | Deep-link for desktop OAuth (`blueflutes://auth/callback`) |

---

## Roadmap

### Phase 1 — Foundation (complete)
- [x] M1.1 — Monorepo scaffold (pnpm + Turborepo, shared types)
- [x] M1.2 — Database schema + RLS migrations + seed
- [x] M1.3 — API foundation (tenant resolution, error handler, structured logging)
- [x] M1.4 — Auth (OAuth 2.0, JWT, refresh rotation, reuse detection)
- [x] M1.5 — Web frontend (15 screens, auth flow, public viewer)
- [x] M1.6 — Desktop wrap (Tauri 2.x, OS keychain, deep-link OAuth)
- [x] M1.7 — Production hardening (Docker, rate limiting, Helmet, nginx)

### Phase 2 — Media pipeline
- Media upload: file picker → presigned cloud upload → `media_assets` record
- Image processing: thumbnails, responsive variants
- Node/gallery CRUD (drag-drop ordering, nesting)

### Phase 3 — Tenant experience
- Custom domain onboarding + verification
- Per-tenant theming; public viewer polish (lightbox, SEO/meta)
- Visitor analytics

### Phase 4 — Scale & operations
- CI/CD pipeline; staging environment
- Backups, monitoring/alerting, performance budgets
- Billing/plan tiers
