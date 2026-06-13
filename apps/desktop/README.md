# @portfoliohub/desktop

Tauri 2.x shell that wraps the `@portfoliohub/web` React app for desktop (Milestone 1.6).

- `devUrl` points at the `apps/web` Vite dev server (`http://localhost:5173`).
- `frontendDist` points at `apps/web/dist` (built by `@portfoliohub/web#build`).

## Development

Requires the Rust toolchain (`rustup`) in addition to Node/pnpm.

```sh
pnpm --filter @portfoliohub/web dev   # in one terminal
pnpm --filter @portfoliohub/desktop dev
```

## Building

```sh
pnpm --filter @portfoliohub/web build
pnpm --filter @portfoliohub/desktop build:desktop
```

`build:desktop` is intentionally kept out of the default `turbo run build` pipeline (it requires
the Rust toolchain and is slow/platform-specific); run it explicitly when producing a desktop
build.
