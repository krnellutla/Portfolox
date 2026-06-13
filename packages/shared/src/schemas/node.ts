import { z } from 'zod';

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
