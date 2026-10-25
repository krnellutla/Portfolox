import { z } from 'zod';
import { googleAlbumSchema, googleSyncResultSchema } from '@blueflutes/shared';
import type { GoogleAlbum, GoogleSyncResult } from '@blueflutes/shared';
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

export function syncGoogleAlbum(albumId: string): Promise<GoogleSyncResult> {
  return apiFetch(
    `/me/google-photos/sync/${albumId}`,
    { method: 'POST' },
    googleSyncResultSchema,
  );
}
