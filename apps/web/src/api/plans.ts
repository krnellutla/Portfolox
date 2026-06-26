import { z } from 'zod';
import { planSchema, printOptionSchema } from '@portfoliohub/shared';
import { apiFetch } from './client.js';

export function getPlans() {
  return apiFetch('/plans', {}, z.array(planSchema));
}

export function getPrintOptions() {
  return apiFetch('/print-options', {}, z.array(printOptionSchema));
}

export function checkoutPrint(data: { photoId: string; printOptionId: string; qty: number }) {
  return apiFetch(
    '/checkout/print',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    z.object({ url: z.string() }),
  );
}

export function checkoutSubscribe(plan: string) {
  return apiFetch(
    '/checkout/subscribe',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) },
    z.object({ url: z.string() }),
  );
}
