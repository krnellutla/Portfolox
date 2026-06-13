import { z } from 'zod';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, refreshAccessToken, setAccessToken } from './client.js';

function jsonResponse(status: number, body: unknown): Response {
  return { status, json: async () => body } as Response;
}

const dataSchema = z.object({ value: z.string() });

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it('returns data validated against the schema on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { data: { value: 'ok' }, error: null }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch('/nodes', { method: 'GET' }, dataSchema);

    expect(result).toEqual({ value: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws ApiError for an error envelope', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(404, { data: null, error: { code: 'NOT_FOUND', message: 'nope' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/nodes', { method: 'GET' }, dataSchema)).rejects.toThrow(ApiError);
  });

  it('throws when the response data fails schema validation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { data: { wrong: 'shape' }, error: null }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/nodes', { method: 'GET' }, dataSchema)).rejects.toThrow();
  });

  it('on a 401, refreshes once and retries the original request', async () => {
    const refreshUser = {
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: '00000000-0000-0000-0000-000000000002',
      email: 'user@example.com',
      displayName: 'User',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { data: null, error: { code: 'UNAUTHORIZED', message: 'expired' } }))
      .mockResolvedValueOnce(
        jsonResponse(200, { data: { accessToken: 'new-token', user: refreshUser }, error: null }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { data: { value: 'ok' }, error: null }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch('/nodes', { method: 'GET' }, dataSchema);

    expect(result).toEqual({ value: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/auth/refresh');
  });

  it('on a 401 with a failed refresh, throws the original error without retrying again', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { data: null, error: { code: 'UNAUTHORIZED', message: 'expired' } }))
      .mockResolvedValueOnce(jsonResponse(401, { data: null, error: { code: 'UNAUTHORIZED', message: 'no cookie' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/nodes', { method: 'GET' }, dataSchema)).rejects.toThrow(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('refreshAccessToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it('returns null without retrying when /auth/refresh itself responds 401', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { data: null, error: { code: 'UNAUTHORIZED', message: 'no cookie' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAccessToken();

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
