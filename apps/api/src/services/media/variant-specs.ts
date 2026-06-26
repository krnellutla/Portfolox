export const VARIANT_SPECS = [
  { name: 'thumb', width: 256 },
  { name: 'small', width: 640 },
  { name: 'medium', width: 1280 },
  { name: 'large', width: 2048 },
] as const;

export type VariantName = (typeof VARIANT_SPECS)[number]['name'];

export const VARIANT_FORMAT = 'webp' as const;
export const VARIANT_CONTENT_TYPE = 'image/webp' as const;
