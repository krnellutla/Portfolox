import { z } from 'zod';

export const analyticsRange = z.enum(['30d', '90d', 'all']);
export type AnalyticsRange = z.infer<typeof analyticsRange>;

export const analyticsSummarySchema = z.object({
  range: analyticsRange,
  views: z.number(),
  conversionPct: z.number(),
  avgOrder: z.number(),
  revenue: z.number(),
  deltas: z.object({
    views: z.number(),
    conversion: z.number(),
    avgOrder: z.number(),
    revenue: z.number(),
  }),
});
export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;

export const revenueSeriesSchema = z.array(z.object({
  month: z.string(),
  revenue: z.number(),
}));
export type RevenueSeries = z.infer<typeof revenueSeriesSchema>;

export const photoPerformanceSchema = z.object({
  photoId: z.string(),
  title: z.string(),
  code: z.string(),
  thumbUrl: z.string(),
  views: z.number(),
  sales: z.number(),
  revenue: z.number(),
  conversionPct: z.number(),
  trend: z.array(z.number()),
});
export type PhotoPerformance = z.infer<typeof photoPerformanceSchema>;

export const funnelStageSchema = z.object({
  label: z.string(),
  value: z.number(),
  pctOfTop: z.number(),
});
export type FunnelStage = z.infer<typeof funnelStageSchema>;

export const buyerSummarySchema = z.object({
  buyerHandle: z.string(),
  avatarUrl: z.string().nullable(),
  orders: z.number(),
  spent: z.number(),
});
export type BuyerSummary = z.infer<typeof buyerSummarySchema>;
