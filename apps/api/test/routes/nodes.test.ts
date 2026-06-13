import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { withTenant } from '../../src/db/with-tenant.js';
import { createTestMigratorPool, createTestPool } from '../db-test-utils.js';

describe('GET /nodes', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const app = createApp(pool);

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const hostA = `nodes-a-${randomUUID()}.example.com`;
  const hostB = `nodes-b-${randomUUID()}.example.com`;

  const rootA = randomUUID();
  const childA = randomUUID();
  const rootB = randomUUID();

  beforeAll(async () => {
    await withTenant(migratorPool, tenantA, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantA, 'Tenant A']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantA, hostA],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'folder', 'Home', 'home', 0)",
        [rootA, tenantA],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, parent_id, type, name, slug, position) VALUES ($1, $2, $3, 'gallery', 'Landscapes', 'landscapes', 0)",
        [childA, tenantA, rootA],
      );
    });

    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantB, 'Tenant B']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantB, hostB],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'folder', 'Home', 'home', 0)",
        [rootB, tenantB],
      );
    });
  });

  afterAll(async () => {
    await migratorPool.query('DELETE FROM nodes WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantA, tenantB]);
    await pool.end();
    await migratorPool.end();
  });

  it('returns the host-resolved tenant\'s nodes without a Bearer token', async () => {
    const res = await request(app).get('/nodes').set('Host', hostA);

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.map((n: { id: string }) => n.id).sort()).toEqual([childA, rootA].sort());
  });

  it('does not return another tenant\'s nodes', async () => {
    const res = await request(app).get('/nodes').set('Host', hostB);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(rootB);
    expect(res.body.data.map((n: { id: string }) => n.id)).not.toContain(rootA);
    expect(res.body.data.map((n: { id: string }) => n.id)).not.toContain(childA);
  });

  it('returns a 404 envelope for an unknown host', async () => {
    const res = await request(app).get('/nodes').set('Host', `unknown-${randomUUID()}.example.com`);

    expect(res.status).toBe(404);
    expect(res.body.data).toBeNull();
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
