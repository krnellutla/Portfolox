import { z } from 'zod';

export const tenantDomainSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  host: z.string().min(1),
  isPrimary: z.boolean(),
  createdAt: z.coerce.date(),
});
