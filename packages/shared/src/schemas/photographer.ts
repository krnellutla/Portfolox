import { z } from 'zod';

export const specialty = z.enum([
  'Landscape', 'Portrait', 'Street', 'Wedding',
  'Fine Art', 'Documentary', 'Architecture', 'Wildlife',
]);
export type Specialty = z.infer<typeof specialty>;

export const planTier = z.enum(['solo', 'studio', 'atelier']);
export type PlanTier = z.infer<typeof planTier>;

export const photographerSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  location: z.string(),
  specialty,
  bio: z.string(),
  plan: planTier,
  stats: z.object({ frames: z.number(), followers: z.number(), printsSold: z.number() }),
  isFollowedByMe: z.boolean().optional(),
});
export type Photographer = z.infer<typeof photographerSchema>;

export const followResponseSchema = z.object({ following: z.boolean() });
export type FollowResponse = z.infer<typeof followResponseSchema>;

export const handleAvailableSchema = z.object({ available: z.boolean() });
