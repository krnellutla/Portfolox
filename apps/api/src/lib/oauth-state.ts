import type { AuthProvider } from '@blueflutes/shared';
import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env.js';

export const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export interface OAuthStateCookie {
  provider: AuthProvider;
  state: string;
  codeVerifier?: string;
  /** Set when the flow was initiated by the desktop app (system-browser OAuth). */
  client?: 'desktop';
}

function cookieOptions(): CookieOptions {
  // Must be Lax (not Strict) even in production: the browser arrives here
  // via a top-level cross-site GET redirect from the OAuth provider, and
  // Strict cookies are not sent on cross-site navigations.
  //
  // Path is hardcoded to /auth (not AUTH_COOKIE_PATH) because the OAuth
  // callback is always at /auth/:provider/callback — the browser must send
  // this cookie on that top-level navigation, which uses the pre-Vercel-rewrite
  // URL (/auth/...). The refresh-token cookie uses /api/auth because it is
  // only ever sent via fetch() to /api/auth/refresh, not a navigation URL.
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth',
  };
}

export function setOAuthStateCookie(res: Response, value: OAuthStateCookie): void {
  res.cookie(OAUTH_STATE_COOKIE, JSON.stringify(value), { ...cookieOptions(), maxAge: OAUTH_STATE_TTL_MS });
}

export function readOAuthStateCookie(req: Request): OAuthStateCookie | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const raw = cookies?.[OAUTH_STATE_COOKIE];
  if (typeof raw !== 'string') return undefined;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'provider' in parsed &&
      'state' in parsed &&
      typeof (parsed as Record<string, unknown>).provider === 'string' &&
      typeof (parsed as Record<string, unknown>).state === 'string'
    ) {
      return parsed as OAuthStateCookie;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE, cookieOptions());
}
