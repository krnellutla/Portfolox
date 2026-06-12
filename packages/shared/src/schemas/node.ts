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
