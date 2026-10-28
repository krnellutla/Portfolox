import type { MediaAssetWithVariants } from '@blueflutes/shared';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ResponsiveImage } from '../../../components/ui/ResponsiveImage.js';
import type { UploadItem } from '../../../stores/media-store.js';

interface AssetTileProps {
  asset: MediaAssetWithVariants;
  onDelete: (id: string) => void;
}

interface UploadTileProps {
  item: UploadItem;
}

export function AssetTile({ asset, onDelete }: AssetTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: asset.id,
    data: { position: asset.position },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square overflow-hidden rounded-lg border border-slate-700 bg-slate-800"
    >
      <ResponsiveImage
        asset={asset}
        className="h-full w-full object-cover"
        sizes="(max-width: 640px) 33vw, 20vw"
        alt=""
      />

      {/* drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1 cursor-grab rounded bg-black/50 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>

      {/* delete */}
      <button
        className="absolute right-1 top-1 rounded bg-black/50 p-0.5 text-white opacity-0 transition-opacity hover:bg-red-900/80 group-hover:opacity-100"
        onClick={() => onDelete(asset.id)}
        aria-label="Delete asset"
      >
        ✕
      </button>

      {/* processing overlay */}
      {asset.status === 'processing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-slate-300">
          Processing…
        </div>
      )}
      {asset.status === 'failed' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-red-400">
          Failed
        </div>
      )}
    </div>
  );
}

export function UploadTile({ item }: UploadTileProps) {
  return (
    <div className="relative flex aspect-square flex-col items-center justify-center rounded-lg border border-slate-600 bg-slate-800/60 p-2">
      <p className="max-w-full truncate text-xs text-slate-400">{item.filename}</p>

      {item.status === 'uploading' && (
        <>
          <p className="mt-1 text-xs font-medium text-slate-300">{item.progress}%</p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </>
      )}

      {item.status === 'processing' && (
        <div className="mt-2 flex flex-col items-center gap-1">
          <svg
            className="h-5 w-5 animate-spin text-blue-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-xs font-medium text-slate-300">Processing…</p>
        </div>
      )}

      {item.status === 'ready' && (
        <p className="mt-1 text-xs font-medium text-green-400">Ready</p>
      )}

      {item.status === 'failed' && (
        <>
          <p className="mt-1 text-xs font-medium text-red-400">Failed</p>
          {item.error && <p className="mt-0.5 text-xs text-red-400">{item.error}</p>}
        </>
      )}

      {item.status === 'queued' && (
        <p className="mt-1 text-xs font-medium text-slate-400">Queued</p>
      )}
    </div>
  );
}
