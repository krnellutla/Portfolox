import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { mediaAssets } from './media-assets.js';
import { tenants } from './tenants.js';

export const mediaVariants = pgTable('media_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  assetId: uuid('asset_id')
    .notNull()
    .references(() => mediaAssets.id, { onDelete: 'cascade' }),
  variant: text('variant').notNull(),
  url: text('url').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
