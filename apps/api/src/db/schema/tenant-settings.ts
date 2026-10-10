import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const tenantSettings = pgTable('tenant_settings', {
  tenantId: uuid('tenant_id')
    .primaryKey()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  colorBg: text('color_bg').notNull().default('#f4f3f0'),
  colorInk: text('color_ink').notNull().default('#16150f'),
  colorAccent: text('color_accent').notNull().default('#c0683f'),
  colorMuted: text('color_muted').notNull().default('#6b6960'),
  fontHeading: text('font_heading').notNull().default('newsreader'),
  fontBody: text('font_body').notNull().default('hanken'),
  galleryLayout: text('gallery_layout').notNull().default('grid'),
  gridColumns: integer('grid_columns').notNull().default(5),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
