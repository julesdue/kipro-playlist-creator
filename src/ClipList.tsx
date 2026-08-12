import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isValidClipName } from "./clipName";

interface ClipListProps {
  clips: string[];
  onReorder: (clips: string[]) => void;
  onRemove: (index: number) => void;
  onFix: (index: number) => void;
}

export function ClipList({ clips, onReorder, onRemove, onFix }: ClipListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const items = clips.map((clip, index) => `${index}-${clip}`);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lastClicked, setLastClicked] = useState<number | null>(null);

  function handleRowClick(index: number, e: React.MouseEvent) {
    if (e.shiftKey && lastClicked !== null) {
      const [from, to] = lastClicked < index ? [lastClicked, index] : [index, lastClicked];
      const range = new Set<number>();
      for (let i = from; i <= to; i++) range.add(i);
      setSelected(range);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
      setLastClicked(index);
      return;
    }

    setSelected(new Set([index]));
    setLastClicked(index);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.indexOf(String(active.id));
    const newIndex = items.indexOf(String(over.id));

    const movingSet = selected.has(oldIndex) ? selected : new Set([oldIndex]);
    const moving = clips.filter((_, i) => movingSet.has(i));
    const remaining = clips.filter((_, i) => !movingSet.has(i));

    const targetClip = clips[newIndex];
    let insertAt = remaining.indexOf(targetClip);
    if (insertAt === -1) insertAt = remaining.length;
    else if (newIndex > oldIndex && !movingSet.has(newIndex)) insertAt += 1;

    const reordered = [...remaining.slice(0, insertAt), ...moving, ...remaining.slice(insertAt)];
    onReorder(reordered);

    if (movingSet.size > 1) {
      const newSelected = new Set<number>();
      for (let i = insertAt; i < insertAt + moving.length; i++) newSelected.add(i);
      setSelected(newSelected);
    }
  }

  if (clips.length === 0) {
    return <p className="empty-state">No clips yet. Drag files into the window to add them.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ol className="clip-list">
          {clips.map((clip, index) => (
            <ClipRow
              key={items[index]}
              id={items[index]}
              clip={clip}
              selected={selected.has(index)}
              onClick={(e) => handleRowClick(index, e)}
              onRemove={() => onRemove(index)}
              onFix={() => onFix(index)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function ClipRow({
  id,
  clip,
  selected,
  onClick,
  onRemove,
  onFix,
}: {
  id: string;
  clip: string;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onRemove: () => void;
  onFix: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const valid = isValidClipName(clip);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`clip-row ${selected ? "selected" : ""} ${!valid ? "invalid" : ""}`}
      onClick={onClick}
    >
      <span className="drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
        ⠿
      </span>
      <span className="clip-name">{clip}</span>
      {!valid && (
        <span className="clip-error" role="alert">
          <span className="clip-error-message" title="Filename must use only letters, digits, - _ and .">
            ⚠ Invalid filename
          </span>
          <button
            className="fix-btn"
            onClick={(e) => {
              e.stopPropagation();
              onFix();
            }}
          >
            Fix
          </button>
        </span>
      )}
      <button
        className="remove-btn"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${clip}`}
      >
        ✕
      </button>
    </li>
  );
}
