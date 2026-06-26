import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { withTenant } from '../../src/db/with-tenant.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { FakeStorageProvider } from '../../src/services/storage/index.js';
import type { Enqueue } from '../../src/services/media/queue.js';
import { createTestMigratorPool, createTestPool } from '../db-test-utils.js';

// Helper: query media_assets within a tenant RLS context (required by FORCE RLS)
async function queryAsset(
  migratorPool: ReturnType<typeof createTestMigratorPool>,
  tenantId: string,
  assetId: string,
) {
  return withTenant(migratorPool, tenantId, (client) =>
    client.query(
      'SELECT status, object_key, mime_type, width, height, checksum FROM media_assets WHERE id = $1',
      [assetId],
    ),
  );
}

describe('POST /media/presign and POST /media/:id/confirm', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const storage = new FakeStorageProvider();
  const enqueue: Enqueue = vi.fn();
  const app = createApp(pool, storage, enqueue);

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();
  const hostA = `media-a-${randomUUID()}.example.com`;
  const hostB = `media-b-${randomUUID()}.example.com`;
  const galleryNodeA = randomUUID();
  const folderNodeA = randomUUID();
  const galleryNodeB = randomUUID();

  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    await withTenant(migratorPool, tenantA, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantA, 'Tenant A']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantA, hostA],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userA, tenantA, 'usera@example.com', 'User A'],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'gallery', 'Gallery A', 'gallery-a', 0)",
        [galleryNodeA, tenantA],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'folder', 'Folder A', 'folder-a', 1)",
        [folderNodeA, tenantA],
      );
    });

    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantB, 'Tenant B']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantB, hostB],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userB, tenantB, 'userb@example.com', 'User B'],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'gallery', 'Gallery B', 'gallery-b', 0)",
        [galleryNodeB, tenantB],
      );
    });

    tokenA = await signAccessToken({ sub: userA, tenantId: tenantA, email: 'usera@example.com' });
    tokenB = await signAccessToken({ sub: userB, tenantId: tenantB, email: 'userb@example.com' });
  });

  afterAll(async () => {
    await migratorPool.query('DELETE FROM media_assets WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM nodes WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM users WHERE id IN ($1, $2)', [userA, userB]);
    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id IN ($1, $2)', [tenantA, tenantB]);
    await migratorPool.query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantA, tenantB]);
    await pool.end();
    await migratorPool.end();
  });

  beforeEach(() => {
    storage.reset();
    vi.clearAllMocks();
  });

  // --- Presign ---

  it('presign: returns 401 without a Bearer token', async () => {
    const res = await request(app)
      .post('/media/presign')
      .set('Host', hostA)
      .send({ nodeId: galleryNodeA, filename: 'photo.jpg', mimeType: 'image/jpeg', byteSize: 1024 });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('presign: returns 422 for invalid mime type', async () => {
    const res = await request(app)
      .post('/media/presign')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ nodeId: galleryNodeA, filename: 'photo.cr2', mimeType: 'image/x-canon-cr2', byteSize: 1024 });

    expect(res.status).toBe(422);
  });

  it('presign: returns 422 for oversized byteSize', async () => {
    const overLimit = 50 * 1024 * 1024 + 1;
    const res = await request(app)
      .post('/media/presign')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ nodeId: galleryNodeA, filename: 'big.jpg', mimeType: 'image/jpeg', byteSize: overLimit });

    expect(res.status).toBe(422);
  });

  it('presign: returns 404 when nodeId belongs to another tenant', async () => {
    const res = await request(app)
      .post('/media/presign')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ nodeId: galleryNodeB, filename: 'photo.jpg', mimeType: 'image/jpeg', byteSize: 1024 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');

    // No pending asset row must have been inserted (query as tenantB to confirm it's truly empty)
    const rows = await withTenant(migratorPool, tenantB, (client) =>
      client.query('SELECT id FROM media_assets WHERE node_id = $1', [galleryNodeB]),
    );
    expect(rows.rowCount).toBe(0);
  });

  it('presign: returns 422 when targeting a folder node (not a gallery)', async () => {
    const res = await request(app)
      .post('/media/presign')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ nodeId: folderNodeA, filename: 'photo.jpg', mimeType: 'image/jpeg', byteSize: 1024 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('presign: creates a pending asset and returns an upload URL with a tenant-prefixed key', async () => {
    const res = await request(app)
      .post('/media/presign')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ nodeId: galleryNodeA, filename: 'photo.jpg', mimeType: 'image/jpeg', byteSize: 2048 });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    const { assetId, uploadUrl, objectKey, expiresAt } = res.body.data;

    expect(assetId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(uploadUrl).toBeTruthy();
    expect(objectKey).toContain(`tenants/${tenantA}/`);
    expect(objectKey).not.toContain(tenantB);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());

    // Key must be server-derived, not client-supplied
    expect(objectKey).toContain(assetId);

    // Verify pending row was inserted (must go through withTenant due to FORCE RLS)
    const rows = await queryAsset(migratorPool, tenantA, assetId);
    expect(rows.rowCount).toBe(1);
    expect(rows.rows[0].status).toBe('pending');
    expect(rows.rows[0].mime_type).toBe('image/jpeg');
    expect(rows.rows[0].object_key).toBe(objectKey);
  });

  // --- Confirm ---

  it('confirm: flips a pending asset to processing, persists dimensions, and enqueues processing', async () => {
    // First presign to get an assetId
    const presignRes = await request(app)
      .post('/media/presign')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ nodeId: galleryNodeA, filename: 'confirm-me.jpg', mimeType: 'image/jpeg', byteSize: 512 });

    expect(presignRes.status).toBe(200);
    const { assetId } = presignRes.body.data;

    const confirmRes = await request(app)
      .post(`/media/${assetId}/confirm`)
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ width: 1920, height: 1080, checksum: 'abc123' });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.error).toBeNull();
    expect(confirmRes.body.data.status).toBe('processing');
    expect(confirmRes.body.data.width).toBe(1920);
    expect(confirmRes.body.data.height).toBe(1080);

    // Verify in DB (must go through withTenant due to FORCE RLS)
    const rows = await queryAsset(migratorPool, tenantA, assetId);
    expect(rows.rows[0].status).toBe('processing');
    expect(rows.rows[0].width).toBe(1920);
    expect(rows.rows[0].height).toBe(1080);
    expect(rows.rows[0].checksum).toBe('abc123');

    // Enqueue must have been called exactly once with the correct job
    expect(enqueue).toHaveBeenCalledOnce();
    expect(enqueue).toHaveBeenCalledWith({ tenantId: tenantA, assetId });
  });

  it('confirm: returns 404 when asset belongs to another tenant, does not enqueue', async () => {
    // Presign an asset under tenantA
    const presignRes = await request(app)
      .post('/media/presign')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ nodeId: galleryNodeA, filename: 'cross-tenant.jpg', mimeType: 'image/jpeg', byteSize: 256 });

    const { assetId } = presignRes.body.data;

    // Attempt to confirm it as tenantB
    const confirmRes = await request(app)
      .post(`/media/${assetId}/confirm`)
      .set('Host', hostB)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ width: 800, height: 600 });

    expect(confirmRes.status).toBe(404);
    expect(confirmRes.body.error.code).toBe('NOT_FOUND');
    expect(enqueue).not.toHaveBeenCalled();

    // Asset must remain pending (query as tenantA since the asset belongs to them)
    const rows = await queryAsset(migratorPool, tenantA, assetId);
    expect(rows.rows[0].status).toBe('pending');
  });

  it('confirm: returns 401 without a Bearer token', async () => {
    const res = await request(app)
      .post(`/media/${randomUUID()}/confirm`)
      .set('Host', hostA)
      .send({ width: 100, height: 100 });

    expect(res.status).toBe(401);
  });

  it('confirm: returns 422 for invalid uuid param', async () => {
    const res = await request(app)
      .post('/media/not-a-uuid/confirm')
      .set('Host', hostA)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ width: 100, height: 100 });

    expect(res.status).toBe(422);
  });
});
