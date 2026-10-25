import { Router } from 'express';
import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { z } from 'zod';

const pbkdf2Async = promisify(pbkdf2);
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';

export const clientGalleryRouter: Router = Router();

// ---------------------------------------------------------------------------
// Simple bcrypt-compatible password helpers using Node built-ins.
// We use PBKDF2 with a random salt stored as "pbkdf2:<salt>:<hash>".
// ---------------------------------------------------------------------------
const HASH_ITERS = 100_000;
const HASH_LEN = 64;
const HASH_ALGO = 'sha512';

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await pbkdf2Async(password, salt, HASH_ITERS, HASH_LEN, HASH_ALGO);
  return `pbkdf2:${salt}:${key.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false;
  const salt = parts[1]!;
  const expectedHex = parts[2]!;
  const key = await pbkdf2Async(password, salt, HASH_ITERS, HASH_LEN, HASH_ALGO);
  const b = Buffer.from(expectedHex, 'hex');
  if (key.length !== b.length) return false;
  return timingSafeEqual(key, b);
}

// Export for re-use in galleries route
export { hashPassword, verifyPassword };

// ---------------------------------------------------------------------------
// GET /client/:shareToken
// ---------------------------------------------------------------------------
clientGalleryRouter.get('/client/:shareToken', asyncHandler(async (req, res) => {
  if (!req.withTenant) throw AppError.notFound('Tenant not found');
  const { shareToken } = req.params;

  const nodeRow = await req.withTenant((client) =>
    client.query(
      `SELECT id, name, tenant_id, is_password_protected FROM nodes WHERE share_token = $1 AND type = 'gallery'`,
      [shareToken],
    ),
  );

  if (!nodeRow.rows[0]) throw AppError.notFound('Client gallery not found');
  const node = nodeRow.rows[0] as {
    id: string;
    name: string;
    tenant_id: string;
    is_password_protected: boolean;
  };

  // Password gate check
  if (node.is_password_protected) {
    const cookieName = `gallery_${shareToken}_unlocked`;
    const cookie = req.cookies?.[cookieName];
    if (cookie !== '1') {
      res.status(403).json({
        data: null,
        error: { code: 'GALLERY_LOCKED', message: 'This gallery is password protected' },
      });
      return;
    }
  }

  const mediaRows = await req.withTenant((client) =>
    client.query(`SELECT id FROM media_assets WHERE node_id = $1 AND status = 'published' ORDER BY position`, [node.id]),
  );

  res.json({
    data: {
      id: node.id,
      photographerId: node.tenant_id,
      title: node.name,
      description: '',
      coverPhotoId: null,
      visibility: 'private',
      layout: 'grid',
      printsForSale: false,
      photoOrder: (mediaRows.rows as { id: string }[]).map((r) => r.id),
      counts: { frames: mediaRows.rows.length, views: 0 },
      clientName: 'Client',
      shareToken,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      allowDownload: true,
      favoritePhotoIds: [],
      viewerRole: 'client',
      selectLimit: null,
      selectsSubmittedAt: null,
      expired: false,
    },
    error: null,
  });
}));

// ---------------------------------------------------------------------------
// POST /client/:shareToken/unlock
// ---------------------------------------------------------------------------
const unlockSchema = z.object({ password: z.string().min(1) });

clientGalleryRouter.post('/client/:shareToken/unlock', asyncHandler(async (req, res) => {
  if (!req.withTenant) throw AppError.notFound('Tenant not found');
  const { shareToken } = req.params;
  const { password } = unlockSchema.parse(req.body);

  const nodeRow = await req.withTenant((client) =>
    client.query(
      `SELECT id, password_hash, is_password_protected FROM nodes WHERE share_token = $1 AND type = 'gallery'`,
      [shareToken],
    ),
  );
  if (!nodeRow.rows[0]) throw AppError.notFound('Gallery not found');

  const node = nodeRow.rows[0] as {
    id: string;
    password_hash: string | null;
    is_password_protected: boolean;
  };

  if (!node.is_password_protected || !node.password_hash) {
    // Not protected — no unlock needed, just grant access
    res.json({ data: { ok: true }, error: null });
    return;
  }

  const valid = await verifyPassword(password, node.password_hash);
  if (!valid) {
    res.status(401).json({
      data: null,
      error: { code: 'INVALID_PASSWORD', message: 'Incorrect password' },
    });
    return;
  }

  const cookieName = `gallery_${shareToken}_unlocked`;
  res.cookie(cookieName, '1', {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  res.json({ data: { ok: true }, error: null });
}));

const favoritesSchema = z.object({ photoIds: z.array(z.string()) });

// Legacy POST (kept for backward compat)
clientGalleryRouter.post('/client/:shareToken/favorites', asyncHandler(async (req, res) => {
  favoritesSchema.parse(req.body);
  res.json({ data: { ok: true }, error: null });
}));

// PUT /client/:shareToken/favorites — replaces full favorites list
clientGalleryRouter.put('/client/:shareToken/favorites', asyncHandler(async (req, res) => {
  const { photoIds } = favoritesSchema.parse(req.body);
  res.json({ data: { favoritePhotoIds: photoIds }, error: null });
}));

// POST /client/:shareToken/submit — submit selects
clientGalleryRouter.post('/client/:shareToken/submit', asyncHandler(async (req, res) => {
  res.json({ data: { selectsSubmittedAt: new Date().toISOString() }, error: null });
}));

// POST /client/:shareToken/download — download zip
const downloadSchema = z.object({ photoIds: z.array(z.string()).optional() });
clientGalleryRouter.post('/client/:shareToken/download', asyncHandler(async (req, res) => {
  downloadSchema.parse(req.body);
  res.json({ data: { url: 'https://download.example.com/stub.zip' }, error: null });
}));
