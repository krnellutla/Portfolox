import { z } from 'zod';

export const collectionSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  note: z.string(),
  coverPhotoIds: z.array(z.string()),
  coverPhotoUrls: z.array(z.string()).optional(),
  photoIds: z.array(z.string()),
  count: z.number(),
});
export type Collection = z.infer<typeof collectionSchema>;

export const createCollectionSchema = z.object({ name: z.string().min(1) });
