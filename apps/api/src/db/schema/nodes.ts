import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const nodes = pgTable(
  'nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => nodes.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['folder', 'gallery', 'page'] }).notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('nodes_tenant_parent_idx').on(table.tenantId, table.parentId),
    uniqueIndex('nodes_tenant_parent_slug_idx').on(table.tenantId, table.parentId, table.slug),
  ],
);
