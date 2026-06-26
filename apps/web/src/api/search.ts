import { searchResultSchema, searchFacetsSchema } from '@portfoliohub/shared';
import { apiFetch } from './client.js';

export interface SearchParams {
  q?: string;
  styles?: string[];
  colors?: string[];
  locations?: string[];
  sort?: string;
  cursor?: string;
}

function buildSearchQs(params: SearchParams): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.styles?.length) sp.set('styles', params.styles.join(','));
  if (params.colors?.length) sp.set('colors', params.colors.join(','));
  if (params.locations?.length) sp.set('locations', params.locations.join(','));
  if (params.sort) sp.set('sort', params.sort);
  if (params.cursor) sp.set('cursor', params.cursor);
  const str = sp.toString();
  return str ? `?${str}` : '';
}

export function search(params: SearchParams) {
  return apiFetch(`/search${buildSearchQs(params)}`, {}, searchResultSchema);
}

export function getSearchFacets() {
  return apiFetch('/search/facets', {}, searchFacetsSchema);
}
