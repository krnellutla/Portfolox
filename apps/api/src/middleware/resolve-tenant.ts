import type { Pool } from 'pg';
import { withTenant } from '../db/with-tenant.js';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { findTenantByHost } from '../services/tenant-resolution.js';

/**
 * Normalizes a `Host` header to a bare hostname: lowercased, with any port
 * stripped. IPv6 literals (`[::1]:3000`) are preserved including brackets.
 * Returns null for missing/empty/malformed input.
 */
export function normalizeHost(rawHost: string | undefined): string | null {
  if (!rawHost) return null;

  const host = rawHost.trim().toLowerCase();
  if (host.length === 0) return null;

  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end === -1 ? null : host.slice(0, end + 1);
  }

  const colonIndex = host.indexOf(':');
  return colonIndex === -1 ? host : host.slice(0, colonIndex);
}

/**
 * Resolves the tenant for the request's Host header via tenant_domains
 * (queried with no tenant context, relying on its permissive SELECT RLS
 * policy), then attaches req.tenant and a tenant-scoped withTenant runner.
 * Missing/unknown hosts both yield a generic 404 — never reveal which hosts
 * are registered.
 */
export function resolveTenant(pool: Pool) {
  return asyncHandler(async (req, _res, next) => {
    const host = normalizeHost(req.headers.host);
    if (!host) {
      throw AppError.notFound('Tenant not found for this host');
    }

    const tenantId = await findTenantByHost(pool, host);
    if (!tenantId) {
      throw AppError.notFound('Tenant not found for this host');
    }

    req.tenant = { id: tenantId };
    req.withTenant = (callback) => withTenant(pool, tenantId, callback);

    next();
  });
}
