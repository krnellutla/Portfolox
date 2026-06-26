import { z } from 'zod';

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex color e.g. #f4f3f0');

export const fontTokenSchema = z.enum([
  'newsreader',
  'hanken',
  'spacemono',
  'system-serif',
  'system-sans',
]);

export const galleryLayoutSchema = z.enum(['grid', 'masonry', 'editorial']);

export const themeTokensSchema = z.object({
  colorBg: hexColorSchema,
  colorInk: hexColorSchema,
  colorAccent: hexColorSchema,
  colorMuted: hexColorSchema,
  fontHeading: fontTokenSchema,
  fontBody: fontTokenSchema,
  galleryLayout: galleryLayoutSchema,
  gridColumns: z.number().int().min(2).max(6),
});

export type ThemeTokens = z.infer<typeof themeTokensSchema>;

export const tenantSettingsSchema = z.object({
  tenantId: z.string().uuid(),
  colorBg: hexColorSchema,
  colorInk: hexColorSchema,
  colorAccent: hexColorSchema,
  colorMuted: hexColorSchema,
  fontHeading: fontTokenSchema,
  fontBody: fontTokenSchema,
  galleryLayout: galleryLayoutSchema,
  gridColumns: z.number().int().min(2).max(6),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type TenantSettings = z.infer<typeof tenantSettingsSchema>;

export const updateTenantSettingsRequestSchema = z.object({
  colorBg: hexColorSchema.optional(),
  colorInk: hexColorSchema.optional(),
  colorAccent: hexColorSchema.optional(),
  colorMuted: hexColorSchema.optional(),
  fontHeading: fontTokenSchema.optional(),
  fontBody: fontTokenSchema.optional(),
  galleryLayout: galleryLayoutSchema.optional(),
  gridColumns: z.number().int().min(2).max(6).optional(),
});

export type UpdateTenantSettingsRequest = z.infer<typeof updateTenantSettingsRequestSchema>;
