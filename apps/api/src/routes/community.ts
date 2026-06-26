import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';

export const communityRouter = Router();

const SPACES = [
  { space: 'show-your-work',   label: 'Show Your Work',     count: 412 },
  { space: 'critique',         label: 'Critique Corner',    count: 189 },
  { space: 'pricing-business', label: 'Pricing & Business', count: 94 },
  { space: 'gear',             label: 'Gear Talk',          count: 266 },
  { space: 'locations',        label: 'Locations',          count: 137 },
];

communityRouter.get('/community/spaces', asyncHandler(async (_req, res) => {
  res.json({ data: SPACES, error: null });
}));

communityRouter.get('/community/posts', asyncHandler(async (_req, res) => {
  res.json({ data: { items: [], nextCursor: null }, error: null });
}));

const createPostSchema = z.object({
  body: z.string().min(1),
  photoIds: z.array(z.string()).optional(),
  space: z.string(),
});
communityRouter.post('/community/posts', asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Not authenticated');
  const { body, photoIds, space } = createPostSchema.parse(req.body);
  res.status(201).json({
    data: {
      id: randomUUID(),
      author: { id: req.user.id, handle: req.user.email.split('@')[0], displayName: req.user.email.split('@')[0], avatarUrl: null, specialty: 'Landscape' },
      body,
      photoIds: photoIds ?? [],
      createdAt: new Date().toISOString(),
      counts: { likes: 0, comments: 0 },
      likedByMe: false,
      space,
    },
    error: null,
  });
}));

communityRouter.post('/community/posts/:id/like', asyncHandler(async (_req, res) => {
  res.json({ data: { liked: true, count: 1 }, error: null });
}));

communityRouter.delete('/community/posts/:id/like', asyncHandler(async (_req, res) => {
  res.json({ data: { liked: false, count: 0 }, error: null });
}));

communityRouter.get('/community/posts/:id/comments', asyncHandler(async (_req, res) => {
  res.json({ data: [], error: null });
}));
