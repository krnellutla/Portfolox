import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withTenant } from '../src/db/with-tenant.js';
import { createTestMigratorPool, createTestPool } from './db-test-utils.js';

describe('tenant row-level security isolation', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();

  const tenantA = randomUUID();
  const tenantB = randomUUID();

  beforeAll(async () => {
    await withTenant(migratorPool, tenantA, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantA, 'Tenant A']);
      await client.query(
        "INSERT INTO nodes (tenant_id, type, name, slug) VALUES ($1, 'folder', 'A Root', 'a-root')",
        [tenantA],
      );
    });

    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantB, 'Tenant B']);
      await client.query(
        "INSERT INTO nodes (tenant_id, type, name, slug) VALUES ($1, 'folder', 'B Root', 'b-root')",
        [tenantB],
      );
    });
  });

  afterAll(async () => {
    await migratorPool.query('DELETE FROM nodes WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantA, tenantB]);
    await pool.end();
    await migratorPool.end();
  });

  it('runs as a role with RLS-bypass permanently disabled', async () => {
    const result = await pool.query<{ rolbypassrls: boolean; rolsuper: boolean }>(
      'SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user',
    );
    expect(result.rows[0]?.rolbypassrls).toBe(false);
    expect(result.rows[0]?.rolsuper).toBe(false);
  });

  it('only returns the active tenant nodes', async () => {
    const rowsA = await withTenant(pool, tenantA, (client) =>
      client.query('SELECT name FROM nodes'),
    );
    expect(rowsA.rows.map((row: { name: string }) => row.name)).toEqual(['A Root']);

    const rowsB = await withTenant(pool, tenantB, (client) =>
      client.query('SELECT name FROM nodes'),
    );
    expect(rowsB.rows.map((row: { name: string }) => row.name)).toEqual(['B Root']);
  });

  it('fails closed when no tenant context is set', async () => {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM nodes');
      expect(result.rows).toHaveLength(0);
    } finally {
      client.release();
    }
  });

  it('fails closed for an empty tenant id', async () => {
    const client = await pool.connect();
    try {
      await client.query("SELECT set_config('app.tenant_id', '', true)");
      const result = await client.query('SELECT * FROM nodes');
      expect(result.rows).toHaveLength(0);
    } finally {
      client.release();
    }
  });

  it('rejects writes with a mismatched tenant id', async () => {
    await expect(
      withTenant(pool, tenantA, (client) =>
        client.query(
          "INSERT INTO nodes (tenant_id, type, name, slug) VALUES ($1, 'folder', 'Cross Tenant', 'cross-tenant')",
          [tenantB],
        ),
      ),
    ).rejects.toThrow();
  });

  it('rejects a non-uuid tenant id', async () => {
    await expect(
      withTenant(pool, 'not-a-uuid', (client) => client.query('SELECT * FROM nodes')),
    ).rejects.toThrow();
  });

  it('tenant_settings: tenant A cannot read tenant B settings', async () => {
    // Seed a settings row for tenantB via the migrator (owner, bypasses RLS)
    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query(
        `INSERT INTO tenant_settings (tenant_id, color_bg)
         VALUES ($1, '#bb0000')
         ON CONFLICT (tenant_id) DO UPDATE SET color_bg = '#bb0000'`,
        [tenantB],
      );
    });

    // App-role under tenantA context should get 0 rows
    const rows = await withTenant(pool, tenantA, (client) =>
      client.query('SELECT * FROM tenant_settings'),
    );
    expect(rows.rows).toHaveLength(0);
  });

  it('tenant_settings: write with mismatched tenant_id is rejected', async () => {
    await expect(
      withTenant(pool, tenantA, (client) =>
        client.query(
          "INSERT INTO tenant_settings (tenant_id, color_bg) VALUES ($1, '#ff0000')",
          [tenantB],
        ),
      ),
    ).rejects.toThrow();
  });
});
