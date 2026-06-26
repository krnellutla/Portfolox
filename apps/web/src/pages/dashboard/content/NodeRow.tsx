import type { NodeResponse } from '@blueflutes/shared';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button.js';

interface Props {
  node: NodeResponse;
  depth: number;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

const TYPE_ICON: Record<NodeResponse['type'], string> = {
  folder: '📁',
  gallery: '🖼',
  page: '📄',
};

export function NodeRow({ node, depth, selected = false, onSelect, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(node.name);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    data: { parentId: node.parentId, position: node.position },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  function handleRenameSubmit() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== node.name) {
      onRename(node.id, trimmed);
    }
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-800 ${
        selected ? 'bg-slate-700 ring-1 ring-slate-500' : ''
      }`}
      onClick={() => node.type === 'gallery' && onSelect?.(node.id)}
      role={node.type === 'gallery' ? 'button' : undefined}
      tabIndex={node.type === 'gallery' ? 0 : undefined}
    >
      {/* drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-slate-600 hover:text-slate-400 active:cursor-grabbing"
        aria-label="Drag to reorder"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        ⠿
      </button>

      <span className="text-sm">{TYPE_ICON[node.type]}</span>

      {editing ? (
        <input
          autoFocus
          className="flex-1 rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-sm text-slate-100 outline-none focus:border-slate-400"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit();
            if (e.key === 'Escape') {
              setDraftName(node.name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <span
          className="flex-1 cursor-pointer text-sm text-slate-200"
          onDoubleClick={() => setEditing(true)}
          title="Double-click to rename"
        >
          {node.name}
        </span>
      )}

      <span className="text-xs text-slate-500">{node.slug}</span>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          className="h-6 px-1.5 text-xs"
          onClick={() => setEditing(true)}
          aria-label="Rename"
        >
          ✏
        </Button>
        <Button
          variant="ghost"
          className="h-6 px-1.5 text-xs text-red-400 hover:text-red-300"
          onClick={() => onDelete(node.id)}
          aria-label="Delete"
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
