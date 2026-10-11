import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TopNav } from '../../components/nav/TopNav.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { useEyebrow } from '../../lib/eyebrow.js';
import { StateView } from '../../components/ui/StateView.js';
import { SkeletonRow } from '../../components/ui/Skeleton.js';
import { getMyGalleries } from '../../api/me.js';
import { qk } from '../../lib/query-client.js';
import { seedThumbUrl } from '../../lib/seed-photos.js';

interface QueueItem {
  id: string;
  filename: string;
  size: string;
  progress: number;
  done: boolean;
}

interface Frame {
  id: string;
  title: string;
  code: string;
  album: string;
  status: 'published' | 'draft';
  price: number;
  thumbIndex: number;
}

const INIT_FRAMES: Frame[] = [
  { id: 'f1', title: 'First Light',  code: 'PFX-4200', album: 'Landscapes', status: 'published', price: 45,  thumbIndex: 0 },
  { id: 'f2', title: 'Tideline',     code: 'PFX-4201', album: 'Landscapes', status: 'published', price: 210, thumbIndex: 1 },
  { id: 'f3', title: 'Northbound',   code: 'PFX-4202', album: 'Landscapes', status: 'draft',     price: 45,  thumbIndex: 2 },
  { id: 'f4', title: 'Quiet Hours',  code: 'PFX-4203', album: 'Portraits',  status: 'published', price: 18,  thumbIndex: 19 },
  { id: 'f5', title: 'Drift',        code: 'PFX-4204', album: 'Portraits',  status: 'published', price: 80,  thumbIndex: 20 },
];

let nextQueueId = 1;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function UploadPage() {
  const eyebrow = useEyebrow('13 — Upload & manage');
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [frames] = useState<Frame[]>(INIT_FRAMES);
  const [draggingOver, setDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: galleries, isLoading: galleriesLoading } = useQuery({
    queryKey: qk.myGalleries(),
    queryFn: getMyGalleries,
    select: (data) => {
      if (!activeAlbumId && data.length > 0) {
        // set initial active album after first load
      }
      return data;
    },
  });

  const activeAlbum = galleries?.find((g) => g.id === activeAlbumId) ?? galleries?.[0];

  function enqueue(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const id = `q${nextQueueId++}`;
      setQueue((prev) => [
        ...prev,
        { id, filename: file.name, size: formatBytes(file.size), progress: 0, done: false },
      ]);
      let prog = 0;
      const interval = setInterval(() => {
        prog = Math.min(prog + Math.random() * 18 + 5, 100);
        setQueue((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, progress: Math.round(prog), done: prog >= 100 } : item
          )
        );
        if (prog >= 100) clearInterval(interval);
      }, 200);
    });
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
            <button className="font-mono text-[11px] text-ink-3 hover:text-ink transition-colors">＋</button>
          </div>
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
            onDrop={(e) => { e.preventDefault(); setDraggingOver(false); enqueue(e.dataTransfer.files); }}
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
              onChange={(e) => enqueue(e.target.files)}
            />
          </div>

          {/* Upload queue empty state */}
          {queue.length === 0 && (
            <StateView
              variant="empty"
              title="Nothing uploading"
              description="Drop files above to start."
            />
          )}

          {/* Upload queue */}
          {queue.length > 0 && (
            <div className="bg-surface border border-line rounded-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-label text-muted mb-4">Upload queue</p>
              <div className="flex flex-col gap-3">
                {queue.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <img
                      src={seedThumbUrl(i)}
                      alt=""
                      className="w-10 h-10 rounded-[6px] shrink-0 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-mono text-[11px] text-ink truncate">{item.filename}</p>
                        <p className="font-mono text-[10px] text-muted ml-2 shrink-0">{item.size}</p>
                      </div>
                      <div className="h-[4px] rounded-full bg-line overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-200 ${item.done ? 'bg-positive' : 'bg-ink'}`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <p className={`font-mono text-[10px] mt-1 ${item.done ? 'text-positive' : 'text-muted'}`}>
                        {item.done ? '● Complete' : `● Uploading ${item.progress}%`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manage frames table */}
          <div className="bg-surface border border-line rounded-card overflow-hidden">
            <div className="px-5 pt-5 pb-3.5 border-b border-line">
              <p className="font-serif text-[20px] font-[500] text-ink">Manage frames</p>
            </div>

            {/* Card list — mobile/tablet only */}
            <div className="md:hidden flex flex-col divide-y divide-line">
              {frames.map((frame, i) => (
                <div key={frame.id} className="flex gap-3 p-4">
                  <img
                    src={seedThumbUrl(frame.thumbIndex)}
                    alt={frame.title}
                    className="w-12 h-12 rounded-[6px] shrink-0 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ink">{frame.title}</p>
                    <p className="font-mono text-[10px] text-muted">{frame.code}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-[6px] font-mono text-[10px] ${
                      frame.status === 'published' ? 'bg-positive/10 text-positive' : 'bg-canvas text-muted'
                    }`}>
                      {frame.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <button className="px-3 py-1 text-[12px] font-semibold bg-surface border border-line rounded-[7px] text-ink whitespace-nowrap">Edit</button>
                      <button className="px-3 py-1 text-[12px] font-semibold bg-surface border border-line rounded-[7px] text-muted whitespace-nowrap">···</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <table className="w-full hidden md:table">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 text-left font-mono text-[10px] uppercase tracking-label text-muted">Frame</th>
                  <th className="px-5 py-2.5 text-left font-mono text-[10px] uppercase tracking-label text-muted">Album</th>
                  <th className="px-5 py-2.5 text-left font-mono text-[10px] uppercase tracking-label text-muted">Status</th>
                  <th className="px-5 py-2.5 text-left font-mono text-[10px] uppercase tracking-label text-muted">Price</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {frames.map((frame, i) => (
                  <tr key={frame.id} className={`border-b border-line-2 last:border-0 ${i % 2 === 0 ? '' : 'bg-canvas/50'}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={seedThumbUrl(frame.thumbIndex)}
                          alt={frame.title}
                          className="w-9 h-9 rounded-[6px] shrink-0 object-cover"
                        />
                        <div>
                          <p className="text-[13px] font-semibold text-ink">{frame.title}</p>
                          <p className="font-mono text-[10px] text-muted">{frame.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-ink-3 max-w-[160px] truncate">{frame.album}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-[6px] font-mono text-[10px] ${
                        frame.status === 'published' ? 'bg-positive/10 text-positive' : 'bg-canvas text-muted'
                      }`}>
                        {frame.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-serif text-[16px] text-ink">${frame.price}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="text-muted hover:text-ink transition-colors text-[18px]">···</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
