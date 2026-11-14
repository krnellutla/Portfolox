import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import type { AutoCategorizeResult } from '@blueflutes/shared';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema/index.js';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';
import { hashPassword } from './client-gallery.js';
import { assignGalleryCategory, inferAlbumCategory } from '../services/google-photos.js';

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
    coverPhotoUrl: (r.cover_photo_url as string | null) ?? null,
    category: (r.category_name as string | null) ?? null,
    googleAlbumId: (r.google_album_id as string | null) ?? null,
    visibility: 'public',
    layout: 'grid',
    printsForSale: false,
    photoOrder,
    counts: { frames: frameCount, views: 0 },
    shareToken: (r.share_token as string | null) ?? null,
    isPasswordProtected: (r.is_password_protected as boolean | null) ?? false,
  };
}

// Complex aggregate query — uses Drizzle sql`` to keep type-safe parameterisation
// while expressing ARRAY_AGG FILTER and self-join constructs that Drizzle's
// fluent API does not yet support directly.
function gallerySql(whereClause: ReturnType<typeof sql>, groupByExtra = '') {
  return sql`
    SELECT n.id, n.name, n.share_token, n.is_password_protected, n.google_album_id,
           p.name AS category_name,
           COUNT(m.id)::int AS frame_count,
           COALESCE(ARRAY_AGG(m.id ORDER BY m.position) FILTER (WHERE m.id IS NOT NULL), '{}') AS photo_order,
           (ARRAY_AGG(COALESCE(m.thumbnail_url, m.url) ORDER BY m.position) FILTER (WHERE m.id IS NOT NULL))[1] AS cover_photo_url
    FROM nodes n
    LEFT JOIN nodes p ON p.id = n.parent_id AND p.type = 'folder'
    LEFT JOIN media_assets m ON m.node_id = n.id
    ${whereClause}
    GROUP BY n.id, p.name ${groupByExtra ? sql.raw(groupByExtra) : sql``}
  `;
}

galleriesRouter.get('/me/galleries', asyncHandler(async (req, res) => {
  if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');

  const rows = await req.withTenant(async (client) => {
    const db = drizzle(client, { schema });
    return db.execute<Record<string, unknown>>(
      sql`${gallerySql(sql`WHERE n.type = 'gallery'`)} ORDER BY n.position, n.created_at DESC`,
    );
  });
  res.json({ data: rows.rows.map((r) => nodeToGallery(r, req.user!.tenantId)), error: null });
}));

const createGallerySchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1).optional(),
});

galleriesRouter.post('/me/galleries', asyncHandler(async (req, res) => {
  if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
  const { title, category } = createGallerySchema.parse(req.body);
  const id = randomUUID();
  const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `gallery-${id.slice(0, 6)}`;

  const created = await req.withTenant(async (client) => {
    const db = drizzle(client, { schema });

    const posRow = await db.execute<{ next_pos: number }>(
      sql`SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM nodes WHERE parent_id IS NULL`,
    );
    const position = posRow.rows[0]?.next_pos ?? 0;

    const existingSlug = await db
      .select({ id: schema.nodes.id })
      .from(schema.nodes)
      .where(sql`${schema.nodes.parentId} IS NULL AND ${schema.nodes.slug} = ${baseSlug}`)
      .limit(1);
    const slug = existingSlug.length > 0 ? `${baseSlug}-${id.slice(0, 6)}` : baseSlug;

    await db.insert(schema.nodes).values({
      id,
      tenantId: req.user!.tenantId,
      type: 'gallery',
      name: title,
      slug,
      position,
    });

    if (category) {
      await assignGalleryCategory(client, req.user!.tenantId, id, category);
    }

    const r = await db.execute<Record<string, unknown>>(
      gallerySql(sql`WHERE n.id = ${id}`),
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
  category: z.string().nullable().optional(),
}).partial();

galleriesRouter.patch('/me/galleries/:id', asyncHandler(async (req, res) => {
  if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
  const id = req.params['id'];
  if (!id || typeof id !== 'string') throw AppError.notFound('Gallery not found');
  const body = updateGallerySchema.parse(req.body);

  const row = await req.withTenant(async (client) => {
    const db = drizzle(client, { schema });
    if (body.title) {
      await db
        .update(schema.nodes)
        .set({ name: body.title, updatedAt: new Date() })
        .where(sql`${schema.nodes.id} = ${id} AND ${schema.nodes.type} = 'gallery'`);
    }
    if (body.category !== undefined) {
      await assignGalleryCategory(client, req.user!.tenantId, id, body.category);
    }
    const r = await db.execute<Record<string, unknown>>(
      gallerySql(sql`WHERE n.id = ${id} AND n.type = 'gallery'`),
    );
    return r.rows[0] as Record<string, unknown> | undefined;
  });

  if (!row) throw AppError.notFound('Gallery not found');
  res.json({ data: nodeToGallery(row, req.user.tenantId), error: null });
}));

galleriesRouter.post('/me/galleries/auto-categorize', asyncHandler(async (req, res) => {
  if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
  const tenantId = req.user.tenantId;

  const result = await req.withTenant(async (client) => {
    const galleries = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM nodes WHERE tenant_id = $1 AND type = 'gallery' ORDER BY position`,
      [tenantId],
    );

    const categories: Record<string, number> = {};
    let categorized = 0;

    for (const g of galleries.rows) {
      const assets = await client.query<{
        original_filename: string;
        width: number | null;
        height: number | null;
      }>(
        `SELECT original_filename, width, height FROM media_assets WHERE node_id = $1`,
        [g.id],
      );

      const inferred = inferAlbumCategory(
        g.name,
        assets.rows.map((a) => ({
          filename: a.original_filename,
          mediaMetadata: {
            width: a.width ? String(a.width) : undefined,
            height: a.height ? String(a.height) : undefined,
          },
        })),
      );

      await assignGalleryCategory(client, tenantId, g.id, inferred);
      categories[inferred] = (categories[inferred] ?? 0) + 1;
      categorized++;
    }

    return { categorized, categories } satisfies AutoCategorizeResult;
  });

  res.json({ data: result, error: null });
}));

const reorderGallerySchema = z.object({ photoOrder: z.array(z.string()) });

galleriesRouter.put('/me/galleries/:id/order', asyncHandler(async (req, res) => {
  if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
  const { id } = req.params;
  const { photoOrder } = reorderGallerySchema.parse(req.body);

  await req.withTenant(async (client) => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validIds = photoOrder.filter((aid): aid is string => typeof aid === 'string' && UUID_RE.test(aid));
    if (validIds.length === 0) return;
    // Single UPDATE with an inline VALUES table — O(1) round-trips instead of O(n)
    const valuePlaceholders = validIds.map((_, i) => `($${i + 1}::uuid, ${i}::int)`).join(', ');
    await client.query(
      `UPDATE media_assets SET position = idx.pos
       FROM (VALUES ${valuePlaceholders}) AS idx(id, pos)
       WHERE media_assets.id = idx.id AND media_assets.node_id = $${validIds.length + 1}`,
      [...validIds, id],
    );
  });

  res.json({ data: { ok: true }, error: null });
}));

// POST /me/galleries/:id/protect — set or clear gallery password
const protectGallerySchema = z.object({ password: z.string().min(6).nullable() });

galleriesRouter.post('/me/galleries/:id/protect', asyncHandler(async (req, res) => {
  if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
  const { id } = req.params as { id: string };
  const { password } = protectGallerySchema.parse(req.body);

  await req.withTenant(async (client) => {
    const db = drizzle(client, { schema });
    if (password !== null) {
      const hashed = await hashPassword(password);
      await db
        .update(schema.nodes)
        .set({ passwordHash: hashed, isPasswordProtected: true })
        .where(sql`${schema.nodes.id} = ${id} AND ${schema.nodes.type} = 'gallery'`);
    } else {
      await db
        .update(schema.nodes)
        .set({ passwordHash: null, isPasswordProtected: false })
        .where(sql`${schema.nodes.id} = ${id} AND ${schema.nodes.type} = 'gallery'`);
    }
  });

  const r = await req.withTenant(async (client) => {
    const db = drizzle(client, { schema });
    const [found] = await db
      .select({ shareToken: schema.nodes.shareToken, isPasswordProtected: schema.nodes.isPasswordProtected })
      .from(schema.nodes)
      .where(eq(schema.nodes.id, id));
    return found ?? null;
  });
  if (!r) throw AppError.notFound('Gallery not found');

  res.json({
    data: { shareToken: r.shareToken, isPasswordProtected: r.isPasswordProtected },
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
