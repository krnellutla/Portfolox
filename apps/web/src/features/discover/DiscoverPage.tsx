import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from '../../components/nav/TopNav.js';
import { PhotoGrid } from '../../components/photo/PhotoGrid.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import { Chip } from '../../components/ui/Chip.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { Input } from '../../components/ui/Input.js';
import { FeaturedCard } from './FeaturedCard.js';
import { CATEGORIES, FEATURED, FRESH_PHOTOS } from './mock.js';

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [following, setFollowing] = useState<Set<string>>(new Set());

  function toggleFollow(name: string) {
    setFollowing((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-4 md:px-8 pb-32 md:pb-24">
        {/* Hero */}
        <div className="pt-16 pb-[46px] border-b border-line">
          <Eyebrow className="mb-[22px]">01 — Discover</Eyebrow>
          <h1 className="font-serif text-display-xl font-[500] text-ink leading-[1.03] tracking-[-0.02em] max-w-[15ch] mb-[22px]">
            Where photographers keep their best work.
          </h1>
          <p className="text-[17px] leading-[1.55] text-ink-3 max-w-[54ch] mb-[30px]">
            A home for your portfolio, a store for your prints, and a community that
            actually shoots. Beautifully simple — and priced so showing your work never
            costs more than making it.
          </p>

          {/* Search row */}
          <form onSubmit={handleSearch} className="flex gap-2.5 max-w-[580px] mb-5">
            <Input
              placeholder="Search photographers, places, or styles"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-[15px]"
            />
            <button
              type="submit"
              className="px-6 py-[14px] bg-ink text-paper rounded-[9px] font-semibold text-[15px] whitespace-nowrap hover:bg-ink-2 transition-colors duration-150"
            >
              Search
            </button>
          </form>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => navigate(`/search?styles=${encodeURIComponent(cat)}`)}
                className="px-[14px] py-[7px] border border-field bg-surface rounded-[999px] text-[13px] text-ink-3 hover:border-ink hover:text-ink transition-colors duration-150"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Featured photographers */}
        <div className="pt-[46px] pb-2">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-[30px] font-[500] text-ink tracking-[-0.01em]">
              Featured photographers
            </h2>
            <button className="font-mono text-[11px] tracking-label text-ink-3 hover:text-ink transition-colors duration-150">
              VIEW ALL →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {FEATURED.map((p) => (
              <FeaturedCard
                key={p.name}
                photographer={p}
                followed={following.has(p.name)}
                onFollow={() => toggleFollow(p.name)}
              />
            ))}
          </div>
        </div>

        {/* Fresh frames */}
        <div className="pt-[42px]">
          <div className="flex items-baseline justify-between mb-[18px]">
            <h2 className="font-serif text-[30px] font-[500] text-ink tracking-[-0.01em]">
              Fresh frames
            </h2>
            <span className="font-mono text-[11px] tracking-[0.16em] text-muted">
              UPDATED HOURLY
            </span>
          </div>
          <PhotoGrid cols={2} gap="sm" className="md:[grid-template-columns:repeat(4,minmax(0,1fr))]">
            {FRESH_PHOTOS.map((photo) => (
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
    </div>
  );
}
