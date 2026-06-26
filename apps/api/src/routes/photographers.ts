import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';

export const photographersRouter: Router = Router();

const cdn = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

photographersRouter.get(
  '/photographers/:handle',
  asyncHandler(async (req, res) => {
    const handle = String(req.params['handle'] ?? '');
    // Resolve against current tenant's nodes; return host-tenant profile
    res.json({
      data: {
        id: handle,
        handle,
        displayName: handle.charAt(0).toUpperCase() + handle.slice(1),
        avatarUrl: cdn('1531746020798-e6953c6e8e04', 120),
        coverUrl: cdn('1506905925346-21bda4d32df4', 1200),
        location: 'Unknown',
        specialty: 'Landscape',
        bio: 'Photographer on Portfolix.',
        plan: 'studio',
        stats: { frames: 0, followers: 0, printsSold: 0 },
        isFollowedByMe: false,
      },
      error: null,
    });
  }),
);

photographersRouter.get(
  '/photographers/:handle/galleries',
  asyncHandler(async (req, res) => {
    if (!req.withTenant) throw AppError.notFound('Tenant not found');

    const rows = await req.withTenant((client) =>
      client.query(
        `SELECT id, tenant_id, name, slug, created_at
         FROM nodes WHERE type = 'gallery'
         ORDER BY position`,
      ),
    );

    res.json({
      data: rows.rows.map((r) => ({
        id: r.id as string,
        photographerId: r.tenant_id as string,
        title: r.name as string,
        description: '',
        coverPhotoId: null,
        visibility: 'public',
        layout: 'grid',
        printsForSale: false,
        photoOrder: [],
        counts: { frames: 0, views: 0 },
      })),
      error: null,
    });
  }),
);

photographersRouter.get(
  '/photographers/:handle/photos',
  asyncHandler(async (req, res) => {
    if (!req.withTenant) throw AppError.notFound('Tenant not found');

    const gallery = typeof req.query.gallery === 'string' ? req.query.gallery : null;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
    const limit = 20;

    const rows = await req.withTenant((client) =>
      client.query(
        `SELECT id, node_id, url, original_filename, width, height, tenant_id, position, created_at
         FROM media_assets
         WHERE status = 'published'
           ${gallery ? 'AND node_id = $1' : ''}
           ${cursor ? `AND position > ${gallery ? '$2' : '$1'}` : ''}
         ORDER BY position
         LIMIT ${limit + 1}`,
        [...(gallery ? [gallery] : []), ...(cursor ? [parseInt(cursor)] : [])],
      ),
    );

    const all = rows.rows;
    const hasMore = all.length > limit;
    const items = hasMore ? all.slice(0, limit) : all;

    res.json({
      data: {
        items: items.map((r) => ({
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
        })),
        nextCursor: hasMore ? String((items[items.length - 1] as { position: number }).position) : null,
      },
      error: null,
    });
  }),
);

photographersRouter.post(
  '/photographers/:id/follow',
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthorized('Not authenticated');
    res.json({ data: { following: true }, error: null });
  }),
);

photographersRouter.delete(
  '/photographers/:id/follow',
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthorized('Not authenticated');
    res.json({ data: { following: false }, error: null });
  }),
);
