import { z } from 'zod';
import { OrderV2Schema as orderV2Schema } from '@blueflutes/shared';
import { apiFetch } from './client.js';

export function getMyOrders(status?: string) {
  const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch(`/me/orders${qs}`, {}, z.array(orderV2Schema));
}

export function getMyOrder(id: string) {
  return apiFetch(`/me/orders/${encodeURIComponent(id)}`, {}, orderV2Schema);
}

export async function refundOrder(id: string) {
  return apiFetch(`/me/orders/${encodeURIComponent(id)}/refund`, { method: 'POST' }, orderV2Schema);
}
