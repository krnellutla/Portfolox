import type { Pool } from 'pg';

/**
 * Looks up the tenant_id for a normalized host via tenant_domains only.
 * Runs on a plain pooled connection with no tenant context — relies solely on
 * the permissive SELECT policy on tenant_domains (USING (true)). No JOIN on
 * tenants is performed here, so this works before migration 0019 is applied
 * and before any app.tenant_id is set in the session.
 */
export async function findTenantByHost(
  pool: Pool,
  host: string,
): Promise<{ tenantId: string } | null> {
  const result = await pool.query<{ tenant_id: string }>(
    `SELECT tenant_id FROM tenant_domains WHERE host = $1`,
    [host],
  );

  const row = result.rows[0];
  return row ? { tenantId: row.tenant_id } : null;
}

