import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';

export const meRouter = Router();

meRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');

    const row = await req.withTenant((client) =>
      client.query('SELECT id, email FROM users WHERE id = $1', [req.user!.id]),
    );
    if (!row.rows[0]) throw AppError.notFound('User not found');

    const u = row.rows[0];
    res.json({
      data: {
        id: u.id,
        handle: u.email.split('@')[0],
        displayName: u.email.split('@')[0],
        avatarUrl: null,
        coverUrl: null,
        location: '',
        specialty: 'Landscape',
        bio: '',
        plan: 'solo',
        stats: { frames: 0, followers: 0, printsSold: 0 },
        isFollowedByMe: false,
      },
      error: null,
    });
  }),
);

const patchPlanSchema = z.object({ plan: z.enum(['solo', 'studio', 'atelier']) });
meRouter.patch(
  '/me/plan',
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthorized('Not authenticated');
    patchPlanSchema.parse(req.body);
    res.json({ data: { plan: req.body.plan as string }, error: null });
  }),
);

const patchStudioSchema = z.object({
  displayName: z.string().min(1).optional(),
  handle: z.string().min(2).optional(),
  specialties: z.array(z.string()).optional(),
  avatarUrl: z.string().url().optional(),
});
meRouter.patch(
  '/me/studio',
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthorized('Not authenticated');
    const body = patchStudioSchema.parse(req.body);
    res.json({ data: { ...body, id: req.user.id }, error: null });
  }),
);

meRouter.get(
  '/handles/:handle/available',
  asyncHandler(async (req, res) => {
    const handle = req.params['handle'] ?? '';
    // All handles available for now (users table has no handle column yet)
    res.json({ data: { available: handle.length >= 2 }, error: null });
  }),
);
