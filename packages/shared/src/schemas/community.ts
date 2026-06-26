import { z } from 'zod';

export const communitySpace = z.enum([
  'show-your-work', 'critique', 'pricing-business', 'gear', 'locations',
]);
export type CommunitySpace = z.infer<typeof communitySpace>;

export const feedPostSchema = z.object({
  id: z.string(),
  author: z.object({
    id: z.string(),
    handle: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
    specialty: z.string(),
  }),
  body: z.string(),
  photoIds: z.array(z.string()),
  photoUrls: z.array(z.string()).optional(),
  createdAt: z.string(),
  counts: z.object({ likes: z.number(), comments: z.number() }),
  likedByMe: z.boolean().optional(),
  space: communitySpace,
});
export type FeedPost = z.infer<typeof feedPostSchema>;

export const spaceCountSchema = z.object({
  space: communitySpace,
  label: z.string(),
  count: z.number(),
});
export type SpaceCount = z.infer<typeof spaceCountSchema>;

export const postFeedSchema = z.object({
  items: z.array(feedPostSchema),
  nextCursor: z.string().nullable(),
});

export const createPostSchema = z.object({
  body: z.string().min(1),
  photoIds: z.array(z.string()).optional(),
  space: communitySpace,
});
