import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export const qk = {
  discover: {
    featured: () => ['discover', 'featured'] as const,
    fresh: () => ['discover', 'fresh'] as const,
  },
  photographer: (handle: string) => ['photographer', handle] as const,
  photographerGalleries: (handle: string) => ['photographer', handle, 'galleries'] as const,
  photographerPhotos: (handle: string, galleryId?: string) =>
    ['photographer', handle, 'photos', galleryId ?? 'all'] as const,
  photo: (id: string) => ['photo', id] as const,
  photoComments: (id: string) => ['photo', id, 'comments'] as const,
  search: (filters: Record<string, unknown>) => ['search', filters] as const,
  searchFacets: () => ['search', 'facets'] as const,
  community: {
    spaces: () => ['community', 'spaces'] as const,
    feed: (space?: string) => ['community', 'feed', space ?? 'all'] as const,
  },
  conversations: () => ['conversations'] as const,
  conversationMessages: (id: string) => ['conversation', id, 'messages'] as const,
  myGalleries: () => ['me', 'galleries'] as const,
  analytics: {
    summary: (range: string) => ['analytics', 'summary', range] as const,
    revenue: (range: string) => ['analytics', 'revenue', range] as const,
    photos: (range: string, sort: string) => ['analytics', 'photos', range, sort] as const,
    funnel: (range: string) => ['analytics', 'funnel', range] as const,
    buyers: (range: string) => ['analytics', 'buyers', range] as const,
    recentSales: () => ['analytics', 'recent-sales'] as const,
  },
  plans: () => ['plans'] as const,
  printOptions: () => ['print-options'] as const,
  clientGallery: (shareToken: string) => ['client-gallery', shareToken] as const,
  collections: () => ['collections'] as const,
  me: () => ['me'] as const,
  theme: () => ['theme'] as const,
  mySettings: () => ['me', 'settings'] as const,
  myOrders: (status?: string) => ['me', 'orders', status ?? 'all'] as const,
  myOrder: (id: string) => ['me', 'orders', id] as const,
};
