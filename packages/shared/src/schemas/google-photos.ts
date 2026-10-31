import { z } from 'zod';

export const PHOTO_CATEGORIES = [
  'City',
  'Landscape',
  'Portrait',
  'Family',
  'B&W',
  'Street',
  'Travel',
  'Events',
  'Wildlife',
  'Architecture',
] as const;

export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export const googleAlbumSchema = z.object({
  id: z.string(),
  title: z.string(),
  mediaItemsCount: z.string().optional(), // Google returns this as a string
  coverPhotoBaseUrl: z.string().optional(),
  productUrl: z.string().optional(),
  suggestedCategory: z.string().optional(),
  syncedGalleryId: z.string().nullable().optional(),
  assignedCategory: z.string().nullable().optional(),
  syncedFramesCount: z.number().optional(),
});

export const googleSyncResultSchema = z.object({
  galleryNodeId: z.string(),
  albumTitle: z.string(),
  category: z.string().optional(),
  synced: z.number(),
  skipped: z.number(),
});

export const googleSyncAllResultSchema = z.object({
  totalAlbums: z.number(),
  albumsSynced: z.number(),
  photosSynced: z.number(),
  photosSkipped: z.number(),
  categories: z.record(z.string(), z.number()),
  results: z.array(googleSyncResultSchema),
});

export const autoCategorizeResultSchema = z.object({
  categorized: z.number(),
  categories: z.record(z.string(), z.number()),
});

export type GoogleAlbum = z.infer<typeof googleAlbumSchema>;
export type GoogleSyncResult = z.infer<typeof googleSyncResultSchema>;
export type GoogleSyncAllResult = z.infer<typeof googleSyncAllResultSchema>;
export type AutoCategorizeResult = z.infer<typeof autoCategorizeResultSchema>;
