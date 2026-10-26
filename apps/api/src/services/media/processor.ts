import sharp from 'sharp';
import type { Pool } from 'pg';
import { withTenant } from '../../db/with-tenant.js';
import type { StorageProvider } from '../storage/index.js';
import { VARIANT_CONTENT_TYPE, VARIANT_FORMAT, VARIANT_SPECS } from './variant-specs.js';

interface ProcessDeps {
  pool: Pool;
  storage: StorageProvider;
}

interface ProcessJob {
  tenantId: string;
  assetId: string;
}

export async function processAsset(deps: ProcessDeps, job: ProcessJob): Promise<void> {
  const { pool, storage } = deps;
  const { tenantId, assetId } = job;

  try {
    const { objectKey, nodeId, origWidth } = await withTenant(pool, tenantId, async (client) => {
      const row = await client.query(
        'SELECT object_key, node_id, width, status FROM media_assets WHERE id = $1',
        [assetId],
      );
      if (row.rowCount === 0 || row.rows[0].status !== 'processing') {
        throw Object.assign(new Error('Asset not found or not in processing state'), {
          code: 'SKIP',
        });
      }
      return {
        objectKey: row.rows[0].object_key as string,
        nodeId: row.rows[0].node_id as string,
        origWidth: (row.rows[0].width ?? 0) as number,
      };
    });

    void nodeId;

    // When the storage provider supports on-demand transforms, skip Sharp entirely.
    // Variants are generated synthetically at read time from the original object.
    if (storage.getTransformUrl) {
      await withTenant(pool, tenantId, async (client) => {
        await client.query(
          "UPDATE media_assets SET status = 'ready' WHERE id = $1",
          [assetId],
        );
      });
      return;
    }

    const originalBuffer = await storage.getObject(objectKey);

    // Determine actual dimensions from the buffer (width from DB may be 0 if not confirmed)
    const meta = await sharp(originalBuffer).metadata();
    const srcWidth = meta.width ?? origWidth;

    const specsToGenerate = VARIANT_SPECS.filter(
      (spec, index) => index === 0 || spec.width <= srcWidth, // always generate thumb
    );

    for (const spec of specsToGenerate) {
      const { data, info } = await sharp(originalBuffer)
        .rotate() // auto-orient via EXIF
        .resize({ width: spec.width, withoutEnlargement: true })
        [VARIANT_FORMAT]()
        .toBuffer({ resolveWithObject: true });

      const variantKey = `tenants/${tenantId}/nodes/${nodeId}/${assetId}/${spec.name}.${VARIANT_FORMAT}`;
      const variantUrl = storage.getPublicUrl(variantKey);

      await storage.putObject({
        key: variantKey,
        body: data,
        contentType: VARIANT_CONTENT_TYPE,
        cacheControl: 'public, max-age=31536000, immutable',
      });

      await withTenant(pool, tenantId, async (client) => {
        await client.query(
          `INSERT INTO media_variants (tenant_id, asset_id, variant, object_key, url, width, height, byte_size)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (asset_id, variant) DO UPDATE
             SET object_key = EXCLUDED.object_key,
                 url        = EXCLUDED.url,
                 width      = EXCLUDED.width,
                 height     = EXCLUDED.height,
                 byte_size  = EXCLUDED.byte_size`,
          [tenantId, assetId, spec.name, variantKey, variantUrl, info.width, info.height, info.size],
        );
      });
    }

    await withTenant(pool, tenantId, async (client) => {
      await client.query(
        "UPDATE media_assets SET status = 'ready' WHERE id = $1",
        [assetId],
      );
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && (err as NodeJS.ErrnoException).code === 'SKIP') {
      return;
    }
    // Best-effort failure mark — use a separate withTenant to avoid nested tx issues
    try {
      await withTenant(pool, tenantId, async (client) => {
        await client.query(
          "UPDATE media_assets SET status = 'failed' WHERE id = $1",
          [assetId],
        );
      });
    } catch {
      // swallow — the original error is more informative
    }
    console.error({
      msg: 'media-processor-error',
      tenantId,
      assetId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
