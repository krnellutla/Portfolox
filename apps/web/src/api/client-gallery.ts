import { z } from 'zod';
import { clientGallerySchema } from '@blueflutes/shared';
import { apiFetch } from './client.js';

export function getClientGallery(shareToken: string) {
  return apiFetch(`/client/${shareToken}`, {}, clientGallerySchema);
}

// PUT /client/:shareToken/favorites — replaces full favorites list
export function updateFavorites(shareToken: string, photoIds: string[]) {
  return apiFetch(
    `/client/${shareToken}/favorites`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoIds }) },
    z.object({ favoritePhotoIds: z.array(z.string()) }),
  );
}

/** @deprecated use updateFavorites */
export function addFavorites(shareToken: string, photoIds: string[]) {
  return apiFetch(
    `/client/${shareToken}/favorites`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoIds }) },
    z.object({ ok: z.boolean() }),
  );
}

// POST /client/:shareToken/submit — submit selects
export function submitSelects(shareToken: string) {
  return apiFetch(
    `/client/${shareToken}/submit`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    z.object({ selectsSubmittedAt: z.string() }),
  );
}

// POST /client/:shareToken/download — download zip
export function downloadGallery(shareToken: string, photoIds?: string[]) {
  return apiFetch(
    `/client/${shareToken}/download`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photoIds ? { photoIds } : {}),
    },
    z.object({ url: z.string() }),
  );
}
