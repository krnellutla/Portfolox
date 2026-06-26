import {
  type ApiEnvelope,
  type ThemeTokens,
  themeTokensSchema,
  updateTenantSettingsRequestSchema,
} from '@blueflutes/shared';
import { Router } from 'express';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { validate } from '../lib/validate.js';

// Mirrors the DB column defaults so the public endpoint returns a valid theme
// even before the tenant has ever called PATCH /me/settings/theme.
const DEFAULT_THEME: ThemeTokens = {
  colorBg: '#f4f3f0',
  colorInk: '#16150f',
  colorAccent: '#c0683f',
  colorMuted: '#9a988f',
  fontHeading: 'newsreader',
  fontBody: 'hanken',
  galleryLayout: 'grid',
  gridColumns: 5,
};

function rowToTheme(row: Record<string, unknown>): ThemeTokens {
  return themeTokensSchema.parse({
    colorBg: row.color_bg,
    colorInk: row.color_ink,
    colorAccent: row.color_accent,
    colorMuted: row.color_muted,
    fontHeading: row.font_heading,
    fontBody: row.font_body,
    galleryLayout: row.gallery_layout,
    gridColumns: row.grid_columns,
  });
}

// ── Public router (no auth required) ────────────────────────────────────────

export const tenantSettingsPublicRouter: Router = Router();

tenantSettingsPublicRouter.get(
  '/theme',
  asyncHandler(async (req, res) => {
    if (!req.tenant || !req.withTenant) throw AppError.notFound('Tenant not found for this host');

    const result = await req.withTenant((client) =>
      client.query('SELECT * FROM tenant_settings WHERE tenant_id = $1', [req.tenant!.id]),
    );

    const theme = result.rows[0]
      ? rowToTheme(result.rows[0] as Record<string, unknown>)
      : DEFAULT_THEME;
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

    const result = await req.withTenant((client) =>
      client.query('SELECT * FROM tenant_settings WHERE tenant_id = $1', [req.tenant!.id]),
    );

    const theme = result.rows[0]
      ? rowToTheme(result.rows[0] as Record<string, unknown>)
      : DEFAULT_THEME;
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

    const result = await req.withTenant((client) =>
      client.query(
        `INSERT INTO tenant_settings
           (tenant_id, color_bg, color_ink, color_accent, color_muted,
            font_heading, font_body, gallery_layout, grid_columns)
         VALUES
           ($1,
            COALESCE($2, '#f4f3f0'), COALESCE($3, '#16150f'),
            COALESCE($4, '#c0683f'), COALESCE($5, '#9a988f'),
            COALESCE($6, 'newsreader'), COALESCE($7, 'hanken'),
            COALESCE($8, 'grid'), COALESCE($9, 5))
         ON CONFLICT (tenant_id) DO UPDATE SET
           color_bg       = COALESCE($2, tenant_settings.color_bg),
           color_ink      = COALESCE($3, tenant_settings.color_ink),
           color_accent   = COALESCE($4, tenant_settings.color_accent),
           color_muted    = COALESCE($5, tenant_settings.color_muted),
           font_heading   = COALESCE($6, tenant_settings.font_heading),
           font_body      = COALESCE($7, tenant_settings.font_body),
           gallery_layout = COALESCE($8, tenant_settings.gallery_layout),
           grid_columns   = COALESCE($9, tenant_settings.grid_columns),
           updated_at     = NOW()
         RETURNING *`,
        [
          req.tenant!.id,
          patch.colorBg ?? null,
          patch.colorInk ?? null,
          patch.colorAccent ?? null,
          patch.colorMuted ?? null,
          patch.fontHeading ?? null,
          patch.fontBody ?? null,
          patch.galleryLayout ?? null,
          patch.gridColumns ?? null,
        ],
      ),
    );

    const theme = rowToTheme(result.rows[0] as Record<string, unknown>);
    const body: ApiEnvelope<ThemeTokens> = { data: theme, error: null };
    res.json(body);
  }),
);
