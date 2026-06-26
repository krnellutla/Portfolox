import { z } from 'zod';
import {
  analyticsSummarySchema,
  revenueSeriesSchema,
  photoPerformanceSchema,
  funnelStageSchema,
  buyerSummarySchema,
  orderSchema,
} from '@blueflutes/shared';
import { apiFetch } from './client.js';

export function getSummary(range: string) {
  return apiFetch(`/me/analytics/summary?range=${range}`, {}, analyticsSummarySchema);
}

export function getRevenue(range: string) {
  return apiFetch(`/me/analytics/revenue?range=${range}`, {}, revenueSeriesSchema);
}

export function getPhotoPerformance(range: string, sort = 'views') {
  return apiFetch(
    `/me/analytics/photos?range=${range}&sort=${sort}`,
    {},
    z.array(photoPerformanceSchema),
  );
}

export function getFunnel(range: string) {
  return apiFetch(`/me/analytics/funnel?range=${range}`, {}, z.array(funnelStageSchema));
}

export function getBuyers(range: string) {
  return apiFetch(`/me/analytics/buyers?range=${range}`, {}, z.array(buyerSummarySchema));
}

export function getRecentSales() {
  return apiFetch('/me/sales/recent', {}, z.array(orderSchema));
}
