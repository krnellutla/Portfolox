import type { Pool } from 'pg';

/**
 * Boot-time guard against the one realistic path to a silent, total RLS
 * bypass: DATABASE_URL pointing at a role with BYPASSRLS or SUPERUSER.
 * FORCE ROW LEVEL SECURITY does not constrain such roles, so every
 * tenant_isolation policy would be a no-op for this connection.
 */
export async function assertRuntimeRoleSafe(pool: Pool): Promise<void> {
  const result = await pool.query<{ rolbypassrls: boolean; rolsuper: boolean }>(
    'SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user',
  );

  const role = result.rows[0];

  if (!role) {
    throw new Error('assertRuntimeRoleSafe: could not determine current role privileges');
  }

  if (role.rolbypassrls || role.rolsuper) {
    throw new Error(
      'assertRuntimeRoleSafe: DATABASE_URL role has BYPASSRLS or SUPERUSER — refusing to start, ' +
        'this would silently disable tenant isolation',
    );
  }
}

/**
 * Tables that must carry FORCE ROW LEVEL SECURITY per
 * db/migrations/0001_rls_policies.sql. Kept as an explicit allowlist so a
 * migration that adds a tenant-scoped table without RLS fails the boot
 * check rather than silently leaking cross-tenant rows.
 */
const TENANT_SCOPED_TABLES = ['tenants', 'tenant_domains', 'users', 'tokens', 'nodes', 'media_assets'];

/**
 * Boot-time guard ensuring every tenant-scoped table still has RLS enabled
 * AND forced. This is the positive counterpart to assertRuntimeRoleSafe:
 * even with a safe role, a migration that forgets FORCE ROW LEVEL SECURITY
 * on a new table would silently disable isolation for that table.
 */
export async function assertTenantTablesRlsEnforced(pool: Pool): Promise<void> {
  const result = await pool.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
    `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY($1)`,
    [TENANT_SCOPED_TABLES],
  );

  const found = new Map(result.rows.map((row) => [row.relname, row]));

  for (const table of TENANT_SCOPED_TABLES) {
    const row = found.get(table);

    if (!row) {
      throw new Error(
        `assertTenantTablesRlsEnforced: table "${table}" not found — refusing to start`,
      );
    }

    if (!row.relrowsecurity || !row.relforcerowsecurity) {
      throw new Error(
        `assertTenantTablesRlsEnforced: table "${table}" does not have FORCE ROW LEVEL SECURITY ` +
          'enabled — refusing to start, this would silently disable tenant isolation',
      );
    }
  }
}
