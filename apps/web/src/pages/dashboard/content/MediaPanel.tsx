import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button.js';
import { StateView } from '../../../components/ui/StateView.js';
import { useMediaStore } from '../../../stores/media-store.js';
import { AssetTile, UploadTile } from './MediaTile.js';

interface Props {
  nodeId: string;
}

export function MediaPanel({ nodeId }: Props) {
  const { byNode, loadForNode, enqueueUploads, deleteOptimistic, reorderOptimistic } =
    useMediaStore();

  const nodeState = byNode[nodeId];
  const assets = nodeState?.assets ?? [];
  const uploads = nodeState?.uploads ?? [];
  const status = nodeState?.status ?? 'idle';
  const error = nodeState?.error ?? null;

  const [activeId, setActiveId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!nodeState || nodeState.status === 'idle') {
      void loadForNode(nodeId);
    }
  }, [nodeId, nodeState, loadForNode]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const overAsset = assets.find((a) => a.id === over.id);
    if (!overAsset) return;

    void reorderOptimistic(nodeId, active.id as string, overAsset.position);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    void enqueueUploads(nodeId, files);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (files.length === 0) return;
    void enqueueUploads(nodeId, files);
  }

  async function handleDelete(assetId: string) {
    if (!window.confirm('Delete this image?')) return;
    await deleteOptimistic(nodeId, assetId);
  }

  const sortedAssets = [...assets].sort((a, b) => a.position - b.position);
  const activeAsset = sortedAssets.find((a) => a.id === activeId);

  const pendingUploads = uploads.filter((u) => u.status !== 'ready');

  if (status === 'loading' && assets.length === 0) {
    return <StateView variant="loading" title="Loading media…" />;
  }

  if (status === 'error') {
    return (
      <StateView
        variant="error"
        title="Failed to load media"
        description={error ?? undefined}
        action={<Button onClick={() => void loadForNode(nodeId)}>Retry</Button>}
      />
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-300">
          Media
          {assets.length > 0 && (
            <span className="ml-1.5 text-slate-500">({assets.length})</span>
          )}
        </p>
        <Button
          variant="outline"
          className="h-7 px-2.5 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload images
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* drop zone + grid */}
      <div
        className="rounded-lg border border-dashed border-slate-700 p-2 transition-colors hover:border-slate-500"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {sortedAssets.length === 0 && pendingUploads.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No images yet. Drop files here or click Upload.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedAssets.map((a) => a.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {sortedAssets.map((asset) => (
                  <AssetTile key={asset.id} asset={asset} onDelete={handleDelete} />
                ))}
                {pendingUploads.map((item) => (
                  <UploadTile key={item.id} item={item} />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeAsset ? (
                <div className="aspect-square rounded-lg border border-slate-500 bg-slate-700 opacity-80 shadow-xl" />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
