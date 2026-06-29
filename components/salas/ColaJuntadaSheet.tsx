"use client";

import ColaJuntadaItem from "@/components/salas/ColaJuntadaItem";
import DoubleConfirmDialog from "@/components/ui/DoubleConfirmDialog";
import AddButton, { COLA_ADD_BUTTON_SIZE } from "@/components/ui/AddButton";
import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import {
  applyOrdenUpdates,
  deleteColaCompleta,
  deleteColaItem,
  finalizarCancionActiva,
  getColaVariant,
  reorderColaByDrag,
} from "@/lib/cola-logic";
import { triggerHaptic } from "@/lib/haptic";
import {
  deleteColaLocalCompleta,
  deleteColaLocalItem,
  finalizarColaLocalActiva,
  persistColaLocalOrden,
  replaceColaLocalItems,
} from "@/lib/offline/cola-local-store";
import {
  COLA_FINALIZE_BUTTON_MS,
  COLA_MODAL_HORIZONTAL_INSET_PX,
  COLA_MODAL_TOP_INSET_PX,
  getColaModalBottomCss,
  getSalaFloatControlsBottomCss,
} from "@/lib/sala-layout";
import { createClient } from "@/lib/supabase/client";
import type { ColaItem } from "@/types";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListMusic, Maximize2, SkipForward, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

const COLA_MODAL_LAYER_Z = 100;

const FLOAT_BTN_SECONDARY =
  "rounded-2xl border border-accent/50 bg-bg-dark text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.5)]";
const FLOAT_BTN_DISABLED = "pointer-events-none opacity-40";
const COLA_DRAG_DELETE_ID = "cola-drag-delete";

const colaDragCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  const deleteHit = pointerHits.find(
    (collision) => collision.id === COLA_DRAG_DELETE_ID,
  );

  if (deleteHit) {
    return [deleteHit];
  }

  return closestCenter(args);
};

type ColaDragDeleteZoneProps = {
  visible: boolean;
  highlighted: boolean;
};

function ColaDragDeleteZone({ visible, highlighted }: ColaDragDeleteZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: COLA_DRAG_DELETE_ID });
  const active = highlighted || isOver;

  if (!visible) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center"
      aria-hidden={!visible}
    >
      <div
        ref={setNodeRef}
        className={`pointer-events-auto flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition-[transform,background-color,border-color,color] duration-150 ${
          active
            ? "scale-105 border-red-500 bg-red-500 text-white"
            : "border-red-500/45 bg-bg-card text-red-400"
        }`}
        aria-label="Soltar para eliminar de la lista"
      >
        {active ? (
          <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <X className="size-3.5 shrink-0" aria-hidden="true" />
        )}
        <span>Eliminar</span>
      </div>
    </div>
  );
}

type ColaJuntadaSheetProps = {
  items: ColaItem[];
  salaId: number;
  offlineMode?: boolean;
  presenceBarVisible?: boolean;
  onColaChange: () => Promise<void>;
  onItemsReordered: (items: ColaItem[]) => void;
  onOpenBuscador: () => void;
  onSettledOpenChange?: (open: boolean) => void;
  onRequestOpen?: (open: () => void) => void;
  onRequestSiguiente?: (siguiente: () => void) => void;
  onExpand?: () => void;
  presentacionOculta?: boolean;
  onDragEnd?: () => void;
};

type SortableColaJuntadaRowProps = {
  item: ColaItem;
  items: ColaItem[];
  listIndex: number;
  nombreRevealGeneration: number;
};

function SortableColaJuntadaRow({
  item,
  items,
  listIndex,
  nombreRevealGeneration,
}: SortableColaJuntadaRowProps) {
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.orden - b.orden),
    [items],
  );
  const variant = getColaVariant(item, sortedItems);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    transition: null,
    attributes: {
      tabIndex: -1,
      role: "listitem",
    },
  });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    WebkitTapHighlightColor: "transparent",
    opacity: isDragging ? 0 : 1,
    outline: "none",
  } as CSSProperties;

  return (
    <ColaJuntadaItem
      ref={setNodeRef}
      item={item}
      variant={variant}
      nombreRevealGeneration={nombreRevealGeneration}
      nombreRevealIndex={listIndex}
      dragHandleProps={{
        ...attributes,
        ...listeners,
        style: dragStyle,
      }}
    />
  );
}

export default function ColaJuntadaSheet({
  items,
  salaId,
  offlineMode = false,
  presenceBarVisible = false,
  onColaChange,
  onItemsReordered,
  onOpenBuscador,
  onSettledOpenChange,
  onRequestOpen,
  onRequestSiguiente,
  onExpand,
  presentacionOculta = false,
  onDragEnd,
}: ColaJuntadaSheetProps) {
  const [abierto, setAbierto] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [dragOverDelete, setDragOverDelete] = useState(false);
  const [nombreRevealGeneration, setNombreRevealGeneration] = useState(0);

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
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 500, tolerance: 5 },
    }),
  );

  const openCola = useCallback(() => {
    triggerHaptic();
    setAbierto(true);
  }, []);

  const closeCola = useCallback(() => {
    setAbierto(false);
  }, []);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    onSettledOpenChange?.(abierto);
  }, [abierto, onSettledOpenChange]);

  useEffect(() => {
    onRequestOpen?.(openCola);
  }, [onRequestOpen, openCola]);

  useHardwareBack(abierto, () => {
    if (showDeleteAllDialog) {
      setShowDeleteAllDialog(false);
      return;
    }

    closeCola();
  });

  function handleOpenBuscador() {
    closeCola();
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
    setDragOverDelete(false);
    navigator.vibrate?.([0, 30, 60]);
  };

  async function handleDeleteItem(itemId: number) {
    const item = items.find((colaItem) => colaItem.id === itemId);

    if (!item || item.estado !== "pendiente") {
      return;
    }

    triggerHaptic();
    const nextItems = items.filter((colaItem) => colaItem.id !== itemId);
    onItemsReordered(nextItems);

    if (offlineMode) {
      await deleteColaLocalItem(salaId, itemId);
      await onColaChange();
      return;
    }

    const supabase = createClient();
    await deleteColaItem(supabase, itemId);
    await onColaChange();
  }

  const handleDragOver = (event: DragOverEvent) => {
    setDragOverDelete(event.over?.id === COLA_DRAG_DELETE_ID);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    onDragEnd?.();
    setActiveDragId(null);
    setDragOverDelete(false);

    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeId = Number(active.id);

    if (over.id === COLA_DRAG_DELETE_ID) {
      await handleDeleteItem(activeId);
      return;
    }

    if (active.id === over.id) {
      return;
    }
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
      triggerNombreRevealCascade();
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
      triggerNombreRevealCascade();
    }
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setDragOverDelete(false);
  };

  const triggerNombreRevealCascade = () => {
    setNombreRevealGeneration((generation) => generation + 1);
  };

  const floatingBottom = getSalaFloatControlsBottomCss(presenceBarVisible);
  const modalBottom = getColaModalBottomCss();

  const listaVacia = sortedItems.length === 0;

  const colaModalLayer =
    abierto && portalMounted
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Cerrar cola"
              className="fixed inset-0 bg-black/50"
              style={{ zIndex: COLA_MODAL_LAYER_Z }}
              onClick={closeCola}
            />

            <DndContext
              sensors={sensors}
              collisionDetection={colaDragCollisionDetection}
              measuring={{
                droppable: { strategy: MeasuringStrategy.Always },
              }}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={(event) => void handleDragEnd(event)}
              onDragCancel={handleDragCancel}
            >
              <div
                className="fixed flex flex-col overflow-hidden rounded-2xl border-[3px] border-bg-cola-sheet bg-bg-dark shadow-[0_0_0_1px_rgba(0,0,0,0.65),0_20px_56px_rgba(0,0,0,0.62)]"
                style={{
                  zIndex: COLA_MODAL_LAYER_Z + 1,
                  top: `calc(${COLA_MODAL_TOP_INSET_PX}px + env(safe-area-inset-top, 0px))`,
                  bottom: modalBottom,
                  left: COLA_MODAL_HORIZONTAL_INSET_PX,
                  right: COLA_MODAL_HORIZONTAL_INSET_PX,
                }}
                role="dialog"
                aria-modal="true"
                aria-label="Fila de canciones"
              >
                <header className="relative shrink-0 border-b border-border bg-bg-cola-sheet px-4 py-3">
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
                  <div
                    ref={listScrollRef}
                    className="min-h-0 flex-1 touch-pan-y select-none overflow-y-auto overscroll-none px-3 py-3"
                    style={{
                      paddingBottom: activeDragId
                        ? "max(4.5rem, env(safe-area-inset-bottom, 0px))"
                        : "max(1rem, env(safe-area-inset-bottom, 0px))",
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
                          <div className="mb-2">
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
                              {pendientes.map((item, index) => (
                                <SortableColaJuntadaRow
                                  key={item.id}
                                  item={item}
                                  items={items}
                                  listIndex={index}
                                  nombreRevealGeneration={nombreRevealGeneration}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        ) : null}
                      </>
                    )}
                  </div>

                  <ColaDragDeleteZone
                    visible={activeDragId !== null}
                    highlighted={dragOverDelete}
                  />
                </div>
              </div>

              <DragOverlay dropAnimation={null} style={{ zIndex: COLA_MODAL_LAYER_Z + 2 }}>
                {activeDragItem ? (
                  <div className="opacity-80 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                    <ColaJuntadaItem
                      item={activeDragItem}
                      variant={getColaVariant(
                        activeDragItem,
                        [...items].sort((a, b) => a.orden - b.orden),
                      )}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            <DoubleConfirmDialog
              open={showDeleteAllDialog}
              step1Message="¿Querés borrar TODA la fila de canciones?"
              step2Message="¿Estás seguro? Esta acción no se puede deshacer."
              zIndex={COLA_MODAL_LAYER_Z + 10}
              onCancel={() => setShowDeleteAllDialog(false)}
              onConfirm={() => void handleConfirmDeleteAll()}
            />
          </>,
          document.body,
        )
      : null;

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
            {onExpand ? (
              <TapButton
                type="button"
                aria-label="Expandir letra a pantalla completa"
                onClick={onExpand}
                className={`sala-expand-attention flex items-center gap-2 px-4 py-2 text-sm font-medium ${FLOAT_BTN_SECONDARY}`}
              >
                <Maximize2 className="size-4 text-accent" aria-hidden="true" />
                <span>Expandir</span>
              </TapButton>
            ) : null}

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
              onClick={openCola}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${FLOAT_BTN_SECONDARY}`}
            >
              <ListMusic className="size-4" aria-hidden="true" />
              <span>Fila · {pendientesCount}</span>
            </TapButton>
          </div>
        </div>
      ) : null}

      {colaModalLayer}
    </>
  );
}
