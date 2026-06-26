# @blueflutes/desktop

Tauri 2.x shell that wraps the `@blueflutes/web` React app for desktop (Milestone 1.6).

- `devUrl` points at the `apps/web` Vite dev server (`http://localhost:5173`).
- `frontendDist` points at `apps/web/dist` (built by `@blueflutes/web#build`).

## Development

Requires the Rust toolchain (`rustup`) in addition to Node/pnpm.

```sh
pnpm --filter @blueflutes/web dev   # in one terminal
pnpm --filter @blueflutes/desktop dev
```

## Building

```sh
# Copy apps/web/.env.desktop.example to apps/web/.env.desktop.local first and
# set VITE_API_BASE_URL to the production API origin (see that file).
pnpm --filter @blueflutes/desktop build:desktop
```

`build:desktop` builds `@blueflutes/web` in "desktop" mode (`vite build --mode desktop`, which
embeds the absolute `VITE_API_BASE_URL` since the bundled app has no dev proxy) before running
`tauri build`. It is intentionally kept out of the default `turbo run build` pipeline (it requires
the Rust toolchain and is slow/platform-specific); run it explicitly when producing a desktop
build.

## Auth and networking

- OAuth happens in the system browser (`tauri-plugin-opener`), not the embedded webview; the API
  redirects back via the `blueflutes://auth/callback` deep link (`tauri-plugin-deep-link`).
- `capabilities/default.json`'s `opener:allow-open-url` only permits opening the API's
  `/auth/google` and `/auth/github` initiate endpoints (the API then redirects to the provider).
  Keep its `https://api.blueflutes.example.com/auth/*` entries in sync with `VITE_API_BASE_URL`
  (same placeholder as the CSP `connect-src`, above).
- The refresh token is stored in the OS keychain (`tauri-plugin-keyring`) and sent as
  `X-Refresh-Token` for `/auth/refresh` and `/auth/logout`, since the webview's origin can't share
  the web app's httpOnly refresh cookie with the API origin.
- The bundled app's origin (`tauri://localhost` / `http://tauri.localhost`) must be included in
  the API's `CORS_ALLOWED_ORIGINS`, and `DESKTOP_AUTH_REDIRECT_URL` must match the
  `blueflutes` scheme registered below.

**Known limitation:** custom URL schemes can't be origin-verified, so any locally registered app
could invoke `blueflutes://auth/callback?refresh_token=...` with an attacker-supplied token
(session fixation — the victim would end up signed into the attacker's account, not have their
own credentials disclosed). `SessionProvider`'s `extractRefreshToken` checks the scheme/path as
defense-in-depth; the real mitigations are server-side: the refresh token is one-time, single-use,
rotated on first `/auth/refresh`, and never written to logs (`stripLocationQuery`). A full fix
(PKCE-style state binding echoed through the deep link) is tracked for a future OAuth-hardening
pass. The one-time token may also appear in OS-level launch-URL logging (e.g. macOS
LaunchServices) — bounded by the same one-time/rotation properties.

## Auto-updates

`tauri.conf.json`'s `plugins.updater` is configured with a generated signing keypair:

- The **public key** is committed in `tauri.conf.json` (`pubkey`) — this is safe to share, it only
  lets the app verify update signatures.
- The **private key** (used to sign release artifacts) was generated with
  `pnpm exec tauri signer generate` and is kept OUT of the repo. To sign a release build, set
  `TAURI_SIGNING_PRIVATE_KEY` (the key contents) and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (if any)
  as CI secrets — `tauri build` picks these up automatically. If you regenerate the keypair,
  update `pubkey` here to match.
- `endpoints` is a placeholder (`updates.blueflutes.example.com`) — point it at the real update
  manifest host before shipping.

## Content Security Policy

`tauri.conf.json`'s `app.security.csp` restricts the webview to its own origin plus:

- `connect-src`: the Tauri IPC bridge (`ipc:`, `http://ipc.localhost`), the local dev API
  (`http://localhost:3001`, used by `tauri dev` against the Vite dev server), and the production
  API origin. Keep the production origin in sync with `VITE_API_BASE_URL` in
  `apps/web/.env.desktop.local` and the API's `CORS_ALLOWED_ORIGINS`.
- `img-src`: `'self'` plus `https:`/`data:` for OAuth provider avatar URLs (Google/GitHub profile
  pictures, served from arbitrary https hosts).
