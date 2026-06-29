"use client";

import ColaJuntadaItem from "@/components/salas/ColaJuntadaItem";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DoubleConfirmDialog from "@/components/ui/DoubleConfirmDialog";
import AddButton, { COLA_ADD_BUTTON_SIZE } from "@/components/ui/AddButton";
import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import {
  applyOrdenUpdates,
  avanzarCancion,
  deleteColaCompleta,
  finalizarCancionActiva,
  getColaVariant,
  reorderColaByDrag,
} from "@/lib/cola-logic";
import { triggerHaptic } from "@/lib/haptic";
import {
  avanzarColaLocal,
  deleteColaLocalCompleta,
  finalizarColaLocalActiva,
  persistColaLocalOrden,
} from "@/lib/offline/cola-local-store";
import { COLA_FINALIZE_BUTTON_MS } from "@/lib/sala-layout";
import { createClient } from "@/lib/supabase/client";
import type { ColaItem } from "@/types";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListMusic, SkipForward, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ColaJuntadaSheetProps = {
  items: ColaItem[];
  salaId: number;
  offlineMode?: boolean;
  onColaChange: () => Promise<void>;
  onItemsReordered: (items: ColaItem[]) => void;
  onOpenBuscador: () => void;
  onSettledOpenChange?: (open: boolean) => void;
};

type SortableColaJuntadaRowProps = {
  item: ColaItem;
  items: ColaItem[];
  onActivar: (id: number) => void;
};

function SortableColaJuntadaRow({
  item,
  items,
  onActivar,
}: SortableColaJuntadaRowProps) {
  const variant = getColaVariant(item, items);
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
        onActivar={onActivar}
      />
    </div>
  );
}

export default function ColaJuntadaSheet({
  items,
  salaId,
  offlineMode = false,
  onColaChange,
  onItemsReordered,
  onOpenBuscador,
  onSettledOpenChange,
}: ColaJuntadaSheetProps) {
  const [abierto, setAbierto] = useState(false);
  const [advanceItemId, setAdvanceItemId] = useState<number | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);

  const listScrollRef = useRef<HTMLDivElement>(null);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.orden - b.orden),
    [items],
  );

  const pendientesIds = useMemo(
    () =>
      sortedItems
        .filter((item) => item.estado === "pendiente")
        .map((item) => item.id),
    [sortedItems],
  );

  const pendientesCount = items.filter((item) => item.estado === "pendiente").length;
  const tieneActiva = items.some((item) => item.estado === "activa");

  const activeDragItem = useMemo(
    () =>
      activeDragId === null
        ? null
        : (sortedItems.find((item) => item.id === activeDragId) ?? null),
    [activeDragId, sortedItems],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  useEffect(() => {
    onSettledOpenChange?.(abierto);
  }, [abierto, onSettledOpenChange]);

  useHardwareBack(abierto, () => {
    if (showDeleteAllDialog) {
      setShowDeleteAllDialog(false);
      return;
    }

    if (advanceItemId !== null) {
      setAdvanceItemId(null);
      return;
    }

    setAbierto(false);
  });

  function handleOpenBuscador() {
    setAbierto(false);
    onOpenBuscador();
  }

  async function handleConfirmAdvance() {
    if (advanceItemId === null) {
      return;
    }

    if (offlineMode) {
      await avanzarColaLocal(salaId, advanceItemId);
      setAdvanceItemId(null);
      setAbierto(false);
      await onColaChange();
      listScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const supabase = createClient();
    await avanzarCancion(supabase, salaId, advanceItemId);
    setAdvanceItemId(null);
    setAbierto(false);
    await onColaChange();
    listScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleConfirmDeleteAll() {
    if (offlineMode) {
      await deleteColaLocalCompleta(salaId);
      setShowDeleteAllDialog(false);
      await onColaChange();
      return;
    }

    const supabase = createClient();
    await deleteColaCompleta(supabase, salaId);
    setShowDeleteAllDialog(false);
    await onColaChange();
  }

  async function handleSiguiente() {
    triggerHaptic();
    await new Promise((resolve) =>
      setTimeout(resolve, COLA_FINALIZE_BUTTON_MS),
    );

    if (offlineMode) {
      await finalizarColaLocalActiva(salaId);
      await onColaChange();
      return;
    }

    const supabase = createClient();
    await finalizarCancionActiva(supabase, salaId);
    await onColaChange();
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(Number(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = Number(active.id);
    const overId = Number(over.id);

    if (offlineMode) {
      const pendientes = items
        .filter((item) => item.estado === "pendiente")
        .sort((a, b) => a.orden - b.orden);
      const activeIndex = pendientes.findIndex((item) => item.id === activeId);
      const overIndex = pendientes.findIndex((item) => item.id === overId);

      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
        return;
      }

      const reordered = [...pendientes];
      const [moved] = reordered.splice(activeIndex, 1);
      reordered.splice(overIndex, 0, moved);

      const anchorOrden = Math.max(
        0,
        ...items
          .filter((item) => item.estado !== "pendiente")
          .map((item) => item.orden),
      );

      const updates = reordered.map((item, index) => ({
        id: item.id,
        orden: anchorOrden + index + 1,
      }));

      onItemsReordered(applyOrdenUpdates(items, updates));
      await persistColaLocalOrden(salaId, items, updates);
      await onColaChange();
      return;
    }

    const supabase = createClient();
    const updates = await reorderColaByDrag(
      supabase,
      items,
      activeId,
      overId,
    );

    if (updates.length > 0) {
      onItemsReordered(applyOrdenUpdates(items, updates));
      await onColaChange();
    }
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const floatingBottom =
    "calc(56px + 16px + env(safe-area-inset-bottom, 0px))";

  return (
    <>
      <div
        className="fixed right-4 z-30 flex flex-col items-end gap-2"
        style={{ bottom: floatingBottom }}
      >
        {tieneActiva ? (
          <TapButton
            type="button"
            onClick={() => void handleSiguiente()}
            className="flex items-center gap-2 rounded-full border border-border bg-bg-dark px-4 py-2 text-sm text-text-secondary"
          >
            <span>Siguiente</span>
            <SkipForward className="size-4" aria-hidden="true" />
          </TapButton>
        ) : null}

        <TapButton
          type="button"
          onClick={() => setAbierto(true)}
          className="flex items-center gap-2 rounded-full border border-accent bg-accent/20 px-4 py-2 text-sm font-medium text-accent"
        >
          <ListMusic className="size-4" aria-hidden="true" />
          <span>Cola · {pendientesCount}</span>
        </TapButton>
      </div>

      {abierto ? (
        <>
          <button
            type="button"
            aria-label="Cerrar cola"
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setAbierto(false)}
          />

          <div
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden rounded-t-2xl border-t border-border bg-bg-dark"
            style={{ height: "65vh" }}
            role="dialog"
            aria-modal="true"
            aria-label="Fila de canciones"
          >
            <header className="relative shrink-0 border-b border-border bg-bg-cola-sheet px-4 pb-3 pt-1.5">
              <TapButton
                type="button"
                aria-label="Cerrar cola"
                onClick={() => setAbierto(false)}
                className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-text-muted"
              >
                <X className="size-5" aria-hidden="true" />
              </TapButton>

              <div className="flex shrink-0 justify-center pb-2 pt-1">
                <div
                  className="h-1 w-10 rounded-full bg-cola-sheet-pill"
                  aria-hidden="true"
                />
              </div>

              <div className="flex items-center gap-2 pr-10">
                <TapButton
                  type="button"
                  aria-label="Borrar toda la lista"
                  onClick={() => setShowDeleteAllDialog(true)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted/50 active:text-text-secondary"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </TapButton>

                <h2 className="min-w-0 flex-1 text-center text-lg font-bold text-text-primary">
                  Fila de canciones
                </h2>

                <AddButton
                  ariaLabel="Agregar canción"
                  size={COLA_ADD_BUTTON_SIZE}
                  onClick={handleOpenBuscador}
                />
              </div>
            </header>

            <div className="relative flex min-h-0 flex-1 flex-col bg-bg-cola-list">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={(event) => void handleDragEnd(event)}
                onDragCancel={handleDragCancel}
              >
                <div
                  ref={listScrollRef}
                  className="min-h-0 flex-1 touch-pan-y space-y-2 overflow-y-auto overscroll-none px-3 py-3"
                  style={{
                    paddingBottom:
                      "max(0.75rem, env(safe-area-inset-bottom, 0px))",
                  }}
                >
                  {sortedItems.length === 0 ? (
                    <p className="py-8 text-center text-sm text-text-muted">
                      La fila está vacía · Agregá una canción con el +
                    </p>
                  ) : (
                    <SortableContext
                      items={pendientesIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {sortedItems.map((item) => {
                        if (item.estado === "pendiente") {
                          return (
                            <SortableColaJuntadaRow
                              key={item.id}
                              item={item}
                              items={items}
                              onActivar={setAdvanceItemId}
                            />
                          );
                        }

                        return (
                          <ColaJuntadaItem
                            key={item.id}
                            item={item}
                            variant={getColaVariant(item, items)}
                          />
                        );
                      })}
                    </SortableContext>
                  )}
                </div>

                <DragOverlay>
                  {activeDragItem ? (
                    <div className="opacity-80 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                      <ColaJuntadaItem
                        item={activeDragItem}
                        variant={getColaVariant(activeDragItem, items)}
                        isDragging
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        </>
      ) : null}

      <ConfirmDialog
        open={advanceItemId !== null}
        message="¿Cambiar la canción? Todos en la sala van a ver la nueva letra."
        onCancel={() => setAdvanceItemId(null)}
        onConfirm={() => void handleConfirmAdvance()}
      />

      <DoubleConfirmDialog
        open={showDeleteAllDialog}
        step1Message="¿Querés borrar TODA la fila de canciones?"
        step2Message="¿Estás seguro? Esta acción no se puede deshacer."
        onCancel={() => setShowDeleteAllDialog(false)}
        onConfirm={() => void handleConfirmDeleteAll()}
      />
    </>
  );
}
