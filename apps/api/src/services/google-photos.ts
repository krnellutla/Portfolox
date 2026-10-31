import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { ALLOWED_MIME_TYPES, type PhotoCategory } from '@blueflutes/shared';
import { env } from '../config/env.js';
import { AppError } from '../lib/app-error.js';

const GOOGLE_PHOTOS_API = 'https://photoslibrary.googleapis.com/v1';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export interface GoogleAlbumRaw {
  id: string;
  title: string;
  mediaItemsCount?: string;
  coverPhotoBaseUrl?: string;
  productUrl?: string;
}

export interface GoogleMediaItemRaw {
  id: string;
  baseUrl: string;
  filename: string;
  mimeType?: string;
  description?: string;
  mediaMetadata?: {
    width?: string;
    height?: string;
    creationTime?: string;
    photo?: Record<string, unknown>;
    video?: Record<string, unknown>;
  };
}

export interface UpsertGoogleTokensParams {
  tenantId: string;
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scopes: string;
}

/**
 * Upserts Google OAuth tokens for a user (conflict on tenant_id, user_id).
 */
export async function upsertGoogleOauthTokens(
  client: PoolClient,
  params: UpsertGoogleTokensParams,
): Promise<void> {
  await client.query(
    `INSERT INTO google_oauth_tokens (tenant_id, user_id, access_token, refresh_token, expires_at, scopes, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (tenant_id, user_id) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, google_oauth_tokens.refresh_token),
       expires_at = EXCLUDED.expires_at,
       scopes = EXCLUDED.scopes,
       updated_at = now()`,
    [params.tenantId, params.userId, params.accessToken, params.refreshToken, params.expiresAt, params.scopes],
  );
}

export interface StoredGoogleToken {
  accessToken: string;
  expiresAt: Date;
}

/**
 * Exchanges a Google OAuth refresh token for a fresh access token.
 */
export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: Date; refreshToken?: string }> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw AppError.unauthorized('Google Photos token expired and OAuth client credentials are not configured');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw AppError.unauthorized('Google Photos token expired — please reconnect');
  }

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };

  if (!data.access_token) {
    throw AppError.unauthorized('Google Photos token refresh returned no access_token');
  }

  const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  const expiresAt = new Date(Date.now() + expiresInSec * 1000);

  return {
    accessToken: data.access_token,
    expiresAt,
    refreshToken: data.refresh_token,
  };
}

/**
 * Retrieves the stored Google access token for a user.
 * Automatically refreshes the token using `refresh_token` if expired or expiring within 60s.
 */
export async function getStoredGoogleToken(client: PoolClient, userId: string): Promise<StoredGoogleToken> {
  const result = await client.query<{
    access_token: string;
    refresh_token: string | null;
    expires_at: Date;
  }>(
    'SELECT access_token, refresh_token, expires_at FROM google_oauth_tokens WHERE user_id = $1 LIMIT 1',
    [userId],
  );

  if (result.rows.length === 0) {
    throw AppError.unauthorized('Google Photos not connected — please reconnect via Dashboard or Settings');
  }

  const row = result.rows[0]!;
  const expiresSoon = row.expires_at.getTime() <= Date.now() + 60_000;

  if (expiresSoon) {
    if (!row.refresh_token) {
      throw AppError.unauthorized('Google Photos token expired — please reconnect');
    }

    const refreshed = await refreshGoogleAccessToken(row.refresh_token);
    await client.query(
      `UPDATE google_oauth_tokens
       SET access_token = $1,
           refresh_token = COALESCE($2, refresh_token),
           expires_at = $3,
           updated_at = now()
       WHERE user_id = $4`,
      [refreshed.accessToken, refreshed.refreshToken ?? null, refreshed.expiresAt, userId],
    );

    return { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt };
  }

  return { accessToken: row.access_token, expiresAt: row.expires_at };
}

/**
 * Fetches all albums from the Google Photos API (paginated).
 */
export async function fetchGoogleAlbums(accessToken: string): Promise<GoogleAlbumRaw[]> {
  const albums: GoogleAlbumRaw[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${GOOGLE_PHOTOS_API}/albums`);
    url.searchParams.set('pageSize', '50');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw AppError.unauthorized('Google Photos access denied or expired — please reconnect');
      }
      throw AppError.internal(`Google Photos API error: ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as { albums?: Partial<GoogleAlbumRaw>[]; nextPageToken?: string };
    if (body.albums) {
      for (const a of body.albums) {
        if (!a.id) continue;
        albums.push({
          id: a.id,
          title: a.title?.trim() || 'Untitled Album',
          mediaItemsCount: a.mediaItemsCount,
          coverPhotoBaseUrl: a.coverPhotoBaseUrl,
          productUrl: a.productUrl,
        });
      }
    }
    pageToken = body.nextPageToken;
  } while (pageToken);

  return albums;
}

/**
 * Fetches photo media items for a specific album (paginated, skips video items).
 */
export async function fetchAlbumMediaItems(accessToken: string, albumId: string): Promise<GoogleMediaItemRaw[]> {
  const items: GoogleMediaItemRaw[] = [];
  let pageToken: string | undefined;

  do {
    const body: Record<string, unknown> = { albumId, pageSize: 100 };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(`${GOOGLE_PHOTOS_API}/mediaItems:search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw AppError.unauthorized('Google Photos access denied or expired — please reconnect');
      }
      throw AppError.internal(`Google Photos API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { mediaItems?: GoogleMediaItemRaw[]; nextPageToken?: string };
    if (data.mediaItems) {
      for (const item of data.mediaItems) {
        // Skip video items — media_assets only stores image MIME types
        if (item.mimeType?.startsWith('video/') || item.mediaMetadata?.video) {
          continue;
        }
        items.push(item);
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

/**
 * Normalizes a Google Photos MIME type into one of ALLOWED_MIME_TYPES.
 * Google Photos `baseUrl` serves JPEG when requested with `=w...` parameters.
 */
export function normalizeGoogleMimeType(mimeType?: string): (typeof ALLOWED_MIME_TYPES)[number] {
  if (mimeType && (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return mimeType as (typeof ALLOWED_MIME_TYPES)[number];
  }
  return 'image/jpeg';
}

// ─── Auto-Categorization Engine ─────────────────────────────────────────────

interface CategoryRule {
  category: PhotoCategory;
  patterns: RegExp[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'B&W',
    patterns: [
      /\b(b&w|b\/w|bw|black\s*(&|and)\s*white|monochrome|noir|grayscale)\b/i,
    ],
  },
  {
    category: 'Family',
    patterns: [
      /\b(family|families|kids|children|child|baby|babies|newborn|maternity|parents|mom|dad|son|daughter|together|reunion|familyshoot)\b/i,
    ],
  },
  {
    category: 'Portrait',
    patterns: [
      /\b(portrait|portraits|headshot|headshots|model|models|face|solo|person|people|deepavali)\b/i,
    ],
  },
  {
    category: 'Events',
    patterns: [
      /\b(wedding|weddings|bride|groom|ceremony|reception|engagement|event|events|festival|party|celebration|concert|fireworks|diwali|birthday|anniversary|graduation|conference)\b/i,
    ],
  },
  {
    category: 'Wildlife',
    patterns: [
      /\b(wildlife|bird|birds|animal|animals|safari|zoo|flora|fauna|macro|flower|flowers|botanical|pet|pets|dog|cat|forest|jungle)\b/i,
    ],
  },
  {
    category: 'Architecture',
    patterns: [
      /\b(architecture|architectural|building|buildings|bridge|tower|cathedral|temple|mosque|church|interior|structure|geometry|geometric)\b/i,
    ],
  },
  {
    category: 'Street',
    patterns: [
      /\b(street|streets|candid|walk|walking|alley|market|transit|tram|subway|metro|documentary|everyday)\b/i,
    ],
  },
  {
    category: 'Travel',
    patterns: [
      /\b(travel|trip|catrip|vacation|holiday|tour|journey|adventure|explore|california|san\s*francisco|sf|tokyo|japan|india|europe|paris|london|bali|thailand|vietnam|malaysia|australia|new\s*zealand|usa|iceland|italy|spain|swiss)\b/i,
    ],
  },
  {
    category: 'City',
    patterns: [
      /\b(city|cities|cityscape|urban|skyline|downtown|marina|bay|gardens|supertree|gbtb|night\s*light|blue\s*hour|singapore|sg|metropolis|nightscape)\b/i,
    ],
  },
  {
    category: 'Landscape',
    patterns: [
      /\b(landscape|landscapes|mountain|mountains|sunset|sunrise|golden\s*hour|beach|coast|coastal|sea|ocean|lake|river|valley|desert|scenic|horizon|dawn|dusk|cloud|clouds|nature|park)\b/i,
    ],
  },
];

/**
 * Infers the best-fit photography category for an album based on its title,
 * media item filenames/descriptions, and image aspect-ratio heuristics.
 */
export function inferAlbumCategory(
  albumTitle: string,
  mediaItems: Pick<GoogleMediaItemRaw, 'filename' | 'description' | 'mediaMetadata'>[] = [],
): PhotoCategory {
  const scores = new Map<PhotoCategory, number>();

  const addScore = (cat: PhotoCategory, pts: number) => {
    scores.set(cat, (scores.get(cat) ?? 0) + pts);
  };

  // 1. Score album title (high weight)
  const normalizedTitle = albumTitle.replace(/[_-]+/g, ' ');
  for (const rule of CATEGORY_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalizedTitle) || pattern.test(albumTitle)) {
        addScore(rule.category, 10);
      }
    }
  }

  // 2. Score media item filenames & descriptions
  for (const item of mediaItems) {
    const text = `${item.filename ?? ''} ${item.description ?? ''}`.replace(/[_-]+/g, ' ');
    if (!text.trim()) continue;
    for (const rule of CATEGORY_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(text)) {
          addScore(rule.category, 2);
        }
      }
    }
  }

  // Return highest-scoring category if any rule matched
  let bestCategory: PhotoCategory | null = null;
  let bestScore = 0;
  for (const [cat, score] of scores.entries()) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }
  if (bestCategory) {
    return bestCategory;
  }

  // 3. Aspect-ratio fallback heuristic when no keywords matched
  let portraitCount = 0;
  let landscapeCount = 0;
  for (const item of mediaItems) {
    const w = item.mediaMetadata?.width ? parseInt(item.mediaMetadata.width, 10) : 0;
    const h = item.mediaMetadata?.height ? parseInt(item.mediaMetadata.height, 10) : 0;
    if (w > 0 && h > 0) {
      if (h > w * 1.1) portraitCount++;
      else if (w > h * 1.2) landscapeCount++;
    }
  }

  if (portraitCount > 0 && portraitCount >= landscapeCount) {
    return 'Portrait';
  }
  if (landscapeCount > 0) {
    return 'Landscape';
  }

  return 'City';
}

function slugifyCategory(text: string, fallbackPrefix = 'item'): string {
  return (
    text
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `${fallbackPrefix}-${randomUUID().slice(0, 6)}`
  );
}

/**
 * Finds or creates a root-level category folder (`type = 'folder'`, `parent_id IS NULL`)
 * for the given tenant and category name.
 */
export async function ensureCategoryFolder(
  client: PoolClient,
  tenantId: string,
  categoryName: string,
): Promise<string> {
  const trimmed = categoryName.trim();
  const baseSlug = slugifyCategory(trimmed, 'category');

  const existing = await client.query<{ id: string }>(
    `SELECT id FROM nodes
     WHERE tenant_id = $1
       AND parent_id IS NULL
       AND type = 'folder'
       AND (LOWER(name) = LOWER($2) OR slug = $3)
     LIMIT 1`,
    [tenantId, trimmed, baseSlug],
  );

  if (existing.rows.length > 0) {
    return existing.rows[0]!.id;
  }

  // Ensure slug doesn't collide with an existing root gallery/page node
  const slugConflict = await client.query(
    `SELECT 1 FROM nodes WHERE tenant_id = $1 AND parent_id IS NULL AND slug = $2 LIMIT 1`,
    [tenantId, baseSlug],
  );
  const slug = (slugConflict.rowCount ?? 0) > 0 ? `cat-${baseSlug}` : baseSlug;

  const posRow = await client.query<{ next_pos: number }>(
    `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM nodes WHERE tenant_id = $1 AND parent_id IS NULL`,
    [tenantId],
  );
  const nextPos = posRow.rows[0]?.next_pos ?? 0;

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO nodes (tenant_id, parent_id, type, name, slug, position)
     VALUES ($1, NULL, 'folder', $2, $3, $4)
     RETURNING id`,
    [tenantId, trimmed, slug, nextPos],
  );

  return inserted.rows[0]!.id;
}

/**
 * Assigns an existing gallery node to a category folder (or removes it to root if `category` is null).
 */
export async function assignGalleryCategory(
  client: PoolClient,
  tenantId: string,
  galleryNodeId: string,
  categoryName: string | null,
): Promise<void> {
  const targetParentId =
    categoryName && categoryName.trim()
      ? await ensureCategoryFolder(client, tenantId, categoryName.trim())
      : null;

  const nodeRow = await client.query<{ name: string; slug: string; parent_id: string | null }>(
    `SELECT name, slug, parent_id FROM nodes WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [galleryNodeId, tenantId],
  );
  if (nodeRow.rows.length === 0) return;

  const current = nodeRow.rows[0]!;
  if (current.parent_id === targetParentId) return;

  const baseSlug = slugifyCategory(current.name, 'gallery');
  const conflict = await client.query(
    targetParentId
      ? `SELECT 1 FROM nodes WHERE tenant_id = $1 AND parent_id = $2 AND slug = $3 AND id != $4 LIMIT 1`
      : `SELECT 1 FROM nodes WHERE tenant_id = $1 AND parent_id IS NULL AND slug = $2 AND id != $3 LIMIT 1`,
    targetParentId
      ? [tenantId, targetParentId, baseSlug, galleryNodeId]
      : [tenantId, baseSlug, galleryNodeId],
  );
  const safeSlug =
    (conflict.rowCount ?? 0) > 0 ? `${baseSlug}-${galleryNodeId.slice(0, 6)}` : baseSlug;

  await client.query(
    `UPDATE nodes SET parent_id = $1, slug = $2, updated_at = now() WHERE id = $3 AND tenant_id = $4`,
    [targetParentId, safeSlug, galleryNodeId, tenantId],
  );
}

/**
 * Syncs a single Google Photos album and its media items into a categorized gallery node.
 */
export async function syncAlbumToTenant(
  client: PoolClient,
  params: {
    tenantId: string;
    album: GoogleAlbumRaw;
    mediaItems: GoogleMediaItemRaw[];
    categoryOverride?: string;
  },
): Promise<{ galleryNodeId: string; category: string; synced: number; skipped: number }> {
  const { tenantId, album, mediaItems, categoryOverride } = params;
  const category =
    categoryOverride && categoryOverride.trim()
      ? categoryOverride.trim()
      : inferAlbumCategory(album.title, mediaItems);

  const categoryFolderId = await ensureCategoryFolder(client, tenantId, category);

  // Find existing gallery node by google_album_id
  const existingNode = await client.query<{ id: string; parent_id: string | null }>(
    `SELECT id, parent_id FROM nodes WHERE tenant_id = $1 AND google_album_id = $2 LIMIT 1`,
    [tenantId, album.id],
  );

  let galleryNodeId: string;
  if (existingNode.rows.length > 0) {
    galleryNodeId = existingNode.rows[0]!.id;
    // Update gallery name and ensure it is placed inside a category folder
    // (if categoryOverride is specified OR it has no parent folder yet)
    if (categoryOverride || !existingNode.rows[0]!.parent_id) {
      await assignGalleryCategory(client, tenantId, galleryNodeId, category);
    }
    await client.query(
      `UPDATE nodes SET name = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3`,
      [album.title, galleryNodeId, tenantId],
    );
  } else {
    const baseSlug = slugifyCategory(album.title, 'album');
    const slugConflict = await client.query(
      `SELECT 1 FROM nodes WHERE tenant_id = $1 AND parent_id = $2 AND slug = $3 LIMIT 1`,
      [tenantId, categoryFolderId, baseSlug],
    );
    const slug =
      (slugConflict.rowCount ?? 0) > 0
        ? `${baseSlug}-${album.id.slice(0, 6).toLowerCase().replace(/[^a-z0-9]/g, 'x')}`
        : baseSlug;

    const posRow = await client.query<{ next_pos: number }>(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM nodes WHERE tenant_id = $1 AND parent_id = $2`,
      [tenantId, categoryFolderId],
    );
    const nextNodePos = posRow.rows[0]?.next_pos ?? 0;

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO nodes (tenant_id, parent_id, type, name, slug, position, google_album_id)
       VALUES ($1, $2, 'gallery', $3, $4, $5, $6)
       RETURNING id`,
      [tenantId, categoryFolderId, album.title, slug, nextNodePos, album.id],
    );
    galleryNodeId = inserted.rows[0]!.id;
  }

  const posRow = await client.query<{ next_pos: number }>(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM media_assets WHERE node_id = $1',
    [galleryNodeId],
  );
  let nextPos = posRow.rows[0]?.next_pos ?? 0;

  let synced = 0;
  let skipped = 0;

  for (const item of mediaItems) {
    const existing = await client.query<{ id: string }>(
      'SELECT id FROM media_assets WHERE tenant_id = $1 AND google_media_item_id = $2 LIMIT 1',
      [tenantId, item.id],
    );
    if (existing.rows.length > 0) {
      // Refresh base URLs in case Google Photos rotated them
      const thumbUrl = `${item.baseUrl}=w400-h300`;
      await client.query(
        `UPDATE media_assets
         SET url = $1, google_base_url = $1, thumbnail_url = $2
         WHERE id = $3`,
        [item.baseUrl, thumbUrl, existing.rows[0]!.id],
      );
      skipped++;
      continue;
    }

    const thumbUrl = `${item.baseUrl}=w400-h300`;
    const objectKey = `google:${item.id}`;
    const width = item.mediaMetadata?.width ? parseInt(item.mediaMetadata.width, 10) : null;
    const height = item.mediaMetadata?.height ? parseInt(item.mediaMetadata.height, 10) : null;
    const mimeType = normalizeGoogleMimeType(item.mimeType);

    await client.query(
      `INSERT INTO media_assets
         (tenant_id, node_id, object_key, url, mime_type, status, position,
          original_filename, byte_size, width, height,
          google_media_item_id, google_base_url, thumbnail_url, ready_at)
       VALUES ($1, $2, $3, $4, $5, 'ready', $6, $7, 1, $8, $9, $10, $11, $12, now())`,
      [
        tenantId,
        galleryNodeId,
        objectKey,
        item.baseUrl,
        mimeType,
        nextPos++,
        item.filename || `photo-${item.id.slice(0, 8)}.jpg`,
        Number.isFinite(width) && (width as number) > 0 ? width : null,
        Number.isFinite(height) && (height as number) > 0 ? height : null,
        item.id,
        item.baseUrl,
        thumbUrl,
      ],
    );
    synced++;
  }

  return { galleryNodeId, category, synced, skipped };
}
