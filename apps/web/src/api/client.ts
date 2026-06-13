import type { ApiEnvelope, RefreshResponse } from '@portfoliohub/shared';
import { refreshResponseSchema } from '@portfoliohub/shared';
import type { z } from 'zod';
import { env } from '../config/env.js';

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

  const res = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

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
 * Calls POST /auth/refresh using the httpOnly refresh cookie. Single-flight:
 * concurrent callers share one in-flight request. Never retried itself
 * (callers must not route this through apiFetch's 401 handling), to avoid an
 * infinite refresh loop.
 */
export function refreshAccessToken(): Promise<RefreshResponse | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { status, envelope } = await request('/auth/refresh', { method: 'POST' });
      if (status !== 200 || !envelope.data) return null;
      return refreshResponseSchema.parse(envelope.data);
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
