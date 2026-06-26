import { z } from 'zod';
import { slugSchema } from '../lib/slug.js';

export const nodeType = z.enum(['folder', 'gallery', 'page']);

export const nodeSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  type: nodeType,
  name: z.string().min(1),
  slug: z.string().min(1),
  position: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// The public node listing omits tenantId: it's an internal identifier with
// no use to an anonymous viewer client.
export const publicNodeSchema = nodeSchema.omit({ tenantId: true });
export type PublicNode = z.infer<typeof publicNodeSchema>;

export const nodeListResponseSchema = z.array(publicNodeSchema);
export type NodeListResponse = z.infer<typeof nodeListResponseSchema>;

export const nodeResponseSchema = publicNodeSchema;
export type NodeResponse = z.infer<typeof nodeResponseSchema>;

export const nodeParamsSchema = z.object({ id: z.string().uuid() });

export const createNodeRequestSchema = z.object({
  parentId: z.string().uuid().nullable().default(null),
  type: nodeType,
  name: z.string().min(1).max(200),
  slug: slugSchema.optional(),
});
export type CreateNodeRequest = z.infer<typeof createNodeRequestSchema>;

export const updateNodeRequestSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    slug: slugSchema.optional(),
  })
  .refine((d) => d.name !== undefined || d.slug !== undefined, {
    message: 'At least one of name or slug must be provided',
  });
export type UpdateNodeRequest = z.infer<typeof updateNodeRequestSchema>;

export const moveNodeRequestSchema = z.object({
  parentId: z.string().uuid().nullable(),
  position: z.number().int().nonnegative(),
});
export type MoveNodeRequest = z.infer<typeof moveNodeRequestSchema>;
