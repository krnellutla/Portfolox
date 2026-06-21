import { useMemo, useState } from 'react';
import { TopNav } from '../../components/nav/TopNav.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import type { SearchFilters } from '../../lib/types.js';
import { FilterSidebar } from './FilterSidebar.js';
import { DEFAULT_FILTERS, MOCK_PHOTOS, SORT_OPTIONS } from './mock.js';

type ColorLabel = SearchFilters['colors'][number];
type StyleLabel = SearchFilters['styles'][number];

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [liked, setLiked] = useState<Set<string>>(new Set());

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

  const results = useMemo(() => {
    let photos = [...MOCK_PHOTOS] as Array<typeof MOCK_PHOTOS[0] & { placeholderGradient?: string }>;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      photos = photos.filter((p) => p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }
    return photos;
  }, [filters.q]);

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-4 md:px-8 pt-8 pb-32 md:pb-24 flex gap-10">
        <FilterSidebar filters={filters} onChange={updateFilters} />

        {/* Results column */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="font-serif text-[32px] font-[500] text-ink tracking-[-0.02em]">
              {results.length.toLocaleString()} frames
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

          {/* 4-col photo grid */}
          <div className="grid grid-cols-4 gap-3">
            {results.map((photo) => {
              const isLiked = liked.has(photo.id) || !!photo.likedByMe;
              return (
                <div key={photo.id} className="group relative">
                  <PhotoTile
                    ratio="1:1"
                    src={photo.url || undefined}
                    alt={photo.title}
                    placeholderGradient={(photo as { placeholderGradient?: string }).placeholderGradient}
                    code={photo.code}
                    action={
                      <button
                        onClick={() =>
                          setLiked((prev) => {
                            const next = new Set(prev);
                            next.has(photo.id) ? next.delete(photo.id) : next.add(photo.id);
                            return next;
                          })
                        }
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[14px] backdrop-blur-sm transition-colors ${
                          isLiked ? 'bg-ink text-paper' : 'bg-white/20 text-white hover:bg-white/40'
                        }`}
                        aria-label={isLiked ? 'Unlike' : 'Like'}
                      >
                        {isLiked ? '♥' : '♡'}
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

          {results.length === 0 && (
            <div className="text-center py-24 text-muted font-mono text-[13px]">
              No frames match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
