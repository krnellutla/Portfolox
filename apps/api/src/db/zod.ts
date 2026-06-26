import { ALLOWED_MIME_TYPES, fontTokenSchema, galleryLayoutSchema } from '@portfoliohub/shared';
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import * as schema from './schema/index.js';

export const tenantRowSchema = createSelectSchema(schema.tenants);
export const tenantDomainRowSchema = createSelectSchema(schema.tenantDomains);
export const userRowSchema = createSelectSchema(schema.users);
export const tokenRowSchema = createSelectSchema(schema.tokens);
export const nodeRowSchema = createSelectSchema(schema.nodes);
export const mediaAssetRowSchema = createSelectSchema(schema.mediaAssets, {
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  status: z.enum(['pending', 'ready']),
});
export const tenantSettingsRowSchema = createSelectSchema(schema.tenantSettings, {
  fontHeading: fontTokenSchema,
  fontBody: fontTokenSchema,
  galleryLayout: galleryLayoutSchema,
});
