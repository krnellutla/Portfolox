import { z } from 'zod';
import { specialty } from './photographer.js';
import { photoSchema } from './photo.js';

export const colorBucket = z.enum(['Warm', 'Cool', 'Green', 'Neutral', 'Mono', 'Dusk']);
export type ColorBucket = z.infer<typeof colorBucket>;

export const searchSortOrder = z.enum(['recent', 'popular', 'price-asc', 'price-desc']);
export type SearchSortOrder = z.infer<typeof searchSortOrder>;

export const searchResultSchema = z.object({
  total: z.number(),
  photos: z.array(photoSchema),
  nextCursor: z.string().nullable().optional(),
});
export type SearchResult = z.infer<typeof searchResultSchema>;

export const searchFacetsSchema = z.object({
  styles: z.array(z.object({ value: specialty, count: z.number() })),
  colors: z.array(z.object({ value: colorBucket, count: z.number() })),
  locations: z.array(z.object({ value: z.string(), count: z.number() })),
});
export type SearchFacets = z.infer<typeof searchFacetsSchema>;
