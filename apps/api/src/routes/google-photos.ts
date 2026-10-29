import { Router } from 'express';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import type { ApiEnvelope } from '@blueflutes/shared';
import type { GoogleAlbum, GoogleSyncResult } from '@blueflutes/shared';
import {
  fetchAlbumMediaItems,
  fetchGoogleAlbums,
  getStoredGoogleToken,
} from '../services/google-photos.js';

export const googlePhotosRouter: Router = Router();

googlePhotosRouter.get(
  '/me/google-photos/status',
  asyncHandler(async (req, res) => {
    if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
    const userId = req.user.id;

    const row = await req.withTenant((client) =>
      client.query<{ expires_at: Date }>(
        'SELECT expires_at FROM google_oauth_tokens WHERE user_id = $1 LIMIT 1',
        [userId],
      ),
    );

    const connected = row.rows.length > 0;
    const tokenExpiresAt = connected ? row.rows[0]!.expires_at.toISOString() : null;

    const body: ApiEnvelope<{ connected: boolean; tokenExpiresAt: string | null }> = {
      data: { connected, tokenExpiresAt },
      error: null,
    };
    res.json(body);
  }),
);

googlePhotosRouter.get(
  '/me/google-photos/albums',
  asyncHandler(async (req, res) => {
    if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
    const userId = req.user.id;

    const { accessToken } = await req.withTenant((client) => getStoredGoogleToken(client, userId));

    const rawAlbums = await fetchGoogleAlbums(accessToken);
    const albums: GoogleAlbum[] = rawAlbums.map((a) => ({
      id: a.id,
      title: a.title,
      mediaItemsCount: a.mediaItemsCount,
      coverPhotoBaseUrl: a.coverPhotoBaseUrl,
      productUrl: a.productUrl,
    }));

    const body: ApiEnvelope<GoogleAlbum[]> = { data: albums, error: null };
    res.json(body);
  }),
);

googlePhotosRouter.post(
  '/me/google-photos/sync/:albumId',
  asyncHandler(async (req, res) => {
    if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
    const { tenantId, id: userId } = req.user;
    const albumId = req.params['albumId'];
    if (!albumId || typeof albumId !== 'string') throw AppError.notFound('Invalid albumId');

    const { accessToken } = await req.withTenant((client) => getStoredGoogleToken(client, userId));

    // Fetch album details to get title
    const allAlbums = await fetchGoogleAlbums(accessToken);
    const album = allAlbums.find((a) => a.id === albumId);
    if (!album) throw AppError.notFound('Album not found in Google Photos');

    // Fetch media items
    const mediaItems = await fetchAlbumMediaItems(accessToken, albumId);

    const result = await req.withTenant(async (client) => {
      // Find or create gallery node for this album (upsert by google_album_id)
      const existingNode = await client.query<{ id: string }>(
        `SELECT id FROM nodes WHERE tenant_id = $1 AND google_album_id = $2 LIMIT 1`,
        [tenantId, albumId],
      );

      let galleryNodeId: string;
      if (existingNode.rows.length > 0) {
        galleryNodeId = existingNode.rows[0]!.id;
      } else {
        const slug = album.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `album-${albumId.slice(0, 8)}`;

        const inserted = await client.query<{ id: string }>(
          `INSERT INTO nodes (tenant_id, type, name, slug, google_album_id)
           VALUES ($1, 'gallery', $2, $3, $4)
           ON CONFLICT (tenant_id, slug) WHERE parent_id IS NULL
           DO UPDATE SET name = EXCLUDED.name, google_album_id = EXCLUDED.google_album_id
           RETURNING id`,
          [tenantId, album.title, slug, albumId],
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
        // Check if already synced
        const existing = await client.query(
          'SELECT id FROM media_assets WHERE google_media_item_id = $1 LIMIT 1',
          [item.id],
        );
        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        const thumbUrl = `${item.baseUrl}=w400-h300`;
        const objectKey = `google:${item.id}`;
        const width = item.mediaMetadata?.width ? parseInt(item.mediaMetadata.width, 10) : null;
        const height = item.mediaMetadata?.height ? parseInt(item.mediaMetadata.height, 10) : null;

        await client.query(
          `INSERT INTO media_assets
             (tenant_id, node_id, object_key, url, mime_type, status, position,
              original_filename, byte_size, width, height,
              google_media_item_id, google_base_url, thumbnail_url, ready_at)
           VALUES ($1, $2, $3, $4, 'image/jpeg', 'ready', $5, $6, 1, $7, $8, $9, $10, $11, now())`,
          [
            tenantId,
            galleryNodeId,
            objectKey,
            item.baseUrl,
            nextPos++,
            item.filename,
            Number.isFinite(width) && (width as number) > 0 ? width : null,
            Number.isFinite(height) && (height as number) > 0 ? height : null,
            item.id,
            item.baseUrl,
            thumbUrl,
          ],
        );
        synced++;
      }

      return { galleryNodeId, synced, skipped };
    });

    const syncResult: GoogleSyncResult = {
      galleryNodeId: result.galleryNodeId,
      albumTitle: album.title,
      synced: result.synced,
      skipped: result.skipped,
    };

    const body: ApiEnvelope<GoogleSyncResult> = { data: syncResult, error: null };
    res.json(body);
  }),
);
