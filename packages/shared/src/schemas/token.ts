import { z } from 'zod';

export const tokenSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  familyId: z.string().uuid(),
  rotatedTo: z.string().uuid().nullable(),
  revokedAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});
