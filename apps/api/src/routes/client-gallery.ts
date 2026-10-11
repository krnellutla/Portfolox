import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';

export const clientGalleryRouter: Router = Router();

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
      viewerRole: 'client',
      selectLimit: null,
      selectsSubmittedAt: null,
      expired: false,
    },
    error: null,
  });
}));

const favoritesSchema = z.object({ photoIds: z.array(z.string()) });

// Legacy POST (kept for backward compat)
clientGalleryRouter.post('/client/:shareToken/favorites', asyncHandler(async (req, res) => {
  favoritesSchema.parse(req.body);
  res.json({ data: { ok: true }, error: null });
}));

// PUT /client/:shareToken/favorites — replaces full favorites list
clientGalleryRouter.put('/client/:shareToken/favorites', asyncHandler(async (req, res) => {
  const { photoIds } = favoritesSchema.parse(req.body);
  // In production this would persist to DB; stub returns the same list
  res.json({ data: { favoritePhotoIds: photoIds }, error: null });
}));

// POST /client/:shareToken/submit — submit selects
clientGalleryRouter.post('/client/:shareToken/submit', asyncHandler(async (req, res) => {
  // In production: check selectLimit, persist to DB
  res.json({ data: { selectsSubmittedAt: new Date().toISOString() }, error: null });
}));

// POST /client/:shareToken/download — download zip
const downloadSchema = z.object({ photoIds: z.array(z.string()).optional() });
clientGalleryRouter.post('/client/:shareToken/download', asyncHandler(async (req, res) => {
  downloadSchema.parse(req.body);
  res.json({ data: { url: 'https://download.example.com/stub.zip' }, error: null });
}));
