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
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ClipListProps {
  clips: string[];
  onReorder: (clips: string[]) => void;
  onRemove: (index: number) => void;
}

export function ClipList({ clips, onReorder, onRemove }: ClipListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const items = clips.map((clip, index) => `${index}-${clip}`);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.indexOf(String(active.id));
    const newIndex = items.indexOf(String(over.id));
    onReorder(arrayMove(clips, oldIndex, newIndex));
  }

  if (clips.length === 0) {
    return <p className="empty-state">No clips yet. Drag files into the window to add them.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ol className="clip-list">
          {clips.map((clip, index) => (
            <ClipRow key={items[index]} id={items[index]} clip={clip} onRemove={() => onRemove(index)} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function ClipRow({ id, clip, onRemove }: { id: string; clip: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="clip-row">
      <span className="drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
        ⠿
      </span>
      <span className="clip-name">{clip}</span>
      <button className="remove-btn" onClick={onRemove} aria-label={`Remove ${clip}`}>
        ✕
      </button>
    </li>
  );
}
