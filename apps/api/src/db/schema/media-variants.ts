import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { mediaAssets } from './media-assets.js';
import { tenants } from './tenants.js';

export const mediaVariants = pgTable(
  'media_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    variant: text('variant').notNull(),
    objectKey: text('object_key').notNull(),
    url: text('url').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    byteSize: integer('byte_size').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('media_variants_asset_variant_idx').on(table.assetId, table.variant),
    index('media_variants_tenant_asset_idx').on(table.tenantId, table.assetId),
  ],
);
