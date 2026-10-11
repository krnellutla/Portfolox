import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';

export const analyticsRouter: Router = Router();

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const REVENUE_DATA = [8400, 9200, 7800, 11200, 12800, 10400, 13600, 14200, 11800, 15400, 16800, 18200];

// Canonical stub data (internally consistent per R8)
// photo views 48,210 → lightbox opens 19,440 (40%) → added to cart 2,910 (6%) → purchases 128 (0.3%)
// conversion = 128 / 48210 = 0.27%
// revenue = 323,968 cents total; avg order = 323968 / 128 = 2531 cents
const PHOTO_ROWS = [
  { title: 'Northbound',        views: 8210, sales: 42, revenue: 106242, conversionPct: 0.51 },
  { title: 'Golden Hour',       views: 7540, sales: 31, revenue:  78431, conversionPct: 0.41 },
  { title: 'Blue Ridge Dawn',   views: 6820, sales: 19, revenue:  48089, conversionPct: 0.28 },
  { title: 'Midnight Forest',   views: 5900, sales: 14, revenue:  35434, conversionPct: 0.24 },
  { title: 'Coastal Fog',       views: 5210, sales: 10, revenue:  25310, conversionPct: 0.19 },
  { title: 'Storm Over Plains', views: 4830, sales:  6, revenue:  15186, conversionPct: 0.12 },
  { title: 'Autumn Valley',     views: 4820, sales:  4, revenue:  10124, conversionPct: 0.08 },
  { title: 'Winter Lake',       views: 4880, sales:  2, revenue:   5152, conversionPct: 0.04 },
];

// Distinct Unsplash photo IDs for thumbnails
const THUMB_IDS = [
  'photo-1506905925346-21bda4d32df4',
  'photo-1470770903676-69b98201ea1c',
  'photo-1433838552652-f9aedb3a07b5',
  'photo-1448375240586-882707db888b',
  'photo-1505765050516-f72dcac9c60e',
  'photo-1504701954957-2010ec3bcec1',
  'photo-1519681393784-d120267933ba',
  'photo-1418065460487-3e41a6c84dc5',
];

analyticsRouter.get('/me/analytics/summary', asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Not authenticated');
  const range = (req.query.range as string) ?? '30d';
  res.json({
    data: {
      range,
      profileViews: 12400,
      photoViews: 48210,
      lightboxOpens: 19440,
      addedToCart: 2910,
      purchases: 128,
      conversionPct: 0.27,
      avgOrderMinorUnits: 2531,
      revenue: 323968,
      currency: 'USD',
      deltas: {
        profileViews: 0.18,
        photoViews: 0.22,
        conversion: 0.05,
        avgOrder: 0.08,
        revenue: 0.22,
      },
    },
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
  if (!req.user) throw AppError.unauthorized('Not authenticated');

  res.json({
    data: PHOTO_ROWS.map((r, i) => ({
      photoId: `stub-photo-${i + 1}`,
      title: r.title,
      code: `PFX-${String(i + 1).padStart(6, '0')}`,
      thumbUrl: `https://images.unsplash.com/${THUMB_IDS[i]}?w=200`,
      views: r.views,
      sales: r.sales,
      revenue: r.revenue,
      conversionPct: r.conversionPct,
      trend: [4, 7, 5, 9, 6, 8, 11].map((v) => v + i),
    })),
    error: null,
  });
}));

analyticsRouter.get('/me/analytics/funnel', asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Not authenticated');
  res.json({
    data: [
      { label: 'Profile views',  value: 12400, pctOfTop: 1.0,   isSeparate: true },
      { label: 'Photo views',    value: 48210, pctOfTop: 1.0 },
      { label: 'Lightbox opens', value: 19440, pctOfTop: 0.403 },
      { label: 'Added to cart',  value:  2910, pctOfTop: 0.060 },
      { label: 'Purchases',      value:   128, pctOfTop: 0.003 },
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
