import type { Collection } from '@blueflutes/shared';
import { seedPhotoUrl } from '../../lib/seed-photos.js';

interface CollectionCardProps {
  collection: Collection;
  coverOffset?: number;
  onClick?: () => void;
}

export function CollectionCard({ collection, coverOffset = 0, onClick }: CollectionCardProps) {
  const coverUrls = collection.coverPhotoUrls?.slice(0, 4) ?? [];

  // Fill remaining slots with seed photos
  const tiles = Array.from({ length: 4 }, (_, i) =>
    coverUrls[i] || seedPhotoUrl(coverOffset * 4 + i, 400),
  );

  return (
    <div
      className="bg-surface border border-line rounded-card overflow-hidden cursor-pointer hover:shadow-avatar transition-shadow duration-150"
      onClick={onClick}
    >
      <div className="grid grid-cols-2 grid-rows-2 gap-[2px] aspect-square">
        {tiles.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="w-full h-full object-cover"
          />
        ))}
      </div>
      <div className="px-4 py-[16px]">
        <p className="font-serif text-[20px] text-ink">{collection.name}</p>
        <p className="text-[13px] text-ink-3 mt-0.5">{collection.note}</p>
        <p className="font-mono text-[10.5px] text-muted mt-2.5">
          {collection.count} FRAMES
        </p>
      </div>
    </div>
  );
}

export function CreateCollectionCard({ onClick }: { onClick?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[220px] rounded-card border-[1.5px] border-dashed border-field text-muted cursor-pointer hover:text-ink-3 transition-colors duration-150"
      onClick={onClick}
    >
      <span className="text-[30px] font-light leading-none mb-1.5">+</span>
      <span className="text-[13.5px]">Create collection</span>
    </div>
  );
}
