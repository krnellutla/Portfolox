import { z } from 'zod';

export const mediaAssetSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  nodeId: z.string().uuid(),
  url: z.string().url(),
  mimeType: z.string().min(1),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  createdAt: z.coerce.date(),
});
