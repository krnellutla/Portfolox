import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Check, Copy, Clock } from 'lucide-react';
import { TopNav } from '../../components/nav/TopNav.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import { StateView } from '../../components/ui/StateView.js';
import { getClientGallery, updateFavorites, submitSelects, downloadGallery } from '../../api/client-gallery.js';
import { qk } from '../../lib/query-client.js';
import { seedPhotoUrl } from '../../lib/seed-photos.js';

type PhotoCategory = 'all' | 'favorites' | 'ceremony' | 'reception' | 'client-selects';

const CLIENT_CATEGORIES: { id: PhotoCategory; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'favorites', label: '♡ Favorites' },
  { id: 'ceremony',  label: 'Ceremony' },
  { id: 'reception', label: 'Reception' },
];

const OWNER_CATEGORIES: { id: PhotoCategory; label: string }[] = [
  { id: 'all',            label: 'All' },
  { id: 'client-selects', label: 'Client selects' },
  { id: 'ceremony',       label: 'Ceremony' },
  { id: 'reception',      label: 'Reception' },
];

// FavoriteButton component
function FavoriteButton({
  isFavorited,
  onClick,
}: {
  isFavorited: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${
        isFavorited
          ? 'bg-paper/90 text-negative'
          : 'bg-paper/80 text-ink-3 hover:text-negative'
      }`}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart size={14} fill={isFavorited ? 'currentColor' : 'none'} />
    </button>
  );
}

export default function ClientGalleryPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<PhotoCategory>('all');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  const { data: gallery, isLoading, error } = useQuery({
    queryKey: qk.clientGallery(shareToken ?? ''),
    queryFn: () => getClientGallery(shareToken ?? ''),
    enabled: !!shareToken,
  });

  // Optimistic favorites (local state overlay)
  const [localFavorites, setLocalFavorites] = useState<Set<string> | null>(null);

  const favMutation = useMutation({
    mutationFn: ({ photoIds }: { photoIds: string[] }) => updateFavorites(shareToken ?? '', photoIds),
    onMutate: ({ photoIds }) => {
      const prev = gallery?.favoritePhotoIds ?? [];
      const next = new Set([...prev, ...photoIds]);
      setLocalFavorites(next);
      return { prev };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(qk.clientGallery(shareToken ?? ''), (old: typeof gallery) => {
        if (!old) return old;
        return { ...old, favoritePhotoIds: result.favoritePhotoIds };
      });
      setLocalFavorites(null);
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) setLocalFavorites(new Set(ctx.prev));
    },
    onSettled: () => {
      setLocalFavorites(null);
      void queryClient.invalidateQueries({ queryKey: qk.clientGallery(shareToken ?? '') });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitSelects(shareToken ?? ''),
    onSuccess: (result) => {
      queryClient.setQueryData(qk.clientGallery(shareToken ?? ''), (old: typeof gallery) => {
        if (!old) return old;
        return { ...old, selectsSubmittedAt: result.selectsSubmittedAt };
      });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: (photoIds?: string[]) => downloadGallery(shareToken ?? '', photoIds),
    onSuccess: (result) => {
      window.open(result.url, '_blank');
    },
  });

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleFavorite(id: string) {
    const currentFavs = new Set(localFavorites ?? gallery?.favoritePhotoIds ?? []);
    if (currentFavs.has(id)) {
      currentFavs.delete(id);
    } else {
      currentFavs.add(id);
    }
    setLocalFavorites(currentFavs);
    favMutation.mutate({ photoIds: Array.from(currentFavs) });
  }

  // Handle expired link error
  if (!isLoading && (error || (gallery && gallery.expired))) {
    return (
      <div className="min-h-screen bg-paper">
        <TopNav />
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-4">
          <p className="font-mono text-[10.5px] tracking-label text-muted">LINK_EXPIRED</p>
          <h2 className="font-serif text-[28px] font-[500] text-ink tracking-[-0.02em]">
            This gallery link has expired
          </h2>
          <p className="text-[14px] text-ink-3 max-w-sm">
            Contact the photographer to request a new link.
          </p>
          <button className="px-5 py-[10px] border border-field rounded-[9px] font-semibold text-[14px] text-ink hover:border-ink transition-colors">
            Message photographer
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) return <StateView variant="loading" title="Loading gallery…" fullScreen />;
  if (!gallery) return <StateView variant="error" title="Gallery not found" fullScreen />;

  const effectiveFavIds = localFavorites ?? new Set(gallery.favoritePhotoIds);
  const isOwner = gallery.viewerRole === 'owner';
  const isAlreadySubmitted = !!gallery.selectsSubmittedAt;

  const categoryList = isOwner ? OWNER_CATEGORIES : CLIENT_CATEGORIES;

  const photos = gallery.photoOrder.map((id, i) => ({
    id,
    code: `DLG-${String(i + 1).padStart(3, '0')}`,
    url: seedPhotoUrl(i, 800),
    favoritedByMe: effectiveFavIds.has(id),
    category: i % 2 === 0 ? 'ceremony' : ('reception' as PhotoCategory),
  }));

  const filtered = photos.filter((p) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'favorites') return p.favoritedByMe;
    if (activeCategory === 'client-selects') return effectiveFavIds.has(p.id);
    return p.category === activeCategory;
  });

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-4 md:px-8 pt-8 pb-32 md:pb-24">
        {/* Page header */}
        <div className="flex items-start justify-between mb-3 flex-wrap gap-4">
          <div>
            <p className="font-mono text-[10.5px] tracking-label text-muted mb-1.5">
              ⬚ PRIVATE · 09 — CLIENT GALLERY
            </p>
            <h1 className="font-serif text-[38px] font-[500] text-ink tracking-[-0.02em] mb-1.5">
              {gallery.title}
            </h1>
            <p className="font-mono text-[11px] text-muted">
              Shared with {gallery.clientName} · {gallery.counts.frames} frames · expires{' '}
              {new Date(gallery.expiresAt).toLocaleDateString()}
            </p>
            {/* Select limit counter */}
            {!isOwner && gallery.selectLimit !== null && (
              <p className="font-mono text-[11px] text-muted mt-1">
                {effectiveFavIds.size} OF {gallery.selectLimit} SELECTS
              </p>
            )}
            {/* Submitted confirmation */}
            {!isOwner && isAlreadySubmitted && gallery.selectsSubmittedAt && (
              <p className="font-mono text-[11px] text-muted mt-1">
                Selects submitted{' '}
                {new Date(gallery.selectsSubmittedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 mt-2 flex-wrap">
            {isOwner ? (
              /* Owner actions */
              <>
                <button
                  onClick={() => void navigator.clipboard.writeText(window.location.href)}
                  className="inline-flex items-center gap-1.5 px-4 py-[10px] bg-surface border border-field rounded-[9px] font-semibold text-[14px] text-ink hover:border-ink transition-colors whitespace-nowrap"
                >
                  <Copy size={14} />
                  Share link
                </button>
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-[10px] bg-surface border border-field rounded-[9px] font-semibold text-[14px] text-ink hover:border-ink transition-colors whitespace-nowrap"
                >
                  <Clock size={14} />
                  Edit expiry
                </button>
              </>
            ) : (
              /* Client actions */
              <>
                {gallery.allowDownload && (
                  <button
                    onClick={() => downloadMutation.mutate(undefined)}
                    disabled={downloadMutation.isPending}
                    className="px-4 py-[10px] bg-surface border border-field rounded-[9px] font-semibold text-[14px] text-ink hover:border-ink transition-colors whitespace-nowrap disabled:opacity-60"
                  >
                    ↓ Download all
                  </button>
                )}
                {!isAlreadySubmitted && (
                  <button
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending}
                    className="px-4 py-[10px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 transition-colors whitespace-nowrap disabled:opacity-60"
                  >
                    {submitMutation.isPending ? 'Submitting…' : 'Submit selects'}
                  </button>
                )}
                <button
                  onClick={() => setIsSelectMode((v) => !v)}
                  className="px-4 py-[10px] bg-surface border border-field rounded-[9px] font-semibold text-[14px] text-ink hover:border-ink transition-colors whitespace-nowrap"
                >
                  {isSelectMode ? 'Done' : 'Select'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {categoryList.map(({ id, label }) => (
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

        {/* Photo grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((photo) => {
            const isSel = selectedIds.has(photo.id);
            const isFav = photo.favoritedByMe;
            return (
              <div
                key={photo.id}
                className={`group relative cursor-pointer ${
                  isSel ? 'ring-2 ring-ink ring-offset-1 rounded-[10px]' : ''
                }`}
                onClick={() => {
                  if (isSelectMode) {
                    toggleSelect(photo.id);
                  } else {
                    setLightboxId(photo.id);
                  }
                }}
              >
                <PhotoTile
                  ratio="3:2"
                  src={photo.url}
                  alt={photo.code}
                  code={photo.code}
                  action={
                    isSelectMode ? (
                      /* Select mode: ring at top-left */
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSel
                            ? 'bg-ink border-ink'
                            : 'border-white/80 bg-transparent'
                        }`}
                        aria-label={isSel ? 'Deselect' : 'Select'}
                      >
                        {isSel && <Check size={12} color="white" strokeWidth={2.5} />}
                      </div>
                    ) : (
                      /* Normal mode: heart at top-right */
                      <FavoriteButton
                        isFavorited={isFav}
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id); }}
                      />
                    )
                  }
                />
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <StateView
            variant="empty"
            title="No frames in this view"
            description="Switch back to all photos."
            action={
              <button
                onClick={() => setActiveCategory('all')}
                className="px-5 py-[10px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 transition-colors"
              >
                All photos
              </button>
            }
          />
        )}
      </div>

      {/* Selection pill — fixed bottom, only in select mode when ≥1 selected */}
      {isSelectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-ink text-paper rounded-full px-5 py-3 shadow-lg">
          <span className="font-mono text-[12px]">{selectedIds.size} SELECTED</span>
          <div className="w-px h-4 bg-paper/30" />
          <button
            onClick={() => downloadMutation.mutate(Array.from(selectedIds))}
            disabled={downloadMutation.isPending}
            className="text-[13px] hover:text-paper/70 disabled:opacity-60"
          >
            Download selected
          </button>
          <button
            onClick={() => {
              const merged = new Set([...effectiveFavIds, ...selectedIds]);
              favMutation.mutate({ photoIds: Array.from(merged) });
              setSelectedIds(new Set());
            }}
            disabled={favMutation.isPending}
            className="text-[13px] hover:text-paper/70 disabled:opacity-60"
          >
            Add to favorites
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-[13px] hover:text-paper/70"
          >
            Clear
          </button>
        </div>
      )}

      {/* Lightbox placeholder — only open when not in select mode */}
      {lightboxId && !isSelectMode && (
        <div
          className="fixed inset-0 z-50 bg-ink/90 flex items-center justify-center"
          onClick={() => setLightboxId(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos.find((p) => p.id === lightboxId)?.url}
              alt=""
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              className="photo-protected max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            />
            <div
              style={{ position: 'absolute', inset: 0 }}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </div>
  );
}
