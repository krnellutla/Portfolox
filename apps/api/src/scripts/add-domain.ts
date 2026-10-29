/**
 * Register a custom domain (host) for an existing tenant.
 *
 * Usage:
 *   DATABASE_MIGRATION_URL=<url> pnpm --filter @blueflutes/api tsx src/scripts/add-domain.ts \
 *     --tenant <tenant-id> --host portfolix.tinkeryard.dev [--primary]
 *
 * If you don't know the tenant ID, run:
 *   DATABASE_MIGRATION_URL=<url> pnpm --filter @blueflutes/api tsx src/scripts/add-domain.ts --list
 */
import { Pool } from 'pg';
import { env } from '../config/env.js';

async function main() {
  const args = process.argv.slice(2);

  const pool = new Pool({ connectionString: env.DATABASE_MIGRATION_URL });

  if (args.includes('--list')) {
    const { rows } = await pool.query<{ id: string; name: string; host: string; is_primary: boolean }>(
      `SELECT t.id, t.name, d.host, d.is_primary
       FROM tenants t
       LEFT JOIN tenant_domains d ON d.tenant_id = t.id
       ORDER BY t.name, d.host`,
    );
    console.log('Tenants and domains:');
    for (const row of rows) {
      console.log(`  ${row.id}  ${row.name}  →  ${row.host ?? '(no domain)'}${row.is_primary ? ' [primary]' : ''}`);
    }
    await pool.end();
    return;
  }

  const tenantIdx = args.indexOf('--tenant');
  const hostIdx = args.indexOf('--host');
  const isPrimary = args.includes('--primary');

  if (tenantIdx === -1 || hostIdx === -1) {
    console.error('Usage: add-domain.ts --tenant <id> --host <hostname> [--primary]');
    console.error('       add-domain.ts --list');
    process.exit(1);
  }

  const tenantId = args[tenantIdx + 1];
  const host = args[hostIdx + 1]?.toLowerCase();

  if (!tenantId || !host) {
    console.error('--tenant and --host values are required');
    process.exit(1);
  }

  const { rows: tenants } = await pool.query('SELECT id, name FROM tenants WHERE id = $1', [tenantId]);
  if (tenants.length === 0) {
    console.error(`Tenant ${tenantId} not found`);
    process.exit(1);
  }

  await pool.query(
    `INSERT INTO tenant_domains (tenant_id, host, is_primary)
     VALUES ($1, $2, $3)
     ON CONFLICT (host) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, is_primary = EXCLUDED.is_primary`,
    [tenantId, host, isPrimary],
  );

  console.log(`✓ Added domain "${host}" for tenant "${tenants[0].name}" (${tenantId})${isPrimary ? ' [primary]' : ''}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
