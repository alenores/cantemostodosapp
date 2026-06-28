"use client";

import type { ColaIndividualItem } from "@/types";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";

type ColaIndividualProps = {
  items: ColaIndividualItem[];
  onReorder: (items: ColaIndividualItem[]) => void;
  onEliminar: (id: number) => void;
  onActivar: (item: ColaIndividualItem) => void;
};

type SortableColaItemProps = {
  item: ColaIndividualItem;
  onEliminar: (id: number) => void;
  onActivar: (item: ColaIndividualItem) => void;
};

function SortableColaItem({
  item,
  onEliminar,
  onActivar,
}: SortableColaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl border border-border bg-bg-card px-3 py-2.5 ${
        isDragging ? "bg-bg-card-hover opacity-50" : ""
      }`}
    >
      <button
        type="button"
        aria-label={`Reordenar ${item.nombre}`}
        className="flex shrink-0 touch-none items-center justify-center text-text-muted/50"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => onActivar(item)}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-medium text-text-primary">
          {item.nombre}
        </p>
        {item.artista ? (
          <p className="truncate text-xs text-text-muted">{item.artista}</p>
        ) : null}
      </button>

      <button
        type="button"
        aria-label={`Eliminar ${item.nombre}`}
        onClick={() => onEliminar(item.id)}
        className="flex shrink-0 items-center justify-center text-text-muted/50"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function ColaIndividual({
  items,
  onReorder,
  onEliminar,
  onActivar,
}: ColaIndividualProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 px-3 pb-3">
          {items.map((item) => (
            <SortableColaItem
              key={item.id}
              item={item}
              onEliminar={onEliminar}
              onActivar={onActivar}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
