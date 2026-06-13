import { z } from 'zod';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, refreshAccessToken, setAccessToken } from './client.js';

vi.mock('../lib/platform.js', () => ({ isDesktop: vi.fn(() => false) }));
vi.mock('../lib/secure-storage.js', () => ({
  getRefreshToken: vi.fn(),
  setRefreshToken: vi.fn(),
  clearRefreshToken: vi.fn(),
}));

const { isDesktop } = await import('../lib/platform.js');
const { getRefreshToken, setRefreshToken } = await import('../lib/secure-storage.js');

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
    vi.mocked(isDesktop).mockReturnValue(false);
    vi.mocked(getRefreshToken).mockReset();
    vi.mocked(setRefreshToken).mockReset();
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

  it('on desktop, sends the keychain refresh token as a header and persists the rotated token', async () => {
    vi.mocked(isDesktop).mockReturnValue(true);
    vi.mocked(getRefreshToken).mockResolvedValue('stored-refresh-token');

    const refreshUserPayload = {
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: '00000000-0000-0000-0000-000000000002',
      email: 'user@example.com',
      displayName: 'User',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        data: { accessToken: 'new-access-token', refreshToken: 'rotated-refresh-token', user: refreshUserPayload },
        error: null,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAccessToken();

    expect(result).toMatchObject({
      accessToken: 'new-access-token',
      user: { ...refreshUserPayload, createdAt: new Date(refreshUserPayload.createdAt), updatedAt: new Date(refreshUserPayload.updatedAt) },
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get('X-Refresh-Token')).toBe('stored-refresh-token');
    expect(setRefreshToken).toHaveBeenCalledWith('rotated-refresh-token');
  });

  it('on desktop with no stored refresh token, does not set the header and returns null', async () => {
    vi.mocked(isDesktop).mockReturnValue(true);
    vi.mocked(getRefreshToken).mockResolvedValue(null);

    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { data: null, error: { code: 'UNAUTHORIZED', message: 'no token' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshAccessToken();

    expect(result).toBeNull();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).has('X-Refresh-Token')).toBe(false);
    expect(setRefreshToken).not.toHaveBeenCalled();
  });
});
