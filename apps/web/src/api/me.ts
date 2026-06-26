import { z } from 'zod';
import { photographerSchema, handleAvailableSchema, gallerySchema } from '@blueflutes/shared';
import { apiFetch } from './client.js';

export function getMe() {
  return apiFetch('/me', {}, photographerSchema);
}

export function updatePlan(plan: string) {
  return apiFetch(
    '/me/plan',
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) },
    photographerSchema,
  );
}

export function updateStudio(data: {
  displayName?: string;
  handle?: string;
  specialties?: string[];
  avatarUrl?: string;
}) {
  return apiFetch(
    '/me/studio',
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    photographerSchema,
  );
}

export function checkHandle(handle: string) {
  return apiFetch(`/handles/${encodeURIComponent(handle)}/available`, {}, handleAvailableSchema);
}

export function getMyGalleries() {
  return apiFetch('/me/galleries', {}, z.array(gallerySchema));
}

export function createGallery(title: string) {
  return apiFetch(
    '/me/galleries',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) },
    gallerySchema,
  );
}

export function reorderGallery(galleryId: string, photoOrder: string[]) {
  return apiFetch(
    `/me/galleries/${galleryId}/order`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoOrder }) },
    z.object({ ok: z.boolean() }),
  );
}

export function updateGallery(galleryId: string, patch: Partial<{ title: string; description: string; visibility: string; layout: string; printsForSale: boolean }>) {
  return apiFetch(
    `/me/galleries/${galleryId}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) },
    gallerySchema,
  );
}
