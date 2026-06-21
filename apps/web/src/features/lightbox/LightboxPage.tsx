import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Comment } from '../../lib/types.js';
import {
  AUTHOR_GRADIENTS,
  LIGHTBOX_COMMENTS,
  LIGHTBOX_PHOTOS,
  PRINT_OPTIONS,
} from './mock.js';

function timeAgo(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function LightboxPage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(() => new Set(LIGHTBOX_PHOTOS.filter((p) => p.likedByMe).map((p) => p.id)));
  const [comments, setComments] = useState<Comment[]>(LIGHTBOX_COMMENTS);
  const [commentInput, setCommentInput] = useState('');

  const total = LIGHTBOX_PHOTOS.length;
  const photo = LIGHTBOX_PHOTOS[index];
  const isLiked = liked.has(photo.id);

  const prev = useCallback(() => setIndex((i) => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setIndex((i) => (i + 1) % total), [total]);

  function toggleLike() {
    setLiked((prev) => {
      const next = new Set(prev);
      next.has(photo.id) ? next.delete(photo.id) : next.add(photo.id);
      return next;
    });
  }

  function postComment() {
    if (!commentInput.trim()) return;
    setComments((prev) => [
      {
        id: `c-${Date.now()}`,
        parentType: 'photo',
        parentId: photo.id,
        author: { id: 'ph1', displayName: 'Mira Calder', avatarUrl: null },
        body: commentInput.trim(),
        createdAt: new Date().toISOString(),
        likes: 0,
      },
      ...prev,
    ]);
    setCommentInput('');
  }

  const photoComments = comments.filter((c) => c.parentId === photo.id);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: '#100f0b', color: '#f4f3f0' }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2.5 text-[13px] font-semibold text-paper/70 hover:text-paper transition-colors"
        >
          <div
            className="w-7 h-7 rounded-full"
            style={{ background: AUTHOR_GRADIENTS['ph1'] }}
          />
          ← Back to portfolio
        </button>
        <span className="flex-1" />
        <span className="font-mono text-[11px] text-paper/40">
          {index + 1} / {total}
        </span>
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-paper/60 hover:text-paper hover:border-white/40 transition-colors text-[18px]"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center — prev / image / next */}
        <div className="flex-1 flex items-center justify-center gap-4 p-6 overflow-hidden">
          <button
            onClick={prev}
            className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-paper/60 hover:text-paper hover:border-white/40 transition-colors shrink-0"
          >
            ‹
          </button>

          <div
            className="max-w-[760px] w-full rounded-[12px] overflow-hidden"
            style={{
              aspectRatio: '3/2',
              background: photo.gradient,
              boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            }}
          >
            {photo.url && (
              <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
            )}
          </div>

          <button
            onClick={next}
            className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-paper/60 hover:text-paper hover:border-white/40 transition-colors shrink-0"
          >
            ›
          </button>
        </div>

        {/* Right meta panel */}
        <aside
          className="w-[344px] shrink-0 border-l border-white/10 flex flex-col overflow-y-auto"
          style={{ background: '#161410' }}
        >
          <div className="p-6 border-b border-white/10">
            <h2 className="font-serif text-[30px] font-[500] text-paper tracking-[-0.01em] mb-1">
              {photo.title}
            </h2>
            <p className="font-mono text-[11px] text-paper/40">{photo.code}</p>
          </div>

          {/* EXIF */}
          <div className="p-6 border-b border-white/10">
            {[
              { label: 'Exposure', value: `${photo.exif.aperture} · ${photo.exif.shutter} · ISO ${photo.exif.iso}` },
              { label: 'Focal length', value: photo.exif.focalLength },
              ...(photo.exif.camera ? [{ label: 'Camera', value: photo.exif.camera }] : []),
              ...(photo.edition ? [{ label: 'Edition', value: `${photo.edition.number} / ${photo.edition.of}` }] : []),
              ...(photo.releasedAt ? [{ label: 'Released', value: photo.releasedAt }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between py-[9px] border-b border-white/[0.07] last:border-0">
                <span className="font-mono text-[10.5px] text-paper/40 uppercase tracking-label">{label}</span>
                <span className="text-[13px] text-paper/80">{value}</span>
              </div>
            ))}
          </div>

          {/* Buy a print */}
          <div className="p-6 border-b border-white/10">
            <div
              className="rounded-[12px] p-4"
              style={{ background: 'rgba(244,243,240,0.06)' }}
            >
              <p className="font-serif text-[18px] text-paper mb-0.5">Buy a print</p>
              <p className="font-mono text-[11px] text-paper/40 mb-4">
                from ${Math.min(...PRINT_OPTIONS.map((p) => p.basePrice))}
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PRINT_OPTIONS.map((opt) => (
                  <div
                    key={opt.id}
                    className="p-2.5 rounded-[8px] border border-white/10 hover:border-white/30 cursor-pointer transition-colors"
                  >
                    <p className="text-[12px] font-semibold text-paper">{opt.size}</p>
                    <p className="font-mono text-[10px] text-paper/40">${opt.basePrice}</p>
                  </div>
                ))}
              </div>
              <Link
                to="/pricing"
                className="block w-full py-[11px] text-center bg-paper text-ink rounded-[9px] font-semibold text-[13.5px] hover:bg-paper/90 transition-colors"
              >
                Choose size & checkout
              </Link>
            </div>
          </div>

          {/* Like / Share */}
          <div className="flex items-center gap-5 px-6 py-4 border-b border-white/10">
            <button
              onClick={toggleLike}
              className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors ${isLiked ? 'text-[#e07070]' : 'text-paper/50 hover:text-paper'}`}
            >
              <span>{isLiked ? '♥' : '♡'}</span>
              <span>{photo.counts.likes + (isLiked && !photo.likedByMe ? 1 : (!isLiked && photo.likedByMe ? -1 : 0))}</span>
            </button>
            <button className="text-[13px] text-paper/50 hover:text-paper transition-colors">
              Share
            </button>
          </div>

          {/* Comments */}
          <div className="p-6 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-label text-paper/40 mb-4">
              Comments ({photoComments.length})
            </p>
            <div className="flex gap-3 mb-5">
              <div
                className="w-8 h-8 rounded-full shrink-0"
                style={{ background: AUTHOR_GRADIENTS['ph1'] }}
              />
              <div className="flex-1">
                <input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add a comment…"
                  className="w-full bg-transparent text-[13.5px] text-paper placeholder:text-paper/30 outline-none border-b border-white/20 pb-2 focus:border-white/40 transition-colors"
                  onKeyDown={(e) => { if (e.key === 'Enter') postComment(); }}
                />
              </div>
              <button
                onClick={postComment}
                disabled={!commentInput.trim()}
                className="px-3 py-1.5 bg-paper text-ink rounded-[7px] font-semibold text-[12px] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-paper/90 transition-colors self-end"
              >
                Post
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {photoComments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-full shrink-0"
                    style={{ background: AUTHOR_GRADIENTS[c.author.id] ?? 'linear-gradient(145deg,#888,#555)' }}
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-paper">{c.author.displayName}</span>
                      <span className="font-mono text-[10px] text-paper/30">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-[13px] text-paper/70 leading-[1.5]">{c.body}</p>
                    <button className="flex items-center gap-1 mt-2 font-mono text-[10px] text-paper/30 hover:text-paper/60 transition-colors">
                      <span>♡</span><span>{c.likes}</span>
                      <span className="ml-3">Reply</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
