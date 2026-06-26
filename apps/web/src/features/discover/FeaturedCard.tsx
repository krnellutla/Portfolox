import { Link } from 'react-router-dom';
import type { Photographer } from '@portfoliohub/shared';
import { Avatar } from '../../components/ui/Avatar.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import { seedPhotoUrl, seedAvatarUrl } from '../../lib/seed-photos.js';

interface FeaturedCardProps {
  photographer: Photographer;
  coverImageIndex: number;
  followed: boolean;
  onFollow: () => void;
}

export function FeaturedCard({ photographer: p, coverImageIndex, followed, onFollow }: FeaturedCardProps) {
  const coverSrc = p.coverUrl ?? seedPhotoUrl(coverImageIndex, 800);
  const avatarSrc = p.avatarUrl ?? seedAvatarUrl(coverImageIndex, 120);

  return (
    <Link
      to={`/portfolio/${p.handle}`}
      className="block bg-surface border border-line rounded-[12px] overflow-hidden hover:shadow-avatar transition-shadow duration-150"
    >
      <div className="relative">
        <PhotoTile ratio="4:3" src={coverSrc} alt={p.displayName} />
        <span className="absolute top-2.5 left-2.5 font-mono text-[10px] text-white/82 bg-black/28 backdrop-blur-sm px-[7px] py-[3px] rounded-[4px]">
          {p.specialty}
        </span>
      </div>

      <div className="px-4 py-[15px] flex gap-3 items-start">
        <Avatar src={avatarSrc} size={42} className="flex-shrink-0 border border-line" />
        <div className="flex-1 min-w-0">
          <p className="font-serif text-[19px] text-ink leading-[1.1]">{p.displayName}</p>
          <p className="font-mono text-[10.5px] text-muted mt-[3px]">
            @{p.handle} · {p.location}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onFollow(); }}
          className={`shrink-0 px-[14px] py-[7px] rounded-[9px] text-[12.5px] font-semibold transition-colors duration-150 ${
            followed
              ? 'bg-canvas text-ink border border-line hover:bg-line'
              : 'bg-ink text-paper hover:bg-ink-2'
          }`}
        >
          {followed ? 'Following' : 'Follow'}
        </button>
      </div>
    </Link>
  );
}
