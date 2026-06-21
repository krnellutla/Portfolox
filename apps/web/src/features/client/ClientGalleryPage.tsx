import { useState } from 'react';
import { TopNav } from '../../components/nav/TopNav.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import type { PhotoCategory } from './mock.js';
import { CLIENT_GALLERY_META, CLIENT_PHOTOS } from './mock.js';

const CATEGORY_LABELS: { id: PhotoCategory; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'favorites',label: '♡ Favorites' },
  { id: 'ceremony', label: 'Ceremony' },
  { id: 'reception',label: 'Reception' },
];

export default function ClientGalleryPage() {
  const [activeCategory, setActiveCategory] = useState<PhotoCategory>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(CLIENT_PHOTOS.filter((p) => p.favoritedByMe).map((p) => p.id))
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function addToFavorites() {
    setFavorites((prev) => {
      const next = new Set(prev);
      selected.forEach((id) => next.add(id));
      return next;
    });
    setSelected(new Set());
  }

  const filtered = CLIENT_PHOTOS.filter((p) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'favorites') return favorites.has(p.id);
    return p.category === activeCategory;
  });

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-8 pt-8 pb-24">
        {/* Page header */}
        <div className="flex items-start justify-between mb-7 flex-wrap gap-4">
          <div>
            <p className="font-mono text-[10.5px] tracking-label text-muted mb-1.5">
              ⬚ PRIVATE · 09 — CLIENT GALLERY
            </p>
            <h1 className="font-serif text-[38px] font-[500] text-ink tracking-[-0.02em] mb-1.5">
              {CLIENT_GALLERY_META.title}
            </h1>
            <p className="font-mono text-[11px] text-muted">
              Shared with {CLIENT_GALLERY_META.clientName} · {CLIENT_GALLERY_META.frameCount} frames · expires {CLIENT_GALLERY_META.expiresAt}
            </p>
          </div>
          <div className="flex items-center gap-2.5 mt-2">
            <button className="px-4 py-[10px] bg-surface border border-field rounded-[9px] font-semibold text-[14px] text-ink hover:border-ink transition-colors">
              ↓ Download all
            </button>
            <button className="px-4 py-[10px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 transition-colors">
              ↗ Share link
            </button>
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 mb-6">
          {CATEGORY_LABELS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={`px-4 py-[8px] rounded-[999px] font-mono text-[11.5px] transition-colors ${
                activeCategory === id
                  ? 'bg-ink text-paper'
                  : 'bg-surface border border-field text-ink-3 hover:border-ink hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 4-col grid */}
        <div className="grid grid-cols-4 gap-3">
          {filtered.map((photo) => {
            const isSel = selected.has(photo.id);
            const isFav = favorites.has(photo.id);
            return (
              <div key={photo.id} className="group relative">
                <PhotoTile
                  ratio="3:2"
                  src={photo.url || undefined}
                  alt={photo.title}
                  placeholderGradient={photo.gradient}
                  action={
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSel
                          ? 'bg-ink border-ink'
                          : 'bg-white/20 border-white/50 hover:bg-white/40'
                      }`}
                      aria-label={isSel ? 'Deselect' : 'Select'}
                    >
                      {isSel && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  }
                />
                {isFav && (
                  <span className="absolute bottom-2 right-2 text-[13px] text-white drop-shadow pointer-events-none">♥</span>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-center py-24 font-mono text-[13px] text-muted">No frames in this category.</p>
        )}
      </div>

      {/* Selection pill */}
      {selected.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3.5 bg-ink text-paper rounded-[999px] shadow-xl">
          <span className="font-semibold text-[14px]">{selected.size} selected</span>
          <span className="w-px h-4 bg-paper/20" />
          <button
            onClick={addToFavorites}
            className="font-semibold text-[14px] text-paper/80 hover:text-paper transition-colors"
          >
            Add to favorites
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-paper/50 hover:text-paper transition-colors text-[16px] leading-none"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
