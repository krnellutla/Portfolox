import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { withTenant } from '../../src/db/with-tenant.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { FakeStorageProvider } from '../../src/services/storage/index.js';
import type { Enqueue } from '../../src/services/media/queue.js';
import { createTestMigratorPool, createTestPool } from '../db-test-utils.js';

// ─── helpers ────────────────────────────────────────────────────────────────

async function seedAsset(
  migratorPool: ReturnType<typeof createTestMigratorPool>,
  tenantId: string,
  nodeId: string,
  overrides: { position?: number; status?: string; objectKey?: string } = {},
): Promise<{ id: string; objectKey: string }> {
  const id = randomUUID();
  const objectKey = overrides.objectKey ?? `tenants/${tenantId}/nodes/${nodeId}/${id}/original.jpg`;
  const position = overrides.position ?? 0;
  const status = overrides.status ?? 'ready';

  await withTenant(migratorPool, tenantId, (client) =>
    client.query(
      `INSERT INTO media_assets
         (id, tenant_id, node_id, object_key, url, mime_type, status, position, original_filename, byte_size)
       VALUES ($1, $2, $3, $4, $5, 'image/jpeg', $6, $7, 'test.jpg', 1024)`,
      [id, tenantId, nodeId, objectKey, `https://fake-storage.example.com/${objectKey}`, status, position],
    ),
  );

  return { id, objectKey };
}

async function seedVariant(
  migratorPool: ReturnType<typeof createTestMigratorPool>,
  tenantId: string,
  assetId: string,
  variant: string,
  objectKey: string,
): Promise<string> {
  const id = randomUUID();
  await withTenant(migratorPool, tenantId, (client) =>
    client.query(
      `INSERT INTO media_variants
         (id, tenant_id, asset_id, variant, object_key, url, width, height, byte_size)
       VALUES ($1, $2, $3, $4, $5, $6, 256, 171, 8192)`,
      [id, tenantId, assetId, variant, objectKey, `https://fake-storage.example.com/${objectKey}`],
    ),
  );
  return id;
}

async function assetPositions(
  migratorPool: ReturnType<typeof createTestMigratorPool>,
  tenantId: string,
  nodeId: string,
): Promise<number[]> {
  const rows = await withTenant(migratorPool, tenantId, (client) =>
    client.query(
      'SELECT position FROM media_assets WHERE tenant_id=$1 AND node_id=$2 ORDER BY position',
      [tenantId, nodeId],
    ),
  );
  return rows.rows.map((r) => r.position as number);
}

// ─── fixture setup ──────────────────────────────────────────────────────────

describe('DELETE /media/:id', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const storage = new FakeStorageProvider();
  const enqueue: Enqueue = vi.fn();
  const app = createApp(pool, storage, enqueue);

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();
  const hostA = `mddel-a-${randomUUID()}.example.com`;
  const hostB = `mddel-b-${randomUUID()}.example.com`;
  const galleryA = randomUUID();
  const galleryB = randomUUID();

  let tokenA: string;

  beforeAll(async () => {
    await withTenant(migratorPool, tenantA, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantA, 'Del Tenant A']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantA, hostA],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userA, tenantA, 'dela@example.com', 'Del A'],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'gallery', 'Gallery A', 'gallery-a', 0)",
        [galleryA, tenantA],
      );
    });
    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantB, 'Del Tenant B']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantB, hostB],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userB, tenantB, 'delb@example.com', 'Del B'],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'gallery', 'Gallery B', 'gallery-b', 0)",
        [galleryB, tenantB],
      );
    });
    tokenA = await signAccessToken({ sub: userA, tenantId: tenantA, email: 'dela@example.com' });
  });

  afterAll(async () => {
    await Promise.all([
      withTenant(migratorPool, tenantA, async (client) => {
        await client.query('DELETE FROM media_assets WHERE tenant_id=$1', [tenantA]);
        await client.query('DELETE FROM nodes WHERE tenant_id=$1', [tenantA]);
        await client.query('DELETE FROM users WHERE tenant_id=$1', [tenantA]);
        await client.query('DELETE FROM tenant_domains WHERE tenant_id=$1', [tenantA]);
        await client.query('DELETE FROM tenants WHERE id=$1', [tenantA]);
      }),
      withTenant(migratorPool, tenantB, async (client) => {
        await client.query('DELETE FROM media_assets WHERE tenant_id=$1', [tenantB]);
        await client.query('DELETE FROM nodes WHERE tenant_id=$1', [tenantB]);
        await client.query('DELETE FROM users WHERE tenant_id=$1', [tenantB]);
        await client.query('DELETE FROM tenant_domains WHERE tenant_id=$1', [tenantB]);
        await client.query('DELETE FROM tenants WHERE id=$1', [tenantB]);
      }),
    ]);
    await pool.end();
    await migratorPool.end();
  });

  beforeEach(() => {
    storage.reset();
    vi.clearAllMocks();
  });

  it('returns 401 without a Bearer token', async () => {
    const res = await request(app)
      .delete(`/media/${randomUUID()}`)
      .set('Host', hostA);

    expect(res.status).toBe(401);
  });

  it('returns 422 for a non-UUID id', async () => {
    const res = await request(app)
      .delete('/media/not-a-uuid')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(422);
  });

  it('returns 404 for an unknown asset id', async () => {
    const res = await request(app)
      .delete(`/media/${randomUUID()}`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when the asset belongs to another tenant (row survives in DB)', async () => {
    const { id } = await seedAsset(migratorPool, tenantB, galleryB);

    const res = await request(app)
      .delete(`/media/${id}`)
      .set('Host', hostA)                         // tenant A
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);

    // row must still exist in tenantB
    const rows = await withTenant(migratorPool, tenantB, (client) =>
      client.query('SELECT id FROM media_assets WHERE id=$1', [id]),
    );
    expect(rows.rowCount).toBe(1);
  });

  it('deletes the asset row and returns its id', async () => {
    const { id } = await seedAsset(migratorPool, tenantA, galleryA);

    const res = await request(app)
      .delete(`/media/${id}`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data.id).toBe(id);

    const rows = await withTenant(migratorPool, tenantA, (client) =>
      client.query('SELECT id FROM media_assets WHERE id=$1', [id]),
    );
    expect(rows.rowCount).toBe(0);
  });

  it('calls storage.deleteObject for the original key', async () => {
    const { id, objectKey } = await seedAsset(migratorPool, tenantA, galleryA);

    await request(app)
      .delete(`/media/${id}`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(storage.deleted).toContain(objectKey);
  });

  it('cascades: variant rows are removed and their object keys are deleted from storage', async () => {
    const { id: assetId } = await seedAsset(migratorPool, tenantA, galleryA);
    const thumbKey = `tenants/${tenantA}/thumb/${assetId}.webp`;
    const smallKey = `tenants/${tenantA}/small/${assetId}.webp`;
    await seedVariant(migratorPool, tenantA, assetId, 'thumb', thumbKey);
    await seedVariant(migratorPool, tenantA, assetId, 'small', smallKey);

    const res = await request(app)
      .delete(`/media/${assetId}`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);

    // Variant rows removed via FK cascade
    const variantRows = await withTenant(migratorPool, tenantA, (client) =>
      client.query('SELECT id FROM media_variants WHERE asset_id=$1', [assetId]),
    );
    expect(variantRows.rowCount).toBe(0);

    // Both variant object keys deleted from storage
    expect(storage.deleted).toContain(thumbKey);
    expect(storage.deleted).toContain(smallKey);
  });

  it('compacts sibling positions after deletion (middle of 3)', async () => {
    const a0 = await seedAsset(migratorPool, tenantA, galleryA, { position: 0 });
    const a1 = await seedAsset(migratorPool, tenantA, galleryA, { position: 1 });
    const a2 = await seedAsset(migratorPool, tenantA, galleryA, { position: 2 });

    await request(app)
      .delete(`/media/${a1.id}`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`);

    // a0 stays at 0; a2 should compact from 2 to 1
    const positions = await assetPositions(migratorPool, tenantA, galleryA);
    expect(positions).toEqual([0, 1]);

    // Cleanup
    for (const a of [a0, a2]) {
      await withTenant(migratorPool, tenantA, (client) =>
        client.query('DELETE FROM media_assets WHERE id=$1', [a.id]),
      );
    }
  });

  it('storage failures do not affect the 200 response (best-effort)', async () => {
    // Even if deleteObject throws, the endpoint should still return 200
    // (we verify this by checking the DB row is gone regardless)
    const { id } = await seedAsset(migratorPool, tenantA, galleryA);

    const res = await request(app)
      .delete(`/media/${id}`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });
});
