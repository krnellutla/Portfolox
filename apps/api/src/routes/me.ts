import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';

export const meRouter: Router = Router();

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

// ---------------------------------------------------------------------------
// Settings endpoints — stubs (Phase 1 scaffold; real persistence in Phase 2)
// ---------------------------------------------------------------------------

const putProfileSchema = z.object({
  displayName: z.string().min(1).max(120),
  handle: z.string().min(2).max(40).regex(/^[a-z0-9_-]+$/),
  location: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  specialties: z.array(z.string()).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

meRouter.get(
  '/me/profile',
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthorized('Not authenticated');
    res.json({
      data: {
        displayName: '',
        handle: '',
        location: '',
        bio: '',
        specialties: [] as string[],
        avatarUrl: null as string | null,
      },
      error: null,
    });
  }),
);

meRouter.put(
  '/me/profile',
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthorized('Not authenticated');
    const body = putProfileSchema.parse(req.body);
    res.json({ data: body, error: null });
  }),
);

meRouter.get(
  '/me/domain',
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthorized('Not authenticated');
    res.json({
      data: { subdomain: 'handle.blueflutes.com', customDomain: null, status: 'none' },
      error: null,
    });
  }),
);

const domainVerifySchema = z.object({ domain: z.string().min(3).max(253) });

/** Stub: returns { status: 'pending' }. Actual DNS verification is server-side
 *  (never trusts a client-sent domain claim directly). */
meRouter.post(
  '/me/domain/verify',
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthorized('Not authenticated');
    domainVerifySchema.parse(req.body);
    res.json({ data: { status: 'pending' }, error: null });
  }),
);

const notifSchema = z.object({
  newOrder: z.boolean().optional(),
  newMessage: z.boolean().optional(),
  clientSelects: z.boolean().optional(),
  newFollower: z.boolean().optional(),
});

meRouter.get(
  '/me/notifications',
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthorized('Not authenticated');
    res.json({
      data: { newOrder: true, newMessage: true, clientSelects: true, newFollower: false },
      error: null,
    });
  }),
);

meRouter.put(
  '/me/notifications',
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthorized('Not authenticated');
    const body = notifSchema.parse(req.body);
    res.json({ data: body, error: null });
  }),
);

meRouter.get(
  '/me/invoices',
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthorized('Not authenticated');
    res.json({
      data: [
        { date: '2026-10-01', amountMinorUnits: 1400, currency: 'USD', pdfUrl: null },
        { date: '2026-09-01', amountMinorUnits: 1400, currency: 'USD', pdfUrl: null },
        { date: '2026-08-01', amountMinorUnits: 1400, currency: 'USD', pdfUrl: null },
      ],
      error: null,
    });
  }),
);
