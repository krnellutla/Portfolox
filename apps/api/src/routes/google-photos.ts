import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import type {
  ApiEnvelope,
  GoogleAlbum,
  GoogleSyncAllResult,
  GoogleSyncResult,
} from '@blueflutes/shared';
import {
  fetchAlbumMediaItems,
  fetchGoogleAlbums,
  getStoredGoogleToken,
  inferAlbumCategory,
  syncAlbumToTenant,
} from '../services/google-photos.js';
import { invalidateGallery } from '../services/cache/gallery-cache.js';

export const googlePhotosRouter: Router = Router();

googlePhotosRouter.get(
  '/me/google-photos/status',
  asyncHandler(async (req, res) => {
    if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
    const userId = req.user.id;

    const row = await req.withTenant((client) =>
      client.query<{ expires_at: Date; refresh_token: string | null }>(
        'SELECT expires_at, refresh_token FROM google_oauth_tokens WHERE user_id = $1 LIMIT 1',
        [userId],
      ),
    );

    const tokenRow = row.rows[0];
    const connected = Boolean(
      tokenRow && (tokenRow.expires_at.getTime() > Date.now() || Boolean(tokenRow.refresh_token)),
    );
    const tokenExpiresAt = tokenRow ? tokenRow.expires_at.toISOString() : null;

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
    const { id: userId, tenantId } = req.user;

    const { accessToken } = await req.withTenant((client) => getStoredGoogleToken(client, userId));

    const [rawAlbums, syncedRows] = await Promise.all([
      fetchGoogleAlbums(accessToken),
      req.withTenant((client) =>
        client.query<{
          id: string;
          google_album_id: string;
          category_name: string | null;
          frame_count: number;
        }>(
          `SELECT n.id,
                  n.google_album_id,
                  p.name AS category_name,
                  COUNT(m.id)::int AS frame_count
           FROM nodes n
           LEFT JOIN nodes p ON p.id = n.parent_id AND p.type = 'folder'
           LEFT JOIN media_assets m ON m.node_id = n.id
           WHERE n.tenant_id = $1 AND n.google_album_id IS NOT NULL
           GROUP BY n.id, p.name`,
          [tenantId],
        ),
      ),
    ]);

    const syncedByAlbumId = new Map(
      syncedRows.rows.map((r) => [r.google_album_id, r]),
    );

    const albums: GoogleAlbum[] = rawAlbums.map((a) => {
      const existing = syncedByAlbumId.get(a.id);
      const suggestedCategory = inferAlbumCategory(a.title);
      return {
        id: a.id,
        title: a.title,
        mediaItemsCount: a.mediaItemsCount,
        coverPhotoBaseUrl: a.coverPhotoBaseUrl,
        productUrl: a.productUrl,
        suggestedCategory,
        syncedGalleryId: existing?.id ?? null,
        assignedCategory: existing?.category_name ?? null,
        syncedFramesCount: existing?.frame_count ?? 0,
      };
    });

    const body: ApiEnvelope<GoogleAlbum[]> = { data: albums, error: null };
    res.json(body);
  }),
);

const syncSingleBodySchema = z
  .object({
    category: z.string().min(1).optional(),
  })
  .optional();

googlePhotosRouter.post(
  '/me/google-photos/sync/:albumId',
  asyncHandler(async (req, res) => {
    if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
    const { tenantId, id: userId } = req.user;
    const albumId = req.params['albumId'];
    if (!albumId || typeof albumId !== 'string') throw AppError.notFound('Invalid albumId');

    const parsedBody = syncSingleBodySchema.parse(req.body ?? {});

    const { accessToken } = await req.withTenant((client) => getStoredGoogleToken(client, userId));

    const allAlbums = await fetchGoogleAlbums(accessToken);
    const album = allAlbums.find((a) => a.id === albumId);
    if (!album) throw AppError.notFound('Album not found in Google Photos');

    const mediaItems = await fetchAlbumMediaItems(accessToken, albumId);

    const result = await req.withTenant((client) =>
      syncAlbumToTenant(client, {
        tenantId,
        album,
        mediaItems,
        categoryOverride: parsedBody?.category,
      }),
    );

    void invalidateGallery(tenantId, result.galleryNodeId);

    const syncResult: GoogleSyncResult = {
      galleryNodeId: result.galleryNodeId,
      albumTitle: album.title,
      category: result.category,
      synced: result.synced,
      skipped: result.skipped,
    };

    const body: ApiEnvelope<GoogleSyncResult> = { data: syncResult, error: null };
    res.json(body);
  }),
);

const syncAllBodySchema = z
  .object({
    categories: z.record(z.string(), z.string()).optional(),
  })
  .optional();

googlePhotosRouter.post(
  '/me/google-photos/sync-all',
  asyncHandler(async (req, res) => {
    if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');
    const { tenantId, id: userId } = req.user;
    const parsedBody = syncAllBodySchema.parse(req.body ?? {});
    const categoryOverrides = parsedBody?.categories ?? {};

    const { accessToken } = await req.withTenant((client) => getStoredGoogleToken(client, userId));
    const allAlbums = await fetchGoogleAlbums(accessToken);

    const results: GoogleSyncResult[] = [];
    const categories: Record<string, number> = {};
    let photosSynced = 0;
    let photosSkipped = 0;

    for (const album of allAlbums) {
      const mediaItems = await fetchAlbumMediaItems(accessToken, album.id);
      const synced = await req.withTenant((client) =>
        syncAlbumToTenant(client, {
          tenantId,
          album,
          mediaItems,
          categoryOverride: categoryOverrides[album.id],
        }),
      );

      void invalidateGallery(tenantId, synced.galleryNodeId);

      photosSynced += synced.synced;
      photosSkipped += synced.skipped;
      categories[synced.category] = (categories[synced.category] ?? 0) + 1;

      results.push({
        galleryNodeId: synced.galleryNodeId,
        albumTitle: album.title,
        category: synced.category,
        synced: synced.synced,
        skipped: synced.skipped,
      });
    }

    const summary: GoogleSyncAllResult = {
      totalAlbums: allAlbums.length,
      albumsSynced: results.length,
      photosSynced,
      photosSkipped,
      categories,
      results,
    };

    const body: ApiEnvelope<GoogleSyncAllResult> = { data: summary, error: null };
    res.json(body);
  }),
);
