import { FilterSidebar } from './FilterSidebar.js';
import type { SearchFilters } from '../../lib/types.js';

interface FiltersSheetProps {
  open: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onChange: (next: Partial<SearchFilters>) => void;
}

export function FiltersSheet({ open, onClose, filters, onChange }: FiltersSheetProps) {
  if (!open) return null;
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Slide-in panel from the left */}
      <div className="fixed top-0 left-0 h-full w-[300px] bg-paper z-50 overflow-y-auto shadow-xl px-5 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="font-serif text-[18px] font-[500] text-ink">Filters</p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-ink-3 hover:text-ink transition-colors text-[20px]"
            aria-label="Close filters"
          >
            ×
          </button>
        </div>
        <FilterSidebar filters={filters} onChange={onChange} />
      </div>
    </>
  );
}
