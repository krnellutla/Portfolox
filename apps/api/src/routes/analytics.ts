import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';

export const analyticsRouter: Router = Router();

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const REVENUE_DATA = [8400, 9200, 7800, 11200, 12800, 10400, 13600, 14200, 11800, 15400, 16800, 18200];

analyticsRouter.get('/me/analytics/summary', asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Not authenticated');
  const range = (req.query.range as string) ?? '30d';
  res.json({
    data: { range, views: 12400, conversionPct: 2.8, avgOrder: 4500, revenue: 128400, deltas: { views: 0.18, conversion: 0.3, avgOrder: 0.05, revenue: 0.22 } },
    error: null,
  });
}));

analyticsRouter.get('/me/analytics/revenue', asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Not authenticated');
  res.json({
    data: MONTHS.map((month, i) => ({ month, revenue: REVENUE_DATA[i] })),
    error: null,
  });
}));

analyticsRouter.get('/me/analytics/photos', asyncHandler(async (req, res) => {
  if (!req.user || !req.withTenant) throw AppError.unauthorized('Not authenticated');

  const rows = await req.withTenant((client) =>
    client.query(
      `SELECT id, url, original_filename FROM media_assets WHERE status = 'published' LIMIT 8`,
    ),
  );

  res.json({
    data: rows.rows.map((r, i) => ({
      photoId: r.id as string,
      title: (r.original_filename as string).replace(/\.[^.]+$/, ''),
      code: `PFX-${(r.id as string).slice(0, 6).toUpperCase()}`,
      thumbUrl: r.url as string,
      views: 1200 - i * 120,
      sales: 8 - i,
      revenue: 36000 - i * 4000,
      conversionPct: 2.8 - i * 0.2,
      trend: [4, 7, 5, 9, 6, 8, 11].map((v) => v + i),
    })),
    error: null,
  });
}));

analyticsRouter.get('/me/analytics/funnel', asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Not authenticated');
  res.json({
    data: [
      { label: 'Profile views', value: 12400, pctOfTop: 1 },
      { label: 'Photo views',   value: 8200,  pctOfTop: 0.66 },
      { label: 'Store visits',  value: 2100,  pctOfTop: 0.17 },
      { label: 'Purchases',     value: 347,   pctOfTop: 0.028 },
    ],
    error: null,
  });
}));

analyticsRouter.get('/me/analytics/buyers', asyncHandler(async (_req, res) => {
  res.json({ data: [], error: null });
}));

analyticsRouter.get('/me/sales/recent', asyncHandler(async (_req, res) => {
  res.json({ data: [], error: null });
}));
