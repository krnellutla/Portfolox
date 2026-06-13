import type { Request } from 'express';

/**
 * Desktop clients (Tauri webview, different origin, no httpOnly cookie
 * support across the API origin) send their refresh token in this header
 * instead of the `refresh_token` cookie used by web. Web requests never set
 * this header, so the two transports are mutually exclusive per request.
 */
export const DESKTOP_REFRESH_TOKEN_HEADER = 'x-refresh-token';

export function getDesktopRefreshTokenHeader(req: Request): string | undefined {
  const value = req.headers[DESKTOP_REFRESH_TOKEN_HEADER];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
