import {
  type ApiEnvelope,
  type MediaAsset,
  type PresignResponse,
  confirmParamsSchema,
  confirmRequestSchema,
  mediaAssetSchema,
  presignRequestSchema,
  presignResponseSchema,
} from '@portfoliohub/shared';
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { validate } from '../lib/validate.js';
import type { StorageProvider } from '../services/storage/index.js';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export function createMediaRouter(storage: StorageProvider): Router {
  const router = Router();

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
           SET status = 'ready', width = $2, height = $3, checksum = $4
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

  return router;
}
