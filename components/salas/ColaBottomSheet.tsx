"use client";

import ColaBarSiguientePreview from "@/components/salas/ColaBarSiguientePreview";
import ColaItemCard from "@/components/salas/ColaItem";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DoubleConfirmDialog from "@/components/ui/DoubleConfirmDialog";
import AddButton, { COLA_ADD_BUTTON_SIZE } from "@/components/ui/AddButton";
import { TapButton } from "@/components/ui/TapFeedback";
import { resolverNombreArtistaDisplay } from "@/lib/buscador";
import {
  avanzarCancion,
  applyColaReorder,
  buildReorderUpdates,
  deleteColaCompleta,
  deleteColaItem,
  finalizarCancionActiva,
  persistColaOrden,
} from "@/lib/cola-logic";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useColaRollerDistances } from "@/hooks/useColaRollerDistances";
import {
  estimateColaCenterDistance,
  getColaFocalRowIndex,
} from "@/lib/cola-roller";
import { triggerHaptic } from "@/lib/haptic";
import {
  COLA_BAR_CONTROLS_BOTTOM_PADDING,
  COLA_BAR_HEIGHT_PX,
  COLA_BAR_STACK_OFFSET_CSS,
  COLA_BAR_TOTAL_HEIGHT_CSS,
  COLA_SHEET_HORIZONTAL_STYLE,
  getColaPanelOpenHeightCss,
  COLA_FINALIZE_BUTTON_MS,
  getColaOpenHeight,
  getColaPanelClosedY,
} from "@/lib/sala-layout";
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
  type TransitionEvent,
} from "react";

/** Fracción del recorrido (dedo o posición) para abrir/cerrar del todo; debajo vuelve al inicio. */
const SNAP_THRESHOLD = 0.2;
const PEEK_THRESHOLD = 0.92;
const TAP_MOVE_THRESHOLD_PX = 12;
const COLA_DRAG_LONG_PRESS_MS = 500;

type ColaBottomSheetProps = {
  items: ColaItem[];
  salaId: number;
  onColaChange: () => Promise<void>;
  onItemsReordered: (items: ColaItem[]) => void;
  onOpenBuscador: () => void;
  avisoMensaje?: string | null;
  onProgressChange?: (progress: number) => void;
  onRegisterClose?: (close: () => void) => void;
  onRegisterOpen?: (open: () => void) => void;
  onSettledOpenChange?: (open: boolean) => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getInitialClosedPanelY(viewportHeight: number): number {
  return getColaPanelClosedY(getColaOpenHeight(viewportHeight, false));
}

function isBarInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest("button, a, [role='button'], input, textarea, select"),
    )
  );
}

type ListDragMemo =
  | { kind: "undecided"; startY: number; startScrollTop: number }
  | { kind: "sheet"; startY: number }
  | { kind: "scroll"; startScrollTop: number }
  | { kind: "reorder" };

export default function ColaBottomSheet({
  items,
  salaId,
  onColaChange,
  onItemsReordered,
  onOpenBuscador,
  avisoMensaje = null,
  onProgressChange,
  onRegisterClose,
  onRegisterOpen,
  onSettledOpenChange,
}: ColaBottomSheetProps) {
  const [viewportHeight, setViewportHeight] = useState(800);
  const [expanded, setExpanded] = useState(false);
  const [panelY, setPanelY] = useState(() => getInitialClosedPanelY(800));
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [advanceItemId, setAdvanceItemId] = useState<number | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [deleteFabOpen, setDeleteFabOpen] = useState(false);
  const [avisoEntered, setAvisoEntered] = useState(false);
  const [isColaReordering, setIsColaReordering] = useState(false);
  const [dragReadyId, setDragReadyId] = useState<number | null>(null);

  const panelYRef = useRef(panelY);
  const dragReadyIdRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressItemRef = useRef<number | null>(null);
  const contentHeightRef = useRef(400);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const isColaReorderingRef = useRef(false);

  const contentHeight = getColaOpenHeight(viewportHeight, expanded);
  const closedPanelY = getColaPanelClosedY(contentHeight);
  contentHeightRef.current = contentHeight;
  panelYRef.current = panelY;
  dragReadyIdRef.current = dragReadyId;

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
    setIsSnapping(false);
  }, [contentHeight]);

  useEffect(() => {
    onProgressChange?.(progress);
  }, [progress, onProgressChange]);

  useEffect(() => {
    onSettledOpenChange?.(isSettledOpen);
  }, [isSettledOpen, onSettledOpenChange]);

  const snapPanelOpen = useCallback(() => {
    if (panelYRef.current === 0) {
      setIsSnapping(false);
      setPanelY(0);
      return;
    }

    setIsSnapping(true);
    setPanelY(0);
  }, []);

  const snapPanelClosed = useCallback(() => {
    const closedY = getColaPanelClosedY(contentHeightRef.current);

    if (panelYRef.current >= closedY * PEEK_THRESHOLD) {
      setIsSnapping(false);
      setPanelY(closedY);
      setExpanded(false);
      setDeleteFabOpen(false);
      return;
    }

    setIsSnapping(true);
    setPanelY(closedY);
    setExpanded(false);
    setDeleteFabOpen(false);
  }, []);

  useEffect(() => {
    if (!isSnapping) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSnapping(false);
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isSnapping, panelY]);

  useHardwareBack(isSettledOpen, () => {
    if (showDeleteAllDialog) {
      setShowDeleteAllDialog(false);
      return;
    }

    if (deleteItemId !== null) {
      setDeleteItemId(null);
      return;
    }

    if (advanceItemId !== null) {
      setAdvanceItemId(null);
      return;
    }

    if (deleteFabOpen) {
      setDeleteFabOpen(false);
      return;
    }

    snapPanelClosed();
  });

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
      filterTaps: true,
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

    const startedOpen = startY < height * (1 - SNAP_THRESHOLD);

    if (last && (tap || Math.abs(my) < TAP_MOVE_THRESHOLD_PX)) {
      if (startedOpen) {
        snapPanelOpen();
      } else {
        snapPanelClosed();
      }
      return startY;
    }

    const next = clamp(startY + my, 0, closedY);
    setPanelY(next);
    setIsDragging(!last);

    if (last) {
      const dragCommitPx = closedY * SNAP_THRESHOLD;

      if (my <= -dragCommitPx) {
        snapPanelOpen();
      } else if (my >= dragCommitPx) {
        snapPanelClosed();
      } else if (startedOpen) {
        snapPanelOpen();
      } else {
        snapPanelClosed();
      }
    }

    return startY;
  },
  [snapPanelClosed, snapPanelOpen],
  );

  const listPanelDragHandler = useCallback(
    (state: {
      movement: [number, number];
      last: boolean;
      first: boolean;
      memo?: unknown;
      tap?: boolean;
      event?: Event;
      cancel?: () => void;
    }) => {
      const height = contentHeightRef.current;
      const isOpen = panelYRef.current < height * (1 - SNAP_THRESHOLD);

      if (!isOpen) {
        return panelYRef.current;
      }

      if (isColaReorderingRef.current) {
        if (state.first) {
          state.cancel?.();
        }

        return { kind: "reorder" as const };
      }

      const scrollEl = listScrollRef.current;
      const scrollTop = scrollEl?.scrollTop ?? 0;
      const maxScroll = scrollEl
        ? Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
        : 0;
      const [, my] = state.movement;

      if (state.first) {
        const readyId = dragReadyIdRef.current;

        if (readyId !== null) {
          const target = state.event?.target;

          if (
            target instanceof Element &&
            target.closest(`[data-cola-id="${readyId}"]`)
          ) {
            state.cancel?.();
            return { kind: "reorder" as const };
          }
        }

        if (scrollTop > 0) {
          return { kind: "scroll" as const, startScrollTop: scrollTop };
        }

        return {
          kind: "undecided" as const,
          startY: panelYRef.current,
          startScrollTop: scrollTop,
        };
      }

      const memo = state.memo as ListDragMemo | undefined;

      if (memo?.kind === "reorder") {
        return memo;
      }

      if (memo?.kind === "scroll") {
        if (scrollEl) {
          scrollEl.scrollTop = clamp(memo.startScrollTop - my, 0, maxScroll);
        }

        return memo;
      }

      if (memo?.kind === "sheet") {
        sheetDragHandler({
          ...state,
          memo: memo.startY,
          first: false,
        });

        return memo;
      }

      if (memo?.kind === "undecided") {
        if (Math.abs(my) < TAP_MOVE_THRESHOLD_PX) {
          return memo;
        }

        if (dragReadyIdRef.current !== null) {
          state.cancel?.();
          return { kind: "reorder" as const };
        }

        if (my < 0) {
          if (scrollEl) {
            scrollEl.scrollTop = clamp(memo.startScrollTop - my, 0, maxScroll);
          }

          return {
            kind: "scroll" as const,
            startScrollTop: memo.startScrollTop,
          };
        }

        const sheetMemo = { kind: "sheet" as const, startY: memo.startY };

        sheetDragHandler({
          ...state,
          memo: memo.startY,
          first: false,
        });

        return sheetMemo;
      }

      return panelYRef.current;
    },
    [sheetDragHandler],
  );

  const barDragHandler = useCallback(
    (state: {
      movement: [number, number];
      last: boolean;
      first: boolean;
      memo?: unknown;
      tap?: boolean;
      event?: Event;
    }) => {
      const [, my] = state.movement;

      if (
        state.last &&
        (state.tap || Math.abs(my) < TAP_MOVE_THRESHOLD_PX) &&
        isBarInteractiveTarget(state.event?.target ?? null)
      ) {
        return state.first ? panelYRef.current : (state.memo as number);
      }

      return sheetDragHandler(state);
    },
    [sheetDragHandler],
  );

  const panelDragHandler = useCallback(
    (state: {
      movement: [number, number];
      last: boolean;
      first: boolean;
      memo?: unknown;
      tap?: boolean;
      event?: Event;
    }) => {
      const [, my] = state.movement;

      if (
        state.last &&
        (state.tap || Math.abs(my) < TAP_MOVE_THRESHOLD_PX) &&
        isBarInteractiveTarget(state.event?.target ?? null)
      ) {
        return state.first ? panelYRef.current : (state.memo as number);
      }

      return sheetDragHandler(state);
    },
    [sheetDragHandler],
  );

  const bindBarDrag = useDrag(barDragHandler, sheetDragOptions);
  const bindPanelDrag = useDrag(panelDragHandler, sheetDragOptions);

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
    const reordered = applyColaReorder(items, result);

    if (!reordered) {
      return;
    }

    onItemsReordered(reordered);

    const updates = buildReorderUpdates(items, result);

    if (!updates) {
      return;
    }

    const supabase = createClient();
    await persistColaOrden(supabase, updates);
    await onColaChange();
  }

  async function handleConfirmDeleteItem() {
    if (deleteItemId === null) {
      return;
    }

    const supabase = createClient();
    await deleteColaItem(supabase, deleteItemId);
    setDeleteItemId(null);
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
    await new Promise((resolve) =>
      setTimeout(resolve, COLA_FINALIZE_BUTTON_MS),
    );

    const supabase = createClient();
    await finalizarCancionActiva(supabase, salaId);
    await onColaChange();
    snapPanelClosed();
  }

  const pendientes = items.filter((item) => item.estado === "pendiente").length;
  const activaItem = items.find((item) => item.estado === "activa");
  const proximaItem = items.find((item) => item.estado === "pendiente");
  const proximaDisplay = proximaItem
    ? resolverNombreArtistaDisplay(proximaItem.nombre, proximaItem.artista)
    : null;

  const panelTransition = isDragging
    ? "none"
    : "transform 350ms cubic-bezier(0.32, 0.72, 0, 1)";
  const panelTranslateY = panelY > 0 ? panelY : 0;
  const isMostlyClosed = panelY >= contentHeight * (1 - SNAP_THRESHOLD);
  /** Misma geometría del panel abierto mientras arrastrás o animás (evita saltos al cruzar el umbral). */
  const panelUsesOpenLayout = isDragging || isSnapping || !isMostlyClosed;
  /** Barra colapsada: persiste todo el arrastre (no desmontar bajo el dedo); oculta al abrir en reposo. */
  const showPeekBar =
    contentHeight > 0 &&
    (isDragging || (!isSnapping && isMostlyClosed && !isSettledOpen));
  const panelHidden = isPeekMode && !isDragging && !isSnapping;

  const activeIndex = items.findIndex((item) => item.estado === "activa");
  const rollerRefreshKey = `${items.length}-${isSettledOpen}-${expanded}-${activeIndex}`;
  const {
    distances: rollerDistances,
    setRowRef: setRollerRowRef,
    scheduleUpdate: scheduleRollerUpdate,
    useViewportScaleOnly: rollerUseViewportScaleOnly,
  } = useColaRollerDistances(
    items.length,
    activeIndex,
    listScrollRef,
    rollerRefreshKey,
  );

  const focalRowIndex = useMemo(
    () => getColaFocalRowIndex(rollerDistances, items.length, activeIndex),
    [rollerDistances, items.length, activeIndex],
  );

  useEffect(() => {
    if (isSettledOpen) {
      scheduleRollerUpdate();
    }
  }, [isSettledOpen, isSnapping, items, scheduleRollerUpdate]);

  function handlePanelTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.propertyName !== "transform" || event.target !== event.currentTarget) {
      return;
    }

    setIsSnapping(false);
    scheduleRollerUpdate();
  }

  function clearColaLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    longPressItemRef.current = null;
  }

  function handleColaRowPointerDown(itemId: number) {
    clearColaLongPress();
    longPressItemRef.current = itemId;
    longPressTimerRef.current = setTimeout(() => {
      setDragReadyId(itemId);
      triggerHaptic();
      longPressTimerRef.current = null;
    }, COLA_DRAG_LONG_PRESS_MS);
  }

  function handleColaRowPointerEnd(itemId: number) {
    if (longPressTimerRef.current) {
      clearColaLongPress();
      return;
    }

    if (dragReadyId === itemId && !isColaReorderingRef.current) {
      setDragReadyId(null);
    }
  }

  function renderColaDraggableRow(
    item: ColaItem,
    index: number,
    draggableProvided: DraggableProvided,
    snapshot: DraggableStateSnapshot,
  ) {
    const isPendiente = item.estado === "pendiente";
    const isDraggingVisual =
      snapshot.isDragging && !snapshot.isDropAnimating;

    const dragHabilitado = isPendiente && dragReadyId === item.id;

    return (
      <div
        ref={(node) => {
          draggableProvided.innerRef(node);
          setRollerRowRef(index, node);
        }}
        {...draggableProvided.draggableProps}
        {...(isPendiente ? draggableProvided.dragHandleProps : {})}
        data-cola-id={item.id}
        className={
          isPendiente
            ? `cola-draggable-item${
                dragHabilitado ? " cola-draggable-item--reorder-ready" : ""
              } ${dragHabilitado ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`
            : undefined
        }
        onPointerDown={
          isPendiente ? () => handleColaRowPointerDown(item.id) : undefined
        }
        onPointerUp={
          isPendiente ? () => handleColaRowPointerEnd(item.id) : undefined
        }
        onPointerCancel={
          isPendiente ? () => handleColaRowPointerEnd(item.id) : undefined
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
            centerDistance={
              rollerDistances[index] ?? estimateColaCenterDistance(items, index)
            }
            isFocalRow={index === focalRowIndex}
            useViewportScaleOnly={rollerUseViewportScaleOnly}
            isDragging={isDraggingVisual}
            onDelete={setDeleteItemId}
            onSelect={(itemId) => setAdvanceItemId(itemId)}
            onFinalize={() => void handleFinalize()}
          />
        </div>
      </div>
    );
  }

  function handleOpenBuscador() {
    onOpenBuscador();
  }

  function handleTogglePanelClick() {
    togglePanel();
  }

  return (
    <>
      <div
        onTransitionEnd={handlePanelTransitionEnd}
        className={`fixed z-20 flex flex-col overflow-hidden rounded-t-2xl ${
          panelHidden
            ? "pointer-events-none shadow-none"
            : "shadow-[0_-6px_28px_rgba(0,0,0,0.45)]"
        }`}
        style={{
          ...COLA_SHEET_HORIZONTAL_STYLE,
          bottom: panelUsesOpenLayout ? 0 : COLA_BAR_STACK_OFFSET_CSS,
          height: panelUsesOpenLayout
            ? getColaPanelOpenHeightCss(contentHeight)
            : contentHeight,
          transform: !isColaReordering
            ? `translateY(${panelTranslateY}px)`
            : undefined,
          transition: panelTransition,
          visibility: panelHidden ? "hidden" : "visible",
        }}
        aria-hidden={panelHidden}
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
          data-no-tap-feedback
          className="relative z-20 shrink-0 touch-none select-none border-b border-border bg-bg-cola-sheet"
        >
          <div className="flex flex-col px-4 pt-1.5 pb-3">
            <div className="flex shrink-0 justify-center pb-2">
              <TapButton
                type="button"
                onClick={handleToggleExpand}
                aria-label={expanded ? "Contraer cola" : "Expandir cola"}
                className="flex items-center justify-center rounded-full px-4 py-1"
              >
                <div
                  className="h-1 w-10 rounded-full bg-cola-sheet-pill"
                  aria-hidden="true"
                />
              </TapButton>
            </div>

            <div className="relative flex shrink-0 items-center gap-2">
              <div className="relative z-30 flex size-9 shrink-0 items-center justify-center">
                <TapButton
                  type="button"
                  aria-label="Borrar toda la lista"
                  aria-expanded={deleteFabOpen}
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteFabOpen((open) => !open);
                  }}
                  className="flex size-7 items-center justify-center rounded-full text-text-muted/50 active:text-text-secondary"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
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
                    className="absolute left-0 top-[calc(100%+0.5rem)] whitespace-nowrap rounded-full bg-[#d94a3d] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(0,0,0,0.38)]"
                  >
                    Borrar toda la lista
                  </TapButton>
                )}
              </div>

              <h2 className="min-w-0 flex-1 text-center text-lg font-bold text-text-primary">
                Fila de canciones
              </h2>

              <AddButton
                ariaLabel="Agregar canción"
                size={COLA_ADD_BUTTON_SIZE}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={handleOpenBuscador}
              />
            </div>
          </div>
        </div>

        <div
          className={`relative flex min-h-0 flex-1 flex-col bg-bg-cola-list ${
            isColaReordering ? "cola-dnd-active" : ""
          }`}
        >
          <DragDropContext
            onDragStart={() => {
              isColaReorderingRef.current = true;
              setIsColaReordering(true);
            }}
            onDragEnd={(result) => {
              isColaReorderingRef.current = false;
              setIsColaReordering(false);
              setDragReadyId(null);
              clearColaLongPress();
              void handleDragEnd(result);
            }}
          >
            <Droppable droppableId="cola-juntada">
              {(provided) => (
                <div
                  ref={(node) => {
                    provided.innerRef(node);
                    listScrollRef.current = node;
                  }}
                  {...provided.droppableProps}
                  className="cola-list-roller min-h-0 flex-1 touch-pan-y space-y-2 overflow-x-visible overflow-y-auto overscroll-none px-3 py-3"
                  style={
                    !showPeekBar
                      ? { paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }
                      : undefined
                  }
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
                      isDragDisabled={
                        item.estado !== "pendiente" || dragReadyId !== item.id
                      }
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
        </div>
      </div>

      {showPeekBar && (
        <div
          {...bindBarDrag()}
          data-no-tap-feedback
          role="group"
          aria-roledescription="sheet"
          aria-expanded={false}
          aria-label="Cola de canciones. Deslizá hacia arriba para abrir."
          className="fixed bottom-0 z-30 flex touch-none flex-col overflow-hidden rounded-t-2xl bg-bg-cola-sheet"
          style={{
            ...COLA_SHEET_HORIZONTAL_STYLE,
            height: COLA_BAR_TOTAL_HEIGHT_CSS,
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col px-4 pt-1.5">
            <div
              className="flex shrink-0 justify-center pb-2"
              aria-hidden="true"
            >
              <div className="h-1 w-10 rounded-full bg-cola-sheet-pill" />
            </div>

            <div className="min-h-0 flex-1" aria-hidden="true" />

            <div className="flex shrink-0 items-stretch gap-2.5 pb-2">
              <ColaBarSiguientePreview
                showSiguiente={Boolean(activaItem)}
                proximaDisplay={proximaDisplay}
                onSiguiente={() => void handleFinalize()}
              />
              <div
                className="w-px shrink-0 self-stretch bg-border/60"
                aria-hidden="true"
              />
              <div className="flex w-[4.25rem] shrink-0 flex-col items-center justify-center gap-1">
                <AddButton
                  ariaLabel="Agregar canción"
                  size={COLA_ADD_BUTTON_SIZE}
                  onClick={handleOpenBuscador}
                />
                <TapButton
                  type="button"
                  aria-label="Abrir fila de canciones"
                  onClick={handleTogglePanelClick}
                  className="flex w-full items-center justify-center rounded-full border border-border/50 bg-black/20 px-2 py-1"
                >
                  <span className="whitespace-nowrap text-xs font-semibold text-text-primary">
                    Fila{" "}
                    <span className="font-normal text-text-secondary">
                      · {pendientes}
                    </span>
                  </span>
                </TapButton>
              </div>
            </div>
          </div>

          <div
            className="shrink-0"
            style={{ height: COLA_BAR_CONTROLS_BOTTOM_PADDING }}
            aria-hidden="true"
          />
        </div>
      )}

      <ConfirmDialog
        open={advanceItemId !== null}
        message="¿Querés cambiar la canción? Todos en la sala van a ver la nueva letra."
        onCancel={() => setAdvanceItemId(null)}
        onConfirm={() => void handleConfirmAdvance()}
      />

      <DoubleConfirmDialog
        open={deleteItemId !== null}
        step1Message="¿Eliminar esta canción de la cola?"
        step2Message="¿Estás seguro? Esta acción no se puede deshacer."
        onCancel={() => setDeleteItemId(null)}
        onConfirm={() => void handleConfirmDeleteItem()}
      />

      <DoubleConfirmDialog
        open={showDeleteAllDialog}
        step1Message="¿Querés borrar TODA la fila de canciones?"
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
          style={{
            bottom: `calc(${COLA_BAR_HEIGHT_PX + 72}px + env(safe-area-inset-bottom, 0px))`,
          }}
        >
          {avisoMensaje}
        </div>
      )}
    </>
  );
}
