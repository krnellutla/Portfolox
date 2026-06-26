import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';

export const discoverRouter: Router = Router();

const cdn = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const FEATURED = [
  { id: 'ph1', handle: 'miracalder',   displayName: 'Mira Calder',    location: 'Reykjavík, Iceland', specialty: 'Landscape',    avatarId: '1531746020798-e6953c6e8e04', coverId: '1506905925346-21bda4d32df4' },
  { id: 'ph2', handle: 'sorenl',       displayName: 'Søren Lafield',  location: 'Berlin, Germany',    specialty: 'Street',       avatarId: '1570295999919-56ceb5ecca61', coverId: '1469474968028-56623f02e42e' },
  { id: 'ph3', handle: 'anaok',        displayName: 'Ana Okonkwo',    location: 'Lagos, Nigeria',     specialty: 'Portrait',     avatarId: '1552374196-1ab2a1c593e8', coverId: '1470071459604-3b5ec3a7fe05' },
  { id: 'ph4', handle: 'theovance',    displayName: 'Theo Vance',     location: 'Portland, OR',       specialty: 'Documentary',  avatarId: '1544005313-94ddf0286df2', coverId: '1441974231531-c6227db76b6e' },
  { id: 'ph5', handle: 'yukit',        displayName: 'Yuki Tanaka',    location: 'Kyoto, Japan',       specialty: 'Fine Art',     avatarId: '1499290731724-12d120b2e357', coverId: '1501785888041-af3ef285b470' },
  { id: 'ph6', handle: 'lenabrandt',   displayName: 'Lena Brandt',    location: 'Oslo, Norway',       specialty: 'Wedding',      avatarId: '1507003211169-0a1dd7228f2d', coverId: '1454496522488-7a8e488e8606' },
];

discoverRouter.get(
  '/discover/featured',
  asyncHandler(async (_req, res) => {
    res.json({
      data: FEATURED.map((p) => ({
        id: p.id,
        handle: p.handle,
        displayName: p.displayName,
        avatarUrl: cdn(p.avatarId, 120),
        coverUrl: cdn(p.coverId, 800),
        location: p.location,
        specialty: p.specialty,
        bio: '',
        plan: 'studio',
        stats: { frames: 0, followers: 0, printsSold: 0 },
        isFollowedByMe: false,
      })),
      error: null,
    });
  }),
);

discoverRouter.get(
  '/discover/fresh',
  asyncHandler(async (req, res) => {
    if (!req.withTenant) throw AppError.notFound('Tenant not found');

    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
    const limit = 12;

    const rows = await req.withTenant((client) =>
      client.query(
        `SELECT id, node_id, url, original_filename, width, height, tenant_id, created_at
         FROM media_assets
         WHERE status = 'published'
           ${cursor ? 'AND created_at < $2' : ''}
         ORDER BY created_at DESC
         LIMIT $1`,
        cursor ? [limit + 1, cursor] : [limit + 1],
      ),
    );

    const all = rows.rows;
    const hasMore = all.length > limit;
    const items = hasMore ? all.slice(0, limit) : all;

    res.json({
      data: {
        items: items.map((r) => ({
          id: r.id,
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
        nextCursor: hasMore ? (items[items.length - 1]?.created_at as string) : null,
      },
      error: null,
    });
  }),
);
