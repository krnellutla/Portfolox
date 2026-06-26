import { z } from 'zod';
import { clientGallerySchema } from '@portfoliohub/shared';
import { apiFetch } from './client.js';

export function getClientGallery(shareToken: string) {
  return apiFetch(`/client/${shareToken}`, {}, clientGallerySchema);
}

export function addFavorites(shareToken: string, photoIds: string[]) {
  return apiFetch(
    `/client/${shareToken}/favorites`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoIds }) },
    z.object({ ok: z.boolean() }),
  );
}
