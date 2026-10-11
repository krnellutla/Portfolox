import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, char } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

// print_options — per-tenant print SKUs (set by photographer or platform admin)
export const printOptions = pgTable('print_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  photoId: uuid('photo_id').notNull(),
  size: text('size').notNull(),
  kind: text('kind').notNull(),
  framed: boolean('framed').notNull().default(false),
  price: integer('price').notNull(),       // minor units
  printCost: integer('print_cost').notNull(),
  currency: char('currency', { length: 3 }).notNull().default('USD'),
  editionSize: integer('edition_size'),    // null = open edition
  editionSold: integer('edition_sold').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// carts — one per (tenant, guest session OR user)
export const carts = pgTable('carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id'),                 // null for guests
  sessionToken: text('session_token'),     // httpOnly cookie value for guests
  currency: char('currency', { length: 3 }).notNull().default('USD'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// cart_items
export const cartItems = pgTable('cart_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  photoId: uuid('photo_id').notNull(),
  printOptionId: uuid('print_option_id').notNull().references(() => printOptions.id),
  qty: integer('qty').notNull().default(1),
  unitPrice: integer('unit_price').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// shipping_methods — stub data, per-tenant in future
export const shippingMethods = pgTable('shipping_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  label: text('label').notNull(),
  estimate: text('estimate').notNull(),
  price: integer('price').notNull(),
  currency: char('currency', { length: 3 }).notNull().default('USD'),
  sortOrder: integer('sort_order').notNull().default(0),
});

// orders
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: text('number').notNull().unique(),  // "BF-10482"
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  buyerEmail: text('buyer_email').notNull(),
  buyerName: text('buyer_name').notNull(),
  buyerUserId: uuid('buyer_user_id'),
  shippingAddressJson: jsonb('shipping_address_json').notNull(),
  shippingMethodId: uuid('shipping_method_id').notNull().references(() => shippingMethods.id),
  shippingPrice: integer('shipping_price').notNull(),
  subtotal: integer('subtotal').notNull(),
  tax: integer('tax').notNull().default(0),
  total: integer('total').notNull(),
  currency: char('currency', { length: 3 }).notNull().default('USD'),
  status: text('status').notNull().default('pending'),  // pending|paid|...
  timelineJson: jsonb('timeline_json').notNull().default('[]'),
  trackingUrl: text('tracking_url'),
  orderToken: text('order_token').notNull(),  // signed token for guest receipt link
  paymentIntentId: text('payment_intent_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// order_items — snapshot of cart at checkout
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  photoId: uuid('photo_id').notNull(),
  printOptionId: uuid('print_option_id').notNull().references(() => printOptions.id),
  title: text('title').notNull(),
  thumbUrl: text('thumb_url').notNull(),
  size: text('size').notNull(),
  kind: text('kind').notNull(),
  qty: integer('qty').notNull(),
  unitPrice: integer('unit_price').notNull(),
  printCost: integer('print_cost').notNull(),
});
