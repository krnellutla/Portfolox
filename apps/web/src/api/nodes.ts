import { nodeListResponseSchema, type NodeListResponse } from '@portfoliohub/shared';
import { apiFetch } from './client.js';

export function listNodes(): Promise<NodeListResponse> {
  return apiFetch<NodeListResponse>('/nodes', { method: 'GET' }, nodeListResponseSchema);
}
