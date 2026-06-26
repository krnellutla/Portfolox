import type { ApiEnvelope, NodeListResponse } from '@blueflutes/shared';
import { nodeListResponseSchema } from '@blueflutes/shared';
import { Router } from 'express';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';

export const nodesRouter: Router = Router();

/**
 * Public, read-only listing of a tenant's node hierarchy (folders/galleries/
 * pages). Mounted before requireAuth so the portfolio viewer can render
 * without a Bearer token; tenant scoping comes entirely from host-based
 * resolution + RLS via req.withTenant.
 */
nodesRouter.get(
  '/nodes',
  asyncHandler(async (req, res) => {
    if (!req.tenant || !req.withTenant) {
      throw AppError.notFound('Tenant not found for this host');
    }

    const rows = await req.withTenant((client) =>
      client.query(
        `SELECT id, parent_id, type, name, slug, position, created_at, updated_at
         FROM nodes
         ORDER BY parent_id NULLS FIRST, position`,
      ),
    );

    const nodes: NodeListResponse = nodeListResponseSchema.parse(
      rows.rows.map((row) => ({
        id: row.id,
        parentId: row.parent_id,
        type: row.type,
        name: row.name,
        slug: row.slug,
        position: row.position,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    );

    const body: ApiEnvelope<NodeListResponse> = { data: nodes, error: null };
    res.json(body);
  }),
);
