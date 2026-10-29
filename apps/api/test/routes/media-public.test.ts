import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { withTenant } from '../../src/db/with-tenant.js';
import { FakeStorageProvider } from '../../src/services/storage/index.js';
import type { Enqueue } from '../../src/services/media/queue.js';
import { createTestMigratorPool, createTestPool } from '../db-test-utils.js';

describe('GET /media?nodeId', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const storage = new FakeStorageProvider();
  const enqueue: Enqueue = vi.fn();
  const app = createApp(pool, storage, enqueue);

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const userA = randomUUID();
  const hostA = `media-pub-a-${randomUUID()}.example.com`;
  const hostB = `media-pub-b-${randomUUID()}.example.com`;
  const galleryNodeA = randomUUID();
  const galleryNodeB = randomUUID();

  let assetReadyId: string;
  let assetProcessingId: string;

  beforeAll(async () => {
    assetReadyId = randomUUID();
    assetProcessingId = randomUUID();

    await withTenant(migratorPool, tenantA, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantA, 'PubA']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantA, hostA],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userA, tenantA, 'puba@example.com', 'Pub A'],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'gallery', 'Gallery', 'gallery', 0)",
        [galleryNodeA, tenantA],
      );

      const keyReady = `tenants/${tenantA}/nodes/${galleryNodeA}/${assetReadyId}/original.jpg`;
      const keyProcessing = `tenants/${tenantA}/nodes/${galleryNodeA}/${assetProcessingId}/original.jpg`;

      await client.query(
        `INSERT INTO media_assets
           (id, tenant_id, node_id, object_key, url, mime_type, status, position, original_filename, byte_size, width, height)
         VALUES ($1, $2, $3, $4, $5, 'image/jpeg', 'ready', 0, 'a.jpg', 1024, 800, 600)`,
        [assetReadyId, tenantA, galleryNodeA, keyReady, `https://fake/${keyReady}`],
      );
      await client.query(
        `INSERT INTO media_assets
           (id, tenant_id, node_id, object_key, url, mime_type, status, position, original_filename, byte_size, width, height)
         VALUES ($1, $2, $3, $4, $5, 'image/jpeg', 'processing', 1, 'b.jpg', 1024, 800, 600)`,
        [assetProcessingId, tenantA, galleryNodeA, keyProcessing, `https://fake/${keyProcessing}`],
      );

      // Add a variant for the ready asset
      await client.query(
        `INSERT INTO media_variants
           (tenant_id, asset_id, variant, object_key, url, width, height, byte_size)
         VALUES ($1, $2, 'thumb', $3, $4, 256, 192, 512)`,
        [
          tenantA, assetReadyId,
          `tenants/${tenantA}/nodes/${galleryNodeA}/${assetReadyId}/thumb.webp`,
          `https://fake/tenants/${tenantA}/nodes/${galleryNodeA}/${assetReadyId}/thumb.webp`,
        ],
      );
    });

    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantB, 'PubB']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantB, hostB],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'gallery', 'Gallery B', 'gallery-b', 0)",
        [galleryNodeB, tenantB],
      );
    });
  });

  afterAll(async () => {
    await migratorPool.query(
      'DELETE FROM media_assets WHERE tenant_id IN ($1, $2)',
      [tenantA, tenantB],
    );
    await migratorPool.query('DELETE FROM nodes WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM users WHERE id = $1', [userA]);
    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantA, tenantB]);
    await pool.end();
    await migratorPool.end();
  });

  beforeEach(() => {
    storage.reset();
    vi.clearAllMocks();
  });

  it('returns only ready assets with their variants — no auth required', async () => {
    const res = await request(app)
      .get(`/media?nodeId=${galleryNodeA}`)
      .set('Host', hostA);

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    const assets = res.body.data;
    expect(Array.isArray(assets)).toBe(true);
    expect(assets).toHaveLength(1);
    expect(assets[0].id).toBe(assetReadyId);
    expect(assets[0].status).toBe('ready');
    expect(Array.isArray(assets[0].variants)).toBe(true);
    expect(assets[0].variants).toHaveLength(1);
    expect(assets[0].variants[0].variant).toBe('thumb');
  });

  it('excludes processing and failed assets', async () => {
    const res = await request(app)
      .get(`/media?nodeId=${galleryNodeA}`)
      .set('Host', hostA);

    const assets = res.body.data as Array<{ status: string }>;
    expect(assets.every((a) => a.status === 'ready')).toBe(true);
  });

  it('returns 200 without a Bearer token (public route)', async () => {
    const res = await request(app)
      .get(`/media?nodeId=${galleryNodeA}`)
      .set('Host', hostA);

    expect(res.status).toBe(200);
  });

  it('returns 422 for a missing nodeId', async () => {
    const res = await request(app)
      .get('/media')
      .set('Host', hostA);

    expect(res.status).toBe(422);
  });

  it('returns 422 for an invalid (non-uuid) nodeId', async () => {
    const res = await request(app)
      .get('/media?nodeId=not-a-uuid')
      .set('Host', hostA);

    expect(res.status).toBe(422);
  });

  it('tenant B cannot read tenant A media assets (RLS)', async () => {
    // galleryNodeA belongs to tenantA; querying it from hostB returns empty
    const res = await request(app)
      .get(`/media?nodeId=${galleryNodeA}`)
      .set('Host', hostB);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('returns empty array for a nodeId with no ready assets', async () => {
    const res = await request(app)
      .get(`/media?nodeId=${randomUUID()}`)
      .set('Host', hostA);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});
