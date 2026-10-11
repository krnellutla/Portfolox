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


export const checkoutPrintSchema = z.object({
  photoId: z.string(),
  printOptionId: z.string(),
  qty: z.number().int().positive(),
});

export const checkoutSubscribeSchema = z.object({ plan: planTier });
