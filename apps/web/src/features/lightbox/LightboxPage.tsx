import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Comment } from '@blueflutes/shared';
import { StateView } from '../../components/ui/StateView.js';
import { getPhoto, likePhoto, unlikePhoto, getComments, postComment } from '../../api/photos.js';
import { getPrintOptions } from '../../api/plans.js';
import { qk } from '../../lib/query-client.js';
import { seedPhotoUrl, seedAvatarUrl } from '../../lib/seed-photos.js';

function timeAgo(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function LightboxPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const photoId = searchParams.get('id') ?? '';
  const [commentInput, setCommentInput] = useState('');

  const { data: photo, isLoading: photoLoading, error: photoError } = useQuery({
    queryKey: qk.photo(photoId),
    queryFn: () => getPhoto(photoId),
    enabled: !!photoId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: qk.photoComments(photoId),
    queryFn: () => getComments(photoId),
    enabled: !!photoId,
  });

  const { data: printOptions = [] } = useQuery({
    queryKey: qk.printOptions(),
    queryFn: getPrintOptions,
  });

  const likeMutation = useMutation({
    mutationFn: () => (photo?.likedByMe ? unlikePhoto(photoId) : likePhoto(photoId)),
    onMutate: () => {
      qc.setQueryData(qk.photo(photoId), (old: typeof photo) =>
        old
          ? {
              ...old,
              likedByMe: !old.likedByMe,
              counts: {
                ...old.counts,
                likes: old.likedByMe ? old.counts.likes - 1 : old.counts.likes + 1,
              },
            }
          : old,
      );
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.photo(photoId) });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => postComment(photoId, body),
    onMutate: (body) => {
      const optimistic: Comment = {
        id: `opt-${Date.now()}`,
        parentType: 'photo',
        parentId: photoId,
        author: { id: 'me', displayName: 'You', avatarUrl: null },
        body,
        createdAt: new Date().toISOString(),
        likes: 0,
      };
      qc.setQueryData(qk.photoComments(photoId), (old: Comment[] | undefined) =>
        old ? [optimistic, ...old] : [optimistic],
      );
      return { optimistic };
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.photoComments(photoId) });
    },
  });

  const handlePost = useCallback(() => {
    if (!commentInput.trim()) return;
    commentMutation.mutate(commentInput.trim());
    setCommentInput('');
  }, [commentInput, commentMutation]);

  if (!photoId) return <StateView variant="error" title="No photo selected" fullScreen />;
  if (photoLoading) return <StateView variant="loading" title="Loading…" fullScreen />;
  if (photoError || !photo) return <StateView variant="error" title="Photo not found" fullScreen />;

  const heroSrc = photo.url || photo.thumbUrl || seedPhotoUrl(0, 1200);
  const minPrice = printOptions.length > 0 ? Math.min(...printOptions.map((p) => p.basePrice)) : (photo.priceFrom ?? 18);

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
          ← Back to portfolio
        </button>
        <span className="flex-1" />
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-paper/60 hover:text-paper hover:border-white/40 transition-colors text-[18px]"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
        {/* Center — image */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
          <div
            className="relative max-w-[760px] w-full rounded-[12px] overflow-hidden"
            style={{ aspectRatio: '3/2', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
          >
            <img
              src={heroSrc}
              alt={photo.title}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              className="photo-protected w-full h-full object-cover"
            />
            <div
              style={{ position: 'absolute', inset: 0 }}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              aria-hidden="true"
            />
          </div>
          {/* Thumbnail strip */}
          <div className="overflow-x-auto w-full mt-4 flex gap-2 lg:justify-center">
            {[0,1,2,3,4].map((i) => (
              <img
                key={i}
                src={seedPhotoUrl(i, 120)}
                alt=""
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                className="photo-protected w-16 h-12 rounded-[6px] shrink-0 object-cover opacity-60 hover:opacity-100 cursor-pointer transition-opacity"
              />
            ))}
          </div>
        </div>

        {/* Right meta panel */}
        <aside
          className="lg:w-[344px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col overflow-y-auto"
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
              { label: 'EXPOSURE', value: `ƒ${photo.exif.aperture} · 1/${photo.exif.shutter}` },
              { label: 'ISO / FOCAL', value: `${photo.exif.iso} · ${photo.exif.focalLength}mm` },
              ...(photo.exif.camera ? [{ label: 'CAMERA', value: photo.exif.camera }] : []),
              ...(photo.edition ? [{ label: 'EDITION', value: `${photo.edition.number} / ${photo.edition.of}` }] : []),
              ...(photo.releasedAt ? [{ label: 'RELEASED', value: photo.releasedAt }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="grid grid-cols-[96px_1fr] items-baseline py-[9px] border-b border-white/[0.07] last:border-0">
                <span className="font-mono text-[10.5px] text-paper/40 uppercase tracking-label">{label}</span>
                <span className="text-[13px] text-paper/80 text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Buy a print */}
          <div className="p-6 border-b border-white/10">
            <div className="rounded-[12px] p-4" style={{ background: 'rgba(244,243,240,0.06)' }}>
              <p className="font-serif text-[18px] text-paper mb-0.5">Buy a print</p>
              <p className="font-mono text-[11px] text-paper/40 mb-4">from ${minPrice}</p>
              {printOptions.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {printOptions.slice(0, 4).map((opt) => (
                    <div
                      key={opt.id}
                      className="p-2.5 rounded-[8px] border border-white/10 hover:border-white/30 cursor-pointer transition-colors"
                    >
                      <p className="text-[12px] font-semibold text-paper">{opt.size}</p>
                      <p className="font-mono text-[10px] text-paper/40">${opt.basePrice}</p>
                    </div>
                  ))}
                </div>
              )}
              <button
                className="block w-full py-[11px] text-center bg-paper text-ink rounded-[9px] font-semibold text-[13.5px] hover:bg-paper/90 transition-colors whitespace-nowrap"
                onClick={() => navigate('/pricing')}
              >
                Choose size & checkout
              </button>
            </div>
          </div>

          {/* Like / Share */}
          <div className="flex items-center gap-5 px-6 py-4 border-b border-white/10">
            <button
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending}
              className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors whitespace-nowrap ${photo.likedByMe ? 'text-[#e07070]' : 'text-paper/50 hover:text-paper'}`}
            >
              <span>{photo.likedByMe ? '♥' : '♡'}</span>
              <span>{photo.counts.likes}</span>
            </button>
            <button className="text-[13px] text-paper/50 hover:text-paper transition-colors whitespace-nowrap">
              Share
            </button>
          </div>

          {/* Comments */}
          <div className="p-6 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-label text-paper/40 mb-4">
              Comments ({comments.length})
            </p>
            <div className="flex gap-3 mb-5">
              <img
                src={seedAvatarUrl(0, 64)}
                alt="You"
                className="w-8 h-8 rounded-full shrink-0 object-cover"
              />
              <div className="flex-1">
                <input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add a comment…"
                  className="w-full bg-transparent text-[13.5px] text-paper placeholder:text-paper/30 outline-none border-b border-white/20 pb-2 focus:border-white/40 transition-colors"
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePost(); }}
                />
              </div>
              <button
                onClick={handlePost}
                disabled={!commentInput.trim() || commentMutation.isPending}
                className="px-3 py-1.5 bg-paper text-ink rounded-[7px] font-semibold text-[12px] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-paper/90 transition-colors self-end"
              >
                Post
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {comments.map((c, i) => (
                <div key={c.id} className="flex gap-3">
                  <img
                    src={c.author.avatarUrl ?? seedAvatarUrl(i + 1, 64)}
                    alt={c.author.displayName}
                    className="w-8 h-8 rounded-full shrink-0 object-cover"
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
