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
  position: number,
): Promise<string> {
  const id = randomUUID();
  const objectKey = `tenants/${tenantId}/nodes/${nodeId}/${id}/original.jpg`;
  await withTenant(migratorPool, tenantId, (client) =>
    client.query(
      `INSERT INTO media_assets
         (id, tenant_id, node_id, object_key, url, mime_type, status, position, original_filename, byte_size)
       VALUES ($1, $2, $3, $4, $5, 'image/jpeg', 'ready', $6, 'test.jpg', 1024)`,
      [id, tenantId, nodeId, objectKey, `https://fake-storage.example.com/${objectKey}`, position],
    ),
  );
  return id;
}

async function assetOrder(
  migratorPool: ReturnType<typeof createTestMigratorPool>,
  tenantId: string,
  nodeId: string,
): Promise<{ id: string; position: number }[]> {
  const rows = await withTenant(migratorPool, tenantId, (client) =>
    client.query(
      'SELECT id, position FROM media_assets WHERE tenant_id=$1 AND node_id=$2 ORDER BY position',
      [tenantId, nodeId],
    ),
  );
  return rows.rows.map((r) => ({ id: r.id as string, position: r.position as number }));
}

async function cleanGallery(
  migratorPool: ReturnType<typeof createTestMigratorPool>,
  tenantId: string,
  nodeId: string,
) {
  await withTenant(migratorPool, tenantId, (client) =>
    client.query('DELETE FROM media_assets WHERE node_id=$1', [nodeId]),
  );
}

// ─── fixture setup ──────────────────────────────────────────────────────────

describe('PATCH /media/:id/move', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const storage = new FakeStorageProvider();
  const enqueue: Enqueue = vi.fn();
  const app = createApp(pool, storage, enqueue);

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();
  const hostA = `mdmov-a-${randomUUID()}.example.com`;
  const hostB = `mdmov-b-${randomUUID()}.example.com`;
  const galleryA = randomUUID();
  const galleryB = randomUUID();

  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    await withTenant(migratorPool, tenantA, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantA, 'Mov Tenant A']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantA, hostA],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userA, tenantA, 'mova@example.com', 'Mov A'],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'gallery', 'Gallery A', 'gallery-a', 0)",
        [galleryA, tenantA],
      );
    });
    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantB, 'Mov Tenant B']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantB, hostB],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userB, tenantB, 'movb@example.com', 'Mov B'],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'gallery', 'Gallery B', 'gallery-b', 0)",
        [galleryB, tenantB],
      );
    });
    tokenA = await signAccessToken({ sub: userA, tenantId: tenantA, email: 'mova@example.com' });
    tokenB = await signAccessToken({ sub: userB, tenantId: tenantB, email: 'movb@example.com' });
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
      .patch(`/media/${randomUUID()}/move`)
      .set('Host', hostA)
      .send({ position: 0 });

    expect(res.status).toBe(401);
  });

  it('returns 422 for a non-UUID id', async () => {
    const res = await request(app)
      .patch('/media/not-a-uuid/move')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ position: 0 });

    expect(res.status).toBe(422);
  });

  it('returns 422 for a negative position', async () => {
    const res = await request(app)
      .patch(`/media/${randomUUID()}/move`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ position: -1 });

    expect(res.status).toBe(422);
  });

  it('returns 422 for missing position', async () => {
    const res = await request(app)
      .patch(`/media/${randomUUID()}/move`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('returns 404 for an unknown asset', async () => {
    const res = await request(app)
      .patch(`/media/${randomUUID()}/move`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ position: 0 });

    expect(res.status).toBe(404);
  });

  it('returns 404 when the asset belongs to another tenant', async () => {
    const id = await seedAsset(migratorPool, tenantB, galleryB, 0);

    const res = await request(app)
      .patch(`/media/${id}/move`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ position: 0 });

    expect(res.status).toBe(404);

    // Cleanup
    await cleanGallery(migratorPool, tenantB, galleryB);
  });

  it('reorders within same gallery: move first to last', async () => {
    const ids = [
      await seedAsset(migratorPool, tenantA, galleryA, 0),
      await seedAsset(migratorPool, tenantA, galleryA, 1),
      await seedAsset(migratorPool, tenantA, galleryA, 2),
    ];

    const res = await request(app)
      .patch(`/media/${ids[0]}/move`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ position: 2 });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data.position).toBe(2);

    const order = await assetOrder(migratorPool, tenantA, galleryA);
    expect(order.map((a) => a.id)).toEqual([ids[1], ids[2], ids[0]]);
    expect(order.map((a) => a.position)).toEqual([0, 1, 2]);

    await cleanGallery(migratorPool, tenantA, galleryA);
  });

  it('reorders within same gallery: move last to first', async () => {
    const ids = [
      await seedAsset(migratorPool, tenantA, galleryA, 0),
      await seedAsset(migratorPool, tenantA, galleryA, 1),
      await seedAsset(migratorPool, tenantA, galleryA, 2),
    ];

    await request(app)
      .patch(`/media/${ids[2]}/move`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ position: 0 });

    const order = await assetOrder(migratorPool, tenantA, galleryA);
    expect(order.map((a) => a.id)).toEqual([ids[2], ids[0], ids[1]]);
    expect(order.map((a) => a.position)).toEqual([0, 1, 2]);

    await cleanGallery(migratorPool, tenantA, galleryA);
  });

  it('clamps out-of-range position to the last slot', async () => {
    const ids = [
      await seedAsset(migratorPool, tenantA, galleryA, 0),
      await seedAsset(migratorPool, tenantA, galleryA, 1),
    ];

    const res = await request(app)
      .patch(`/media/${ids[0]}/move`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ position: 999 });

    expect(res.status).toBe(200);
    const order = await assetOrder(migratorPool, tenantA, galleryA);
    expect(order.map((a) => a.id)).toEqual([ids[1], ids[0]]);
    expect(order.map((a) => a.position)).toEqual([0, 1]);

    await cleanGallery(migratorPool, tenantA, galleryA);
  });

  it('positions are always dense after any move', async () => {
    const ids = [
      await seedAsset(migratorPool, tenantA, galleryA, 0),
      await seedAsset(migratorPool, tenantA, galleryA, 1),
      await seedAsset(migratorPool, tenantA, galleryA, 2),
      await seedAsset(migratorPool, tenantA, galleryA, 3),
    ];

    // Move last (pos 3) to position 1
    await request(app)
      .patch(`/media/${ids[3]}/move`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ position: 1 });

    const order = await assetOrder(migratorPool, tenantA, galleryA);
    expect(order.map((a) => a.position)).toEqual([0, 1, 2, 3]);

    await cleanGallery(migratorPool, tenantA, galleryA);
  });

  it('returns the updated MediaAsset in the response envelope', async () => {
    const ids = [
      await seedAsset(migratorPool, tenantA, galleryA, 0),
      await seedAsset(migratorPool, tenantA, galleryA, 1),
    ];

    const res = await request(app)
      .patch(`/media/${ids[0]}/move`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ position: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ids[0]);
    expect(res.body.data.nodeId).toBe(galleryA);
    expect(res.body.data.tenantId).toBe(tenantA);

    await cleanGallery(migratorPool, tenantA, galleryA);
  });
});
