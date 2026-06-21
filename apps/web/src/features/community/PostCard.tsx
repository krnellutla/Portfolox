import { useState } from 'react';
import type { FeedPost } from '../../lib/types.js';
import { PHOTOGRAPHER_GRADIENTS, relativeTime } from './mock.js';

interface PostCardProps {
  post: FeedPost & { photoGradient?: string };
}

export function PostCard({ post }: PostCardProps) {
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.counts.likes);

  function toggleLike() {
    setLiked((prev) => {
      const next = !prev;
      setLikeCount((c) => c + (next ? 1 : -1));
      return next;
    });
  }

  const avatarGrad = PHOTOGRAPHER_GRADIENTS[post.author.id] ?? 'linear-gradient(145deg,#9a9,#6a6)';

  return (
    <div className="bg-surface border border-line rounded-card p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3.5">
        <div
          className="w-11 h-11 rounded-full shrink-0"
          style={{ background: avatarGrad }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-serif text-[18px] font-[500] text-ink leading-tight">{post.author.displayName}</p>
          <p className="font-mono text-[10.5px] text-muted mt-0.5">
            @{post.author.handle} · {post.author.specialty} · {relativeTime(post.createdAt)}
          </p>
        </div>
        <button className="text-muted text-[18px] hover:text-ink transition-colors leading-none">···</button>
      </div>

      {/* Body */}
      <p className="text-[15px] text-ink leading-[1.55] mb-3.5">{post.body}</p>

      {/* Optional photo */}
      {post.photoIds.length > 0 && post.photoGradient && (
        <div
          className="w-full aspect-video rounded-[10px] mb-3.5"
          style={{ background: post.photoGradient }}
        />
      )}

      {/* Reaction row */}
      <div className="flex items-center gap-5 pt-1 border-t border-line-2">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors ${
            liked ? 'text-negative' : 'text-ink-3 hover:text-ink'
          }`}
        >
          <span>{liked ? '♥' : '♡'}</span>
          <span>{likeCount}</span>
        </button>
        <button className="flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink transition-colors">
          <span>◻</span>
          <span>{post.counts.comments}</span>
        </button>
        <button className="text-[13px] text-ink-3 hover:text-ink transition-colors ml-auto">
          Share
        </button>
      </div>
    </div>
  );
}
