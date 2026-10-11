import { useParams, Link } from 'react-router-dom';
import { TopNav } from '../../components/nav/TopNav.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { PostCard } from './PostCard.js';
import { seedPhotoUrl, seedAvatarUrl } from '../../lib/seed-photos.js';

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();

  const stubPost = {
    id: id ?? 'stub',
    space: 'show-your-work' as const,
    author: { id: 'author-1', displayName: 'Alex Chen', handle: 'alex_chen', specialty: 'Landscape', avatarUrl: null },
    body: 'Just finished this piece after three months of waiting for the right light. The patience was worth it.',
    photoIds: ['photo-1'],
    counts: { likes: 24, comments: 3 },
    likedByMe: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  };

  const stubComments = [
    { id: 'c1', author: 'Maria Santos', text: 'Breathtaking composition. The foreground really grounds it.', at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'c2', author: 'James Okafor', text: 'Which lens did you use for this?', at: new Date(Date.now() - 1800000).toISOString() },
    { id: 'c3', author: 'Priya Nair', text: 'Worth every minute of the wait.', at: new Date(Date.now() - 900000).toISOString() },
  ];

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />
      <div className="max-w-[680px] mx-auto px-4 md:px-6 pt-[34px] pb-32">
        <Link to="/community" className="font-mono text-[11px] text-ink-3 hover:text-ink mb-6 inline-block transition-colors">
          ← COMMUNITY
        </Link>

        <PostCard
          post={stubPost}
          photoUrl={seedPhotoUrl(3)}
          avatarSrc={seedAvatarUrl(0)}
          liked={false}
          onLike={() => {}}
        />

        {/* Comment thread */}
        <div className="mt-6">
          <Eyebrow className="mb-4">COMMENTS ({stubComments.length})</Eyebrow>
          <div className="flex flex-col gap-4">
            {stubComments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-canvas shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-ink">{c.author}</p>
                  <p className="text-[14px] text-ink-2 leading-snug mt-0.5">{c.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Add comment */}
          <div className="mt-5 flex gap-3">
            <div className="w-8 h-8 rounded-full bg-canvas shrink-0 mt-0.5" />
            <div className="flex-1 flex gap-2">
              <input
                className="flex-1 bg-surface border border-field rounded-[9px] px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink transition-colors"
                placeholder="Add a comment…"
              />
              <button className="px-4 py-2 bg-ink text-paper text-[13px] font-semibold rounded-[9px] hover:bg-ink-2 transition-colors">
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
