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
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TopNav } from '../../components/nav/TopNav.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { Input } from '../../components/ui/Input.js';
import { Toggle } from '../../components/ui/Toggle.js';

interface Frame {
  id: string;
  code: string;
  gradient: string;
}

const INIT_FRAMES: Frame[] = [
  { id: 'f1',  code: 'PFX-4200', gradient: 'linear-gradient(145deg,#7e8893,#525c68)' },
  { id: 'f2',  code: 'PFX-4201', gradient: 'linear-gradient(145deg,#9aa79b,#5f6f63)' },
  { id: 'f3',  code: 'PFX-4202', gradient: 'linear-gradient(145deg,#c4a882,#8a7150)' },
  { id: 'f4',  code: 'PFX-4203', gradient: 'linear-gradient(145deg,#bda988,#7a6347)' },
  { id: 'f5',  code: 'PFX-4204', gradient: 'linear-gradient(145deg,#8aab90,#4d7255)' },
  { id: 'f6',  code: 'PFX-4205', gradient: 'linear-gradient(145deg,#8f93a3,#5e6374)' },
  { id: 'f7',  code: 'PFX-4206', gradient: 'linear-gradient(145deg,#a6a49c,#6b6760)' },
  { id: 'f8',  code: 'PFX-4207', gradient: 'linear-gradient(145deg,#9a96a6,#675f74)' },
  { id: 'f9',  code: 'PFX-4208', gradient: 'linear-gradient(145deg,#c0b89a,#8a7f62)' },
  { id: 'f10', code: 'PFX-4209', gradient: 'linear-gradient(145deg,#94a8a0,#5e706a)' },
  { id: 'f11', code: 'PFX-4210', gradient: 'linear-gradient(145deg,#a8b4b0,#68797a)' },
  { id: 'f12', code: 'PFX-4211', gradient: 'linear-gradient(145deg,#b4a894,#7a6f60)' },
];

type GalleryLayout = 'grid' | 'feature' | 'full';

function SortableFrame({
  frame,
  index,
}: {
  frame: Frame;
  index: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: frame.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      className="relative aspect-[4/3] rounded-[8px] overflow-hidden cursor-grab active:cursor-grabbing select-none"
    >
      <div className="absolute inset-0" style={{ background: frame.gradient }} />

      {/* Hatch overlay */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 8px)',
        }}
      />

      {/* Order badge */}
      <span className="absolute top-2 left-2 min-w-[22px] h-[22px] px-1.5 rounded-[6px] bg-paper/90 font-mono text-[10px] text-ink flex items-center justify-center">
        {index + 1}
      </span>

      {/* Grip handle */}
      <span
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 w-[22px] h-[22px] flex items-center justify-center text-paper/70 text-[14px] hover:text-paper transition-colors"
        title="Drag to reorder"
      >
        ⠿
      </span>

      {/* Code */}
      <span className="absolute bottom-2 left-2 font-mono text-[10px] text-white/70">
        {frame.code}
      </span>
    </div>
  );
}

function DragPreviewFrame({ frame }: { frame: Frame }) {
  return (
    <div className="relative aspect-[4/3] w-[180px] rounded-[8px] overflow-hidden shadow-xl opacity-90 rotate-2">
      <div className="absolute inset-0" style={{ background: frame.gradient }} />
      <span className="absolute bottom-2 left-2 font-mono text-[10px] text-white/70">{frame.code}</span>
    </div>
  );
}

export default function GalleryBuilderPage() {
  const [frames, setFrames] = useState<Frame[]>(INIT_FRAMES);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState('Iceland — Ring Road');
  const [description, setDescription] = useState('48 frames from the Ring Road, May 2026.');
  const [visibility, setVisibility] = useState(true);
  const [printsForSale, setPrintsForSale] = useState(true);
  const [layout, setLayout] = useState<GalleryLayout>('grid');

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
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveId(null);
  }

  const activeFrame = activeId ? frames.find((f) => f.id === activeId) : null;

  const LAYOUT_OPTIONS: { id: GalleryLayout; icon: string }[] = [
    { id: 'grid',    icon: '⊞' },
    { id: 'feature', icon: '⊟' },
    { id: 'full',    icon: '⊡' },
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
            <Link
              to={`/portfolio/miracalder`}
              className="px-4 py-[10px] bg-surface border border-field rounded-[9px] font-semibold text-[14px] text-ink hover:border-ink transition-colors"
            >
              Preview
            </Link>
            <button className="px-5 py-[11px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 transition-colors">
              Publish
            </button>
          </div>
        </div>

        {/* 2-col layout */}
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
                        layout === opt.id
                          ? 'border-ink bg-ink/[0.04]'
                          : 'border-field hover:border-ink-3'
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
      </div>
    </div>
  );
}
