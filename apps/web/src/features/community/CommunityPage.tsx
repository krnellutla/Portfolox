import { useState } from 'react';
import { TopNav } from '../../components/nav/TopNav.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import type { CommunitySpace } from '../../lib/types.js';
import { PostCard } from './PostCard.js';
import {
  ACTIVE_NOW, FEED_POSTS, PHOTOGRAPHER_GRADIENTS, SPACES, TRENDING_TAGS,
} from './mock.js';

const ME_ID = 'ph1';
const ME_GRAD = PHOTOGRAPHER_GRADIENTS[ME_ID];

export default function CommunityPage() {
  const [activeSpace, setActiveSpace] = useState<CommunitySpace>('show-your-work');
  const [composer, setComposer] = useState('');
  const [posts, setPosts] = useState(FEED_POSTS);

  function submitPost() {
    if (!composer.trim()) return;
    setPosts((prev) => [
      {
        id: `post-${Date.now()}`,
        author: {
          id: ME_ID,
          handle: 'miracalder',
          displayName: 'Mira Calder',
          avatarUrl: null,
          specialty: 'Landscape',
        },
        body: composer.trim(),
        photoIds: [],
        createdAt: new Date().toISOString(),
        counts: { likes: 0, comments: 0 },
        likedByMe: false,
        space: activeSpace,
      },
      ...prev,
    ]);
    setComposer('');
  }

  const filtered = posts.filter((p) => p.space === activeSpace);

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
            onClick={() => {}}
            className="w-full py-[11px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 transition-colors mb-6"
          >
            + New post
          </button>

          <p className="font-mono text-[10px] uppercase tracking-label text-muted mb-2.5">Spaces</p>
          <div className="flex flex-col gap-1">
            {SPACES.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSpace(s.id)}
                className={`flex items-center justify-between px-3 py-[10px] rounded-[10px] text-left transition-colors ${
                  activeSpace === s.id
                    ? 'bg-surface border border-line'
                    : 'hover:bg-canvas'
                }`}
              >
                <span className={`text-[13.5px] font-semibold ${activeSpace === s.id ? 'text-ink' : 'text-ink-3'}`}>
                  {s.label}
                </span>
                <span className="font-mono text-[10px] text-muted">{s.count}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Center feed */}
        <div className="flex flex-col gap-4">
          {/* Composer */}
          <div className="bg-surface border border-line rounded-card p-4">
            <div className="flex gap-3">
              <div
                className="w-10 h-10 rounded-full shrink-0"
                style={{ background: ME_GRAD }}
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
                disabled={!composer.trim()}
                className="px-5 py-[8px] bg-ink text-paper rounded-[8px] font-semibold text-[13px] hover:bg-ink-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Post
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center py-16 font-mono text-[13px] text-muted">
              No posts in this space yet.
            </p>
          ) : (
            filtered.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>

        {/* Right rail */}
        <aside className="hidden md:flex sticky top-[72px] self-start flex-col gap-6">
          {/* Trending */}
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

          {/* Active now */}
          <div className="bg-surface border border-line rounded-card p-5">
            <p className="font-mono text-[10px] uppercase tracking-label text-muted mb-3">Active now</p>
            <div className="flex flex-col gap-3">
              {ACTIVE_NOW.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <div
                      className="w-9 h-9 rounded-full"
                      style={{ background: u.gradient }}
                    />
                    <span className="absolute bottom-0 right-0 w-[10px] h-[10px] rounded-full bg-positive border-2 border-surface" />
                  </div>
                  <span className="text-[13.5px] text-ink font-semibold">{u.name}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
