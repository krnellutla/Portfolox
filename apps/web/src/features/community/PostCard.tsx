import type { FeedPost } from '@portfoliohub/shared';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface PostCardProps {
  post: FeedPost;
  photoUrl?: string;
  avatarSrc?: string;
  liked: boolean;
  onLike: () => void;
}

export function PostCard({ post, photoUrl, avatarSrc, liked, onLike }: PostCardProps) {
  return (
    <div className="bg-surface border border-line rounded-card p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3.5">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={post.author.displayName}
            className="w-11 h-11 rounded-full shrink-0 object-cover"
          />
        ) : (
          <div className="w-11 h-11 rounded-full shrink-0 bg-canvas" />
        )}
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
      {post.photoIds.length > 0 && photoUrl && (
        <img
          src={photoUrl}
          alt=""
          className="w-full aspect-video object-cover rounded-[10px] mb-3.5"
        />
      )}

      {/* Reaction row */}
      <div className="flex items-center gap-5 pt-1 border-t border-line-2">
        <button
          onClick={onLike}
          className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors ${
            liked ? 'text-negative' : 'text-ink-3 hover:text-ink'
          }`}
        >
          <span>{liked ? '♥' : '♡'}</span>
          <span>{post.counts.likes}</span>
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
