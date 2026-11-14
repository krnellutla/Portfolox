import { z } from 'zod';

export const passkeyCredentialSchema = z.object({
  id: z.string().uuid(),
  friendlyName: z.string().nullable(),
  deviceType: z.string(),
  backedUp: z.boolean(),
  transports: z.string().nullable(),
  aaguid: z.string().nullable(),
  lastUsedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type PasskeyCredential = z.infer<typeof passkeyCredentialSchema>;

export const passkeyListResponseSchema = z.object({
  credentials: z.array(passkeyCredentialSchema),
});
export type PasskeyListResponse = z.infer<typeof passkeyListResponseSchema>;

export const passkeyRenameSchema = z.object({
  friendlyName: z.string().min(1).max(60),
});
export type PasskeyRename = z.infer<typeof passkeyRenameSchema>;

export const passkeyAuthBeginSchema = z.object({
  email: z.string().email().optional(),
});
export type PasskeyAuthBegin = z.infer<typeof passkeyAuthBeginSchema>;
