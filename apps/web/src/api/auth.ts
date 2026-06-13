import { logoutResponseSchema, type LogoutResponse } from '@portfoliohub/shared';
import { apiFetch, refreshAccessToken, setAccessToken } from './client.js';

export { refreshAccessToken };

export async function logout(): Promise<void> {
  try {
    await apiFetch<LogoutResponse>('/auth/logout', { method: 'POST' }, logoutResponseSchema);
  } finally {
    setAccessToken(null);
  }
}
