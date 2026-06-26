import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';

export const photosRouter = Router();

function assetToPhoto(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    code: `PFX-${(r.id as string).slice(0, 6).toUpperCase()}`,
    title: (r.original_filename as string).replace(/\.[^.]+$/, ''),
    url: r.url as string,
    thumbUrl: r.url as string,
    width: (r.width as number) ?? 1200,
    height: (r.height as number) ?? 800,
    exif: { aperture: 'f/2.8', shutter: '1/250', iso: '400', focalLength: '50mm' },
    galleryId: r.node_id as string,
    photographerId: r.tenant_id as string,
    status: 'published',
    counts: { likes: 0, comments: 0, views: 0 },
    likedByMe: false,
    favoritedByMe: false,
  };
}

photosRouter.get(
  '/photos/:id',
  asyncHandler(async (req, res) => {
    if (!req.withTenant) throw AppError.notFound('Tenant not found');
    const { id } = req.params;

    const rows = await req.withTenant((client) =>
      client.query(
        `SELECT id, node_id, url, original_filename, width, height, tenant_id
         FROM media_assets WHERE id = $1`,
        [id],
      ),
    );
    if (!rows.rows[0]) throw AppError.notFound('Photo not found');

    res.json({ data: assetToPhoto(rows.rows[0] as Record<string, unknown>), error: null });
  }),
);

photosRouter.post('/photos/:id/like', asyncHandler(async (_req, res) => {
  res.json({ data: { liked: true, count: 1 }, error: null });
}));

photosRouter.delete('/photos/:id/like', asyncHandler(async (_req, res) => {
  res.json({ data: { liked: false, count: 0 }, error: null });
}));

photosRouter.post('/photos/:id/favorite', asyncHandler(async (_req, res) => {
  res.json({ data: { favorited: true }, error: null });
}));

photosRouter.delete('/photos/:id/favorite', asyncHandler(async (_req, res) => {
  res.json({ data: { favorited: false }, error: null });
}));

photosRouter.get('/photos/:id/comments', asyncHandler(async (_req, res) => {
  res.json({ data: [], error: null });
}));

const postCommentSchema = z.object({ body: z.string().min(1) });
photosRouter.post(
  '/photos/:id/comments',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { body } = postCommentSchema.parse(req.body);
    res.status(201).json({
      data: {
        id: randomUUID(),
        parentType: 'photo',
        parentId: id,
        author: { id: req.user?.id ?? 'anon', displayName: 'You', avatarUrl: null },
        body,
        createdAt: new Date().toISOString(),
        likes: 0,
      },
      error: null,
    });
  }),
);
