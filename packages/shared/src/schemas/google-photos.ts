import { z } from 'zod';

export const googleAlbumSchema = z.object({
  id: z.string(),
  title: z.string(),
  mediaItemsCount: z.string().optional(), // Google returns this as a string
  coverPhotoBaseUrl: z.string().optional(),
  productUrl: z.string().optional(),
});

export const googleSyncResultSchema = z.object({
  galleryNodeId: z.string(),
  albumTitle: z.string(),
  synced: z.number(),
  skipped: z.number(),
});

export type GoogleAlbum = z.infer<typeof googleAlbumSchema>;
export type GoogleSyncResult = z.infer<typeof googleSyncResultSchema>;
