import { createSelectSchema } from 'drizzle-zod';
import * as schema from './schema/index.js';

export const tenantRowSchema = createSelectSchema(schema.tenants);
export const tenantDomainRowSchema = createSelectSchema(schema.tenantDomains);
export const userRowSchema = createSelectSchema(schema.users);
export const tokenRowSchema = createSelectSchema(schema.tokens);
export const nodeRowSchema = createSelectSchema(schema.nodes);
export const mediaAssetRowSchema = createSelectSchema(schema.mediaAssets);
