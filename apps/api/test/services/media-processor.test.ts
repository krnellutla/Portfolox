import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { withTenant } from '../../src/db/with-tenant.js';
import { processAsset } from '../../src/services/media/processor.js';
import { FakeStorageProvider } from '../../src/services/storage/index.js';
import { createTestMigratorPool, createTestPool } from '../db-test-utils.js';

// 2400x1600 — wide enough that all 4 variant widths (256/640/1280/2048) are downscales
const FIXTURE = readFileSync(
  join(import.meta.dirname, 'fixtures/sample-2400x1600.jpg'),
);

describe('processAsset', () => {
  const pool = createTestPool();
  const migratorPool = createTestMigratorPool();
  const storage = new FakeStorageProvider();

  const tenantId = randomUUID();
  const tenantB = randomUUID();
  const userId = randomUUID();
  const nodeId = randomUUID();
  let assetId: string;
  let objectKey: string;

  beforeAll(async () => {
    await withTenant(migratorPool, tenantId, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantId, 'Proc Tenant']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantId, `proc-${tenantId}.example.com`],
      );
      await client.query(
        'INSERT INTO users (id, tenant_id, email, display_name) VALUES ($1, $2, $3, $4)',
        [userId, tenantId, 'proc@example.com', 'Proc User'],
      );
      await client.query(
        "INSERT INTO nodes (id, tenant_id, type, name, slug, position) VALUES ($1, $2, 'gallery', 'Proc Gallery', 'proc-gallery', 0)",
        [nodeId, tenantId],
      );
    });

    await withTenant(migratorPool, tenantB, async (client) => {
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantB, 'Proc Tenant B']);
      await client.query(
        'INSERT INTO tenant_domains (tenant_id, host, is_primary) VALUES ($1, $2, true)',
        [tenantB, `proc-b-${tenantB}.example.com`],
      );
    });
  });

  afterAll(async () => {
    await migratorPool.query('DELETE FROM media_assets WHERE tenant_id = $1', [tenantId]);
    await migratorPool.query('DELETE FROM nodes WHERE id = $1', [nodeId]);
    await migratorPool.query('DELETE FROM users WHERE id = $1', [userId]);
    await migratorPool.query('DELETE FROM tenant_domains WHERE tenant_id IN ($1, $2)', [tenantId, tenantB]);
    await migratorPool.query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantId, tenantB]);
    await pool.end();
    await migratorPool.end();
  });

  beforeEach(async () => {
    storage.reset();
    assetId = randomUUID();
    objectKey = `tenants/${tenantId}/nodes/${nodeId}/${assetId}/original.jpg`;

    storage.seed(objectKey, FIXTURE, 'image/jpeg');

    await withTenant(migratorPool, tenantId, async (client) => {
      await client.query(
        `INSERT INTO media_assets
           (id, tenant_id, node_id, object_key, url, mime_type, status, position, original_filename, byte_size, width, height)
         VALUES ($1, $2, $3, $4, $5, 'image/jpeg', 'processing', 0, 'sample.jpg', $6, 2400, 1600)`,
        [
          assetId, tenantId, nodeId, objectKey,
          `https://fake-storage.example.com/${objectKey}`,
          FIXTURE.byteLength,
        ],
      );
    });
  });

  it('generates all 4 variant sizes and flips status to ready', async () => {
    await processAsset({ pool, storage }, { tenantId, assetId });

    const rows = await withTenant(migratorPool, tenantId, (client) =>
      client.query(
        'SELECT variant, object_key, url, width, height, byte_size FROM media_variants WHERE asset_id = $1 ORDER BY width',
        [assetId],
      ),
    );

    expect(rows.rowCount).toBe(4);
    const variants = rows.rows.map((r) => r.variant);
    expect(variants).toContain('thumb');
    expect(variants).toContain('small');
    expect(variants).toContain('medium');
    expect(variants).toContain('large');

    for (const row of rows.rows) {
      expect(row.object_key).toContain(`tenants/${tenantId}/`);
      expect(row.object_key).toContain(assetId);
      expect(row.url).toContain('fake-storage.example.com');
      expect(row.byte_size).toBeGreaterThan(0);
    }

    const assetRow = await withTenant(migratorPool, tenantId, (client) =>
      client.query('SELECT status FROM media_assets WHERE id = $1', [assetId]),
    );
    expect(assetRow.rows[0].status).toBe('ready');
  });

  it('never upscales — a 256px wide original yields only thumb', async () => {
    // Re-seed with a tiny 200x150 image
    const { default: sharp } = await import('sharp');
    const tinyBuf = await sharp({
      create: { width: 200, height: 150, channels: 3, background: { r: 50, g: 50, b: 50 } },
    })
      .jpeg()
      .toBuffer();

    const tinyAssetId = randomUUID();
    const tinyKey = `tenants/${tenantId}/nodes/${nodeId}/${tinyAssetId}/original.jpg`;
    storage.seed(tinyKey, tinyBuf, 'image/jpeg');

    await withTenant(migratorPool, tenantId, async (client) => {
      await client.query(
        `INSERT INTO media_assets
           (id, tenant_id, node_id, object_key, url, mime_type, status, position, original_filename, byte_size, width, height)
         VALUES ($1, $2, $3, $4, $5, 'image/jpeg', 'processing', 1, 'tiny.jpg', $6, 200, 150)`,
        [tinyAssetId, tenantId, nodeId, tinyKey, `https://fake-storage.example.com/${tinyKey}`, tinyBuf.byteLength],
      );
    });

    await processAsset({ pool, storage }, { tenantId, assetId: tinyAssetId });

    const rows = await withTenant(migratorPool, tenantId, (client) =>
      client.query('SELECT variant FROM media_variants WHERE asset_id = $1', [tinyAssetId]),
    );
    expect(rows.rowCount).toBe(1);
    expect(rows.rows[0].variant).toBe('thumb');
  });

  it('uses tenant-scoped object keys for all variants', async () => {
    await processAsset({ pool, storage }, { tenantId, assetId });

    const rows = await withTenant(migratorPool, tenantId, (client) =>
      client.query('SELECT object_key FROM media_variants WHERE asset_id = $1', [assetId]),
    );
    for (const row of rows.rows) {
      expect(row.object_key).toMatch(new RegExp(`^tenants/${tenantId}/`));
    }
  });

  it('is idempotent — re-running upserts rows, no duplicates', async () => {
    await processAsset({ pool, storage }, { tenantId, assetId });
    // Reset storage and re-seed so the processor can download the original again
    storage.reset();
    storage.seed(objectKey, FIXTURE, 'image/jpeg');
    // Reset to processing so it can run again
    await migratorPool.query(
      "UPDATE media_assets SET status='processing' WHERE id=$1",
      [assetId],
    );
    await migratorPool.query('DELETE FROM media_variants WHERE asset_id=$1', [assetId]);

    await processAsset({ pool, storage }, { tenantId, assetId });

    const rows = await withTenant(migratorPool, tenantId, (client) =>
      client.query('SELECT variant FROM media_variants WHERE asset_id = $1', [assetId]),
    );
    expect(rows.rowCount).toBe(4);
  });

  it('sets status to failed when the original is missing from storage', async () => {
    storage.reset(); // original is gone

    await processAsset({ pool, storage }, { tenantId, assetId });

    const assetRow = await withTenant(migratorPool, tenantId, (client) =>
      client.query('SELECT status FROM media_assets WHERE id = $1', [assetId]),
    );
    expect(assetRow.rows[0].status).toBe('failed');

    const variantRows = await withTenant(migratorPool, tenantId, (client) =>
      client.query('SELECT id FROM media_variants WHERE asset_id = $1', [assetId]),
    );
    expect(variantRows.rowCount).toBe(0);
  });

  it('tenant B cannot read tenant A variant rows (RLS isolation)', async () => {
    await processAsset({ pool, storage }, { tenantId, assetId });

    const rows = await withTenant(migratorPool, tenantB, (client) =>
      client.query('SELECT id FROM media_variants WHERE asset_id = $1', [assetId]),
    );
    expect(rows.rowCount).toBe(0);
  });
});
