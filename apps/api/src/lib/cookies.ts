import type { Request, Response } from 'express';
import { env } from '../config/env.js';

export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * httpOnly refresh-token cookie. Scoped to /auth so it is only sent with
 * refresh/logout/OAuth requests. Secure + SameSite=Strict in production;
 * relaxed to Secure=false + SameSite=Lax in development/test, where the API
 * runs over plain HTTP and browsers drop Secure cookies.
 */
function cookieOptions() {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
    path: '/auth',
  };
}

export function setRefreshTokenCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions());
}

export function getRefreshTokenCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[REFRESH_TOKEN_COOKIE];
  return typeof value === 'string' ? value : undefined;
}
