import { Router, type IRouter } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';

export const searchRouter: IRouter = Router();

searchRouter.get(
  '/search/facets',
  asyncHandler(async (_req, res) => {
    res.json({
      data: {
        styles: [
          { value: 'Landscape', count: 24 },
          { value: 'Portrait', count: 18 },
          { value: 'Street', count: 14 },
          { value: 'Wedding', count: 11 },
          { value: 'Fine Art', count: 9 },
          { value: 'Documentary', count: 7 },
          { value: 'Architecture', count: 6 },
          { value: 'Wildlife', count: 4 },
        ],
        colors: [
          { value: 'Warm', count: 15 },
          { value: 'Cool', count: 12 },
          { value: 'Green', count: 9 },
          { value: 'Neutral', count: 18 },
          { value: 'Mono', count: 7 },
          { value: 'Dusk', count: 5 },
        ],
        locations: [
          { value: 'Iceland', count: 8 },
          { value: 'Japan', count: 6 },
          { value: 'Norway', count: 5 },
          { value: 'Morocco', count: 4 },
          { value: 'New York', count: 7 },
          { value: 'Patagonia', count: 3 },
          { value: 'Scotland', count: 4 },
        ],
      },
      error: null,
    });
  }),
);

searchRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    if (!req.withTenant) throw AppError.notFound('Tenant not found');

    const q = typeof req.query.q === 'string' ? req.query.q : null;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
    const limit = 20;

    const rows = await req.withTenant((client) =>
      client.query(
        `SELECT id, node_id, url, original_filename, width, height, tenant_id, position
         FROM media_assets
         WHERE status = 'published'
           ${q ? "AND original_filename ILIKE '%' || $1 || '%'" : ''}
           ${cursor ? `AND position > ${q ? '$2' : '$1'}` : ''}
         ORDER BY position
         LIMIT ${limit + 1}`,
        [...(q ? [q] : []), ...(cursor ? [parseInt(cursor)] : [])],
      ),
    );

    const countRow = await req.withTenant((client) =>
      client.query(
        `SELECT COUNT(*) FROM media_assets WHERE status = 'published' ${q ? "AND original_filename ILIKE '%' || $1 || '%'" : ''}`,
        q ? [q] : [],
      ),
    );

    const all = rows.rows;
    const hasMore = all.length > limit;
    const items = hasMore ? all.slice(0, limit) : all;

    res.json({
      data: {
        total: parseInt((countRow.rows[0] as { count: string }).count),
        photos: items.map((r) => ({
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
