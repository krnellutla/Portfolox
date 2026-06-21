import { useState } from 'react';
import { TopNav } from '../../components/nav/TopNav.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { Chip } from '../../components/ui/Chip.js';
import { PhotoGrid } from '../../components/photo/PhotoGrid.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import { GALLERIES, PHOTOGRAPHER, PHOTOS } from './mock.js';

function formatStat(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k`;
  return n.toLocaleString();
}

export default function PortfolioPage() {
  const [followed, setFollowed] = useState(PHOTOGRAPHER.isFollowedByMe ?? false);
  const [activeGallery, setActiveGallery] = useState('all');

  const stats = [
    { label: 'Frames', value: formatStat(PHOTOGRAPHER.stats.frames) },
    { label: 'Followers', value: formatStat(PHOTOGRAPHER.stats.followers) },
    { label: 'Prints sold', value: formatStat(PHOTOGRAPHER.stats.printsSold) },
  ];

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      {/* Cover band */}
      <div className="relative h-[300px] overflow-hidden bg-[#7e8893]">
        <div
          className="absolute inset-0"
          style={{
            background:
              'repeating-linear-gradient(135deg,rgba(255,255,255,0.05) 0 2px,transparent 2px 9px)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg,rgba(0,0,0,0.05),rgba(244,243,240,0) 40%,#f4f3f0 100%)',
          }}
        />
        <span className="absolute top-4 left-8 font-mono text-[11px] tracking-[0.2em] text-white/70">
          PORTFOLIO COVER · ICELAND — RING ROAD
        </span>
      </div>

      {/* Content */}
      <div className="max-w-shell mx-auto px-4 md:px-8 pb-32 md:pb-[84px]">
        {/* Header row — avatar pulled up over cover */}
        <div className="flex gap-[22px] items-end mt-[-58px] relative">
          <Avatar
            size={116}
            className="ring-4 ring-paper shadow-avatar flex-shrink-0"
          />
          <div className="flex-1 pb-2">
            <h1 className="font-serif text-[42px] font-[500] text-ink leading-none tracking-[-0.02em]">
              {PHOTOGRAPHER.displayName}
            </h1>
            <p className="font-mono text-[12.5px] text-muted mt-[7px]">
              @{PHOTOGRAPHER.handle} · {PHOTOGRAPHER.location} · {PHOTOGRAPHER.specialty}
            </p>
          </div>
          <div className="flex gap-2.5 pb-[10px]">
            <button
              onClick={() => setFollowed((f) => !f)}
              className={`px-[22px] py-[11px] rounded-[9px] font-semibold text-sm transition-colors duration-150 ${
                followed
                  ? 'bg-canvas text-ink border border-line hover:bg-line'
                  : 'bg-ink text-paper hover:bg-ink-2'
              }`}
            >
              {followed ? 'Following' : 'Follow'}
            </button>
            <button className="px-5 py-[11px] bg-surface text-ink border border-field rounded-[9px] font-semibold text-sm hover:border-ink transition-colors duration-150">
              Message
            </button>
          </div>
        </div>

        {/* Bio */}
        <p className="text-[16px] leading-[1.6] text-ink-3 max-w-[62ch] mt-[22px] mb-6">
          {PHOTOGRAPHER.bio}
        </p>

        {/* Stats bar */}
        <div className="flex border-t border-b border-line py-[18px] mb-[30px]">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`${i > 0 ? 'pl-10 ml-0 border-l border-line' : ''} ${i < stats.length - 1 ? 'pr-10' : ''}`}
            >
              <p className="font-serif text-[26px] text-ink">{s.value}</p>
              <p className="font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase mt-0.5">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Gallery filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {GALLERIES.map((g) => (
            <Chip
              key={g.id}
              active={activeGallery === g.id}
              onClick={() => setActiveGallery(g.id)}
            >
              {g.name}
            </Chip>
          ))}
        </div>

        {/* Photo grid — click opens lightbox (stub) */}
        <PhotoGrid cols={2} gap="sm" className="md:[grid-template-columns:repeat(5,minmax(0,1fr))]">
          {PHOTOS.map((photo) => (
            <PhotoTile
              key={photo.id}
              ratio="1:1"
              code={photo.code}
              placeholderGradient={photo.gradient}
              onClick={() => {/* lightbox: built in screen 12 */}}
            />
          ))}
        </PhotoGrid>
      </div>
    </div>
  );
}
