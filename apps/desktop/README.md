# @blueflutes/desktop

Tauri 2.x desktop wrapper for `@blueflutes/web`, sharing the full React UI without code duplication while adding OS keychain credential storage, deep-link callbacks (`blueflutes://auth/callback`), and signed auto-updates.

For complete setup, signing, Content Security Policy, and troubleshooting instructions, see:

- [Architecture & Stack (Chapter 1)](../../docs/01-ARCHITECTURE-AND-STACK.md)
- [Developer Setup, Deployment & Desktop Runbook (Chapter 5)](../../docs/05-DEVELOPER-SETUP-AND-RUNBOOK.md#6-tauri-desktop-app-appsdesktop)

## Quick Commands

```bash
# Development (requires Rust toolchain via rustup + running Vite & API servers)
pnpm --filter @blueflutes/web dev       # Terminal 1 (http://localhost:5173)
pnpm --filter @blueflutes/desktop dev   # Terminal 2

# Production desktop installer build
cp apps/web/.env.desktop.example apps/web/.env.desktop.local
pnpm --filter @blueflutes/desktop build:desktop
```
