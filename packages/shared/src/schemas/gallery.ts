import { z } from 'zod';

export const galleryVisibility = z.enum(['public', 'unlisted', 'private']);
export type GalleryVisibility = z.infer<typeof galleryVisibility>;

export const galleryLayout = z.enum(['grid', 'masonry', 'feature']);
export type GalleryLayout = z.infer<typeof galleryLayout>;

export const gallerySchema = z.object({
  id: z.string(),
  photographerId: z.string(),
  title: z.string(),
  description: z.string(),
  coverPhotoId: z.string().nullable(),
  visibility: galleryVisibility,
  layout: galleryLayout,
  printsForSale: z.boolean(),
  photoOrder: z.array(z.string()),
  counts: z.object({ frames: z.number(), views: z.number() }),
});
export type Gallery = z.infer<typeof gallerySchema>;

export const clientGallerySchema = gallerySchema.extend({
  clientName: z.string(),
  shareToken: z.string(),
  expiresAt: z.string(),
  allowDownload: z.boolean(),
  favoritePhotoIds: z.array(z.string()),
});
export type ClientGallery = z.infer<typeof clientGallerySchema>;

export const galleryOrderSchema = z.object({ photoOrder: z.array(z.string()) });
export const createGallerySchema = z.object({ title: z.string().min(1) });
export const updateGallerySchema = gallerySchema
  .pick({ title: true, description: true, visibility: true, layout: true, printsForSale: true })
  .partial();
