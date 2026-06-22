import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { nodes } from './nodes.js';
import { tenants } from './tenants.js';

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    nodeId: uuid('node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    objectKey: text('object_key').notNull(),
    url: text('url').notNull(),
    mimeType: text('mime_type').notNull(),
    status: text('status').notNull().default('pending'),
    position: integer('position').notNull().default(0),
    originalFilename: text('original_filename').notNull(),
    byteSize: integer('byte_size').notNull(),
    checksum: text('checksum'),
    width: integer('width'),
    height: integer('height'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('media_assets_tenant_node_position_idx').on(
      table.tenantId,
      table.nodeId,
      table.position,
    ),
  ],
);
