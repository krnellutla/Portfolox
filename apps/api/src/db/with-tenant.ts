import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';

const tenantIdSchema = z.string().uuid();

/**
 * Runs `callback` inside a transaction with `app.tenant_id` set via
 * `set_config(..., true)` (transaction-local, parameterized — never a raw
 * `SET` with string interpolation). RLS policies key off this setting, so
 * every tenant-scoped query must go through this helper.
 */
export async function withTenant<T>(
  pool: Pool,
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const parsedTenantId = tenantIdSchema.parse(tenantId);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [parsedTenantId]);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
