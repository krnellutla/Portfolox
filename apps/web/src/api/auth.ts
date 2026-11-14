import {
  logoutResponseSchema,
  otpRequestResponseSchema,
  refreshResponseSchema,
  desktopRefreshResponseSchema,
  type LogoutResponse,
  type OtpRequestResponse,
  type RefreshResponse,
  type DesktopRefreshResponse,
} from '@blueflutes/shared';
import { isDesktop } from '../lib/platform.js';
import { clearRefreshToken } from '../lib/secure-storage.js';
import { apiFetch, refreshAccessToken, setAccessToken } from './client.js';

export { refreshAccessToken };

export async function requestOtp(email: string): Promise<OtpRequestResponse> {
  return apiFetch<OtpRequestResponse>(
    '/auth/otp/request',
    { method: 'POST', body: JSON.stringify({ email }) },
    otpRequestResponseSchema,
  );
}

export async function verifyOtp(
  email: string,
  code: string,
): Promise<RefreshResponse | DesktopRefreshResponse> {
  const path = isDesktop() ? '/auth/otp/verify?client=desktop' : '/auth/otp/verify';
  const schema = isDesktop() ? desktopRefreshResponseSchema : refreshResponseSchema;
  return apiFetch<RefreshResponse | DesktopRefreshResponse>(
    path,
    { method: 'POST', body: JSON.stringify({ email, code }) },
    schema,
  );
}

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
