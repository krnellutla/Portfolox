import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';
import { hashPassword } from './client-gallery.js';

export const galleriesRouter: Router = Router();

function nodeToGallery(r: Record<string, unknown>, tenantId: string) {
  const photoOrder = Array.isArray(r.photo_order)
    ? (r.photo_order as string[]).filter(Boolean)
    : [];
  const frameCount =
    typeof r.frame_count === 'number' ? r.frame_count : photoOrder.length;
  return {
    id: r.id as string,
    photographerId: tenantId,
    title: r.name as string,
    description: '',
    coverPhotoId: photoOrder[0] ?? null,
    visibility: 'public',
    layout: 'grid',
    printsForSale: false,
    photoOrder,
    counts: { frames: frameCount, views: 0 },
    shareToken: (r.share_token as string | null) ?? null,
    isPasswordProtected: (r.is_password_protected as boolean | null) ?? false,
  };
}

galleriesRouter.get('/me/galleries', asyncHandler(async (req, res) => {
  if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');

  const rows = await req.withTenant((client) =>
    client.query(
      `SELECT n.id, n.name, n.share_token, n.is_password_protected,
              COUNT(m.id)::int AS frame_count,
              COALESCE(ARRAY_AGG(m.id ORDER BY m.position) FILTER (WHERE m.id IS NOT NULL), '{}') AS photo_order
       FROM nodes n
       LEFT JOIN media_assets m ON m.node_id = n.id
       WHERE n.type = 'gallery'
       GROUP BY n.id
       ORDER BY n.position`,
    ),
  );
  res.json({ data: rows.rows.map((r) => nodeToGallery(r as Record<string, unknown>, req.user!.tenantId)), error: null });
}));

const createGallerySchema = z.object({ title: z.string().min(1) });
galleriesRouter.post('/me/galleries', asyncHandler(async (req, res) => {
  if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
  const { title } = createGallerySchema.parse(req.body);
  const id = randomUUID();
  const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `gallery-${id.slice(0, 6)}`;

  const created = await req.withTenant(async (client) => {
    const posRow = await client.query<{ next_pos: number }>(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM nodes WHERE parent_id IS NULL`,
    );
    const position = posRow.rows[0]?.next_pos ?? 0;
    const existingSlug = await client.query(
      `SELECT 1 FROM nodes WHERE parent_id IS NULL AND slug = $1 LIMIT 1`,
      [baseSlug],
    );
    const slug = (existingSlug.rowCount ?? 0) > 0 ? `${baseSlug}-${id.slice(0, 6)}` : baseSlug;

    const r = await client.query(
      `INSERT INTO nodes (id, tenant_id, type, name, slug, position)
       VALUES ($1, $2, 'gallery', $3, $4, $5)
       RETURNING id, name, share_token, is_password_protected`,
      [id, req.user!.tenantId, title, slug, position],
    );
    return r.rows[0] as Record<string, unknown>;
  });
  res.status(201).json({ data: nodeToGallery(created, req.user!.tenantId), error: null });
}));

const updateGallerySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  visibility: z.string().optional(),
  layout: z.string().optional(),
  printsForSale: z.boolean().optional(),
}).partial();

galleriesRouter.patch('/me/galleries/:id', asyncHandler(async (req, res) => {
  if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
  const { id } = req.params;
  const body = updateGallerySchema.parse(req.body);

  if (body.title) {
    await req.withTenant((client) =>
      client.query(`UPDATE nodes SET name = $1 WHERE id = $2 AND type = 'gallery'`, [body.title, id]),
    );
  }
  const row = await req.withTenant((client) =>
    client.query(`SELECT id, name FROM nodes WHERE id = $1`, [id]),
  );
  if (!row.rows[0]) throw AppError.notFound('Gallery not found');
  res.json({ data: nodeToGallery(row.rows[0] as Record<string, unknown>, req.user!.tenantId), error: null });
}));

const reorderGallerySchema = z.object({ photoOrder: z.array(z.string()) });

galleriesRouter.put('/me/galleries/:id/order', asyncHandler(async (req, res) => {
  if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
  const { id } = req.params;
  const { photoOrder } = reorderGallerySchema.parse(req.body);

  await req.withTenant(async (client) => {
    for (let i = 0; i < photoOrder.length; i++) {
      const assetId = photoOrder[i];
      if (!assetId) continue;
      // Only update valid UUIDs belonging to this gallery node
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetId)) {
        await client.query(
          `UPDATE media_assets SET position = $1 WHERE id = $2 AND node_id = $3`,
          [i, assetId, id],
        );
      }
    }
  });

  res.json({ data: { ok: true }, error: null });
}));

// POST /me/galleries/:id/protect — set or clear gallery password
const protectGallerySchema = z.object({ password: z.string().min(6).nullable() });

galleriesRouter.post('/me/galleries/:id/protect', asyncHandler(async (req, res) => {
  if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
  const { id } = req.params;
  const { password } = protectGallerySchema.parse(req.body);

  if (password !== null) {
    const hashed = await hashPassword(password);
    await req.withTenant((client) =>
      client.query(
        `UPDATE nodes SET password_hash = $1, is_password_protected = true WHERE id = $2 AND type = 'gallery'`,
        [hashed, id],
      ),
    );
  } else {
    await req.withTenant((client) =>
      client.query(
        `UPDATE nodes SET password_hash = NULL, is_password_protected = false WHERE id = $1 AND type = 'gallery'`,
        [id],
      ),
    );
  }

  const row = await req.withTenant((client) =>
    client.query(`SELECT share_token, is_password_protected FROM nodes WHERE id = $1`, [id]),
  );
  if (!row.rows[0]) throw AppError.notFound('Gallery not found');
  const r = row.rows[0] as { share_token: string; is_password_protected: boolean };

  res.json({
    data: { shareToken: r.share_token, isPasswordProtected: r.is_password_protected },
    error: null,
  });
}));

galleriesRouter.patch('/me/photos/:id', asyncHandler(async (req, res) => {
  if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
  const { id } = req.params;
  const row = await req.withTenant((client) =>
    client.query(`SELECT id, node_id, url, original_filename, width, height, tenant_id FROM media_assets WHERE id = $1`, [id]),
  );
  if (!row.rows[0]) throw AppError.notFound('Photo not found');
  const r = row.rows[0] as Record<string, unknown>;
  res.json({
    data: {
      id: r.id, code: `PFX-${(r.id as string).slice(0, 6).toUpperCase()}`,
      title: (r.original_filename as string).replace(/\.[^.]+$/, ''),
      url: r.url, thumbUrl: r.url, width: r.width ?? 1200, height: r.height ?? 800,
      exif: { aperture: 'f/2.8', shutter: '1/250', iso: '400', focalLength: '50mm' },
      galleryId: r.node_id, photographerId: r.tenant_id, status: 'published',
      counts: { likes: 0, comments: 0, views: 0 },
    },
    error: null,
  });
}));
