import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { withTenant } from '../db/with-tenant.js';

/**
 * Creates one tenant with a primary domain and a root "Home" folder.
 * Idempotent per host: re-running with the same host changes nothing.
 *
 *   TENANT_NAME="Portfolix" TENANT_HOST=portfolix.tinkeryard.dev pnpm --filter @blueflutes/api db:create-tenant
 */
async function main() {
  const name = process.env.TENANT_NAME;
  const host = process.env.TENANT_HOST?.trim().toLowerCase();
  if (!name || !host) {
    throw new Error('Set TENANT_NAME and TENANT_HOST (e.g. portfolix.tinkeryard.dev)');
  }

  const ssl = env.NODE_ENV === 'production' ? true : { rejectUnauthorized: false };
  const pool = new Pool({ connectionString: env.DATABASE_MIGRATION_URL, ssl });
  try {
    const existing = await pool.query('SELECT tenant_id FROM tenant_domains WHERE host = $1', [host]);
    if (existing.rowCount && existing.rowCount > 0) {
      console.log(`tenant for ${host} already exists (${existing.rows[0].tenant_id as string})`);
      return;
    }

    const tenantId = randomUUID();
    await withTenant(pool, tenantId, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantId, name]);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantId, host],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug) VALUES ($1, $2, 'folder', 'Home', 'home')",
        [randomUUID(), tenantId],
      );
    });
    console.log(`created tenant ${tenantId} for ${host}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
