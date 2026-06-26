import { logoutResponseSchema, type LogoutResponse } from '@blueflutes/shared';
import { isDesktop } from '../lib/platform.js';
import { clearRefreshToken } from '../lib/secure-storage.js';
import { apiFetch, refreshAccessToken, setAccessToken } from './client.js';

export { refreshAccessToken };

export async function logout(): Promise<void> {
  try {
    await apiFetch<LogoutResponse>('/auth/logout', { method: 'POST' }, logoutResponseSchema);
  } finally {
    setAccessToken(null);
    if (isDesktop()) {
      await clearRefreshToken();
    }
  }
}
