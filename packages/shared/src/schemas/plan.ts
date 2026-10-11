import { z } from 'zod';
import { planTier } from './photographer.js';

export const planSchema = z.object({
  tier: planTier,
  name: z.string(),
  priceMonthly: z.number(),
  priceAnnual: z.number().optional(),
  tagline: z.string(),
  commissionPct: z.number(),
  features: z.array(z.string()),
  highlighted: z.boolean(),
});
export type Plan = z.infer<typeof planSchema>;

export const printOptionSchema = z.object({
  id: z.string(),
  size: z.string(),
  kind: z.string(),
  basePrice: z.number(),
  framed: z.boolean().optional(),
});
export type PrintOption = z.infer<typeof printOptionSchema>;

export const orderSchema = z.object({
  id: z.string(),
  buyerHandle: z.string(),
  photoId: z.string(),
  printOptionId: z.string(),
  amount: z.number(),
  createdAt: z.string(),
});
export type Order = z.infer<typeof orderSchema>;

export const orderStatusSchema = z.enum(['paid', 'in_production', 'shipped', 'delivered', 'refunded']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderItemSchema = z.object({
  id: z.string(),
  printOptionId: z.string(),
  title: z.string(),
  size: z.string(),
  thumbUrl: z.string().nullable(),
  qty: z.number(),
  unitPrice: z.number(),
  printCost: z.number(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderTimelineStepSchema = z.object({
  status: orderStatusSchema,
  at: z.string().nullable(),
});
export type OrderTimelineStep = z.infer<typeof orderTimelineStepSchema>;

export const orderPayoutSchema = z.object({
  subtotal: z.number(),
  printCost: z.number(),
  commission: z.number(),
  commissionPct: z.number(),
  amount: z.number(),
});
export type OrderPayout = z.infer<typeof orderPayoutSchema>;

export const orderV2Schema = z.object({
  id: z.string(),
  number: z.string(),
  buyerHandle: z.string(),
  buyerEmail: z.string().nullable(),
  status: orderStatusSchema,
  subtotal: z.number(),
  items: z.array(orderItemSchema),
  timeline: z.array(orderTimelineStepSchema),
  shippingAddress: z.object({
    name: z.string(),
    line1: z.string(),
    line2: z.string().nullable(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string(),
  }).nullable(),
  trackingUrl: z.string().nullable(),
  payout: orderPayoutSchema,
  createdAt: z.string(),
});
export type OrderV2 = z.infer<typeof orderV2Schema>;

export const checkoutPrintSchema = z.object({
  photoId: z.string(),
  printOptionId: z.string(),
  qty: z.number().int().positive(),
});

export const checkoutSubscribeSchema = z.object({ plan: planTier });
