import type { Pool } from 'pg';

/**
 * Looks up the tenant for a normalized host. Runs on a plain pooled
 * connection with no tenant context set — relies on the
 * `tenant_domains_read_for_resolution` RLS policy (FOR SELECT USING (true)),
 * since no tenant context can exist before resolution happens.
 */
export async function findTenantByHost(pool: Pool, host: string): Promise<string | null> {
  const result = await pool.query<{ tenant_id: string }>(
    'SELECT tenant_id FROM tenant_domains WHERE host = $1',
    [host],
  );

  return result.rows[0]?.tenant_id ?? null;
}
