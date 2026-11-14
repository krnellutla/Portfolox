import {
  startRegistration,
  startAuthentication,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from '@simplewebauthn/browser';
import type {
  ApiEnvelope,
  DesktopRefreshResponse,
  PasskeyCredential,
  PasskeyListResponse,
  RefreshResponse,
} from '@blueflutes/shared';
import {
  passkeyCredentialSchema,
  passkeyListResponseSchema,
  desktopRefreshResponseSchema,
  refreshResponseSchema,
} from '@blueflutes/shared';
import { isDesktop } from '../lib/platform.js';
import { apiFetch } from './client.js';

// ─── Registration ─────────────────────────────────────────────────────────────

export async function registerPasskey(friendlyName?: string): Promise<PasskeyCredential> {
  // 1. Get challenge from server
  const beginEnvelope = await apiFetch('/auth/passkey/register/begin', {
    method: 'POST',
  });
  const options = (beginEnvelope as ApiEnvelope<unknown>).data as Parameters<
    typeof startRegistration
  >[0];

  // 2. Browser WebAuthn prompt
  const registrationResponse: RegistrationResponseJSON = await startRegistration({ optionsJSON: options as never });

  // 3. Send attestation to server
  return apiFetch<PasskeyCredential>(
    '/auth/passkey/register/finish',
    {
      method: 'POST',
      body: JSON.stringify({ response: registrationResponse, friendlyName: friendlyName ?? null }),
    },
    passkeyCredentialSchema,
  );
}

// ─── Authentication ───────────────────────────────────────────────────────────

export async function authenticateWithPasskey(
  email?: string,
): Promise<RefreshResponse | DesktopRefreshResponse> {
  // 1. Get challenge
  const beginEnvelope = await apiFetch('/auth/passkey/auth/begin', {
    method: 'POST',
    body: JSON.stringify(email ? { email } : {}),
  });
  const options = (beginEnvelope as ApiEnvelope<unknown>).data as Parameters<
    typeof startAuthentication
  >[0];

  // 2. Browser WebAuthn prompt
  const authResponse: AuthenticationResponseJSON = await startAuthentication({ optionsJSON: options as never });

  // 3. Send assertion to server
  const path = isDesktop()
    ? '/auth/passkey/auth/finish?client=desktop'
    : '/auth/passkey/auth/finish';
  const schema = isDesktop() ? desktopRefreshResponseSchema : refreshResponseSchema;

  return apiFetch<RefreshResponse | DesktopRefreshResponse>(
    path,
    { method: 'POST', body: JSON.stringify({ response: authResponse }) },
    schema,
  );
}

// ─── Credential management ────────────────────────────────────────────────────

export async function listPasskeys(): Promise<PasskeyListResponse> {
  return apiFetch<PasskeyListResponse>('/auth/passkey/credentials', {}, passkeyListResponseSchema);
}

export async function renamePasskey(id: string, friendlyName: string): Promise<void> {
  await apiFetch('/auth/passkey/credentials/' + id, {
    method: 'PATCH',
    body: JSON.stringify({ friendlyName }),
  });
}

export async function deletePasskey(id: string): Promise<void> {
  await apiFetch('/auth/passkey/credentials/' + id, { method: 'DELETE' });
}
