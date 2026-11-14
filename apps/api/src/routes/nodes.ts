import type { ApiEnvelope, NodeListResponse } from '@blueflutes/shared';
import { nodeListResponseSchema } from '@blueflutes/shared';
import { asc, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Router } from 'express';
import * as schema from '../db/schema/index.js';
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

    const rows = await req.withTenant((client) => {
      const db = drizzle(client, { schema });
      return db
        .select({
          id: schema.nodes.id,
          parentId: schema.nodes.parentId,
          type: schema.nodes.type,
          name: schema.nodes.name,
          slug: schema.nodes.slug,
          position: schema.nodes.position,
          createdAt: schema.nodes.createdAt,
          updatedAt: schema.nodes.updatedAt,
        })
        .from(schema.nodes)
        .orderBy(sql`${schema.nodes.parentId} NULLS FIRST`, asc(schema.nodes.position));
    });

    const nodes: NodeListResponse = nodeListResponseSchema.parse(rows);

    const body: ApiEnvelope<NodeListResponse> = { data: nodes, error: null };
    res.json(body);
  }),
);
