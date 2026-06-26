import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TopNav } from '../../components/nav/TopNav.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import { StateView } from '../../components/ui/StateView.js';
import { getClientGallery, addFavorites } from '../../api/client-gallery.js';
import { qk } from '../../lib/query-client.js';
import { seedPhotoUrl } from '../../lib/seed-photos.js';

type PhotoCategory = 'all' | 'favorites' | 'ceremony' | 'reception';

const CATEGORY_LABELS: { id: PhotoCategory; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'favorites', label: '♡ Favorites' },
  { id: 'ceremony',  label: 'Ceremony' },
  { id: 'reception', label: 'Reception' },
];

export default function ClientGalleryPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<PhotoCategory>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: gallery, isLoading, error } = useQuery({
    queryKey: qk.clientGallery(shareToken ?? ''),
    queryFn: () => getClientGallery(shareToken ?? ''),
    enabled: !!shareToken,
  });

  const favMutation = useMutation({
    mutationFn: (photoIds: string[]) => addFavorites(shareToken ?? '', photoIds),
    onMutate: (photoIds) => {
      queryClient.setQueryData(qk.clientGallery(shareToken ?? ''), (old: typeof gallery) => {
        if (!old) return old;
        return { ...old, favoritePhotoIds: [...new Set([...old.favoritePhotoIds, ...photoIds])] };
      });
      setSelected(new Set());
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.clientGallery(shareToken ?? '') });
    },
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (isLoading) return <StateView variant="loading" title="Loading gallery…" fullScreen />;
  if (error || !gallery) return <StateView variant="error" title="Gallery not found or link expired" fullScreen />;

  const favoriteIds = new Set(gallery.favoritePhotoIds);

  const photos = gallery.photoOrder.map((id, i) => ({
    id,
    code: `DLG-${String(i + 1).padStart(3, '0')}`,
    url: seedPhotoUrl(i, 800),
    favoritedByMe: favoriteIds.has(id),
    category: i % 2 === 0 ? 'ceremony' : 'reception' as PhotoCategory,
  }));

  const filtered = photos.filter((p) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'favorites') return p.favoritedByMe;
    return p.category === activeCategory;
  });

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-4 md:px-8 pt-8 pb-32 md:pb-24">
        {/* Page header */}
        <div className="flex items-start justify-between mb-7 flex-wrap gap-4">
          <div>
            <p className="font-mono text-[10.5px] tracking-label text-muted mb-1.5">
              ⬚ PRIVATE · 09 — CLIENT GALLERY
            </p>
            <h1 className="font-serif text-[38px] font-[500] text-ink tracking-[-0.02em] mb-1.5">
              {gallery.title}
            </h1>
            <p className="font-mono text-[11px] text-muted">
              Shared with {gallery.clientName} · {gallery.counts.frames} frames · expires {new Date(gallery.expiresAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2.5 mt-2">
            <button className="px-4 py-[10px] bg-surface border border-field rounded-[9px] font-semibold text-[14px] text-ink hover:border-ink transition-colors">
              ↓ Download all
            </button>
            <button
              onClick={() => void navigator.clipboard.writeText(window.location.href)}
              className="px-4 py-[10px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 transition-colors"
            >
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
            const isFav = photo.favoritedByMe;
            return (
              <div key={photo.id} className="group relative">
                <PhotoTile
                  ratio="3:2"
                  src={photo.url}
                  alt={photo.code}
                  code={photo.code}
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
            onClick={() => favMutation.mutate(Array.from(selected))}
            disabled={favMutation.isPending}
            className="font-semibold text-[14px] text-paper/80 hover:text-paper transition-colors disabled:opacity-60"
          >
            {favMutation.isPending ? 'Saving…' : 'Add to favorites'}
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
