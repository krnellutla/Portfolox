import {
  photoSchema,
  likeResponseSchema,
  favoriteResponseSchema,
  commentListSchema,
  commentSchema,
} from '@blueflutes/shared';
import { apiFetch } from './client.js';

export function getPhoto(id: string) {
  return apiFetch(`/photos/${id}`, {}, photoSchema);
}

export function likePhoto(id: string) {
  return apiFetch(`/photos/${id}/like`, { method: 'POST' }, likeResponseSchema);
}

export function unlikePhoto(id: string) {
  return apiFetch(`/photos/${id}/like`, { method: 'DELETE' }, likeResponseSchema);
}

export function favoritePhoto(id: string) {
  return apiFetch(`/photos/${id}/favorite`, { method: 'POST' }, favoriteResponseSchema);
}

export function unfavoritePhoto(id: string) {
  return apiFetch(`/photos/${id}/favorite`, { method: 'DELETE' }, favoriteResponseSchema);
}

export function getComments(id: string) {
  return apiFetch(`/photos/${id}/comments`, {}, commentListSchema);
}

export function postComment(id: string, body: string) {
  return apiFetch(
    `/photos/${id}/comments`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) },
    commentSchema,
  );
}
