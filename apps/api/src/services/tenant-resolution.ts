import type { Pool } from 'pg';

/**
 * Looks up the tenant for a normalized host in a single JOIN query. Runs on a
 * plain pooled connection with no tenant context — relies on the permissive
 * SELECT policies on both tenant_domains (tenant_domains_read_for_resolution)
 * and tenants (tenants_read_for_resolution). Both policies use USING (true) so
 * no app.tenant_id needs to be set before resolution.
 */
export async function findTenantByHost(
  pool: Pool,
  host: string,
): Promise<{ tenantId: string; name: string } | null> {
  const result = await pool.query<{ tenant_id: string; name: string }>(
    `SELECT td.tenant_id, t.name
     FROM tenant_domains td
     JOIN tenants t ON t.id = td.tenant_id
     WHERE td.host = $1`,
    [host],
  );

  const row = result.rows[0];
  return row ? { tenantId: row.tenant_id, name: row.name } : null;
}

