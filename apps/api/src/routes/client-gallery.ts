import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';

export const clientGalleryRouter = Router();

clientGalleryRouter.get('/client/:shareToken', asyncHandler(async (req, res) => {
  if (!req.withTenant) throw AppError.notFound('Tenant not found');
  const { shareToken } = req.params;

  const nodeRow = await req.withTenant((client) =>
    client.query(`SELECT id, name, tenant_id FROM nodes WHERE slug = $1 AND type = 'gallery'`, [shareToken]),
  );

  if (!nodeRow.rows[0]) throw AppError.notFound('Client gallery not found');
  const node = nodeRow.rows[0] as { id: string; name: string; tenant_id: string };

  const mediaRows = await req.withTenant((client) =>
    client.query(`SELECT id FROM media_assets WHERE node_id = $1 AND status = 'published' ORDER BY position`, [node.id]),
  );

  res.json({
    data: {
      id: node.id,
      photographerId: node.tenant_id,
      title: node.name,
      description: '',
      coverPhotoId: null,
      visibility: 'private',
      layout: 'grid',
      printsForSale: false,
      photoOrder: (mediaRows.rows as { id: string }[]).map((r) => r.id),
      counts: { frames: mediaRows.rows.length, views: 0 },
      clientName: 'Client',
      shareToken,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      allowDownload: true,
      favoritePhotoIds: [],
    },
    error: null,
  });
}));

const favoritesSchema = z.object({ photoIds: z.array(z.string()) });
clientGalleryRouter.post('/client/:shareToken/favorites', asyncHandler(async (req, res) => {
  favoritesSchema.parse(req.body);
  res.json({ data: { ok: true }, error: null });
}));
