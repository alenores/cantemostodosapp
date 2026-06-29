"use client";

import ColaJuntadaItem from "@/components/salas/ColaJuntadaItem";
import DoubleConfirmDialog from "@/components/ui/DoubleConfirmDialog";
import AddButton, { COLA_ADD_BUTTON_SIZE } from "@/components/ui/AddButton";
import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import {
  applyOrdenUpdates,
  deleteColaCompleta,
  finalizarCancionActiva,
  getColaVariant,
  reorderColaByDrag,
} from "@/lib/cola-logic";
import { triggerHaptic } from "@/lib/haptic";
import {
  deleteColaLocalCompleta,
  finalizarColaLocalActiva,
  persistColaLocalOrden,
  replaceColaLocalItems,
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
import { ListMusic, SkipForward, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const FLOAT_BTN_SECONDARY =
  "rounded-2xl border border-accent/50 bg-bg-dark text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.5)]";
const FLOAT_BTN_DISABLED = "pointer-events-none opacity-40";

type ColaJuntadaSheetProps = {
  items: ColaItem[];
  salaId: number;
  offlineMode?: boolean;
  onColaChange: () => Promise<void>;
  onItemsReordered: (items: ColaItem[]) => void;
  onOpenBuscador: () => void;
  onSettledOpenChange?: (open: boolean) => void;
  onRequestOpen?: (open: () => void) => void;
  onRequestSiguiente?: (siguiente: () => void) => void;
  presentacionOculta?: boolean;
};

type SortableColaJuntadaRowProps = {
  item: ColaItem;
  items: ColaItem[];
};

function SortableColaJuntadaRow({ item, items }: SortableColaJuntadaRowProps) {
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
  onRequestOpen,
  onRequestSiguiente,
  presentacionOculta = false,
}: ColaJuntadaSheetProps) {
  const [abierto, setAbierto] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);

  const listScrollRef = useRef<HTMLDivElement>(null);

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

  const pendientesCount = pendientes.length;
  const tieneActiva = activaItem !== null;

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

  useEffect(() => {
    onSettledOpenChange?.(abierto);
  }, [abierto, onSettledOpenChange]);

  useEffect(() => {
    onRequestOpen?.(() => setAbierto(true));
  }, [onRequestOpen]);

  useHardwareBack(abierto, () => {
    if (showDeleteAllDialog) {
      setShowDeleteAllDialog(false);
      return;
    }

    setAbierto(false);
  });

  function handleOpenBuscador() {
    setAbierto(false);
    onOpenBuscador();
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
    if (pendientesCount === 0) {
      return;
    }

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

  const handleSiguienteRef = useRef(handleSiguiente);
  handleSiguienteRef.current = handleSiguiente;

  useEffect(() => {
    onRequestSiguiente?.(() => void handleSiguienteRef.current());
  }, [onRequestSiguiente]);

  async function handleVolverAPendiente(itemId: number) {
    const item = items.find((colaItem) => colaItem.id === itemId);

    if (!item || item.estado !== "tocada") {
      return;
    }

    const maxOrden = Math.max(0, ...items.map((colaItem) => colaItem.orden));
    const nextOrden = maxOrden + 1;

    if (offlineMode) {
      const nextItems = items.map((colaItem) =>
        colaItem.id === itemId
          ? { ...colaItem, estado: "pendiente" as const, orden: nextOrden }
          : colaItem,
      );
      onItemsReordered(nextItems);
      await replaceColaLocalItems(salaId, nextItems);
      await onColaChange();
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("cola_juntada")
      .update({ estado: "pendiente", orden: nextOrden })
      .eq("id", itemId);

    if (error) {
      throw error;
    }

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

  const listaVacia = sortedItems.length === 0;

  return (
    <>
      {!presentacionOculta ? (
        <div
          className="pointer-events-none fixed inset-x-0 z-30"
          style={{
            bottom: floatingBottom,
            height: 0,
            overflow: "visible",
          }}
        >
          <div className="pointer-events-auto absolute bottom-0 right-4 flex flex-col items-end gap-2">
            {tieneActiva ? (
              <TapButton
                type="button"
                disabled={pendientesCount === 0}
                onClick={() => void handleSiguiente()}
                className={`flex items-center gap-2 px-4 py-2 text-sm ${FLOAT_BTN_SECONDARY} ${
                  pendientesCount === 0 ? FLOAT_BTN_DISABLED : ""
                }`}
              >
                <span>Siguiente</span>
                <SkipForward className="size-4" aria-hidden="true" />
              </TapButton>
            ) : null}

            <TapButton
              type="button"
              onClick={() => setAbierto(true)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${FLOAT_BTN_SECONDARY}`}
            >
              <ListMusic className="size-4" aria-hidden="true" />
              <span>Cola · {pendientesCount}</span>
            </TapButton>
          </div>
        </div>
      ) : null}

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
              <div className="flex shrink-0 justify-center pb-2 pt-1">
                <div
                  className="h-1 w-10 rounded-full bg-cola-sheet-pill"
                  aria-hidden="true"
                />
              </div>

              <div className="flex items-center gap-2">
                <TapButton
                  type="button"
                  aria-label="Borrar toda la lista"
                  onClick={() => setShowDeleteAllDialog(true)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted/50 active:text-text-secondary"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </TapButton>

                <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                  <h2 className="text-lg font-bold text-text-primary">
                    Fila de canciones
                  </h2>
                  <TapButton
                    type="button"
                    aria-label="Siguiente canción"
                    disabled={pendientesCount === 0}
                    onClick={() => void handleSiguiente()}
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full text-text-secondary ${
                      pendientesCount === 0
                        ? "pointer-events-none opacity-40"
                        : ""
                    }`}
                  >
                    <SkipForward className="size-4" aria-hidden="true" />
                  </TapButton>
                </div>

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
                  className="min-h-0 flex-1 touch-pan-y select-none overflow-y-auto overscroll-none px-3 py-3"
                  style={{
                    paddingBottom:
                      "max(0.75rem, env(safe-area-inset-bottom, 0px))",
                  }}
                >
                  {listaVacia ? (
                    <p className="py-8 text-center text-sm text-text-muted">
                      La fila está vacía · Agregá una canción con el +
                    </p>
                  ) : (
                    <>
                      {tocadas.length > 0 ? (
                        <div className="mb-2 space-y-0.5">
                          {tocadas.map((item) => (
                            <ColaJuntadaItem
                              key={item.id}
                              item={item}
                              variant="tocada"
                              onVolverAPendiente={(id) =>
                                void handleVolverAPendiente(id)
                              }
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
                          <ColaJuntadaItem
                            item={activaItem}
                            variant="activa"
                          />
                        </div>
                      ) : null}

                      {pendientes.length > 0 ? (
                        <SortableContext
                          items={pendientesIds}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {pendientes.map((item) => (
                              <SortableColaJuntadaRow
                                key={item.id}
                                item={item}
                                items={items}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      ) : null}
                    </>
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
