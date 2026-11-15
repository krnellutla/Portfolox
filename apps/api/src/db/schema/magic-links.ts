import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const magicLinks = pgTable(
  'magic_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('magic_links_tenant_email_idx').on(table.tenantId, table.email),
    index('magic_links_expires_at_idx').on(table.expiresAt),
  ],
);
