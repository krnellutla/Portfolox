import {
  nodeListResponseSchema,
  nodeResponseSchema,
  type CreateNodeRequest,
  type MoveNodeRequest,
  type NodeListResponse,
  type NodeResponse,
  type UpdateNodeRequest,
} from '@blueflutes/shared';
import { z } from 'zod';
import { apiFetch } from './client.js';

export function listNodes(): Promise<NodeListResponse> {
  return apiFetch<NodeListResponse>('/nodes', { method: 'GET' }, nodeListResponseSchema);
}

export function createNode(body: CreateNodeRequest): Promise<NodeResponse> {
  return apiFetch<NodeResponse>(
    '/nodes',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    nodeResponseSchema,
  );
}

export function updateNode(id: string, body: UpdateNodeRequest): Promise<NodeResponse> {
  return apiFetch<NodeResponse>(
    `/nodes/${id}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    nodeResponseSchema,
  );
}

export function deleteNode(id: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(
    `/nodes/${id}`,
    { method: 'DELETE' },
    z.object({ id: z.string().uuid() }),
  );
}

export function moveNode(id: string, body: MoveNodeRequest): Promise<NodeResponse> {
  return apiFetch<NodeResponse>(
    `/nodes/${id}/move`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    nodeResponseSchema,
  );
}
