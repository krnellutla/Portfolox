import { z } from 'zod';

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;

export const mediaAssetSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  nodeId: z.string().uuid(),
  objectKey: z.string().min(1),
  url: z.string().url(),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  status: z.enum(['pending', 'processing', 'ready', 'failed']),
  position: z.number().int().nonnegative(),
  originalFilename: z.string().min(1),
  byteSize: z.number().int().positive(),
  checksum: z.string().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  createdAt: z.coerce.date(),
});

export type MediaAsset = z.infer<typeof mediaAssetSchema>;

export const mediaVariantSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  assetId: z.string().uuid(),
  variant: z.enum(['thumb', 'small', 'medium', 'large']),
  objectKey: z.string().min(1),
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  byteSize: z.number().int().positive(),
  createdAt: z.coerce.date(),
});

export type MediaVariant = z.infer<typeof mediaVariantSchema>;

export const mediaAssetWithVariantsSchema = mediaAssetSchema.extend({
  variants: z.array(mediaVariantSchema),
});

export type MediaAssetWithVariants = z.infer<typeof mediaAssetWithVariantsSchema>;

export const mediaListResponseSchema = z.array(mediaAssetWithVariantsSchema);

export type MediaListResponse = z.infer<typeof mediaListResponseSchema>;

export const presignRequestSchema = z.object({
  nodeId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES),
  byteSize: z.number().int().positive(),
});

export type PresignRequest = z.infer<typeof presignRequestSchema>;

export const presignResponseSchema = z.object({
  assetId: z.string().uuid(),
  uploadUrl: z.string().url(),
  objectKey: z.string().min(1),
  expiresAt: z.coerce.date(),
});

export type PresignResponse = z.infer<typeof presignResponseSchema>;

export const confirmRequestSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  checksum: z.string().optional(),
});

export type ConfirmRequest = z.infer<typeof confirmRequestSchema>;

export const confirmParamsSchema = z.object({
  id: z.string().uuid(),
});
