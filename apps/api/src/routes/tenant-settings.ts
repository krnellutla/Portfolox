import {
  type ApiEnvelope,
  type ThemeTokens,
  themeTokensSchema,
  updateTenantSettingsRequestSchema,
} from '@blueflutes/shared';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Router } from 'express';
import * as schema from '../db/schema/index.js';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { validate } from '../lib/validate.js';

// Mirrors the DB column defaults so the public endpoint returns a valid theme
// even before the tenant has ever called PATCH /me/settings/theme.
const DEFAULT_THEME: ThemeTokens = {
  colorBg: '#f4f3f0',
  colorInk: '#16150f',
  colorAccent: '#c0683f',
  colorMuted: '#6b6960',
  fontHeading: 'newsreader',
  fontBody: 'hanken',
  galleryLayout: 'grid',
  gridColumns: 5,
};

type DrizzleSettings = typeof schema.tenantSettings.$inferSelect;

function rowToTheme(row: DrizzleSettings): ThemeTokens {
  return themeTokensSchema.parse({
    colorBg: row.colorBg,
    colorInk: row.colorInk,
    colorAccent: row.colorAccent,
    colorMuted: row.colorMuted,
    fontHeading: row.fontHeading,
    fontBody: row.fontBody,
    galleryLayout: row.galleryLayout,
    gridColumns: row.gridColumns,
  });
}

// ── Public router (no auth required) ────────────────────────────────────────

export const tenantSettingsPublicRouter: Router = Router();

tenantSettingsPublicRouter.get(
  '/theme',
  asyncHandler(async (req, res) => {
    if (!req.tenant || !req.withTenant) throw AppError.notFound('Tenant not found for this host');

    const row = await req.withTenant(async (client) => {
      const db = drizzle(client, { schema });
      const [found] = await db
        .select()
        .from(schema.tenantSettings)
        .where(eq(schema.tenantSettings.tenantId, req.tenant!.id));
      return found ?? null;
    });

    const theme = row ? rowToTheme(row) : DEFAULT_THEME;
    const body: ApiEnvelope<ThemeTokens> = { data: theme, error: null };
    res.json(body);
  }),
);

// ── Protected router (requireAuth applied in app.ts before this mounts) ─────

export const tenantSettingsRouter: Router = Router();

tenantSettingsRouter.get(
  '/me/settings',
  asyncHandler(async (req, res) => {
    if (!req.user || !req.tenant || !req.withTenant) throw AppError.unauthorized('Not authenticated');

    const row = await req.withTenant(async (client) => {
      const db = drizzle(client, { schema });
      const [found] = await db
        .select()
        .from(schema.tenantSettings)
        .where(eq(schema.tenantSettings.tenantId, req.tenant!.id));
      return found ?? null;
    });

    const theme = row ? rowToTheme(row) : DEFAULT_THEME;
    const body: ApiEnvelope<ThemeTokens> = { data: theme, error: null };
    res.json(body);
  }),
);

tenantSettingsRouter.patch(
  '/me/settings/theme',
  validate({ body: updateTenantSettingsRequestSchema }),
  asyncHandler(async (req, res) => {
    if (!req.user || !req.tenant || !req.withTenant) throw AppError.unauthorized('Not authenticated');

    const patch = req.body as {
      colorBg?: string;
      colorInk?: string;
      colorAccent?: string;
      colorMuted?: string;
      fontHeading?: string;
      fontBody?: string;
      galleryLayout?: string;
      gridColumns?: number;
    };

    const updated = await req.withTenant(async (client) => {
      const db = drizzle(client, { schema });
      const ts = schema.tenantSettings;
      const [row] = await db
        .insert(ts)
        .values({
          tenantId: req.tenant!.id,
          colorBg: patch.colorBg ?? DEFAULT_THEME.colorBg,
          colorInk: patch.colorInk ?? DEFAULT_THEME.colorInk,
          colorAccent: patch.colorAccent ?? DEFAULT_THEME.colorAccent,
          colorMuted: patch.colorMuted ?? DEFAULT_THEME.colorMuted,
          fontHeading: patch.fontHeading ?? DEFAULT_THEME.fontHeading,
          fontBody: patch.fontBody ?? DEFAULT_THEME.fontBody,
          galleryLayout: patch.galleryLayout ?? DEFAULT_THEME.galleryLayout,
          gridColumns: patch.gridColumns ?? DEFAULT_THEME.gridColumns,
        })
        .onConflictDoUpdate({
          target: ts.tenantId,
          set: {
            ...(patch.colorBg !== undefined ? { colorBg: patch.colorBg } : {}),
            ...(patch.colorInk !== undefined ? { colorInk: patch.colorInk } : {}),
            ...(patch.colorAccent !== undefined ? { colorAccent: patch.colorAccent } : {}),
            ...(patch.colorMuted !== undefined ? { colorMuted: patch.colorMuted } : {}),
            ...(patch.fontHeading !== undefined ? { fontHeading: patch.fontHeading } : {}),
            ...(patch.fontBody !== undefined ? { fontBody: patch.fontBody } : {}),
            ...(patch.galleryLayout !== undefined ? { galleryLayout: patch.galleryLayout } : {}),
            ...(patch.gridColumns !== undefined ? { gridColumns: patch.gridColumns } : {}),
            updatedAt: new Date(),
          },
        })
        .returning();
      return row!;
    });

    const theme = rowToTheme(updated);
    const body: ApiEnvelope<ThemeTokens> = { data: theme, error: null };
    res.json(body);
  }),
);
