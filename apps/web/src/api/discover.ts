import { z } from 'zod';
import { photographerSchema } from '@portfoliohub/shared';
import { paginatedPhotosSchema } from '@portfoliohub/shared';
import { apiFetch } from './client.js';

export function getFeatured() {
  return apiFetch('/discover/featured', {}, z.array(photographerSchema));
}

export function getFresh(cursor?: string) {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiFetch(`/discover/fresh${qs}`, {}, paginatedPhotosSchema);
}
