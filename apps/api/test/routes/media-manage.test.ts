import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { withTenant } from '../../src/db/with-tenant.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { FakeStorageProvider } from '../../src/services/storage/index.js';
import type { Enqueue } from '../../src/services/media/queue.js';
import { createTestMigratorPool, createTestPool } from '../db-test-utils.js';

// ─── fixture setup ──────────────────────────────────────────────────────────

describe('GET /media/manage', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const storage = new FakeStorageProvider();
  const enqueue: Enqueue = vi.fn();
  const app = createApp(pool, storage, enqueue);

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();
  const hostA = `mdmgr-a-${randomUUID()}.example.com`;
  const hostB = `mdmgr-b-${randomUUID()}.example.com`;
  const galleryA = randomUUID();
  const galleryB = randomUUID();

  // assets seeded in beforeAll for the main tests
  const pendingId = randomUUID();
  const processingId = randomUUID();
  const readyId = randomUUID();
  const failedId = randomUUID();

  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    await withTenant(migratorPool, tenantA, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantA, 'Mgr Tenant A']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantA, hostA],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userA, tenantA, 'mgra@example.com', 'Mgr A'],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'gallery', 'Gallery A', 'gallery-a', 0)",
        [galleryA, tenantA],
      );

      // Seed one asset for each status
      for (const [id, status, pos] of [
        [pendingId, 'pending', 0],
        [processingId, 'processing', 1],
        [readyId, 'ready', 2],
        [failedId, 'failed', 3],
      ] as [string, string, number][]) {
        const key = `tenants/${tenantA}/nodes/${galleryA}/${id}/original.jpg`;
        await client.query(
          `INSERT INTO media_assets
             (id, tenant_id, node_id, object_key, url, mime_type, status, position, original_filename, byte_size)
           VALUES ($1, $2, $3, $4, $5, 'image/jpeg', $6, $7, 'test.jpg', 1024)`,
          [id, tenantA, galleryA, key, `https://fake-storage.example.com/${key}`, status, pos],
        );
      }

      // Seed a variant on the ready asset so we can check variants are included
      const thumbKey = `tenants/${tenantA}/nodes/${galleryA}/${readyId}/thumb.webp`;
      await client.query(
        `INSERT INTO media_variants
           (id, tenant_id, asset_id, variant, object_key, url, width, height, byte_size)
         VALUES ($1, $2, $3, 'thumb', $4, $5, 256, 171, 8192)`,
        [randomUUID(), tenantA, readyId, thumbKey, `https://fake-storage.example.com/${thumbKey}`],
      );
    });

    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantB, 'Mgr Tenant B']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantB, hostB],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userB, tenantB, 'mgrb@example.com', 'Mgr B'],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'gallery', 'Gallery B', 'gallery-b', 0)",
        [galleryB, tenantB],
      );
    });

    tokenA = await signAccessToken({ sub: userA, tenantId: tenantA, email: 'mgra@example.com' });
    tokenB = await signAccessToken({ sub: userB, tenantId: tenantB, email: 'mgrb@example.com' });
  });

  afterAll(async () => {
    await Promise.all([
      withTenant(migratorPool, tenantA, async (client) => {
        await client.query('DELETE FROM media_variants WHERE tenant_id=$1', [tenantA]);
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
      .get(`/media/manage?nodeId=${galleryA}`)
      .set('Host', hostA);

    expect(res.status).toBe(401);
  });

  it('returns 422 for a missing nodeId', async () => {
    const res = await request(app)
      .get('/media/manage')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(422);
  });

  it('returns 422 for a non-UUID nodeId', async () => {
    const res = await request(app)
      .get('/media/manage?nodeId=not-a-uuid')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(422);
  });

  it('returns all statuses (pending, processing, ready, failed)', async () => {
    const res = await request(app)
      .get(`/media/manage?nodeId=${galleryA}`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();

    const statuses = (res.body.data as { status: string }[]).map((a) => a.status).sort();
    expect(statuses).toEqual(['failed', 'pending', 'processing', 'ready']);
  });

  it('returns assets ordered by position', async () => {
    const res = await request(app)
      .get(`/media/manage?nodeId=${galleryA}`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`);

    const positions = (res.body.data as { position: number }[]).map((a) => a.position);
    expect(positions).toEqual([0, 1, 2, 3]);
  });

  it('includes variants nested on the ready asset', async () => {
    const res = await request(app)
      .get(`/media/manage?nodeId=${galleryA}`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`);

    const readyAsset = (res.body.data as { id: string; variants: unknown[] }[]).find(
      (a) => a.id === readyId,
    );
    expect(readyAsset).toBeDefined();
    expect(readyAsset!.variants).toHaveLength(1);

    const pendingAsset = (res.body.data as { id: string; variants: unknown[] }[]).find(
      (a) => a.id === pendingId,
    );
    expect(pendingAsset!.variants).toHaveLength(0);
  });

  it('returns empty array for a gallery with no assets', async () => {
    const emptyGallery = randomUUID();
    await withTenant(migratorPool, tenantA, (client) =>
      client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'gallery', 'Empty', 'empty', 99)",
        [emptyGallery, tenantA],
      ),
    );

    const res = await request(app)
      .get(`/media/manage?nodeId=${emptyGallery}`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);

    // Cleanup
    await withTenant(migratorPool, tenantA, (client) =>
      client.query('DELETE FROM nodes WHERE id=$1', [emptyGallery]),
    );
  });

  it('tenant isolation: tenantA nodeId queried by tenantB returns empty (RLS scoping)', async () => {
    const res = await request(app)
      .get(`/media/manage?nodeId=${galleryA}`)
      .set('Host', hostB)
      .set('Authorization', `Bearer ${tokenB}`);

    // galleryA belongs to tenantA; tenantB sees no assets for it
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
