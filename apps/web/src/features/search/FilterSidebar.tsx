import { Input } from '../../components/ui/Input.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { useEyebrow } from '../../lib/eyebrow.js';
import type { SearchFilters } from '../../lib/types.js';

interface FilterSidebarProps {
  filters: SearchFilters;
  onChange: (next: Partial<SearchFilters>) => void;
}

const STYLE_OPTIONS = [
  'Landscape', 'Portrait', 'Street', 'Wedding', 'Fine Art', 'Documentary', 'Architecture', 'Wildlife',
] as const;

const COLOR_OPTIONS = [
  { label: 'Warm',    hex: '#c4a882' },
  { label: 'Cool',    hex: '#8aa6c4' },
  { label: 'Green',   hex: '#8aab90' },
  { label: 'Neutral', hex: '#a8a49c' },
  { label: 'Mono',    hex: '#585550' },
  { label: 'Dusk',    hex: '#9c8aae' },
] as const;

const LOCATION_OPTIONS = [
  'Iceland', 'Japan', 'Patagonia', 'Morocco', 'Norway', 'New York', 'Scotland',
] as const;

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export function FilterSidebar({ filters, onChange }: FilterSidebarProps) {
  const eyebrow = useEyebrow('02 — Search');
  return (
    <aside className="w-[262px] shrink-0 lg:sticky top-[72px] self-start max-h-[calc(100vh-88px)] overflow-y-auto pr-2 pb-10">
      <Eyebrow className="mb-4">{eyebrow}</Eyebrow>

      <Input
        type="search"
        placeholder="Search frames…"
        value={filters.q}
        onChange={(e) => onChange({ q: e.target.value })}
        className="mb-6"
      />

      {/* Style */}
      <p className="font-mono text-[10.5px] uppercase tracking-label text-muted mb-2.5">Style</p>
      <div className="flex flex-col gap-[10px] mb-6">
        {STYLE_OPTIONS.map((s) => {
          const checked = filters.styles.includes(s as never);
          return (
            <label key={s} className="flex items-center gap-2.5 cursor-pointer group">
              <span
                className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors shrink-0 ${
                  checked ? 'bg-ink border-ink' : 'bg-surface border-field group-hover:border-ink-3'
                }`}
                onClick={() => onChange({ styles: toggle(filters.styles, s as never) })}
              >
                {checked && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span
                className="text-[13.5px] text-ink-3 group-hover:text-ink transition-colors"
                onClick={() => onChange({ styles: toggle(filters.styles, s as never) })}
              >
                {s}
              </span>
            </label>
          );
        })}
      </div>

      {/* Color */}
      <p className="font-mono text-[10.5px] uppercase tracking-label text-muted mb-2.5">Color</p>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {COLOR_OPTIONS.map(({ label, hex }) => {
          const selected = filters.colors.includes(label as never);
          return (
            <button
              key={label}
              onClick={() => onChange({ colors: toggle(filters.colors, label as never) })}
              className={`relative h-9 rounded-[8px] transition-all ${
                selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''
              }`}
              style={{ background: hex }}
              aria-label={label}
              title={label}
            >
              {selected && (
                <span className="absolute inset-0 rounded-[8px] ring-[3px] ring-inset ring-paper pointer-events-none" />
              )}
              <span className="absolute bottom-1 left-0 right-0 text-center font-mono text-[9px] text-white/80">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Location */}
      <p className="font-mono text-[10.5px] uppercase tracking-label text-muted mb-2.5">Location</p>
      <div className="flex flex-col">
        {LOCATION_OPTIONS.map((loc) => {
          const active = filters.locations.includes(loc);
          return (
            <button
              key={loc}
              onClick={() => onChange({ locations: toggle(filters.locations, loc) })}
              className={`flex items-center justify-between py-[10px] border-b border-line-2 last:border-0 text-[13.5px] transition-colors ${
                active ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink'
              }`}
            >
              <span>{loc}</span>
              <span className="text-muted">›</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
