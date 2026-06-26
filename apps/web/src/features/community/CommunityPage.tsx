import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CommunitySpace, FeedPost } from '@portfoliohub/shared';
import { TopNav } from '../../components/nav/TopNav.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { StateView } from '../../components/ui/StateView.js';
import { getSpaces, getPosts, createPost, likePost, unlikePost } from '../../api/community.js';
import { connectWs, disconnectWs } from '../../api/ws.js';
import { qk } from '../../lib/query-client.js';
import { seedAvatarUrl, seedPhotoUrl } from '../../lib/seed-photos.js';
import { PostCard } from './PostCard.js';

const TRENDING_TAGS = ['#iceland', '#fineart', '#print-edition', '#critique', '#35mm', '#landscape'];

export default function CommunityPage() {
  const queryClient = useQueryClient();
  const [activeSpace, setActiveSpace] = useState<CommunitySpace>('show-your-work');
  const [composer, setComposer] = useState('');

  useEffect(() => {
    connectWs();
    return () => disconnectWs();
  }, []);

  const { data: spaces } = useQuery({
    queryKey: qk.community.spaces(),
    queryFn: getSpaces,
  });

  const { data: feed, isLoading, error } = useQuery({
    queryKey: qk.community.feed(activeSpace),
    queryFn: () => getPosts(activeSpace),
    staleTime: 30_000,
  });

  const likeMutation = useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) =>
      liked ? unlikePost(id) : likePost(id),
    onMutate: ({ id, liked }) => {
      queryClient.setQueryData(
        qk.community.feed(activeSpace),
        (old: typeof feed) =>
          old && {
            ...old,
            items: old.items.map((p) =>
              p.id === id
                ? { ...p, likedByMe: !liked, counts: { ...p.counts, likes: p.counts.likes + (liked ? -1 : 1) } }
                : p,
            ),
          },
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.community.feed(activeSpace) });
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: string) =>
      createPost({ body, space: activeSpace }),
    onMutate: (body) => {
      const optimistic: FeedPost = {
        id: `opt-${Date.now()}`,
        author: { id: 'me', handle: 'me', displayName: 'You', avatarUrl: null, specialty: 'Landscape' },
        body,
        photoIds: [],
        createdAt: new Date().toISOString(),
        counts: { likes: 0, comments: 0 },
        likedByMe: false,
        space: activeSpace,
      };
      queryClient.setQueryData(
        qk.community.feed(activeSpace),
        (old: typeof feed) =>
          old ? { ...old, items: [optimistic, ...old.items] } : old,
      );
      setComposer('');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.community.feed(activeSpace) });
    },
  });

  function submitPost() {
    if (!composer.trim()) return;
    createMutation.mutate(composer.trim());
  }

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div
        className="max-w-shell mx-auto px-4 md:px-8 pt-8 pb-32 md:pb-24 flex flex-col md:grid md:gap-8"
        style={{ gridTemplateColumns: '236px 1fr 280px' }}
      >
        {/* Left rail */}
        <aside className="hidden md:block sticky top-[72px] self-start">
          <Eyebrow className="mb-5">05 — Community</Eyebrow>

          <button
            onClick={() => { const el = document.querySelector('textarea'); el?.focus(); }}
            className="w-full py-[11px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 transition-colors mb-6"
          >
            + New post
          </button>

          <p className="font-mono text-[10px] uppercase tracking-label text-muted mb-2.5">Spaces</p>
          <div className="flex flex-col gap-1">
            {(spaces ?? [
              { space: 'show-your-work' as CommunitySpace, label: 'Show Your Work', count: 412 },
              { space: 'critique' as CommunitySpace, label: 'Critique Corner', count: 189 },
              { space: 'pricing-business' as CommunitySpace, label: 'Pricing & Business', count: 94 },
              { space: 'gear' as CommunitySpace, label: 'Gear Talk', count: 266 },
              { space: 'locations' as CommunitySpace, label: 'Locations', count: 137 },
            ]).map((s) => {
              const id = 'space' in s ? s.space : s.space;
              const label = s.label;
              const count = s.count;
              return (
                <button
                  key={id}
                  onClick={() => setActiveSpace(id as CommunitySpace)}
                  className={`flex items-center justify-between px-3 py-[10px] rounded-[10px] text-left transition-colors ${
                    activeSpace === id
                      ? 'bg-surface border border-line'
                      : 'hover:bg-canvas'
                  }`}
                >
                  <span className={`text-[13.5px] font-semibold ${activeSpace === id ? 'text-ink' : 'text-ink-3'}`}>
                    {label}
                  </span>
                  <span className="font-mono text-[10px] text-muted">{count}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center feed */}
        <div className="flex flex-col gap-4">
          {/* Composer */}
          <div className="bg-surface border border-line rounded-card p-4">
            <div className="flex gap-3">
              <img
                src={seedAvatarUrl(0, 40)}
                alt="me"
                className="w-10 h-10 rounded-full shrink-0 object-cover"
              />
              <textarea
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder="Share a photo, thought, or question…"
                rows={3}
                className="flex-1 resize-none text-[14.5px] text-ink bg-transparent outline-none placeholder:text-muted leading-[1.5]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitPost();
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-line-2">
              <div className="flex gap-2">
                <button className="font-mono text-[11px] text-ink-3 hover:text-ink transition-colors">Photo</button>
                <button className="font-mono text-[11px] text-ink-3 hover:text-ink transition-colors">Poll</button>
              </div>
              <button
                onClick={submitPost}
                disabled={!composer.trim() || createMutation.isPending}
                className="px-5 py-[8px] bg-ink text-paper rounded-[8px] font-semibold text-[13px] hover:bg-ink-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Post
              </button>
            </div>
          </div>

          {isLoading && <StateView variant="loading" title="Loading posts…" />}
          {error && <StateView variant="error" title="Couldn't load feed" />}
          {feed && feed.items.length === 0 && (
            <p className="text-center py-16 font-mono text-[13px] text-muted">
              No posts in this space yet.
            </p>
          )}
          {feed?.items.map((post, i) => (
            <PostCard
              key={post.id}
              post={post}
              photoUrl={post.photoIds.length > 0 ? seedPhotoUrl(i, 800) : undefined}
              avatarSrc={post.author.avatarUrl ?? seedAvatarUrl(i % 8, 44)}
              liked={!!post.likedByMe}
              onLike={() => likeMutation.mutate({ id: post.id, liked: !!post.likedByMe })}
            />
          ))}
        </div>

        {/* Right rail */}
        <aside className="hidden md:flex sticky top-[72px] self-start flex-col gap-6">
          <div className="bg-surface border border-line rounded-card p-5">
            <p className="font-mono text-[10px] uppercase tracking-label text-muted mb-3">Trending</p>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TAGS.map((tag) => (
                <button
                  key={tag}
                  className="px-3 py-1.5 bg-canvas border border-line rounded-[999px] font-mono text-[11px] text-ink-3 hover:border-ink hover:text-ink transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-line rounded-card p-5">
            <p className="font-mono text-[10px] uppercase tracking-label text-muted mb-3">Active now</p>
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <img
                      src={seedAvatarUrl(i, 36)}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 w-[10px] h-[10px] rounded-full bg-positive border-2 border-surface" />
                  </div>
                  <span className="text-[13.5px] text-ink font-semibold">
                    {['Ridge Studio', 'K. Møller', 'Noah Petersen'][i - 1]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
