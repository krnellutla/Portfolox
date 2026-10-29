import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { TopNav } from '../../components/nav/TopNav.js';
import { FavoriteButton } from '../../components/photo/FavoriteButton.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { useEyebrow } from '../../lib/eyebrow.js';
import { StateView } from '../../components/ui/StateView.js';
import { SkeletonTile } from '../../components/ui/Skeleton.js';
import { seedPhotoUrl } from '../../lib/seed-photos.js';
import { qk } from '../../lib/query-client.js';
import { getCollections } from '../../api/collections.js';
import { favoritePhoto, unfavoritePhoto } from '../../api/photos.js';
import { CollectionCard, CreateCollectionCard } from './CollectionCard.js';

// Seed liked photos for display when real API is unavailable
const SEED_LIKED = Array.from({ length: 12 }, (_, i) => ({
  id: `seed-liked-${i}`,
  code: `PFX·${4200 + i}`,
  thumbUrl: seedPhotoUrl(i + 12, 400),
  favoritedByMe: true,
}));

export default function CollectionsPage() {
  const eyebrow = useEyebrow('07 — Collections');
  const [localFavs, setLocalFavs] = useState<Set<string>>(
    () => new Set(SEED_LIKED.map((p) => p.id)),
  );

  const { data: collections, isLoading, error } = useQuery({
    queryKey: qk.collections(),
    queryFn: getCollections,
    retry: false,
  });

  const favMutation = useMutation({
    mutationFn: ({ id, favorited }: { id: string; favorited: boolean }) =>
      favorited ? unfavoritePhoto(id) : favoritePhoto(id),
    onMutate: ({ id, favorited }) => {
      setLocalFavs((prev) => {
        const next = new Set(prev);
        if (favorited) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
  });

  const favCount = localFavs.size;

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />

      <div className="max-w-shell mx-auto px-4 md:px-8 pt-[34px] pb-32 md:pb-24 animate-pfxFade">
        {/* Header */}
        <div className="flex items-end justify-between mb-[30px] flex-wrap gap-3">
          <div>
            <Eyebrow className="mb-3">{eyebrow}</Eyebrow>
            <h1 className="font-serif text-display-m font-[500] text-ink tracking-[-0.02em]">
              Saved &amp; organized
            </h1>
          </div>
          <button className="px-5 py-[11px] bg-ink text-paper rounded-[9px] font-semibold text-sm hover:bg-ink-2 transition-colors duration-150">
            + New collection
          </button>
        </div>

        {/* Collection cards grid */}
        {isLoading && (
          <div className="grid grid-cols-4 gap-[18px] mb-14">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonTile key={i} className="aspect-square" />
            ))}
          </div>
        )}
        {error && (
          <div className="mb-14">
            <StateView
              variant="error"
              title="Couldn't load collections"
              description="Something went wrong. Try refreshing the page."
              eyebrow="LOAD ERROR"
              action={
                <button
                  onClick={() => void 0}
                  className="px-5 py-[10px] border border-field rounded-[9px] font-mono text-[12px] text-ink hover:border-ink transition-colors"
                >
                  Try again
                </button>
              }
            />
          </div>
        )}
        {collections && collections.length > 0 && (
          <div className="grid grid-cols-4 gap-[18px] mb-14">
            {collections.map((col, i) => (
              <CollectionCard key={col.id} collection={col} coverOffset={i} />
            ))}
            <CreateCollectionCard />
          </div>
        )}
        {collections && collections.length === 0 && (
          <div className="mb-14">
            <StateView
              variant="empty"
              title="No collections yet"
              description="Save frames you love and group them here."
              action={
                <button className="px-5 py-[10px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 transition-colors">
                  New collection
                </button>
              }
            />
          </div>
        )}
        {!isLoading && !collections && !error && (
          <div className="grid grid-cols-4 gap-[18px] mb-14">
            <CreateCollectionCard />
          </div>
        )}

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
          {SEED_LIKED.map((photo) => (
            <PhotoTile
              key={photo.id}
              ratio="1:1"
              src={photo.thumbUrl}
              code={photo.code}
              action={
                <FavoriteButton
                  active={localFavs.has(photo.id)}
                  onChange={() =>
                    favMutation.mutate({ id: photo.id, favorited: localFavs.has(photo.id) })
                  }
                />
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
