import { isDesktop } from './platform.js';

const SERVICE = 'com.portfoliohub.desktop';
const ACCOUNT = 'refresh_token';

/**
 * Persists the desktop refresh token in the OS keychain (macOS Keychain,
 * Windows Credential Manager, Linux Secret Service via the
 * tauri-plugin-keyring backend). On web this is a no-op: the refresh token
 * lives only in the httpOnly cookie and is never readable by JS.
 */
export async function getRefreshToken(): Promise<string | null> {
  if (!isDesktop()) return null;

  const { getPassword } = await import('tauri-plugin-keyring-api');
  return getPassword(SERVICE, ACCOUNT);
}

export async function setRefreshToken(token: string): Promise<void> {
  if (!isDesktop()) return;

  const { setPassword } = await import('tauri-plugin-keyring-api');
  await setPassword(SERVICE, ACCOUNT, token);
}

export async function clearRefreshToken(): Promise<void> {
  if (!isDesktop()) return;

  const { deletePassword } = await import('tauri-plugin-keyring-api');
  try {
    await deletePassword(SERVICE, ACCOUNT);
  } catch {
    // No entry to delete — already logged out.
  }
}
