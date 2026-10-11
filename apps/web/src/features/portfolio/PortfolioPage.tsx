import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Photographer } from '@blueflutes/shared';
import { TopNav } from '../../components/nav/TopNav.js';
import { Avatar } from '../../components/ui/Avatar.js';
import { Chip } from '../../components/ui/Chip.js';
import { PhotoGrid } from '../../components/photo/PhotoGrid.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import { StateView } from '../../components/ui/StateView.js';
import { SkeletonTile } from '../../components/ui/Skeleton.js';
import { getProfile, getGalleries, getPhotos, follow, unfollow } from '../../api/photographers.js';
import { qk } from '../../lib/query-client.js';
import { seedPhotoUrl, seedAvatarUrl } from '../../lib/seed-photos.js';

function formatStat(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k`;
  return n.toLocaleString();
}

export default function PortfolioPage() {
  const { handle = '' } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeGallery, setActiveGallery] = useState<string | undefined>(undefined);

  const { data: photographer, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: qk.photographer(handle),
    queryFn: () => getProfile(handle),
    enabled: !!handle,
  });

  const { data: galleries } = useQuery({
    queryKey: qk.photographerGalleries(handle),
    queryFn: () => getGalleries(handle),
    enabled: !!handle,
  });

  const { data: photosData, isLoading: photosLoading } = useQuery({
    queryKey: qk.photographerPhotos(handle, activeGallery),
    queryFn: () => getPhotos(handle, activeGallery),
    enabled: !!handle,
  });

  const followMutation = useMutation({
    mutationFn: ({ id, isFollowing }: { id: string; isFollowing: boolean }) =>
      isFollowing ? unfollow(id) : follow(id),
    onMutate: ({ isFollowing }) => {
      qc.setQueryData(qk.photographer(handle), (old: Photographer | undefined) =>
        old ? { ...old, isFollowedByMe: !isFollowing } : old,
      );
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.photographer(handle) });
    },
  });

  if (profileLoading) return <StateView variant="loading" title="Loading portfolio…" fullScreen />;
  if (profileError || !photographer) return <StateView variant="error" title="Portfolio not found" fullScreen />;

  const coverSrc = photographer.coverUrl ?? seedPhotoUrl(0, 1200);
  const avatarSrc = photographer.avatarUrl ?? seedAvatarUrl(0, 120);
  const isFollowed = !!photographer.isFollowedByMe;

  const stats = [
    { label: 'Frames', value: formatStat(photographer.stats.frames) },
    { label: 'Followers', value: formatStat(photographer.stats.followers) },
    { label: 'Prints sold', value: formatStat(photographer.stats.printsSold) },
  ];

  const allGalleries = [{ id: undefined, title: 'All work' }, ...(galleries ?? [])];
  const photos = photosData?.items ?? [];

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      {/* Cover band */}
      <div className="relative h-[300px] overflow-hidden">
        <img src={coverSrc} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.05),rgba(244,243,240,0) 40%,#f4f3f0 100%)' }}
        />
        <span className="absolute top-4 left-8 font-mono text-[11px] tracking-[0.2em] text-white/70">
          PORTFOLIO COVER · {photographer.location.toUpperCase()}
        </span>
      </div>

      {/* Content */}
      <div className="max-w-shell mx-auto px-4 md:px-8 pb-32 md:pb-[84px]">
        {/* Header row — avatar pulled up over cover */}
        <div className="flex gap-[22px] items-end mt-[-58px] relative">
          <Avatar src={avatarSrc} size={116} className="ring-4 ring-paper shadow-avatar flex-shrink-0" />
          <div className="flex-1 pb-2">
            <h1 className="font-serif text-[42px] font-[500] text-ink leading-none tracking-[-0.02em]">
              {photographer.displayName}
            </h1>
            <p className="font-mono text-[12.5px] text-muted mt-[7px]">
              @{photographer.handle} · {photographer.location} · {photographer.specialty}
            </p>
          </div>
          <div className="flex gap-2.5 pb-[10px]">
            <button
              onClick={() => followMutation.mutate({ id: photographer.id, isFollowing: isFollowed })}
              disabled={followMutation.isPending}
              className={`px-[22px] py-[11px] rounded-[9px] font-semibold text-sm transition-colors duration-150 ${
                isFollowed
                  ? 'bg-canvas text-ink border border-line hover:bg-line'
                  : 'bg-ink text-paper hover:bg-ink-2'
              }`}
            >
              {isFollowed ? 'Following' : 'Follow'}
            </button>
            <button className="px-5 py-[11px] bg-surface text-ink border border-field rounded-[9px] font-semibold text-sm hover:border-ink transition-colors duration-150">
              Message
            </button>
          </div>
        </div>

        {/* Bio */}
        <p className="text-[16px] leading-[1.6] text-ink-3 max-w-[62ch] mt-[22px] mb-6">
          {photographer.bio}
        </p>

        {/* Stats bar */}
        <div className="flex border-t border-b border-line py-[18px] mb-[30px]">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`${i > 0 ? 'pl-10 border-l border-line' : ''} ${i < stats.length - 1 ? 'pr-10' : ''}`}
            >
              <p className="font-serif text-[26px] text-ink">{s.value}</p>
              <p className="font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Gallery filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {allGalleries.map((g) => (
            <Chip
              key={g.id ?? 'all'}
              active={activeGallery === g.id}
              onClick={() => setActiveGallery(g.id)}
            >
              {'title' in g ? g.title : (g as { name: string }).name}
            </Chip>
          ))}
        </div>

        {/* Photo grid */}
        {photosLoading && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonTile key={i} className="aspect-square" />
            ))}
          </div>
        )}
        {!photosLoading && photos.length === 0 && (
          <StateView
            variant="empty"
            title="Nothing published yet"
            description="Follow to hear when new work goes up."
            action={
              <button
                onClick={() => followMutation.mutate({ id: photographer.id, isFollowing: isFollowed })}
                disabled={followMutation.isPending || isFollowed}
                className="px-5 py-[10px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 disabled:opacity-60 transition-colors"
              >
                {isFollowed ? 'Following' : 'Follow'}
              </button>
            }
          />
        )}
        {!photosLoading && photos.length > 0 && (
          <PhotoGrid cols={2} gap="sm" className="md:[grid-template-columns:repeat(5,minmax(0,1fr))]">
            {photos.map((photo, i) => (
              <PhotoTile
                key={photo.id}
                src={photo.url || photo.thumbUrl || seedPhotoUrl(i)}
                alt={photo.title}
                ratio="1:1"
                code={photo.code}
                onClick={() => navigate(`/lightbox?id=${photo.id}&photographer=${handle}`)}
              />
            ))}
          </PhotoGrid>
        )}
      </div>
    </div>
  );
}
