import type { Request } from 'express';
import { env } from '../config/env.js';

/**
 * Desktop clients (Tauri webview, different origin, no httpOnly cookie
 * support across the API origin) send their refresh token in this header
 * instead of the `refresh_token` cookie used by web. Web requests never set
 * this header, so the two transports are mutually exclusive per request.
 */
export const DESKTOP_REFRESH_TOKEN_HEADER = 'x-refresh-token';

/**
 * Returns true only when the request's Origin matches an entry in
 * CORS_ALLOWED_ORIGINS — the same allowlist used for credentialed CORS.
 * Browsers set Origin automatically and cannot be overridden by page scripts,
 * so this prevents a web XSS payload from using the header path to extract
 * or rotate a refresh token that was stored client-side.
 */
function isDesktopOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  return typeof origin === 'string' && env.CORS_ALLOWED_ORIGINS.includes(origin);
}

export function getDesktopRefreshTokenHeader(req: Request): string | undefined {
  if (!isDesktopOrigin(req)) return undefined;
  const value = req.headers[DESKTOP_REFRESH_TOKEN_HEADER];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
