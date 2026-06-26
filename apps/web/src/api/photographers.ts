import { z } from 'zod';
import {
  photographerSchema,
  followResponseSchema,
  gallerySchema,
  paginatedPhotosSchema,
} from '@portfoliohub/shared';
import { apiFetch } from './client.js';

export function getProfile(handle: string) {
  return apiFetch(`/photographers/${handle}`, {}, photographerSchema);
}

export function getGalleries(handle: string) {
  return apiFetch(`/photographers/${handle}/galleries`, {}, z.array(gallerySchema));
}

export function getPhotos(handle: string, galleryId?: string) {
  const qs = galleryId ? `?gallery=${encodeURIComponent(galleryId)}` : '';
  return apiFetch(`/photographers/${handle}/photos${qs}`, {}, paginatedPhotosSchema);
}

export function follow(photographerId: string) {
  return apiFetch(`/photographers/${photographerId}/follow`, { method: 'POST' }, followResponseSchema);
}

export function unfollow(photographerId: string) {
  return apiFetch(`/photographers/${photographerId}/follow`, { method: 'DELETE' }, followResponseSchema);
}
