import { z } from 'zod';

export const tenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: z.enum(['active', 'suspended']),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
