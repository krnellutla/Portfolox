import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TopNav } from '../../components/nav/TopNav.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import { StateView } from '../../components/ui/StateView.js';
import { SkeletonTile } from '../../components/ui/Skeleton.js';
import { seedPhotoUrl } from '../../lib/seed-photos.js';
import { qk } from '../../lib/query-client.js';
import { search } from '../../api/search.js';
import { favoritePhoto, unfavoritePhoto } from '../../api/photos.js';
import { FilterSidebar } from './FilterSidebar.js';
import { FiltersSheet } from './FiltersSheet.js';
import type { SearchFilters } from '../../lib/types.js';
import type { Photo } from '@blueflutes/shared';

const DEFAULT_FILTERS: SearchFilters = {
  q: '',
  styles: [],
  colors: [],
  locations: [],
  sort: 'popular',
};

const SORT_OPTIONS = [
  { value: 'popular',    label: 'Most popular' },
  { value: 'recent',     label: 'Most recent' },
  { value: 'price-asc',  label: 'Price: low–high' },
  { value: 'price-desc', label: 'Price: high–low' },
] as const;

type ColorLabel = SearchFilters['colors'][number];
type StyleLabel = SearchFilters['styles'][number];

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>(() => ({
    ...DEFAULT_FILTERS,
    q: searchParams.get('q') ?? '',
    styles: searchParams.get('styles') ? [searchParams.get('styles') as StyleLabel] : [],
  }));

  // Sync URL params into filters on mount only
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    const style = searchParams.get('styles');
    setFilters((prev) => ({
      ...prev,
      q,
      styles: style ? [style as StyleLabel] : prev.styles,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateFilters(patch: Partial<SearchFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function removeColor(c: ColorLabel) {
    updateFilters({ colors: filters.colors.filter((x) => x !== c) });
  }
  function removeStyle(s: StyleLabel) {
    updateFilters({ styles: filters.styles.filter((x) => x !== s) });
  }
  function removeLocation(l: string) {
    updateFilters({ locations: filters.locations.filter((x) => x !== l) });
  }

  const activeChips = [
    ...filters.styles.map((s) => ({ label: s, remove: () => removeStyle(s) })),
    ...filters.colors.map((c) => ({ label: c, remove: () => removeColor(c) })),
    ...filters.locations.map((l) => ({ label: l, remove: () => removeLocation(l) })),
  ];

  const searchKey = qk.search({
    q: filters.q,
    styles: filters.styles,
    colors: filters.colors,
    locations: filters.locations,
    sort: filters.sort,
  });

  const { data: results, isLoading, error } = useQuery({
    queryKey: searchKey,
    queryFn: () => search({
      q: filters.q || undefined,
      styles: filters.styles.length ? filters.styles : undefined,
      colors: filters.colors.length ? filters.colors : undefined,
      locations: filters.locations.length ? filters.locations : undefined,
      sort: filters.sort,
    }),
    placeholderData: (prev) => prev,
  });

  const favMutation = useMutation({
    mutationFn: ({ id, favorited }: { id: string; favorited: boolean }) =>
      favorited ? unfavoritePhoto(id) : favoritePhoto(id),
    onMutate: ({ id, favorited }) => {
      queryClient.setQueryData(searchKey, (old: typeof results) => {
        if (!old) return old;
        return {
          ...old,
          photos: old.photos.map((p: Photo) =>
            p.id === id ? { ...p, favoritedByMe: !favorited } : p,
          ),
        };
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: searchKey });
    },
  });

  const photos = results?.photos ?? [];

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <FiltersSheet
        open={filtersSheetOpen}
        onClose={() => setFiltersSheetOpen(false)}
        filters={filters}
        onChange={updateFilters}
      />

      <div className="max-w-shell mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-32 md:pb-24 flex gap-10">
        <div className="hidden lg:block">
          <FilterSidebar filters={filters} onChange={updateFilters} />
        </div>

        {/* Results column */}
        <div className="flex-1 min-w-0">
          {/* Mobile filters button */}
          <div className="flex lg:hidden mb-4">
            <button
              onClick={() => setFiltersSheetOpen(true)}
              className="flex items-center gap-2 px-4 py-[10px] border border-field rounded-[9px] font-mono text-[12px] text-ink-3 hover:border-ink transition-colors whitespace-nowrap"
            >
              ⚙ Filters
            </button>
          </div>

          {/* Header row */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="font-serif text-[32px] font-[500] text-ink tracking-[-0.02em]">
              {isLoading ? '—' : `${(results?.total ?? photos.length).toLocaleString()} frames`}
            </h2>
            <div className="relative">
              <select
                value={filters.sort}
                onChange={(e) => updateFilters({ sort: e.target.value as SearchFilters['sort'] })}
                className="appearance-none pl-4 pr-9 py-[10px] bg-surface border border-field rounded-[9px] font-mono text-[12px] text-ink cursor-pointer hover:border-ink transition-colors duration-150 focus:outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted text-[11px]">▾</span>
            </div>
          </div>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {activeChips.map(({ label, remove }) => (
                <button
                  key={label}
                  onClick={remove}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper rounded-[999px] font-mono text-[11px] hover:bg-ink-2 transition-colors"
                >
                  {label}
                  <span className="text-paper/60 leading-none">×</span>
                </button>
              ))}
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="px-3 py-1.5 border border-field rounded-[999px] font-mono text-[11px] text-ink-3 hover:border-ink hover:text-ink transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          {isLoading && (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonTile key={i} className="aspect-square" />
              ))}
            </div>
          )}
          {error && (
            <StateView
              variant="error"
              title="Search failed"
              description="We couldn't complete your search. Check your connection and try again."
              eyebrow="SEARCH ERROR"
              action={
                <button
                  onClick={() => void 0}
                  className="px-5 py-[10px] border border-field rounded-[9px] font-mono text-[12px] text-ink hover:border-ink transition-colors"
                >
                  Try again
                </button>
              }
            />
          )}

          {!isLoading && !error && (
            <>
              {photos.length === 0 ? (
                <StateView
                  variant="empty"
                  title="No frames match"
                  description="Try removing a filter or searching a wider area."
                  action={
                    <button
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                      className="px-5 py-[10px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 transition-colors"
                    >
                      Clear filters
                    </button>
                  }
                />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {photos.map((photo, i) => {
                    const isFavorited = !!photo.favoritedByMe;
                    const src = photo.url || photo.thumbUrl || seedPhotoUrl(i);
                    return (
                      <div key={photo.id} className="group relative">
                        <PhotoTile
                          ratio="1:1"
                          src={src}
                          alt={photo.title}
                          code={photo.code}
                          onClick={() => navigate(`/lightbox?id=${photo.id}`)}
                          action={
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                favMutation.mutate({ id: photo.id, favorited: isFavorited });
                              }}
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-[14px] backdrop-blur-sm transition-colors ${
                                isFavorited ? 'bg-ink text-paper' : 'bg-white/20 text-white hover:bg-white/40'
                              }`}
                              aria-label={isFavorited ? 'Unfavorite' : 'Favorite'}
                            >
                              {isFavorited ? '♥' : '♡'}
                            </button>
                          }
                        />
                        <p className="mt-2 text-[13px] font-semibold text-ink truncate">{photo.title}</p>
                        {photo.priceFrom && (
                          <p className="font-mono text-[10.5px] text-muted mt-0.5">
                            from ${photo.priceFrom}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
