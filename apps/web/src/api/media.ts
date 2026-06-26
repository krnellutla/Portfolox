import { mediaListResponseSchema, type MediaListResponse } from '@portfoliohub/shared';
import { apiFetch } from './client.js';

export function getNodeMedia(nodeId: string): Promise<MediaListResponse> {
  return apiFetch<MediaListResponse>(
    `/media?nodeId=${encodeURIComponent(nodeId)}`,
    { method: 'GET' },
    mediaListResponseSchema,
  );
}
