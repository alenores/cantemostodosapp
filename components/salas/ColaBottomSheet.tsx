"use client";

import ColaItemCard from "@/components/salas/ColaItem";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DoubleConfirmDialog from "@/components/ui/DoubleConfirmDialog";
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
import { COLA_BAR_HEIGHT_PX, getColaOpenHeight } from "@/lib/sala-layout";
import { buildGuardadaKey } from "@/lib/sala-data";
import { createClient } from "@/lib/supabase/client";
import type { ColaItem } from "@/types";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useDrag } from "@use-gesture/react";
import { ChevronUp, Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent as ReactTouchEvent,
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
  onProgressChange?: (progress: number) => void;
  onRegisterClose?: (close: () => void) => void;
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
  onProgressChange,
  onRegisterClose,
}: ColaBottomSheetProps) {
  const [viewportHeight, setViewportHeight] = useState(800);
  const [expanded, setExpanded] = useState(false);
  const [panelY, setPanelY] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const [advanceItemId, setAdvanceItemId] = useState<number | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const panelYRef = useRef(panelY);
  const contentHeightRef = useRef(400);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const contentHeight = getColaOpenHeight(viewportHeight, expanded);
  contentHeightRef.current = contentHeight;
  panelYRef.current = panelY;

  const progress = contentHeight > 0 ? 1 - panelY / contentHeight : 0;
  const isSettledOpen = panelY < contentHeight * (1 - SNAP_THRESHOLD);
  const isPeekMode = panelY >= contentHeight * PEEK_THRESHOLD;

  useEffect(() => {
    function updateViewport() {
      setViewportHeight(window.innerHeight);
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    setPanelY((current) => (current < contentHeight * 0.5 ? 0 : contentHeight));
  }, [contentHeight]);

  useEffect(() => {
    onProgressChange?.(progress);
  }, [progress, onProgressChange]);

  const snapPanelOpen = useCallback(() => {
    setPanelY(0);
  }, []);

  const snapPanelClosed = useCallback(() => {
    setPanelY(contentHeightRef.current);
    setExpanded(false);
  }, []);

  useEffect(() => {
    onRegisterClose?.(snapPanelClosed);
  }, [onRegisterClose, snapPanelClosed]);

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
    const startY = first ? panelYRef.current : (memo as number);

    if (last && (tap || Math.abs(my) < TAP_MOVE_THRESHOLD_PX)) {
      togglePanel();
      return startY;
    }

    const next = clamp(startY + my, 0, height);
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

  const listDragHandler = useCallback(
    (state: Parameters<typeof sheetDragHandler>[0]) => {
      const listEl = listScrollRef.current;

      if (listEl && listEl.scrollTop > 4) {
        state.cancel?.();
        return state.memo;
      }

      if (state.first && listEl && listEl.scrollTop > 4) {
        state.cancel?.();
        return state.memo;
      }

      return sheetDragHandler(state);
    },
    [sheetDragHandler],
  );

  const bindBarDrag = useDrag(sheetDragHandler, sheetDragOptions);
  const bindPanelDrag = useDrag(sheetDragHandler, sheetDragOptions);
  const bindListDrag = useDrag(listDragHandler, sheetDragOptions);

  function handleListTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    const listEl = listScrollRef.current;

    if (
      listEl &&
      listEl.scrollTop <= 0 &&
      panelYRef.current < contentHeightRef.current * (1 - SNAP_THRESHOLD)
    ) {
      event.preventDefault();
    }
  }

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

  return (
    <>
      <div
        className="fixed left-1.5 right-1.5 z-20 flex flex-col overflow-hidden rounded-t-2xl shadow-[0_-6px_28px_rgba(0,0,0,0.45)]"
        style={{
          bottom: COLA_BAR_HEIGHT_PX,
          height: contentHeight,
          transform: `translateY(${panelY}px)`,
          transition: panelTransition,
        }}
        aria-hidden={isPeekMode && !isDragging}
      >
        <div
          {...bindPanelDrag()}
          className="shrink-0 touch-none bg-bg-cola-sheet"
        >
          <button
            type="button"
            onClick={handleToggleExpand}
            aria-label={expanded ? "Contraer cola" : "Expandir cola"}
            className="flex w-full shrink-0 justify-center py-2"
          >
            <div className="h-1 w-10 rounded-full bg-cola-sheet-pill" />
          </button>

          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3">
            <h2 className="min-w-0 flex-1 text-base font-bold text-text-primary">
              Lista de canciones
            </h2>
            {!isPeekMode && (
              <TapButton
                aria-label="Agregar canción"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenBuscador();
                }}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent"
              >
                <Plus className="size-5 text-white" aria-hidden="true" />
              </TapButton>
            )}
          </div>
        </div>

        <div
          className="mx-3 h-px shrink-0 bg-border/70"
          aria-hidden="true"
        />

        <div className="flex min-h-0 flex-1 flex-col bg-bg-cola-list">
          <DragDropContext onDragEnd={(result) => void handleDragEnd(result)}>
            <Droppable droppableId="cola-juntada">
              {(provided) => (
                <div
                  ref={(node) => {
                    provided.innerRef(node);
                    listScrollRef.current = node;
                  }}
                  {...provided.droppableProps}
                  {...bindListDrag()}
                  onTouchMove={handleListTouchMove}
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
                      {(draggableProvided, snapshot) => (
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                        >
                          <ColaItemCard
                            item={item}
                            items={items}
                            index={index}
                            dragHandleProps={
                              item.estado === "pendiente"
                                ? draggableProvided.dragHandleProps
                                : null
                            }
                            isDragging={snapshot.isDragging}
                            yaGuardada={guardadasKeys.has(
                              buildGuardadaKey(item.nombre, item.url_letra),
                            )}
                            onDelete={(itemId) => void handleDeleteItem(itemId)}
                            onSelect={(itemId) => setAdvanceItemId(itemId)}
                            onFinalize={() => void handleFinalize()}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {!isPeekMode && (
            <div className="shrink-0 border-t border-border/40 px-3 py-2">
              <TapButton
                aria-label="Borrar toda la cola"
                onClick={() => setShowDeleteAllDialog(true)}
                className="w-full rounded-md border border-border/60 bg-bg-cola-sheet/50 py-1.5 text-[11px] font-semibold text-text-muted"
              >
                Borrar todo
              </TapButton>
            </div>
          )}
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
            Cola
          </span>
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
            {pendientes}
          </span>
          {isPeekMode ? (
            <span className="pointer-events-none min-w-0 flex-1 truncate text-sm text-text-secondary">
              Próxima: {proximaNombre ?? "—"}
            </span>
          ) : (
            <span className="min-w-0 flex-1" aria-hidden="true" />
          )}
          {isPeekMode && (
            <ChevronUp
              className="pointer-events-none size-5 shrink-0 text-text-muted"
              aria-hidden="true"
            />
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
    </>
  );
}
