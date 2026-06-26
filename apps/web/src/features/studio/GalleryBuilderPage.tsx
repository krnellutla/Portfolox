import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { TopNav } from '../../components/nav/TopNav.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { Input } from '../../components/ui/Input.js';
import { Toggle } from '../../components/ui/Toggle.js';
import { StateView } from '../../components/ui/StateView.js';
import { getMyGalleries, reorderGallery, updateGallery } from '../../api/me.js';
import { qk, queryClient } from '../../lib/query-client.js';
import { seedPhotoUrl } from '../../lib/seed-photos.js';
import type { Gallery } from '@blueflutes/shared';

interface Frame {
  id: string;
  code: string;
  src: string;
}

type GalleryLayout = 'grid' | 'feature' | 'full';

function SortableFrame({ frame, index }: { frame: Frame; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: frame.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className="relative aspect-[4/3] rounded-[8px] overflow-hidden cursor-grab active:cursor-grabbing select-none"
    >
      <img src={frame.src} alt={frame.code} className="absolute inset-0 w-full h-full object-cover" />
      <span
        className="pointer-events-none absolute inset-0"
        style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 8px)' }}
      />
      <span className="absolute top-2 left-2 min-w-[22px] h-[22px] px-1.5 rounded-[6px] bg-paper/90 font-mono text-[10px] text-ink flex items-center justify-center">
        {index + 1}
      </span>
      <span
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 w-[22px] h-[22px] flex items-center justify-center text-paper/70 text-[14px] hover:text-paper transition-colors"
        title="Drag to reorder"
      >
        ⠿
      </span>
      <span className="absolute bottom-2 left-2 font-mono text-[10px] text-white/70">{frame.code}</span>
    </div>
  );
}

function DragPreviewFrame({ frame }: { frame: Frame }) {
  return (
    <div className="relative aspect-[4/3] w-[180px] rounded-[8px] overflow-hidden shadow-xl opacity-90 rotate-2">
      <img src={frame.src} alt={frame.code} className="absolute inset-0 w-full h-full object-cover" />
      <span className="absolute bottom-2 left-2 font-mono text-[10px] text-white/70">{frame.code}</span>
    </div>
  );
}

const PLACEHOLDER_FRAMES: Frame[] = Array.from({ length: 12 }, (_, i) => ({
  id: `f${i + 1}`,
  code: `PFX-${4200 + i}`,
  src: seedPhotoUrl(i, 800),
}));

export default function GalleryBuilderPage() {
  const { data: galleries, isLoading } = useQuery({
    queryKey: qk.myGalleries(),
    queryFn: getMyGalleries,
  });

  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const selectedGallery: Gallery | undefined = galleries?.find((g) => g.id === selectedGalleryId) ?? galleries?.[0];

  // Local editable state synced from selected gallery
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState(true);
  const [printsForSale, setPrintsForSale] = useState(false);
  const [layout, setLayout] = useState<GalleryLayout>('grid');
  const [frames, setFrames] = useState<Frame[]>(PLACEHOLDER_FRAMES);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGallery) {
      setTitle(selectedGallery.title);
      setDescription(selectedGallery.description);
      setVisibility(selectedGallery.visibility === 'public');
      setPrintsForSale(selectedGallery.printsForSale);
      setLayout(selectedGallery.layout as GalleryLayout);
    }
  }, [selectedGallery?.id]);

  const reorderMutation = useMutation({
    mutationFn: ({ galleryId, photoOrder }: { galleryId: string; photoOrder: string[] }) =>
      reorderGallery(galleryId, photoOrder),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.myGalleries() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateGallery>[1]) =>
      updateGallery(selectedGallery!.id, patch),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.myGalleries() });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFrames((items) => {
        const oldIndex = items.findIndex((f) => f.id === active.id);
        const newIndex = items.findIndex((f) => f.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        if (selectedGallery) {
          reorderMutation.mutate({ galleryId: selectedGallery.id, photoOrder: reordered.map((f) => f.id) });
        }
        return reordered;
      });
    }
    setActiveId(null);
  }

  function handlePublish() {
    if (!selectedGallery) return;
    updateMutation.mutate({
      title,
      description,
      visibility: visibility ? 'public' : 'unlisted',
      layout,
      printsForSale,
    });
  }

  const activeFrame = activeId ? frames.find((f) => f.id === activeId) : null;

  const LAYOUT_OPTIONS: { id: GalleryLayout; icon: string }[] = [
    { id: 'grid', icon: '⊞' },
    { id: 'feature', icon: '⊟' },
    { id: 'full', icon: '⊡' },
  ];

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-4 md:px-8 pt-8 pb-32 md:pb-24">
        {/* Header */}
        <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
          <div>
            <Eyebrow className="mb-2">14 — Gallery Builder</Eyebrow>
            <h1 className="font-serif text-[36px] font-[500] text-ink tracking-[-0.02em]">
              {title || 'Untitled gallery'}
            </h1>
            <p className="font-mono text-[10.5px] tracking-label text-muted mt-1">DRAG TO REORDER</p>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Gallery selector */}
            {galleries && galleries.length > 1 && (
              <select
                value={selectedGalleryId ?? selectedGallery?.id ?? ''}
                onChange={(e) => setSelectedGalleryId(e.target.value)}
                className="px-3 py-[10px] bg-surface border border-field rounded-[9px] font-mono text-[12px] text-ink-3 hover:border-ink transition-colors"
              >
                {galleries.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            )}
            <Link
              to={`/portfolio/${selectedGallery?.photographerId ?? ''}`}
              className="px-4 py-[10px] bg-surface border border-field rounded-[9px] font-semibold text-[14px] text-ink hover:border-ink transition-colors"
            >
              Preview
            </Link>
            <button
              onClick={handlePublish}
              disabled={updateMutation.isPending}
              className="px-5 py-[11px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 transition-colors disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Saving…' : 'Publish'}
            </button>
          </div>
        </div>

        {isLoading && <StateView variant="loading" title="Loading gallery…" />}

        {/* 2-col layout */}
        {!isLoading && (
          <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 300px' }}>
            {/* Sortable grid */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={frames.map((f) => f.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 gap-3">
                  {frames.map((frame, i) => (
                    <SortableFrame key={frame.id} frame={frame} index={i} />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeFrame && <DragPreviewFrame frame={activeFrame} />}
              </DragOverlay>
            </DndContext>

            {/* Settings panel */}
            <aside className="sticky top-[72px] self-start">
              <div className="bg-surface border border-line rounded-card p-5 flex flex-col gap-5">
                <div>
                  <label className="block font-mono text-[10.5px] uppercase tracking-label text-muted mb-2">Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="block font-mono text-[10.5px] uppercase tracking-label text-muted mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full resize-none px-3.5 py-3 bg-canvas border border-field rounded-[9px] text-[13.5px] text-ink outline-none focus:border-ink transition-colors leading-[1.5]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13.5px] font-semibold text-ink">Visible</p>
                    <p className="font-mono text-[10px] text-muted mt-0.5">{visibility ? 'Public' : 'Unlisted'}</p>
                  </div>
                  <Toggle checked={visibility} onChange={setVisibility} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13.5px] font-semibold text-ink">Prints for sale</p>
                    <p className="font-mono text-[10px] text-muted mt-0.5">{printsForSale ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  <Toggle checked={printsForSale} onChange={setPrintsForSale} />
                </div>
                <div>
                  <label className="block font-mono text-[10.5px] uppercase tracking-label text-muted mb-2.5">Layout</label>
                  <div className="flex gap-2">
                    {LAYOUT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setLayout(opt.id)}
                        className={`flex-1 py-3 flex items-center justify-center text-[18px] rounded-[8px] border transition-colors ${
                          layout === opt.id ? 'border-ink bg-ink/[0.04]' : 'border-field hover:border-ink-3'
                        }`}
                        title={opt.id}
                      >
                        {opt.icon}
                      </button>
                    ))}
                  </div>
                  <p className="font-mono text-[10px] text-muted mt-1.5 capitalize">{layout}</p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
