import { z } from 'zod';
import { clientGallerySchema, galleryProtectResultSchema } from '@blueflutes/shared';
import { apiFetch, ApiError } from './client.js';

export { ApiError };

/**
 * Fetch a client gallery. Throws ApiError with code GALLERY_LOCKED (status 403)
 * if the gallery is password-protected and not yet unlocked.
 */
export function getClientGallery(shareToken: string) {
  return apiFetch(`/client/${shareToken}`, {}, clientGallerySchema);
}

/**
 * Attempt to unlock a password-protected gallery.
 * On success the server sets an httpOnly cookie granting access.
 * Throws ApiError with code INVALID_PASSWORD (status 401) on wrong password.
 */
export function unlockGallery(shareToken: string, password: string) {
  return apiFetch(
    `/client/${shareToken}/unlock`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) },
    z.object({ ok: z.boolean() }),
  );
}

/**
 * Set or clear a password on a studio gallery.
 * Requires authentication. Returns shareToken and protection status.
 */
export function protectGallery(galleryId: string, password: string | null) {
  return apiFetch(
    `/me/galleries/${galleryId}/protect`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) },
    galleryProtectResultSchema,
  );
}

/** Build the public share URL for a gallery share token */
export function galleryShareUrl(shareToken: string): string {
  return `${window.location.origin}/gallery/${shareToken}`;
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
