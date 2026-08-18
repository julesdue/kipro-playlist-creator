import { useEffect, useState } from "react";
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
  onDuplicate: (index: number) => void;
  onRename: (index: number, name: string) => void;
}

export function ClipList({ clips, onReorder, onRemove, onFix, onDuplicate, onRename }: ClipListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const items = clips.map((clip, index) => `${index}-${clip}`);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lastClicked, setLastClicked] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function handleRowClick(index: number, e: React.MouseEvent) {
    if (editingIndex !== null) return;
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

    const newSelected = new Set<number>();
    for (let i = insertAt; i < insertAt + moving.length; i++) newSelected.add(i);
    setSelected(newSelected);
    setLastClicked(insertAt);
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
              editing={editingIndex === index}
              onClick={(e) => handleRowClick(index, e)}
              onRemove={() => onRemove(index)}
              onFix={() => onFix(index)}
              onDuplicate={() => onDuplicate(index)}
              onStartRename={() => setEditingIndex(index)}
              onCommitRename={(name) => {
                setEditingIndex(null);
                if (name && name !== clip) onRename(index, name);
              }}
              onCancelRename={() => setEditingIndex(null)}
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
  editing,
  onClick,
  onRemove,
  onFix,
  onDuplicate,
  onStartRename,
  onCommitRename,
  onCancelRename,
}: {
  id: string;
  clip: string;
  selected: boolean;
  editing: boolean;
  onClick: (e: React.MouseEvent) => void;
  onRemove: () => void;
  onFix: () => void;
  onDuplicate: () => void;
  onStartRename: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: editing,
  });
  const valid = isValidClipName(clip);
  const [draft, setDraft] = useState(clip);

  useEffect(() => {
    if (editing) setDraft(clip);
  }, [editing, clip]);

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
      onDoubleClick={() => {
        if (!editing) onStartRename();
      }}
    >
      <span className="drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
        ⠿
      </span>
      {editing ? (
        <input
          className="clip-name-input"
          type="text"
          value={draft}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onCommitRename(draft.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onCommitRename(draft.trim());
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancelRename();
            }
          }}
        />
      ) : (
        <span className="clip-name">{clip}</span>
      )}
      {!valid && !editing && (
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
        className="rename-btn"
        onClick={(e) => {
          e.stopPropagation();
          onStartRename();
        }}
        aria-label={`Rename ${clip}`}
        title="Rename"
      >
        ✎
      </button>
      <button
        className="duplicate-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        aria-label={`Duplicate ${clip}`}
        title="Duplicate"
      >
        ⧉
      </button>
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
