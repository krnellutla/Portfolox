import type { AuthProvider } from '@portfoliohub/shared';
import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env.js';

export const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export interface OAuthStateCookie {
  provider: AuthProvider;
  state: string;
  codeVerifier?: string;
}

function cookieOptions(): CookieOptions {
  // Must be Lax (not Strict) even in production: the browser arrives here
  // via a top-level cross-site GET redirect from the OAuth provider, and
  // Strict cookies are not sent on cross-site navigations.
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
