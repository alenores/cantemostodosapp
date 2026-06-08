"use client";

import ColaItemCard from "@/components/salas/ColaItem";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DoubleConfirmDialog from "@/components/ui/DoubleConfirmDialog";
import AddButton from "@/components/ui/AddButton";
import { TapButton } from "@/components/ui/TapFeedback";
import {
  avanzarCancion,
  buildReorderUpdates,
  deleteColaCompleta,
  deleteColaItem,
  finalizarCancionActiva,
  persistColaOrden,
} from "@/lib/cola-logic";
import { triggerHaptic } from "@/lib/haptic";
import {
  COLA_BAR_HEIGHT_PX,
  getColaOpenHeight,
  getColaPanelClosedY,
} from "@/lib/sala-layout";
import { buildGuardadaKey } from "@/lib/sala-data";
import { createClient } from "@/lib/supabase/client";
import type { ColaItem } from "@/types";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DraggableProvided,
  type DraggableStateSnapshot,
  type DropResult,
} from "@hello-pangea/dnd";
import { useDrag } from "@use-gesture/react";
import { Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const SNAP_THRESHOLD = 0.3;
const PEEK_THRESHOLD = 0.92;
const TAP_MOVE_THRESHOLD_PX = 12;

type ColaBottomSheetProps = {
  items: ColaItem[];
  guardadasKeys: Set<string>;
  salaId: number;
  onColaChange: () => Promise<void>;
  onOpenBuscador: () => void;
  avisoMensaje?: string | null;
  onProgressChange?: (progress: number) => void;
  onRegisterClose?: (close: () => void) => void;
  onRegisterOpen?: (open: () => void) => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function ColaBottomSheet({
  items,
  guardadasKeys,
  salaId,
  onColaChange,
  onOpenBuscador,
  avisoMensaje = null,
  onProgressChange,
  onRegisterClose,
  onRegisterOpen,
}: ColaBottomSheetProps) {
  const [viewportHeight, setViewportHeight] = useState(800);
  const [expanded, setExpanded] = useState(false);
  const [panelY, setPanelY] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const [advanceItemId, setAdvanceItemId] = useState<number | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deleteFabOpen, setDeleteFabOpen] = useState(false);
  const [avisoEntered, setAvisoEntered] = useState(false);
  const [isColaReordering, setIsColaReordering] = useState(false);

  const panelYRef = useRef(panelY);
  const contentHeightRef = useRef(400);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const listScrollLockedRef = useRef(false);

  const contentHeight = getColaOpenHeight(viewportHeight, expanded);
  const closedPanelY = getColaPanelClosedY(contentHeight);
  contentHeightRef.current = contentHeight;
  panelYRef.current = panelY;

  const progress =
    contentHeight > 0
      ? Math.max(0, Math.min(1, 1 - panelY / contentHeight))
      : 0;
  const isSettledOpen = panelY < contentHeight * (1 - SNAP_THRESHOLD);
  const isPeekMode = panelY >= closedPanelY * PEEK_THRESHOLD;

  useEffect(() => {
    function updateViewport() {
      setViewportHeight(window.innerHeight);
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const closedY = getColaPanelClosedY(contentHeight);
    setPanelY((current) => (current < contentHeight * 0.5 ? 0 : closedY));
  }, [contentHeight]);

  useEffect(() => {
    onProgressChange?.(progress);
  }, [progress, onProgressChange]);

  const snapPanelOpen = useCallback(() => {
    setPanelY(0);
  }, []);

  const snapPanelClosed = useCallback(() => {
    setPanelY(getColaPanelClosedY(contentHeightRef.current));
    setExpanded(false);
    setDeleteFabOpen(false);
  }, []);

  useEffect(() => {
    onRegisterClose?.(snapPanelClosed);
  }, [onRegisterClose, snapPanelClosed]);

  useEffect(() => {
    onRegisterOpen?.(snapPanelOpen);
  }, [onRegisterOpen, snapPanelOpen]);

  useEffect(() => {
    if (!avisoMensaje) {
      setAvisoEntered(false);
      return;
    }

    setAvisoEntered(false);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAvisoEntered(true);
      });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [avisoMensaje]);

  const togglePanel = useCallback(() => {
    triggerHaptic();
    const height = contentHeightRef.current;

    if (panelYRef.current < height * (1 - SNAP_THRESHOLD)) {
      snapPanelClosed();
    } else {
      snapPanelOpen();
    }
  }, [snapPanelClosed, snapPanelOpen]);

  const sheetDragOptions = useMemo(
    () => ({
      axis: "y" as const,
      filterTaps: false,
      pointer: { touch: true as const },
    }),
    [],
  );

  const sheetDragHandler = useCallback(
  ({
    movement: [, my],
    last,
    first,
    memo,
    tap,
  }: {
    movement: [number, number];
    last: boolean;
    first: boolean;
    memo?: unknown;
    tap?: boolean;
    cancel?: () => void;
  }) => {
    const height = contentHeightRef.current;
    const closedY = getColaPanelClosedY(height);
    const startY = first ? panelYRef.current : (memo as number);

    if (last && (tap || Math.abs(my) < TAP_MOVE_THRESHOLD_PX)) {
      togglePanel();
      return startY;
    }

    const next = clamp(startY + my, 0, closedY);
    setPanelY(next);
    setIsDragging(!last);

    if (last) {
      const dragProgress = 1 - next / height;
      if (dragProgress >= SNAP_THRESHOLD) {
        snapPanelOpen();
      } else {
        snapPanelClosed();
      }
    }

    return startY;
  },
  [snapPanelClosed, snapPanelOpen, togglePanel],
  );

  const listPanelDragHandler = useCallback(
    (state: {
      movement: [number, number];
      last: boolean;
      first: boolean;
      memo?: unknown;
      tap?: boolean;
    }) => {
      const height = contentHeightRef.current;
      const isOpen = panelYRef.current < height * (1 - SNAP_THRESHOLD);

      if (!isOpen) {
        listScrollLockedRef.current = false;
        return panelYRef.current;
      }

      if (state.first) {
        listScrollLockedRef.current =
          (listScrollRef.current?.scrollTop ?? 0) > 0;
      }

      if (listScrollLockedRef.current) {
        return state.first ? panelYRef.current : (state.memo as number);
      }

      return sheetDragHandler(state);
    },
    [sheetDragHandler],
  );

  const bindBarDrag = useDrag(sheetDragHandler, sheetDragOptions);
  const bindPanelDrag = useDrag(sheetDragHandler, sheetDragOptions);

  useDrag(listPanelDragHandler, {
    ...sheetDragOptions,
    target: listScrollRef,
    eventOptions: { passive: false },
  });

  function handleToggleExpand() {
    triggerHaptic();
    setExpanded((prev) => !prev);
  }

  async function handleDragEnd(result: DropResult) {
    const updates = buildReorderUpdates(items, result);

    if (!updates) {
      return;
    }

    const supabase = createClient();
    await persistColaOrden(supabase, updates);
    await onColaChange();
  }

  async function handleDeleteItem(itemId: number) {
    const confirmed = window.confirm(
      "¿Eliminar esta canción de la cola?",
    );

    if (!confirmed) {
      return;
    }

    const supabase = createClient();
    await deleteColaItem(supabase, itemId);
    await onColaChange();
  }

  async function handleConfirmAdvance() {
    if (advanceItemId === null) {
      return;
    }

    const supabase = createClient();
    await avanzarCancion(supabase, salaId, advanceItemId);
    setAdvanceItemId(null);
    await onColaChange();
  }

  async function handleConfirmDeleteAll() {
    const supabase = createClient();
    await deleteColaCompleta(supabase, salaId);
    setShowDeleteAllDialog(false);
    await onColaChange();
  }

  async function handleFinalize() {
    triggerHaptic();
    const supabase = createClient();
    await finalizarCancionActiva(supabase, salaId);
    await onColaChange();
  }

  const pendientes = items.filter((item) => item.estado === "pendiente").length;
  const proximaNombre =
    items.find((item) => item.estado === "pendiente")?.nombre ?? null;

  const panelTransition = isDragging
    ? "none"
    : "transform 350ms cubic-bezier(0.32, 0.72, 0, 1)";

  function renderColaDraggableRow(
    item: ColaItem,
    index: number,
    draggableProvided: DraggableProvided,
    snapshot: DraggableStateSnapshot,
  ) {
    const isPendiente = item.estado === "pendiente";
    const isDraggingVisual =
      snapshot.isDragging && !snapshot.isDropAnimating;

    return (
      <div
        ref={draggableProvided.innerRef}
        {...draggableProvided.draggableProps}
        {...(isPendiente ? draggableProvided.dragHandleProps : {})}
        className={
          isPendiente
            ? "cola-draggable-item cursor-grab active:cursor-grabbing"
            : undefined
        }
        onContextMenu={
          isPendiente ? (event) => event.preventDefault() : undefined
        }
      >
        <div
          className={
            isDraggingVisual
              ? "cola-drag-surface cola-drag-surface--active"
              : "cola-drag-surface"
          }
        >
          <ColaItemCard
            item={item}
            items={items}
            index={index}
            isDragging={isDraggingVisual}
            yaGuardada={guardadasKeys.has(
              buildGuardadaKey(item.nombre, item.url_letra),
            )}
            onDelete={(itemId) => void handleDeleteItem(itemId)}
            onSelect={(itemId) => setAdvanceItemId(itemId)}
            onFinalize={() => void handleFinalize()}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`fixed left-1.5 right-1.5 z-20 flex flex-col overflow-hidden rounded-t-2xl ${
          isPeekMode && !isDragging
            ? "pointer-events-none shadow-none"
            : "shadow-[0_-6px_28px_rgba(0,0,0,0.45)]"
        }`}
        style={{
          bottom: COLA_BAR_HEIGHT_PX,
          height: contentHeight,
          transform: `translateY(${panelY}px)`,
          transition: panelTransition,
          visibility: isPeekMode && !isDragging ? "hidden" : "visible",
        }}
        aria-hidden={isPeekMode && !isDragging}
      >
        {deleteFabOpen && (
          <button
            type="button"
            aria-label="Cerrar menú de borrado"
            className="absolute inset-0 z-10 rounded-t-2xl bg-black/50"
            onClick={() => setDeleteFabOpen(false)}
          />
        )}

        <div
          {...bindPanelDrag()}
          className="relative z-20 shrink-0 touch-none border-b border-border bg-bg-cola-sheet"
        >
          <button
            type="button"
            onClick={handleToggleExpand}
            aria-label={expanded ? "Contraer cola" : "Expandir cola"}
            className="flex w-full shrink-0 justify-center py-2"
          >
            <div className="h-1 w-10 rounded-full bg-cola-sheet-pill" />
          </button>

          <div className="relative flex shrink-0 items-center px-4 pb-3">
            <div className="size-8 shrink-0" aria-hidden="true" />

            <h2 className="min-w-0 flex-1 text-center text-lg font-bold text-text-primary">
              Fila de canciones
            </h2>

            <div className="relative z-30 shrink-0">
              <TapButton
                type="button"
                aria-label="Borrar toda la lista"
                aria-expanded={deleteFabOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleteFabOpen((open) => !open);
                }}
                className="flex size-8 items-center justify-center rounded-full bg-cola-sheet-pill text-text-secondary"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </TapButton>

              {deleteFabOpen && (
                <TapButton
                  type="button"
                  aria-label="Confirmar borrar toda la lista"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteFabOpen(false);
                    setShowDeleteAllDialog(true);
                  }}
                  className="absolute right-0 top-[calc(100%+0.5rem)] whitespace-nowrap rounded-full bg-[#d94a3d] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(0,0,0,0.38)]"
                >
                  Borrar toda la lista
                </TapButton>
              )}
            </div>
          </div>
        </div>

        <div
          className={`relative flex min-h-0 flex-1 flex-col bg-bg-cola-list ${
            isColaReordering ? "cola-dnd-active" : ""
          }`}
        >
          <DragDropContext
            onDragStart={() => setIsColaReordering(true)}
            onDragEnd={(result) => {
              setIsColaReordering(false);
              void handleDragEnd(result);
            }}
          >
            <Droppable
              droppableId="cola-juntada"
              getContainerForClone={() => document.body}
              renderClone={(provided, snapshot, rubric) => {
                const item = items.find(
                  (colaItem) => String(colaItem.id) === rubric.draggableId,
                );

                if (!item) {
                  return null;
                }

                return renderColaDraggableRow(
                  item,
                  rubric.source.index,
                  provided,
                  snapshot,
                );
              }}
            >
              {(provided) => (
                <div
                  ref={(node) => {
                    provided.innerRef(node);
                    listScrollRef.current = node;
                  }}
                  {...provided.droppableProps}
                  className="min-h-0 flex-1 touch-pan-y space-y-2 overflow-y-auto overscroll-none px-3 py-3"
                >
                {items.length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-muted">
                    La cola está vacía
                  </p>
                ) : (
                  items.map((item, index) => (
                    <Draggable
                      key={item.id}
                      draggableId={String(item.id)}
                      index={index}
                      isDragDisabled={item.estado !== "pendiente"}
                    >
                      {(draggableProvided, snapshot) =>
                        renderColaDraggableRow(
                          item,
                          index,
                          draggableProvided,
                          snapshot,
                        )
                      }
                    </Draggable>
                  ))
                )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div
            className="cola-list-fade-bottom pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-36"
            aria-hidden="true"
          />
        </div>
      </div>

      <div
        {...bindBarDrag()}
        role="button"
        tabIndex={0}
        aria-expanded={isSettledOpen}
        aria-label={isSettledOpen ? "Cerrar cola" : "Abrir cola"}
        className="fixed inset-x-0 bottom-0 z-30 flex touch-none flex-col overflow-hidden border-t border-border/60 bg-bg-cola-sheet"
        style={{ height: COLA_BAR_HEIGHT_PX }}
      >
        {isPeekMode && (
          <div className="pointer-events-none flex shrink-0 justify-center pt-1.5 pb-0.5">
            <div className="h-1 w-10 rounded-full bg-cola-sheet-pill" />
          </div>
        )}

        <div
          className={`flex min-h-0 flex-1 items-center gap-2 px-4 ${
            isPeekMode ? "pb-1.5" : "py-2"
          }`}
        >
          <span className="shrink-0 text-sm font-semibold text-text-primary">
            En fila
          </span>
          <span
            className={`flex shrink-0 items-center justify-center rounded-full bg-cola-badge-bg font-bold text-bg-darker ${
              isPeekMode ? "size-5 text-[10px]" : "size-7 text-[11px]"
            }`}
          >
            {pendientes}
          </span>
          {isPeekMode ? (
            <>
              <span className="pointer-events-none min-w-0 flex-1 truncate text-sm text-text-secondary">
                Próxima: {proximaNombre ?? "—"}
              </span>
              <AddButton
                ariaLabel="Agregar canción"
                size="xs"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenBuscador();
                }}
              />
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1" aria-hidden="true" />
              <AddButton
                ariaLabel="Agregar canción"
                size="bar"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenBuscador();
                }}
              />
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={advanceItemId !== null}
        message="¿Querés cambiar la canción? Todos en la sala van a ver la nueva letra."
        onCancel={() => setAdvanceItemId(null)}
        onConfirm={() => void handleConfirmAdvance()}
      />

      <DoubleConfirmDialog
        open={showDeleteAllDialog}
        step1Message="¿Querés borrar toda la cola?"
        step2Message="¿Estás seguro? Esta acción no se puede deshacer."
        onCancel={() => setShowDeleteAllDialog(false)}
        onConfirm={() => void handleConfirmDeleteAll()}
      />

      {avisoMensaje && (
        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-none fixed left-1/2 z-40 w-fit max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-[10px] border border-accent/30 bg-bg-cola-aviso px-3.5 py-2 text-center text-sm font-semibold whitespace-nowrap text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.38)] transition-[opacity,transform] duration-300 ease-out ${
            avisoEntered ? "opacity-100" : "translate-y-2 opacity-0"
          }`}
          style={{ bottom: COLA_BAR_HEIGHT_PX + 72 }}
        >
          {avisoMensaje}
        </div>
      )}
    </>
  );
}
