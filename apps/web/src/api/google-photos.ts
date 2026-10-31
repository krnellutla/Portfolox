import { z } from 'zod';
import {
  googleAlbumSchema,
  googleSyncAllResultSchema,
  googleSyncResultSchema,
} from '@blueflutes/shared';
import type {
  GoogleAlbum,
  GoogleSyncAllResult,
  GoogleSyncResult,
} from '@blueflutes/shared';
import { apiFetch } from './client.js';

const googlePhotosStatusSchema = z.object({
  connected: z.boolean(),
  tokenExpiresAt: z.string().nullable(),
});

export function getGooglePhotosStatus(): Promise<{ connected: boolean; tokenExpiresAt: string | null }> {
  return apiFetch('/me/google-photos/status', {}, googlePhotosStatusSchema);
}

export function listGoogleAlbums(): Promise<GoogleAlbum[]> {
  return apiFetch('/me/google-photos/albums', {}, z.array(googleAlbumSchema));
}

export function syncGoogleAlbum(albumId: string, category?: string): Promise<GoogleSyncResult> {
  return apiFetch(
    `/me/google-photos/sync/${encodeURIComponent(albumId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category ? { category } : {}),
    },
    googleSyncResultSchema,
  );
}

export function syncAllGoogleAlbums(
  categories?: Record<string, string>,
): Promise<GoogleSyncAllResult> {
  return apiFetch(
    '/me/google-photos/sync-all',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categories ? { categories } : {}),
    },
    googleSyncAllResultSchema,
  );
}
