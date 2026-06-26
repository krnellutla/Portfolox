import { z } from 'zod';

export const exifSchema = z.object({
  aperture: z.string(),
  shutter: z.string(),
  iso: z.string(),
  focalLength: z.string(),
  camera: z.string().optional(),
  lens: z.string().optional(),
});
export type Exif = z.infer<typeof exifSchema>;

export const photoStatus = z.enum(['published', 'draft', 'processing']);

export const photoSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  url: z.string(),
  thumbUrl: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  exif: exifSchema,
  galleryId: z.string(),
  photographerId: z.string(),
  edition: z.object({ number: z.number(), of: z.number() }).optional(),
  releasedAt: z.string().optional(),
  status: photoStatus,
  priceFrom: z.number().optional(),
  counts: z.object({ likes: z.number(), comments: z.number(), views: z.number() }),
  likedByMe: z.boolean().optional(),
  favoritedByMe: z.boolean().optional(),
  colorBucket: z.enum(['Warm', 'Cool', 'Green', 'Neutral', 'Mono', 'Dusk']).optional(),
});
export type Photo = z.infer<typeof photoSchema>;

export const paginatedPhotosSchema = z.object({
  items: z.array(photoSchema),
  nextCursor: z.string().nullable(),
  total: z.number().optional(),
});
export type PaginatedPhotos = z.infer<typeof paginatedPhotosSchema>;

export const likeResponseSchema = z.object({ liked: z.boolean(), count: z.number() });
export type LikeResponse = z.infer<typeof likeResponseSchema>;

export const favoriteResponseSchema = z.object({ favorited: z.boolean() });
export type FavoriteResponse = z.infer<typeof favoriteResponseSchema>;
