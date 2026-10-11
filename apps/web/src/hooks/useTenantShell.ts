/**
 * Determines whether the current page is being served from a tenant's own
 * host (a subdomain of blueflutes.com or a custom domain) vs. the platform
 * host (blueflutes.com itself, or localhost for dev).
 *
 * This is purely for shell/navigation rendering decisions — it is not a
 * security boundary. Tenant isolation is enforced server-side via the
 * tenant_domains lookup + Row-Level Security.
 */
export function useTenantShell() {
  const hostname = window.location.hostname;
  const isTenantHost =
    hostname !== 'blueflutes.com' &&
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1';
  return { isTenantHost };
}
