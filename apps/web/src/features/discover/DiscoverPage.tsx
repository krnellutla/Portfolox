import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TopNav } from '../../components/nav/TopNav.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { useEyebrow } from '../../lib/eyebrow.js';
import { Input } from '../../components/ui/Input.js';
import { StateView } from '../../components/ui/StateView.js';
import { FeaturedCard } from './FeaturedCard.js';
import { getFeatured, getFresh } from '../../api/discover.js';
import { follow, unfollow } from '../../api/photographers.js';
import { qk } from '../../lib/query-client.js';

const CATEGORIES = [
  'Landscape', 'Portrait', 'Street', 'Wedding',
  'Fine Art', 'Documentary', 'Architecture', 'Wildlife', 'Black & White',
];

export default function DiscoverPage() {
  const eyebrow = useEyebrow('01 — Discover');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');

  const { data: featured, isLoading: featuredLoading, error: featuredError } = useQuery({
    queryKey: qk.discover.featured(),
    queryFn: getFeatured,
  });

  const { data: fresh, isLoading: freshLoading } = useQuery({
    queryKey: qk.discover.fresh(),
    queryFn: () => getFresh(),
  });

  const followMutation = useMutation({
    mutationFn: ({ id, following }: { id: string; following: boolean }) =>
      following ? unfollow(id) : follow(id),
    onMutate: ({ id, following }) => {
      queryClient.setQueryData(qk.discover.featured(), (old: typeof featured) =>
        old?.map((p) => p.id === id ? { ...p, isFollowedByMe: !following } : p),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.discover.featured() });
    },
  });

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
          <Eyebrow className="mb-[22px]">{eyebrow}</Eyebrow>
          <h1 className="font-serif text-display-xl font-[500] text-ink leading-[1.03] tracking-[-0.02em] max-w-[15ch] mb-[22px]">
            Where photographers keep their best work.
          </h1>
          <p className="text-[17px] leading-[1.55] text-ink-3 max-w-[54ch] mb-[30px]">
            A home for your portfolio, a store for your prints, and a community that
            actually shoots. Beautifully simple — and priced so showing your work never
            costs more than making it.
          </p>

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
            <button className="font-mono text-[11px] tracking-label text-ink-3 hover:text-ink transition-colors duration-150 whitespace-nowrap">
              VIEW ALL →
            </button>
          </div>

          {featuredLoading && <StateView variant="loading" title="Loading…" />}
          {featuredError && <StateView variant="error" title="Couldn't load featured photographers" />}
          {featured && (
            <>
              {/* Mobile: horizontal scroll rail */}
              <div className="flex md:hidden overflow-x-auto gap-4 snap-x snap-mandatory pb-2 -mx-4 px-4">
                {featured.map((p, i) => (
                  <div key={p.id} className="snap-start flex-shrink-0 w-[80vw] max-w-[320px]">
                    <FeaturedCard
                      photographer={p}
                      coverImageIndex={i}
                      followed={!!p.isFollowedByMe}
                      onFollow={() => followMutation.mutate({ id: p.id, following: !!p.isFollowedByMe })}
                    />
                  </div>
                ))}
              </div>
              {/* md+: grid */}
              <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {featured.map((p, i) => (
                  <FeaturedCard
                    key={p.id}
                    photographer={p}
                    coverImageIndex={i}
                    followed={!!p.isFollowedByMe}
                    onFollow={() => followMutation.mutate({ id: p.id, following: !!p.isFollowedByMe })}
                  />
                ))}
              </div>
            </>
          )}
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
          {freshLoading && <StateView variant="loading" title="Loading…" />}
          {fresh && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {fresh.items.map((photo) => (
                <PhotoTile
                  key={photo.id}
                  src={photo.url || photo.thumbUrl || undefined}
                  alt={photo.title}
                  ratio="1:1"
                  code={photo.code}
                  onClick={() => navigate(`/lightbox?id=${photo.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
