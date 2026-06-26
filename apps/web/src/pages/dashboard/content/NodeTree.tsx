import type { NodeResponse } from '@blueflutes/shared';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';
import { NodeRow } from './NodeRow.js';

interface Props {
  nodes: NodeResponse[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, targetParentId: string | null, targetPosition: number) => void;
}

interface FlatItem {
  node: NodeResponse;
  depth: number;
}

function flatten(nodes: NodeResponse[], parentId: string | null = null, depth = 0): FlatItem[] {
  const children = nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.position - b.position);
  return children.flatMap((n) => [{ node: n, depth }, ...flatten(nodes, n.id, depth + 1)]);
}

export function NodeTree({ nodes, selectedId, onSelect, onRename, onDelete, onMove }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const flatItems = flatten(nodes);
  const ids = flatItems.map((item) => item.node.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const movingNode = nodes.find((n) => n.id === active.id);
    const overNode = nodes.find((n) => n.id === over.id);
    if (!movingNode || !overNode) return;

    // Place the moving node into the same parent group as the over-node,
    // at the over-node's current position (shift semantics).
    onMove(movingNode.id, overNode.parentId, overNode.position);
  }

  const activeItem = flatItems.find((item) => item.node.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {flatItems.map(({ node, depth }) => (
            <NodeRow
              key={node.id}
              node={node}
              depth={depth}
              selected={selectedId === node.id}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
          {flatItems.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No nodes yet. Create a folder or gallery to get started.
            </p>
          )}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <div className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-200 shadow-lg opacity-90">
            {activeItem.node.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
