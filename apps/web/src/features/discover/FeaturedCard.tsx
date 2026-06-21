import { Link } from 'react-router-dom';
import { Avatar } from '../../components/ui/Avatar.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import type { FeaturedPhotographer } from './mock.js';

interface FeaturedCardProps {
  photographer: FeaturedPhotographer;
  followed: boolean;
  onFollow: () => void;
}

export function FeaturedCard({ photographer: p, followed, onFollow }: FeaturedCardProps) {
  return (
    <Link
      to={`/portfolio/${p.handle.replace('@', '')}`}
      className="block bg-surface border border-line rounded-[12px] overflow-hidden hover:shadow-avatar transition-shadow duration-150"
    >
      {/* Cover image */}
      <div className="relative">
        <PhotoTile
          ratio="4:3"
          placeholderGradient={p.coverGradient}
        />
        <span className="absolute top-2.5 left-2.5 font-mono text-[10px] text-white/82 bg-black/28 backdrop-blur-sm px-[7px] py-[3px] rounded-[4px]">
          {p.spec}
        </span>
      </div>

      {/* Card body */}
      <div className="px-4 py-[15px] flex gap-3 items-start">
        <Avatar size={42} className="flex-shrink-0 border border-line" />
        <div className="flex-1 min-w-0">
          <p className="font-serif text-[19px] text-ink leading-[1.1]">{p.name}</p>
          <p className="font-mono text-[10.5px] text-muted mt-[3px]">
            {p.handle} · {p.loc}
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
