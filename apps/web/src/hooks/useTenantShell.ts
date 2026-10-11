/**
 * Detects whether the app is running on a tenant's custom domain
 * (as opposed to the main blueflutes.com app shell).
 *
 * Tenant hosts are anything that isn't localhost, 127.0.0.1, or *.blueflutes.com.
 */
export function useTenantShell(): { isTenantHost: boolean } {
  const { hostname } = window.location;
  const isAppHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.blueflutes.com') ||
    hostname === 'blueflutes.com';
  return { isTenantHost: !isAppHost };
}
