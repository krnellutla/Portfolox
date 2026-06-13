import { Pool } from 'pg';
import { env } from '../config/env.js';
import { withTenant } from '../db/with-tenant.js';

// Fixed IDs so this script is idempotent on repeated runs against the same database.
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEV_NODE_ID = '00000000-0000-0000-0000-000000000002';
const DEV_GALLERY_LANDSCAPES_ID = '00000000-0000-0000-0000-000000000003';
const DEV_GALLERY_PORTRAITS_ID = '00000000-0000-0000-0000-000000000004';
const DEV_GALLERY_STREET_ID = '00000000-0000-0000-0000-000000000005';

async function main() {
  const pool = new Pool({ connectionString: env.DATABASE_MIGRATION_URL });

  await withTenant(pool, DEV_TENANT_ID, async (client) => {
    await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [
      DEV_TENANT_ID,
      'Dev Tenant',
    ]);
    await client.query(
      'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true) ON CONFLICT (host) DO NOTHING',
      [DEV_TENANT_ID, 'localhost'],
    );
    await client.query(
      "INSERT INTO nodes (id, tenant_id, type, name, slug) VALUES ($1, $2, 'folder', 'Home', 'home') ON CONFLICT (id) DO NOTHING",
      [DEV_NODE_ID, DEV_TENANT_ID],
    );
    await client.query(
      `INSERT INTO nodes (id, tenant_id, parent_id, type, name, slug, position)
       VALUES
         ($1, $4, $5, 'gallery', 'Landscapes', 'landscapes', 0),
         ($2, $4, $5, 'gallery', 'Portraits', 'portraits', 1),
         ($3, $4, $5, 'gallery', 'Street', 'street', 2)
       ON CONFLICT (id) DO NOTHING`,
      [DEV_GALLERY_LANDSCAPES_ID, DEV_GALLERY_PORTRAITS_ID, DEV_GALLERY_STREET_ID, DEV_TENANT_ID, DEV_NODE_ID],
    );
  });

  console.log(`seeded dev tenant ${DEV_TENANT_ID}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
