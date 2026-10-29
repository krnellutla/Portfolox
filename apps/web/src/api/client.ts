import type { ApiEnvelope, RefreshResponse } from '@blueflutes/shared';
import { desktopRefreshResponseSchema, refreshResponseSchema } from '@blueflutes/shared';
import type { z } from 'zod';
import { env } from '../config/env.js';
import { isDesktop } from '../lib/platform.js';
import { getRefreshToken, setRefreshToken } from '../lib/secure-storage.js';

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request(path: string, init: RequestInit = {}): Promise<{ status: number; envelope: ApiEnvelope<unknown> }> {
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  // Desktop has no shared cookie jar with the API origin: the refresh token
  // lives in the OS keychain and is sent as a header on the two endpoints
  // that need it (the API falls back to this header when no refresh cookie
  // is present).
  if (isDesktop() && (path === '/auth/refresh' || path === '/auth/logout') && !headers.has('X-Refresh-Token')) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      headers.set('X-Refresh-Token', refreshToken);
    }
  }

  const controller = new AbortController();
  const timeoutMs = path === '/auth/refresh' || path === '/auth/logout' ? 5_000 : 30_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      signal: init.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  let envelope: ApiEnvelope<unknown>;
  try {
    envelope = (await res.json()) as ApiEnvelope<unknown>;
  } catch {
    throw new ApiError('INTERNAL_ERROR', 'Unexpected non-JSON response', res.status);
  }

  return { status: res.status, envelope };
}

let refreshPromise: Promise<RefreshResponse | null> | null = null;

/**
 * Calls POST /auth/refresh using the httpOnly refresh cookie (web) or the
 * keychain-backed X-Refresh-Token header (desktop). Single-flight: concurrent
 * callers share one in-flight request. Never retried itself (callers must not
 * route this through apiFetch's 401 handling), to avoid an infinite refresh
 * loop. On desktop, persists the rotated refresh token back to the keychain.
 */
export function refreshAccessToken(): Promise<RefreshResponse | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      let status: number;
      let envelope: ApiEnvelope<unknown>;
      try {
        ({ status, envelope } = await request('/auth/refresh', { method: 'POST' }));
      } catch {
        return null;
      }
      if (status !== 200 || !envelope.data) return null;

      if (isDesktop()) {
        const parsed = desktopRefreshResponseSchema.safeParse(envelope.data);
        if (!parsed.success) return null;
        await setRefreshToken(parsed.data.refreshToken);
        return parsed.data;
      }

      const parsed = refreshResponseSchema.safeParse(envelope.data);
      return parsed.success ? parsed.data : null;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Fetches `path`, validates the envelope's `data` against `schema`, and
 * throws `ApiError` on an error envelope. On a 401 (other than from
 * /auth/refresh itself), attempts a single silent refresh-and-retry before
 * giving up.
 */
export async function apiFetch<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  let { status, envelope } = await request(path, init);

  if (status === 401 && path !== '/auth/refresh') {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      setAccessToken(refreshed.accessToken);
      ({ status, envelope } = await request(path, init));
    }
  }

  if (envelope.error) {
    throw new ApiError(envelope.error.code, envelope.error.message, status);
  }

  return schema.parse(envelope.data);
}
