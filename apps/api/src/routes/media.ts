import {
  type ApiEnvelope,
  type MediaAsset,
  type MediaListResponse,
  type PresignResponse,
  confirmParamsSchema,
  confirmRequestSchema,
  deleteMediaResponseSchema,
  mediaAssetSchema,
  mediaListResponseSchema,
  mediaParamsSchema,
  moveMediaRequestSchema,
  presignRequestSchema,
  presignResponseSchema,
} from '@blueflutes/shared';
import { createHash, randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { validate } from '../lib/validate.js';
import type { Enqueue } from '../services/media/queue.js';
import { VARIANT_SPECS } from '../services/media/variant-specs.js';
import type { StorageProvider } from '../services/storage/index.js';
import {
  getCachedGallery,
  invalidateGallery,
  setCachedGallery,
} from '../services/cache/gallery-cache.js';

const mediaQuerySchema = z.object({
  nodeId: z.string().uuid(),
});

const mediaStatusParamsSchema = z.object({
  id: z.string().uuid(),
});

// Lazily-created Redis client for job status lookups (reuses REDIS_URL if set)
let _statusRedis: Redis | null = null;
function getStatusRedis(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (!_statusRedis) {
    _statusRedis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    });
  }
  return _statusRedis;
}

function buildSyntheticVariants(
  storage: StorageProvider,
  asset: {
    id: string;
    tenant_id: string;
    object_key: string;
    url?: string;
    width: number;
    height: number;
    byte_size: number;
    created_at: Date;
  },
) {
  const isGoogle = asset.object_key.startsWith('google:');
  return VARIANT_SPECS.map((spec) => {
    const hash = createHash('md5').update(`${asset.id}:${spec.name}`).digest('hex');
    const syntheticId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
    const scaledWidth = asset.width > 0 ? Math.min(spec.width, asset.width) : spec.width;
    const scaledHeight =
      asset.width > 0 && asset.height > 0
        ? Math.max(1, Math.round(scaledWidth * (asset.height / asset.width)))
        : scaledWidth;
    const estByteSize =
      asset.width > 0
        ? Math.max(1, Math.round(asset.byte_size * (scaledWidth / asset.width) ** 2))
        : 1;
    const variantUrl =
      isGoogle && asset.url
        ? `${asset.url}=w${spec.width}`
        : storage.getTransformUrl!(asset.object_key, spec.width, 80);
    return {
      id: syntheticId,
      tenantId: asset.tenant_id,
      assetId: asset.id,
      variant: spec.name,
      objectKey: asset.object_key,
      url: variantUrl,
      width: scaledWidth,
      height: scaledHeight,
      byteSize: estByteSize,
      createdAt: asset.created_at,
    };
  });
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export function createMediaPublicRouter(storage: StorageProvider): Router {
  const router = Router();
  const useTransform = typeof storage.getTransformUrl === 'function';

  router.get(
    '/media',
    validate({ query: mediaQuerySchema }),
    asyncHandler(async (req, res) => {
      if (!req.tenant || !req.withTenant) {
        throw AppError.notFound('Tenant not found for this host');
      }

      const { nodeId } = req.query as { nodeId: string };

      const cached = await getCachedGallery(req.tenant.id, nodeId);
      if (cached !== null) {
        const body: ApiEnvelope<MediaListResponse> = {
          data: cached as MediaListResponse,
          error: null,
        };
        res.json(body);
        return;
      }

      const assets = await req.withTenant(async (client) => {
        const assetRows = await client.query(
          `SELECT id, tenant_id, node_id, object_key, url, mime_type, status,
                  position, original_filename, byte_size, checksum, width, height, created_at
           FROM media_assets
           WHERE node_id = $1 AND status IN ('ready', 'published')
           ORDER BY position`,
          [nodeId],
        );

        if (assetRows.rowCount === 0) return [];

        const variantsByAsset = new Map<string, unknown[]>();
        if (!useTransform) {
          const assetIds = assetRows.rows.map((r) => r.id as string);
          const variantRows = await client.query(
            `SELECT id, tenant_id, asset_id, variant, object_key, url, width, height, byte_size, created_at
             FROM media_variants
             WHERE asset_id = ANY($1)
             ORDER BY asset_id, width`,
            [assetIds],
          );
          for (const v of variantRows.rows) {
            const list = variantsByAsset.get(v.asset_id as string) ?? [];
            list.push({
              id: v.id,
              tenantId: v.tenant_id,
              assetId: v.asset_id,
              variant: v.variant,
              objectKey: v.object_key,
              url: v.url,
              width: v.width,
              height: v.height,
              byteSize: v.byte_size,
              createdAt: v.created_at,
            });
            variantsByAsset.set(v.asset_id as string, list);
          }
        }

        return assetRows.rows.map((a) => ({
          id: a.id,
          tenantId: a.tenant_id,
          nodeId: a.node_id,
          objectKey: a.object_key,
          url: a.url,
          mimeType: a.mime_type,
          status: a.status === 'published' ? 'ready' : a.status,
          position: a.position,
          originalFilename: a.original_filename,
          byteSize: Math.max(1, (a.byte_size as number) || 1),
          checksum: a.checksum,
          width: a.width,
          height: a.height,
          createdAt: a.created_at,
          variants: useTransform
            ? buildSyntheticVariants(storage, a)
            : (variantsByAsset.get(a.id as string) ?? []),
        }));
      });

      const data: MediaListResponse = mediaListResponseSchema.parse(assets);
      void setCachedGallery(req.tenant.id, nodeId, data);
      const body: ApiEnvelope<MediaListResponse> = { data, error: null };
      res.json(body);
    }),
  );

  // ── GET /media/:id/status ─────────────────────────────────────────────────
  // Public polling endpoint — checks Redis job:status key first, falls back to DB.
  // Used by the upload widget to poll until the asset reaches 'ready' or 'failed'.

  router.get(
    '/media/:id/status',
    validate({ params: mediaStatusParamsSchema }),
    asyncHandler(async (req, res) => {
      if (!req.tenant || !req.withTenant) {
        throw AppError.notFound('Tenant not found for this host');
      }

      const { id } = req.params as { id: string };

      // Fast path: check Redis job status key
      const redis = getStatusRedis();
      if (redis) {
        try {
          const cached = await redis.get(`job:status:${id}`);
          if (cached === 'ready' || cached === 'failed') {
            const body: ApiEnvelope<{ id: string; assetId: string; status: string }> = {
              data: { id, assetId: id, status: cached },
              error: null,
            };
            res.json(body);
            return;
          }
        } catch {
          // Redis unavailable — fall through to DB
        }
      }

      // Slow path: DB lookup
      const row = await req.withTenant(async (client) => {
        const result = await client.query(
          'SELECT id, status FROM media_assets WHERE id = $1',
          [id],
        );
        return result.rows[0] as { id: string; status: string } | undefined;
      });

      if (!row) {
        throw AppError.notFound('Media asset not found');
      }

      const body: ApiEnvelope<{ id: string; assetId: string; status: string }> = {
        data: { id: row.id, assetId: row.id, status: row.status },
        error: null,
      };
      res.json(body);
    }),
  );

  return router;
}

export function createMediaRouter(storage: StorageProvider, enqueue: Enqueue): Router {
  const router = Router();
  const useTransform = typeof storage.getTransformUrl === 'function';

  router.post(
    '/media/presign',
    validate({ body: presignRequestSchema }),
    asyncHandler(async (req, res) => {
      if (!req.tenant || !req.withTenant) {
        throw AppError.notFound('Tenant not found for this host');
      }

      const { nodeId, filename, mimeType, byteSize } = req.body as {
        nodeId: string;
        filename: string;
        mimeType: string;
        byteSize: number;
      };

      if (byteSize > env.MEDIA_MAX_UPLOAD_BYTES) {
        throw AppError.validation(
          `byteSize exceeds maximum allowed size of ${env.MEDIA_MAX_UPLOAD_BYTES} bytes`,
        );
      }

      const assetId = randomUUID();
      const ext = MIME_TO_EXT[mimeType] ?? 'bin';
      const objectKey = `tenants/${req.tenant.id}/nodes/${nodeId}/${assetId}/original.${ext}`;
      const publicUrl = storage.getPublicUrl(objectKey);

      const result = await req.withTenant(async (client) => {
        const nodeRow = await client.query(
          'SELECT id, type FROM nodes WHERE id = $1',
          [nodeId],
        );

        if (nodeRow.rowCount === 0) {
          throw AppError.notFound('Node not found');
        }

        if (nodeRow.rows[0].type !== 'gallery') {
          throw AppError.validation('Media can only be uploaded to gallery nodes');
        }

        // Serialize concurrent uploads to prevent duplicate positions
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [nodeId]);

        const positionRow = await client.query(
          'SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM media_assets WHERE node_id = $1',
          [nodeId],
        );
        const position = positionRow.rows[0].next_position as number;

        await client.query(
          `INSERT INTO media_assets
             (id, tenant_id, node_id, object_key, url, mime_type, status, position, original_filename, byte_size)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)`,
          [assetId, req.tenant!.id, nodeId, objectKey, publicUrl, mimeType, position, filename, byteSize],
        );

        return { position };
      });

      void result;

      const presignResult = await storage.presignUpload({
        key: objectKey,
        contentType: mimeType,
        contentLength: byteSize,
        expiresIn: env.MEDIA_PRESIGN_TTL_SECONDS,
      });

      const data: PresignResponse = presignResponseSchema.parse({
        assetId,
        uploadUrl: presignResult.uploadUrl,
        objectKey: presignResult.objectKey,
        expiresAt: presignResult.expiresAt,
      });

      const body: ApiEnvelope<PresignResponse> = { data, error: null };
      res.json(body);
    }),
  );

  router.post(
    '/media/:id/confirm',
    validate({ params: confirmParamsSchema, body: confirmRequestSchema }),
    asyncHandler(async (req, res) => {
      if (!req.tenant || !req.withTenant) {
        throw AppError.notFound('Tenant not found for this host');
      }

      const { id } = req.params as { id: string };
      const { width, height, checksum } = req.body as {
        width: number;
        height: number;
        checksum?: string;
      };

      const asset = await req.withTenant(async (client) => {
        const row = await client.query(
          `UPDATE media_assets
           SET status = 'processing', width = $2, height = $3, checksum = $4
           WHERE id = $1 AND status = 'pending'
           RETURNING id, tenant_id, node_id, object_key, url, mime_type, status,
                     position, original_filename, byte_size, checksum, width, height, created_at`,
          [id, width, height, checksum ?? null],
        );

        if (row.rowCount === 0) {
          throw AppError.notFound('Media asset not found or already confirmed');
        }

        return row.rows[0];
      });

      await enqueue({ tenantId: req.tenant.id, assetId: id, nodeId: asset.node_id as string });
      void invalidateGallery(req.tenant.id, asset.node_id as string);

      const data: MediaAsset = mediaAssetSchema.parse({
        id: asset.id,
        tenantId: asset.tenant_id,
        nodeId: asset.node_id,
        objectKey: asset.object_key,
        url: asset.url,
        mimeType: asset.mime_type,
        status: asset.status,
        position: asset.position,
        originalFilename: asset.original_filename,
        byteSize: asset.byte_size,
        checksum: asset.checksum,
        width: asset.width,
        height: asset.height,
        createdAt: asset.created_at,
      });

      const body: ApiEnvelope<MediaAsset> = { data, error: null };
      res.status(202).json(body);
    }),
  );

  // ── GET /media/manage ─────────────────────────────────────────────────────
  // Authenticated admin list — returns ALL statuses (pending/processing/ready/failed)
  // so the dashboard can surface upload progress and failures. Mirrors the public
  // GET /media assembly but without the status='ready' filter.
  //
  // Authorization model (Phase 1): every authenticated tenant user is a full admin.
  // Per-user roles (editor/viewer) are scoped to Phase 3.

  router.get(
    '/media/manage',
    validate({ query: mediaQuerySchema }),
    asyncHandler(async (req, res) => {
      if (!req.tenant || !req.withTenant) {
        throw AppError.notFound('Tenant not found for this host');
      }

      const { nodeId } = req.query as { nodeId: string };

      const assets = await req.withTenant(async (client) => {
        const assetRows = await client.query(
          `SELECT id, tenant_id, node_id, object_key, url, mime_type, status,
                  position, original_filename, byte_size, checksum, width, height, created_at
           FROM media_assets
           WHERE node_id = $1
           ORDER BY position`,
          [nodeId],
        );

        if (assetRows.rowCount === 0) return [];

        const variantsByAsset = new Map<string, unknown[]>();
        if (!useTransform) {
          const assetIds = assetRows.rows.map((r) => r.id as string);
          const variantRows = await client.query(
            `SELECT id, tenant_id, asset_id, variant, object_key, url, width, height, byte_size, created_at
             FROM media_variants
             WHERE asset_id = ANY($1)
             ORDER BY asset_id, width`,
            [assetIds],
          );
          for (const v of variantRows.rows) {
            const list = variantsByAsset.get(v.asset_id as string) ?? [];
            list.push({
              id: v.id,
              tenantId: v.tenant_id,
              assetId: v.asset_id,
              variant: v.variant,
              objectKey: v.object_key,
              url: v.url,
              width: v.width,
              height: v.height,
              byteSize: v.byte_size,
              createdAt: v.created_at,
            });
            variantsByAsset.set(v.asset_id as string, list);
          }
        }

        return assetRows.rows.map((a) => ({
          id: a.id,
          tenantId: a.tenant_id,
          nodeId: a.node_id,
          objectKey: a.object_key,
          url: a.url,
          mimeType: a.mime_type,
          status: a.status === 'published' ? 'ready' : a.status,
          position: a.position,
          originalFilename: a.original_filename,
          byteSize: Math.max(1, (a.byte_size as number) || 1),
          checksum: a.checksum,
          width: a.width,
          height: a.height,
          createdAt: a.created_at,
          variants: useTransform
            ? buildSyntheticVariants(storage, a)
            : (variantsByAsset.get(a.id as string) ?? []),
        }));
      });

      const data: MediaListResponse = mediaListResponseSchema.parse(assets);
      const body: ApiEnvelope<MediaListResponse> = { data, error: null };
      res.json(body);
    }),
  );

  // ── DELETE /media/:id ─────────────────────────────────────────────────────
  // TODO(Phase 3): strip objectKey/checksum from all client-facing payloads once
  // the shared schema has separate public vs. internal asset types.

  router.delete(
    '/media/:id',
    validate({ params: mediaParamsSchema }),
    asyncHandler(async (req, res) => {
      if (!req.tenant || !req.withTenant) {
        throw AppError.notFound('Tenant not found for this host');
      }

      const { id } = req.params as { id: string };

      const { objectKeysToDelete, nodeId: deletedNodeId } = await req.withTenant(async (client) => {
        // Read node_id first so we can acquire the per-gallery advisory lock
        const assetRow = await client.query(
          'SELECT node_id, object_key FROM media_assets WHERE id = $1',
          [id],
        );
        if (assetRow.rowCount === 0) {
          throw AppError.notFound('Media asset not found');
        }

        const { node_id, object_key } = assetRow.rows[0] as {
          node_id: string;
          object_key: string;
        };

        // Serialize concurrent deletes/moves within this gallery node
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [node_id]);

        // Re-read position under the lock so concurrent sibling deletes don't
        // produce a stale value and leave a gap in the compaction UPDATE below
        const posRow = await client.query(
          'SELECT position FROM media_assets WHERE id = $1 FOR UPDATE',
          [id],
        );
        if (posRow.rowCount === 0) {
          throw AppError.notFound('Media asset not found');
        }
        const { position } = posRow.rows[0] as { position: number };

        // Collect variant keys before the cascade removes variant rows
        const variantRows = await client.query(
          'SELECT object_key FROM media_variants WHERE asset_id = $1',
          [id],
        );
        const variantKeys = variantRows.rows.map((r) => r.object_key as string);

        // Delete row — FK cascade removes media_variants
        await client.query('DELETE FROM media_assets WHERE id = $1', [id]);

        // Compact siblings: shift everything after deleted position down
        await client.query(
          'UPDATE media_assets SET position = position - 1 WHERE node_id = $1 AND position > $2',
          [node_id, position],
        );

        return { objectKeysToDelete: [object_key, ...variantKeys], nodeId: node_id };
      });

      void invalidateGallery(req.tenant!.id, deletedNodeId);

      // Best-effort storage cleanup after the DB transaction commits
      for (const key of objectKeysToDelete) {
        await storage.deleteObject(key).catch((err: unknown) => {
          req.log.warn(
            { key, err: err instanceof Error ? err.message : String(err) },
            'media storage cleanup failed — blob may be orphaned',
          );
        });
      }

      const data = deleteMediaResponseSchema.parse({ id });
      const body: ApiEnvelope<typeof data> = { data, error: null };
      res.json(body);
    }),
  );

  // ── PATCH /media/:id/move ─────────────────────────────────────────────────

  router.patch(
    '/media/:id/move',
    validate({ params: mediaParamsSchema, body: moveMediaRequestSchema }),
    asyncHandler(async (req, res) => {
      if (!req.tenant || !req.withTenant) {
        throw AppError.notFound('Tenant not found for this host');
      }

      const { id } = req.params as { id: string };
      const { position: requestedPosition } = req.body as { position: number };

      const asset = await req.withTenant(async (client) => {
        // Read node_id first so we can acquire the per-gallery advisory lock
        const assetRow = await client.query(
          'SELECT node_id FROM media_assets WHERE id = $1',
          [id],
        );
        if (assetRow.rowCount === 0) {
          throw AppError.notFound('Media asset not found');
        }

        const nodeId = assetRow.rows[0].node_id as string;

        // Serialize concurrent moves/deletes within this gallery node
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [nodeId]);

        // Re-read position under the lock (FOR UPDATE) so a concurrent sibling
        // delete/move committed between the first SELECT and the lock cannot
        // produce a stale currentPosition and leave duplicate/gap positions
        const lockedRow = await client.query(
          `SELECT id, tenant_id, node_id, object_key, url, mime_type, status,
                  position, original_filename, byte_size, checksum, width, height, created_at
           FROM media_assets WHERE id = $1 FOR UPDATE`,
          [id],
        );
        if (lockedRow.rowCount === 0) {
          throw AppError.notFound('Media asset not found');
        }

        const currentPosition = lockedRow.rows[0].position as number;

        // Count siblings (excluding self) to clamp position
        const countRow = await client.query(
          'SELECT COUNT(*)::int AS cnt FROM media_assets WHERE node_id = $1 AND id != $2',
          [nodeId, id],
        );
        const siblingCount = countRow.rows[0].cnt as number;
        const newPosition = Math.min(requestedPosition, siblingCount);

        if (newPosition === currentPosition) {
          return lockedRow.rows[0];
        }

        if (newPosition > currentPosition) {
          await client.query(
            `UPDATE media_assets SET position = position - 1
             WHERE node_id = $1 AND id != $2
               AND position > $3 AND position <= $4`,
            [nodeId, id, currentPosition, newPosition],
          );
        } else {
          await client.query(
            `UPDATE media_assets SET position = position + 1
             WHERE node_id = $1 AND id != $2
               AND position >= $3 AND position < $4`,
            [nodeId, id, newPosition, currentPosition],
          );
        }

        const updated = await client.query(
          `UPDATE media_assets SET position = $1 WHERE id = $2
           RETURNING id, tenant_id, node_id, object_key, url, mime_type, status,
                     position, original_filename, byte_size, checksum, width, height, created_at`,
          [newPosition, id],
        );
        return updated.rows[0];
      });

      void invalidateGallery(req.tenant!.id, asset.node_id as string);

      const data: MediaAsset = mediaAssetSchema.parse({
        id: asset.id,
        tenantId: asset.tenant_id,
        nodeId: asset.node_id,
        objectKey: asset.object_key,
        url: asset.url,
        mimeType: asset.mime_type,
        status: asset.status,
        position: asset.position,
        originalFilename: asset.original_filename,
        byteSize: asset.byte_size,
        checksum: asset.checksum,
        width: asset.width,
        height: asset.height,
        createdAt: asset.created_at,
      });

      const body: ApiEnvelope<MediaAsset> = { data, error: null };
      res.json(body);
    }),
  );

  // ── GET /media/:id/status ─────────────────────────────────────────────────
  // Lightweight endpoint for the client to poll processing state.
  // Returns id, status, and any variants already generated.

  router.get(
    '/media/:id/status',
    validate({ params: mediaParamsSchema }),
    asyncHandler(async (req, res) => {
      if (!req.tenant || !req.withTenant) {
        throw AppError.notFound('Tenant not found for this host');
      }

      const { id } = req.params as { id: string };

      const result = await req.withTenant(async (client) => {
        const assetRow = await client.query(
          `SELECT id, status FROM media_assets WHERE id = $1`,
          [id],
        );

        if (assetRow.rowCount === 0) {
          throw AppError.notFound('Media asset not found');
        }

        const asset = assetRow.rows[0] as { id: string; status: string };

        const variantRows = await client.query(
          `SELECT id, tenant_id, asset_id, variant, object_key, url, width, height, byte_size, created_at
           FROM media_variants WHERE asset_id = $1 ORDER BY width`,
          [id],
        );

        return {
          id: asset.id,
          status: asset.status,
          variants: variantRows.rows.map((v) => ({
            id: v.id,
            tenantId: v.tenant_id,
            assetId: v.asset_id,
            variant: v.variant,
            objectKey: v.object_key,
            url: v.url,
            width: v.width,
            height: v.height,
            byteSize: v.byte_size,
            createdAt: v.created_at,
          })),
        };
      });

      const body: ApiEnvelope<typeof result> = { data: result, error: null };
      res.json(body);
    }),
  );

  return router;
}
