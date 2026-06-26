import {
  type ApiEnvelope,
  type NodeResponse,
  createNodeRequestSchema,
  moveNodeRequestSchema,
  nodeParamsSchema,
  nodeResponseSchema,
  updateNodeRequestSchema,
} from '@blueflutes/shared';
import { slugify } from '@blueflutes/shared';
import { Router } from 'express';
import { AppError } from '../lib/app-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { validate } from '../lib/validate.js';

const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === PG_UNIQUE_VIOLATION
  );
}

function mapNodeRow(row: Record<string, unknown>): NodeResponse {
  return nodeResponseSchema.parse({
    id: row.id,
    parentId: row.parent_id,
    type: row.type,
    name: row.name,
    slug: row.slug,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function createNodesWriteRouter(): Router {
  const router = Router();

  // ── POST /nodes ──────────────────────────────────────────────────────────

  router.post(
    '/nodes',
    validate({ body: createNodeRequestSchema }),
    asyncHandler(async (req, res) => {
      if (!req.tenant || !req.withTenant) {
        throw AppError.notFound('Tenant not found for this host');
      }

      const { type, name, parentId } = req.body as {
        type: string;
        name: string;
        slug?: string;
        parentId: string | null;
      };
      const slug: string = (req.body as { slug?: string }).slug ?? slugify(name);

      let node: NodeResponse;
      try {
        node = await req.withTenant(async (client) => {
          if (parentId !== null) {
            const parentRow = await client.query(
              'SELECT id, type FROM nodes WHERE id = $1',
              [parentId],
            );
            if (parentRow.rowCount === 0) {
              throw AppError.notFound('Parent node not found');
            }
            if ((parentRow.rows[0].type as string) !== 'folder') {
              throw AppError.validation('Parent must be a folder');
            }
          }

          const posRow = await client.query(
            `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
             FROM nodes
             WHERE parent_id IS NOT DISTINCT FROM $1`,
            [parentId],
          );
          const position = posRow.rows[0].next_pos as number;

          const row = await client.query(
            `INSERT INTO nodes (tenant_id, parent_id, type, name, slug, position)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, parent_id, type, name, slug, position, created_at, updated_at`,
            [req.tenant!.id, parentId, type, name, slug, position],
          );

          return mapNodeRow(row.rows[0]);
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw AppError.conflict('A node with this slug already exists at this level');
        }
        throw err;
      }

      const body: ApiEnvelope<NodeResponse> = { data: node, error: null };
      res.status(201).json(body);
    }),
  );

  // ── PATCH /nodes/:id ─────────────────────────────────────────────────────

  router.patch(
    '/nodes/:id',
    validate({ params: nodeParamsSchema, body: updateNodeRequestSchema }),
    asyncHandler(async (req, res) => {
      if (!req.tenant || !req.withTenant) {
        throw AppError.notFound('Tenant not found for this host');
      }

      const { id } = req.params as { id: string };
      const { name, slug } = req.body as { name?: string; slug?: string };

      const setClauses: string[] = ['updated_at = NOW()'];
      const values: unknown[] = [id];

      if (name !== undefined) {
        values.push(name);
        setClauses.push(`name = $${values.length}`);
      }
      if (slug !== undefined) {
        values.push(slug);
        setClauses.push(`slug = $${values.length}`);
      }

      let node: NodeResponse;
      try {
        node = await req.withTenant(async (client) => {
          const row = await client.query(
            `UPDATE nodes SET ${setClauses.join(', ')}
             WHERE id = $1
             RETURNING id, parent_id, type, name, slug, position, created_at, updated_at`,
            values,
          );
          if (row.rowCount === 0) {
            throw AppError.notFound('Node not found');
          }
          return mapNodeRow(row.rows[0]);
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw AppError.conflict('A node with this slug already exists at this level');
        }
        throw err;
      }

      const body: ApiEnvelope<NodeResponse> = { data: node, error: null };
      res.json(body);
    }),
  );

  // ── DELETE /nodes/:id ────────────────────────────────────────────────────

  router.delete(
    '/nodes/:id',
    validate({ params: nodeParamsSchema }),
    asyncHandler(async (req, res) => {
      if (!req.tenant || !req.withTenant) {
        throw AppError.notFound('Tenant not found for this host');
      }

      const { id } = req.params as { id: string };

      const deleted = await req.withTenant(async (client) => {
        const row = await client.query(
          'DELETE FROM nodes WHERE id = $1 RETURNING id, parent_id, position',
          [id],
        );
        if (row.rowCount === 0) {
          throw AppError.notFound('Node not found');
        }

        const { parent_id, position } = row.rows[0] as {
          id: string;
          parent_id: string | null;
          position: number;
        };

        // Compact siblings: shift everything after the deleted position down by 1
        await client.query(
          `UPDATE nodes
           SET position = position - 1
           WHERE parent_id IS NOT DISTINCT FROM $1 AND position > $2`,
          [parent_id, position],
        );

        return { id: row.rows[0].id as string };
      });

      const body: ApiEnvelope<{ id: string }> = { data: deleted, error: null };
      res.json(body);
    }),
  );

  // ── PATCH /nodes/:id/move ────────────────────────────────────────────────

  router.patch(
    '/nodes/:id/move',
    validate({ params: nodeParamsSchema, body: moveNodeRequestSchema }),
    asyncHandler(async (req, res) => {
      if (!req.tenant || !req.withTenant) {
        throw AppError.notFound('Tenant not found for this host');
      }

      const { id } = req.params as { id: string };
      const { parentId: targetParentId, position: requestedPosition } = req.body as {
        parentId: string | null;
        position: number;
      };

      if (targetParentId === id) {
        throw AppError.validation('Cannot move a node into itself');
      }

      const node = await req.withTenant(async (client) => {
        const nodeRow = await client.query(
          'SELECT id, parent_id, position, type FROM nodes WHERE id = $1',
          [id],
        );
        if (nodeRow.rowCount === 0) {
          throw AppError.notFound('Node not found');
        }

        const currentParentId = nodeRow.rows[0].parent_id as string | null;
        const currentPosition = nodeRow.rows[0].position as number;

        if (targetParentId !== null) {
          const parentRow = await client.query(
            'SELECT id, type FROM nodes WHERE id = $1',
            [targetParentId],
          );
          if (parentRow.rowCount === 0) {
            throw AppError.notFound('Target parent node not found');
          }
          if ((parentRow.rows[0].type as string) !== 'folder') {
            throw AppError.validation('Target parent must be a folder');
          }

          // Walk ancestors of targetParentId upward; if we encounter the moving
          // node, targetParentId is a descendant — moving would create a cycle.
          const cycleRow = await client.query(
            `WITH RECURSIVE ancestors AS (
               SELECT id, parent_id FROM nodes WHERE id = $1
               UNION ALL
               SELECT n.id, n.parent_id
               FROM nodes n
               JOIN ancestors a ON n.id = a.parent_id
             )
             SELECT 1 FROM ancestors WHERE id = $2 LIMIT 1`,
            [targetParentId, id],
          );
          if ((cycleRow.rowCount ?? 0) > 0) {
            throw AppError.validation('Cannot move a node into one of its own descendants');
          }
        }

        const isSameParent =
          currentParentId === targetParentId ||
          (currentParentId === null && targetParentId === null);

        if (isSameParent) {
          // Count siblings (excluding self) to clamp position
          const countRow = await client.query(
            `SELECT COUNT(*)::int AS cnt FROM nodes
             WHERE parent_id IS NOT DISTINCT FROM $1 AND id != $2`,
            [targetParentId, id],
          );
          const siblingCount = countRow.rows[0].cnt as number;
          const newPosition = Math.min(requestedPosition, siblingCount);

          if (newPosition === currentPosition) {
            const data = await client.query(
              `SELECT id, parent_id, type, name, slug, position, created_at, updated_at
               FROM nodes WHERE id = $1`,
              [id],
            );
            return mapNodeRow(data.rows[0]);
          }

          if (newPosition > currentPosition) {
            await client.query(
              `UPDATE nodes SET position = position - 1
               WHERE parent_id IS NOT DISTINCT FROM $1
                 AND id != $2
                 AND position > $3 AND position <= $4`,
              [targetParentId, id, currentPosition, newPosition],
            );
          } else {
            await client.query(
              `UPDATE nodes SET position = position + 1
               WHERE parent_id IS NOT DISTINCT FROM $1
                 AND id != $2
                 AND position >= $3 AND position < $4`,
              [targetParentId, id, newPosition, currentPosition],
            );
          }

          const updated = await client.query(
            `UPDATE nodes SET position = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, parent_id, type, name, slug, position, created_at, updated_at`,
            [newPosition, id],
          );
          return mapNodeRow(updated.rows[0]);
        } else {
          // Cross-parent move
          // 1. Compact old parent group
          await client.query(
            `UPDATE nodes SET position = position - 1
             WHERE parent_id IS NOT DISTINCT FROM $1 AND position > $2`,
            [currentParentId, currentPosition],
          );

          // 2. Determine clamped position in target group
          const countRow = await client.query(
            `SELECT COUNT(*)::int AS cnt FROM nodes
             WHERE parent_id IS NOT DISTINCT FROM $1`,
            [targetParentId],
          );
          const targetGroupSize = countRow.rows[0].cnt as number;
          const newPosition = Math.min(requestedPosition, targetGroupSize);

          // 3. Open a slot at newPosition in target group
          await client.query(
            `UPDATE nodes SET position = position + 1
             WHERE parent_id IS NOT DISTINCT FROM $1 AND position >= $2`,
            [targetParentId, newPosition],
          );

          // 4. Place the node in its new home
          const updated = await client.query(
            `UPDATE nodes SET parent_id = $1, position = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING id, parent_id, type, name, slug, position, created_at, updated_at`,
            [targetParentId, newPosition, id],
          );
          return mapNodeRow(updated.rows[0]);
        }
      });

      const body: ApiEnvelope<NodeResponse> = { data: node, error: null };
      res.json(body);
    }),
  );

  return router;
}
