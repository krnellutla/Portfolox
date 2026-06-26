import { z } from 'zod';
import {
  spaceCountSchema,
  postFeedSchema,
  feedPostSchema,
  likeResponseSchema,
  commentListSchema,
} from '@portfoliohub/shared';
import { apiFetch } from './client.js';

export function getSpaces() {
  return apiFetch('/community/spaces', {}, z.array(spaceCountSchema));
}

export function getPosts(space?: string, cursor?: string) {
  const sp = new URLSearchParams();
  if (space) sp.set('space', space);
  if (cursor) sp.set('cursor', cursor);
  const qs = sp.toString() ? `?${sp.toString()}` : '';
  return apiFetch(`/community/posts${qs}`, {}, postFeedSchema);
}

export function createPost(data: { body: string; photoIds?: string[]; space: string }) {
  return apiFetch(
    '/community/posts',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    feedPostSchema,
  );
}

export function likePost(id: string) {
  return apiFetch(`/community/posts/${id}/like`, { method: 'POST' }, likeResponseSchema);
}

export function unlikePost(id: string) {
  return apiFetch(`/community/posts/${id}/like`, { method: 'DELETE' }, likeResponseSchema);
}

export function getPostComments(id: string) {
  return apiFetch(`/community/posts/${id}/comments`, {}, commentListSchema);
}
