import { useState } from 'react';
import { TopNav } from '../../components/nav/TopNav.js';
import { FavoriteButton } from '../../components/photo/FavoriteButton.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { CollectionCard, CreateCollectionCard } from './CollectionCard.js';
import { COLLECTIONS, LIKED_PHOTOS } from './mock.js';

export default function CollectionsPage() {
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(LIKED_PHOTOS.map((p) => p.id)),
  );

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const favCount = favorites.size;

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />

      <div className="max-w-shell mx-auto px-8 pt-[34px] pb-24 animate-pfxFade">
        {/* Header */}
        <div className="flex items-end justify-between mb-[30px] flex-wrap gap-3">
          <div>
            <Eyebrow className="mb-3">07 — Collections</Eyebrow>
            <h1 className="font-serif text-display-m font-[500] text-ink tracking-[-0.02em]">
              Saved &amp; organized
            </h1>
          </div>
          <button className="px-5 py-[11px] bg-ink text-paper rounded-[9px] font-semibold text-sm hover:bg-ink-2 transition-colors duration-150">
            + New collection
          </button>
        </div>

        {/* Collection cards grid */}
        <div className="grid grid-cols-4 gap-[18px] mb-14">
          {COLLECTIONS.map((col) => (
            <CollectionCard key={col.id} collection={col} />
          ))}
          <CreateCollectionCard />
        </div>

        {/* Liked photos */}
        <div className="flex items-baseline justify-between mb-[18px]">
          <h2 className="font-serif text-[28px] font-[500] text-ink tracking-[-0.01em]">
            Liked photos
          </h2>
          <span className="font-mono text-[11px] tracking-label text-muted">
            {favCount} SAVED
          </span>
        </div>

        <div className="grid grid-cols-6 gap-3">
          {LIKED_PHOTOS.map((photo) => (
            <PhotoTile
              key={photo.id}
              ratio="1:1"
              code={photo.code}
              placeholderGradient={photo.gradient}
              action={
                <FavoriteButton
                  active={favorites.has(photo.id)}
                  onChange={() => toggleFavorite(photo.id)}
                />
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
