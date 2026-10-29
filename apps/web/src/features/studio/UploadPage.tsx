import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TopNav } from '../../components/nav/TopNav.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { useEyebrow } from '../../lib/eyebrow.js';
import { StateView } from '../../components/ui/StateView.js';
import { SkeletonRow } from '../../components/ui/Skeleton.js';
import { createGallery, getMyGalleries } from '../../api/me.js';
import { getGooglePhotosStatus, listGoogleAlbums, syncGoogleAlbum } from '../../api/google-photos.js';
import { qk } from '../../lib/query-client.js';
import { seedThumbUrl } from '../../lib/seed-photos.js';
import { useMediaStore } from '../../stores/media-store.js';

export default function UploadPage() {
  const eyebrow = useEyebrow('13 — Upload & manage');
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [draggingOver, setDraggingOver] = useState(false);
  const [syncingAlbumId, setSyncingAlbumId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const byNode = useMediaStore((s) => s.byNode);
  const loadForNode = useMediaStore((s) => s.loadForNode);
  const enqueueUploads = useMediaStore((s) => s.enqueueUploads);
  const deleteOptimistic = useMediaStore((s) => s.deleteOptimistic);

  const { data: gPhotosStatus } = useQuery({
    queryKey: ['google-photos', 'status'],
    queryFn: getGooglePhotosStatus,
  });

  const { data: gAlbums, isLoading: gAlbumsLoading, error: gAlbumsError } = useQuery({
    queryKey: ['google-photos', 'albums'],
    queryFn: listGoogleAlbums,
    enabled: gPhotosStatus?.connected === true,
  });

  const { data: galleries, isLoading: galleriesLoading } = useQuery({
    queryKey: qk.myGalleries(),
    queryFn: getMyGalleries,
  });

  const activeAlbum = galleries?.find((g) => g.id === activeAlbumId) ?? galleries?.[0];
  const nodeMedia = activeAlbum ? byNode[activeAlbum.id] : undefined;
  const uploads = nodeMedia?.uploads ?? [];
  const assets = nodeMedia?.assets ?? [];

  useEffect(() => {
    if (activeAlbum?.id) {
      void loadForNode(activeAlbum.id);
    }
  }, [activeAlbum?.id, loadForNode]);

  async function handleCreateAlbum() {
    const trimmed = newAlbumTitle.trim();
    if (!trimmed) return;
    try {
      const created = await createGallery(trimmed);
      setNewAlbumTitle('');
      setCreatingAlbum(false);
      setActiveAlbumId(created.id);
      await queryClient.invalidateQueries({ queryKey: qk.myGalleries() });
    } catch {
      // ignore error
    }
  }

  async function handleSyncAlbum(albumId: string) {
    setSyncingAlbumId(albumId);
    setSyncMessage(null);
    try {
      const result = await syncGoogleAlbum(albumId);
      setSyncMessage(`Synced ${result.synced} photos to "${result.albumTitle}"`);
      await queryClient.invalidateQueries({ queryKey: qk.myGalleries() });
      if (result.galleryNodeId) {
        setActiveAlbumId(result.galleryNodeId);
        await loadForNode(result.galleryNodeId);
      }
    } catch {
      setSyncMessage('Sync failed — please try again');
    } finally {
      setSyncingAlbumId(null);
    }
  }

  async function enqueue(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    let targetNodeId = activeAlbum?.id;
    if (!targetNodeId) {
      const created = await createGallery('Untitled Album');
      await queryClient.invalidateQueries({ queryKey: qk.myGalleries() });
      setActiveAlbumId(created.id);
      targetNodeId = created.id;
    }
    await enqueueUploads(targetNodeId, fileList);
    await queryClient.invalidateQueries({ queryKey: qk.myGalleries() });
  }

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div
        className="max-w-shell mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-32 md:pb-24 flex flex-col lg:grid lg:gap-8"
        style={{ gridTemplateColumns: '236px 1fr' }}
      >
        {/* Left rail — albums */}
        <aside className="hidden lg:block sticky top-[72px] self-start">
          <Eyebrow className="mb-4">{eyebrow}</Eyebrow>
          <div className="flex items-center justify-between mb-2.5">
            <p className="font-mono text-[10.5px] uppercase tracking-label text-muted">Albums</p>
            <button
              onClick={() => setCreatingAlbum((v) => !v)}
              title="New album"
              className="font-mono text-[11px] text-ink-3 hover:text-ink transition-colors"
            >
              ＋
            </button>
          </div>
          {creatingAlbum && (
            <div className="flex gap-1.5 mb-2.5">
              <input
                type="text"
                placeholder="Album title…"
                value={newAlbumTitle}
                onChange={(e) => setNewAlbumTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreateAlbum();
                }}
                className="flex-1 min-w-0 px-2.5 py-1.5 bg-canvas border border-field rounded-[8px] text-[12.5px] text-ink outline-none focus:border-ink"
              />
              <button
                onClick={() => void handleCreateAlbum()}
                className="px-2.5 py-1.5 bg-ink text-paper rounded-[8px] font-semibold text-[12px]"
              >
                Add
              </button>
            </div>
          )}
          {galleriesLoading ? (
            <div className="flex flex-col">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {(galleries ?? []).map((gallery) => (
                <button
                  key={gallery.id}
                  onClick={() => setActiveAlbumId(gallery.id)}
                  className={`flex items-center justify-between px-3 py-[10px] rounded-[10px] transition-colors text-left ${
                    activeAlbum?.id === gallery.id ? 'bg-surface border border-line' : 'hover:bg-canvas'
                  }`}
                >
                  <span className={`text-[13.5px] font-semibold truncate ${activeAlbum?.id === gallery.id ? 'text-ink' : 'text-ink-3'}`}>
                    {gallery.visibility === 'private' && <span className="mr-1 text-muted">🔒</span>}
                    {gallery.title}
                  </span>
                  <span className="font-mono text-[10px] text-muted ml-2 shrink-0">{gallery.counts.frames}</span>
                </button>
              ))}
              {!galleriesLoading && !galleries?.length && (
                <p className="font-mono text-[11px] text-muted px-3 py-2">No albums yet.</p>
              )}
            </div>
          )}
        </aside>

        {/* Right — dropzone + queue + manage */}
        <div className="flex flex-col gap-5">
          {/* Mobile/tablet album selector */}
          <select
            className="w-full rounded-[9px] border border-field px-3 py-2 text-sm text-ink bg-surface lg:hidden"
            value={activeAlbum?.id ?? ''}
            onChange={(e) => setActiveAlbumId(e.target.value)}
          >
            {(galleries ?? []).map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>

          {/* Dropzone */}
          <div
            className={`border-2 border-dashed rounded-card p-10 flex flex-col items-center justify-center gap-4 transition-colors ${
              draggingOver ? 'border-ink bg-canvas' : 'border-field bg-[#fbfaf7]'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDraggingOver(true); }}
            onDragLeave={() => setDraggingOver(false)}
            onDrop={(e) => { e.preventDefault(); setDraggingOver(false); void enqueue(e.dataTransfer.files); }}
          >
            <div className="w-14 h-14 rounded-[12px] border-2 border-field flex items-center justify-center text-[24px] text-ink-3">
              ↑
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-ink mb-1">Drop RAW or JPEG here</p>
              <p className="font-mono text-[11px] text-muted">
                Target: <span className="text-ink-3 font-semibold">{activeAlbum?.title ?? '—'}</span>
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-[11px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 transition-colors whitespace-nowrap"
            >
              Browse files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.raw,.cr2,.nef,.arw,.dng"
              className="hidden"
              onChange={(e) => void enqueue(e.target.files)}
            />
          </div>

          {/* Upload queue empty state */}
          {uploads.length === 0 && (
            <StateView
              variant="empty"
              title="Nothing uploading"
              description="Drop files above to start."
            />
          )}

          {/* Upload queue */}
          {uploads.length > 0 && (
            <div className="bg-surface border border-line rounded-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-label text-muted mb-4">Upload queue</p>
              <div className="flex flex-col gap-3">
                {uploads.map((item, i) => {
                  const isDone = item.status === 'ready';
                  const isFailed = item.status === 'failed';
                  return (
                    <div key={item.id} className="flex items-center gap-4">
                      <img
                        src={seedThumbUrl(i)}
                        alt=""
                        className="w-10 h-10 rounded-[6px] shrink-0 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="font-mono text-[11px] text-ink truncate">{item.filename}</p>
                          <p className="font-mono text-[10px] text-muted ml-2 shrink-0 capitalize">{item.status}</p>
                        </div>
                        <div className="h-[4px] rounded-full bg-line overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-200 ${
                              isFailed ? 'bg-danger' : isDone ? 'bg-positive' : 'bg-ink'
                            }`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <p className={`font-mono text-[10px] mt-1 ${
                          isFailed ? 'text-danger' : isDone ? 'text-positive' : 'text-muted'
                        }`}>
                          {isFailed
                            ? `● ${item.error ?? 'Upload failed'}`
                            : isDone
                              ? '● Complete'
                              : `● ${item.status === 'processing' ? 'Processing variants…' : `Uploading ${item.progress}%`}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manage frames table */}
          <div className="bg-surface border border-line rounded-card overflow-hidden">
            <div className="px-5 pt-5 pb-3.5 border-b border-line">
              <p className="font-serif text-[20px] font-[500] text-ink">Manage frames</p>
            </div>

            {assets.length === 0 ? (
              <div className="p-6">
                <StateView
                  variant="empty"
                  title="No frames in this album"
                  description="Upload files above or import an album from Google Photos."
                />
              </div>
            ) : (
              <>
                {/* Card list — mobile/tablet only */}
                <div className="md:hidden flex flex-col divide-y divide-line">
                  {assets.map((asset, i) => {
                    const thumbUrl =
                      asset.variants.find((v) => v.variant === 'thumb')?.url ??
                      asset.variants[0]?.url ??
                      asset.url ??
                      seedThumbUrl(i);
                    const frameTitle = asset.originalFilename.replace(/\.[^.]+$/, '');
                    const frameCode = `PFX-${asset.id.slice(0, 4).toUpperCase()}`;
                    const isPublished = asset.status === 'ready';
                    return (
                      <div key={asset.id} className="flex gap-3 p-4">
                        <img
                          src={thumbUrl}
                          alt={frameTitle}
                          className="w-12 h-12 rounded-[6px] shrink-0 object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-ink">{frameTitle}</p>
                          <p className="font-mono text-[10px] text-muted">{frameCode}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-[6px] font-mono text-[10px] ${
                            isPublished ? 'bg-positive/10 text-positive' : 'bg-canvas text-muted'
                          }`}>
                            {isPublished ? 'Published' : 'Processing'}
                          </span>
                          <div className="flex items-center gap-2 mt-2">
                            {activeAlbum && (
                              <button
                                onClick={() => {
                                  void deleteOptimistic(activeAlbum.id, asset.id).then(() =>
                                    queryClient.invalidateQueries({ queryKey: qk.myGalleries() }),
                                  );
                                }}
                                className="px-3 py-1 text-[12px] font-semibold bg-surface border border-line rounded-[7px] text-danger whitespace-nowrap"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <table className="w-full hidden md:table">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-5 py-2.5 text-left font-mono text-[10px] uppercase tracking-label text-muted">Frame</th>
                      <th className="px-5 py-2.5 text-left font-mono text-[10px] uppercase tracking-label text-muted">Album</th>
                      <th className="px-5 py-2.5 text-left font-mono text-[10px] uppercase tracking-label text-muted">Status</th>
                      <th className="px-5 py-2.5 text-left font-mono text-[10px] uppercase tracking-label text-muted">Dimensions</th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset, i) => {
                      const thumbUrl =
                        asset.variants.find((v) => v.variant === 'thumb')?.url ??
                        asset.variants[0]?.url ??
                        asset.url ??
                        seedThumbUrl(i);
                      const frameTitle = asset.originalFilename.replace(/\.[^.]+$/, '');
                      const frameCode = `PFX-${asset.id.slice(0, 4).toUpperCase()}`;
                      const isPublished = asset.status === 'ready';
                      return (
                        <tr key={asset.id} className={`border-b border-line-2 last:border-0 ${i % 2 === 0 ? '' : 'bg-canvas/50'}`}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={thumbUrl}
                                alt={frameTitle}
                                className="w-9 h-9 rounded-[6px] shrink-0 object-cover"
                              />
                              <div>
                                <p className="text-[13px] font-semibold text-ink">{frameTitle}</p>
                                <p className="font-mono text-[10px] text-muted">{frameCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-[13px] text-ink-3 max-w-[160px] truncate">
                            {activeAlbum?.title ?? '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-[6px] font-mono text-[10px] ${
                              isPublished ? 'bg-positive/10 text-positive' : 'bg-canvas text-muted'
                            }`}>
                              {isPublished ? 'Published' : 'Processing'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[11px] text-muted">
                            {asset.width && asset.height ? `${asset.width}×${asset.height}` : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {activeAlbum && (
                              <button
                                onClick={() => {
                                  void deleteOptimistic(activeAlbum.id, asset.id).then(() =>
                                    queryClient.invalidateQueries({ queryKey: qk.myGalleries() }),
                                  );
                                }}
                                className="font-mono text-[11px] text-muted hover:text-danger transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
          {/* Google Photos import panel */}
          <div className="bg-surface border border-line rounded-card overflow-hidden">
            <div className="px-5 pt-5 pb-3.5 border-b border-line flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4"/>
                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" fill="white"/>
              </svg>
              <p className="font-serif text-[20px] font-[500] text-ink">Import from Google Photos</p>
            </div>

            <div className="p-5">
              {!gPhotosStatus?.connected ? (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-[13.5px] text-ink-3">Connect your Google account to import albums directly into your studio.</p>
                  <a
                    href={`/api/auth/google?next=/studio/upload`}
                    className="px-5 py-[10px] bg-ink text-paper rounded-[9px] font-semibold text-[13.5px] hover:bg-ink-2 transition-colors"
                  >
                    Connect Google Photos
                  </a>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {syncMessage && (
                    <div className="px-4 py-2.5 rounded-[8px] bg-positive/10 text-positive font-mono text-[11.5px]">
                      {syncMessage}
                    </div>
                  )}
                  {gAlbumsLoading ? (
                    <div className="flex flex-col gap-2">
                      {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
                    </div>
                  ) : gAlbumsError ? (
                    <StateView variant="error" title="Could not load albums" description="Try reconnecting Google Photos." />
                  ) : !gAlbums?.length ? (
                    <StateView variant="empty" title="No albums found" description="Create an album in Google Photos first." />
                  ) : (
                    <div className="flex flex-col divide-y divide-line-2">
                      {gAlbums.map((album) => (
                        <div key={album.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          {album.coverPhotoBaseUrl ? (
                            <img
                              src={`${album.coverPhotoBaseUrl}=w80-h80-c`}
                              alt={album.title}
                              className="w-10 h-10 rounded-[6px] shrink-0 object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-[6px] bg-canvas shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-semibold text-ink truncate">{album.title}</p>
                            {album.mediaItemsCount && (
                              <p className="font-mono text-[10px] text-muted">{album.mediaItemsCount} photos</p>
                            )}
                          </div>
                          <button
                            onClick={() => void handleSyncAlbum(album.id)}
                            disabled={syncingAlbumId === album.id}
                            className="shrink-0 px-4 py-[8px] rounded-[8px] bg-ink text-paper font-semibold text-[12.5px] hover:bg-ink-2 disabled:opacity-50 disabled:cursor-wait transition-colors"
                          >
                            {syncingAlbumId === album.id ? 'Syncing…' : 'Sync'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
