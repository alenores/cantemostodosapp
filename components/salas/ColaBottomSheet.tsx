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

  useEffect(() => {
    onRegisterOpen?.(snapPanelOpen);
  }, [onRegisterOpen, snapPanelOpen]);

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

  const bindBarDrag = useDrag(sheetDragHandler, sheetDragOptions);
  const bindPanelDrag = useDrag(sheetDragHandler, sheetDragOptions);

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

          <div className="flex shrink-0 justify-center px-4 pb-3">
            <h2 className="text-center text-lg font-bold text-text-primary">
              Lista de canciones
            </h2>
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
                          {...(item.estado === "pendiente"
                            ? draggableProvided.dragHandleProps
                            : {})}
                          className={
                            item.estado === "pendiente"
                              ? "cola-draggable-item cursor-grab active:cursor-grabbing"
                              : undefined
                          }
                          onContextMenu={
                            item.estado === "pendiente"
                              ? (event) => event.preventDefault()
                              : undefined
                          }
                        >
                          <ColaItemCard
                            item={item}
                            items={items}
                            index={index}
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
              <TapButton
                aria-label="Borrar toda la cola"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowDeleteAllDialog(true);
                }}
                className="shrink-0 rounded-md border border-border/70 bg-bg-card/60 px-2.5 py-1 text-[11px] font-semibold text-text-secondary"
              >
                Borrar todo
              </TapButton>
              <AddButton
                ariaLabel="Agregar canción"
                size="xs"
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
          className="pointer-events-none fixed inset-x-4 z-40 mx-auto max-w-sm rounded-[12px] border border-accent/40 bg-bg-card px-4 py-3 text-center text-sm font-semibold text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
          style={{ bottom: COLA_BAR_HEIGHT_PX + 12 }}
        >
          {avisoMensaje}
        </div>
      )}
    </>
  );
}
