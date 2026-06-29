"use client";

import ColaJuntadaItem, {
  type ColaJuntadaItemVariant,
} from "@/components/salas/ColaJuntadaItem";
import type { ColaIndividualItem } from "@/types";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";

type ColaIndividualProps = {
  items: ColaIndividualItem[];
  onReorder: (items: ColaIndividualItem[]) => void;
  onVolverAPendiente: (id: number) => void;
};

function getIndividualVariant(
  item: ColaIndividualItem,
  items: ColaIndividualItem[],
): ColaJuntadaItemVariant {
  if (item.estado === "tocada") {
    return "tocada";
  }

  if (item.estado === "activa") {
    return "activa";
  }

  const firstPendiente = items
    .filter((colaItem) => colaItem.estado === "pendiente")
    .sort((a, b) => a.orden - b.orden)[0];

  if (firstPendiente?.id === item.id) {
    return "proxima";
  }

  return "pendiente";
}

type SortableColaIndividualRowProps = {
  item: ColaIndividualItem;
  items: ColaIndividualItem[];
};

function SortableColaIndividualRow({
  item,
  items,
}: SortableColaIndividualRowProps) {
  const variant = getIndividualVariant(item, items);
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
      className={isDragging ? "relative z-10" : undefined}
    >
      <ColaJuntadaItem
        item={item}
        variant={variant}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export default function ColaIndividual({
  items,
  onReorder,
  onVolverAPendiente,
}: ColaIndividualProps) {
  const [activeDragId, setActiveDragId] = useState<number | null>(null);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.orden - b.orden),
    [items],
  );

  const tocadas = useMemo(
    () =>
      sortedItems
        .filter((item) => item.estado === "tocada")
        .sort((a, b) => b.orden - a.orden),
    [sortedItems],
  );

  const activaItem = useMemo(
    () => sortedItems.find((item) => item.estado === "activa") ?? null,
    [sortedItems],
  );

  const pendientes = useMemo(
    () =>
      sortedItems
        .filter((item) => item.estado === "pendiente")
        .sort((a, b) => a.orden - b.orden),
    [sortedItems],
  );

  const pendientesIds = useMemo(
    () => pendientes.map((item) => item.id),
    [pendientes],
  );

  const activeDragItem = useMemo(
    () =>
      activeDragId === null
        ? null
        : (pendientes.find((item) => item.id === activeDragId) ?? null),
    [activeDragId, pendientes],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(Number(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeIndex = pendientes.findIndex((item) => item.id === active.id);
    const overIndex = pendientes.findIndex((item) => item.id === over.id);

    if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
      return;
    }

    const reorderedPendientes = arrayMove(pendientes, activeIndex, overIndex);
    const anchorOrden = Math.max(
      0,
      ...items
        .filter((item) => item.estado !== "pendiente")
        .map((item) => item.orden),
    );

    const updatedPendientes = reorderedPendientes.map((item, index) => ({
      ...item,
      orden: anchorOrden + index + 1,
    }));

    const nextItems = items.map((item) => {
      const updated = updatedPendientes.find(
        (pendiente) => pendiente.id === item.id,
      );
      return updated ?? item;
    });

    onReorder(nextItems);
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  if (sortedItems.length === 0) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="select-none px-3 pb-3">
        {tocadas.length > 0 ? (
          <div className="mb-2 space-y-0.5">
            {tocadas.map((item) => (
              <ColaJuntadaItem
                key={item.id}
                item={item}
                variant="tocada"
                onVolverAPendiente={onVolverAPendiente}
              />
            ))}
            <div
              className="mx-1 my-2 border-b border-border/40"
              aria-hidden="true"
            />
          </div>
        ) : null}

        {activaItem ? (
          <div className="mx-2.5 mb-2">
            <ColaJuntadaItem item={activaItem} variant="activa" />
          </div>
        ) : null}

        {pendientes.length > 0 ? (
          <SortableContext
            items={pendientesIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {pendientes.map((item) => (
                <SortableColaIndividualRow
                  key={item.id}
                  item={item}
                  items={items}
                />
              ))}
            </div>
          </SortableContext>
        ) : null}
      </div>

      <DragOverlay>
        {activeDragItem ? (
          <div className="opacity-80 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
            <ColaJuntadaItem
              item={activeDragItem}
              variant={getIndividualVariant(activeDragItem, items)}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
