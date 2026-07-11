"use client";

import ColaJuntadaItem, {
  type ColaJuntadaItemVariant,
} from "@/components/salas/ColaJuntadaItem";
import ColaPanelHeader from "@/components/salas/ColaPanelHeader";
import DoubleConfirmDialog from "@/components/ui/DoubleConfirmDialog";
import { useColaSidePanel } from "@/hooks/useColaSidePanel";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { usePremiumCancioneroIds } from "@/hooks/usePremiumCancioneroIds";
import type { ColaIndividualRow } from "@/hooks/useColaIndividual";
import { triggerHaptic } from "@/lib/haptic";
import { isColaItemPremium } from "@/lib/buscador";
import {
  COLA_DELETE_ALL_STEP1,
  COLA_DELETE_ALL_STEP2,
  COLA_PANEL_ARIA_LABEL,
  COLA_PANEL_EMPTY_MESSAGE,
  COLA_SIDE_PANEL_CLASS,
} from "@/lib/cola-ui";
import {
  COLA_FINALIZE_BUTTON_MS,
  COLA_MODAL_HORIZONTAL_INSET_PX,
  COLA_MODAL_TOP_INSET_PX,
  COLA_SHEET_EXIT_MS,
  getColaModalBottomCss,
} from "@/lib/sala-layout";
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

const COLA_MODAL_LAYER_Z = 100;
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

function getIndividualVariant(
  item: ColaIndividualRow,
  items: ColaIndividualRow[],
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
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center">
      <div
        ref={setNodeRef}
        className={`pointer-events-auto flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition-[transform,background-color,border-color,color] duration-150 ${
          active
            ? "scale-105 border-red-500 bg-red-500 text-white"
            : "border-red-500/45 bg-bg-card text-red-400"
        }`}
      >
        <span>Eliminar</span>
      </div>
    </div>
  );
}

type ColaIndividualSheetProps = {
  items: ColaIndividualRow[];
  onOpenBuscador: () => void;
  presentacionOculta?: boolean;
  onRequestOpen?: (open: () => void) => void;
  onRequestSiguiente?: (siguiente: () => void) => void;
  onSiguiente: () => Promise<void>;
  onDeleteAll: () => Promise<void>;
  onDeleteItem: (id: number) => Promise<void>;
  onVolverAPendiente: (id: number) => Promise<void>;
  onReorder: (activeId: number, overId: number) => Promise<void>;
};

type SortableRowProps = {
  item: ColaIndividualRow;
  items: ColaIndividualRow[];
  listIndex: number;
  nombreRevealGeneration: number;
  premiumIds: ReadonlySet<number>;
};

function SortableColaIndividualRow({
  item,
  items,
  listIndex,
  nombreRevealGeneration,
  premiumIds,
}: SortableRowProps) {
  const variant = getIndividualVariant(item, items);
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
    attributes: { tabIndex: -1, role: "listitem" },
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
      premium={isColaItemPremium(item, premiumIds)}
      showAgregadoAvatar={false}
      nombreRevealGeneration={nombreRevealGeneration}
      nombreRevealIndex={listIndex}
      dragHandleProps={{ ...attributes, ...listeners, style: dragStyle }}
    />
  );
}

export default function ColaIndividualSheet({
  items,
  onOpenBuscador,
  presentacionOculta = false,
  onRequestOpen,
  onRequestSiguiente,
  onSiguiente,
  onDeleteAll,
  onDeleteItem,
  onVolverAPendiente,
  onReorder,
}: ColaIndividualSheetProps) {
  const premiumIds = usePremiumCancioneroIds();
  const colaSidePanelMode = useColaSidePanel() && !presentacionOculta;
  const [abierto, setAbierto] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetExiting, setSheetExiting] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [dragOverDelete, setDragOverDelete] = useState(false);
  const [nombreRevealGeneration, setNombreRevealGeneration] = useState(0);
  const sheetCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.orden - b.orden),
    [items],
  );

  const tocadas = useMemo(
    () => sortedItems.filter((item) => item.estado === "tocada"),
    [sortedItems],
  );

  const activaItem = useMemo(
    () => sortedItems.find((item) => item.estado === "activa") ?? null,
    [sortedItems],
  );

  const pendientes = useMemo(
    () => sortedItems.filter((item) => item.estado === "pendiente"),
    [sortedItems],
  );

  const pendientesIds = useMemo(
    () => pendientes.map((item) => item.id),
    [pendientes],
  );

  const pendientesCount = pendientes.length;

  const activeDragItem = useMemo(
    () =>
      activeDragId === null
        ? null
        : (pendientes.find((item) => item.id === activeDragId) ?? null),
    [activeDragId, pendientes],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 500, tolerance: 5 },
    }),
  );

  const openCola = useCallback(() => {
    if (sheetCloseTimerRef.current) {
      clearTimeout(sheetCloseTimerRef.current);
      sheetCloseTimerRef.current = null;
    }

    triggerHaptic();
    setSheetExiting(false);
    setSheetVisible(true);
    setAbierto(true);
  }, []);

  const closeCola = useCallback(() => {
    if (colaSidePanelMode) {
      return;
    }

    if (!sheetVisible || sheetExiting) {
      return;
    }

    setAbierto(false);
    setSheetExiting(true);

    sheetCloseTimerRef.current = setTimeout(() => {
      setSheetVisible(false);
      setSheetExiting(false);
      sheetCloseTimerRef.current = null;
    }, COLA_SHEET_EXIT_MS);
  }, [colaSidePanelMode, sheetExiting, sheetVisible]);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (sheetCloseTimerRef.current) {
        clearTimeout(sheetCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    onRequestOpen?.(openCola);
  }, [onRequestOpen, openCola]);

  useHardwareBack(sheetVisible && !sheetExiting && !colaSidePanelMode, () => {
    if (showDeleteAllDialog) {
      setShowDeleteAllDialog(false);
      return;
    }

    closeCola();
  });

  function handleOpenBuscador() {
    if (!colaSidePanelMode) {
      closeCola();
    }
    onOpenBuscador();
  }

  async function handleSiguiente() {
    if (pendientesCount === 0) {
      return;
    }

    if (!colaSidePanelMode) {
      closeCola();
    }
    triggerHaptic();
    if (!colaSidePanelMode) {
      await new Promise((resolve) =>
        setTimeout(resolve, COLA_FINALIZE_BUTTON_MS),
      );
    }
    await onSiguiente();
  }

  const handleSiguienteRef = useRef(handleSiguiente);
  handleSiguienteRef.current = handleSiguiente;

  useEffect(() => {
    onRequestSiguiente?.(() => void handleSiguienteRef.current());
  }, [onRequestSiguiente]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(Number(event.active.id));
    setDragOverDelete(false);
    navigator.vibrate?.([0, 30, 60]);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setDragOverDelete(event.over?.id === COLA_DRAG_DELETE_ID);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    setDragOverDelete(false);

    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeId = Number(active.id);

    if (over.id === COLA_DRAG_DELETE_ID) {
      await onDeleteItem(activeId);
      return;
    }

    if (active.id === over.id) {
      return;
    }

    await onReorder(activeId, Number(over.id));
    setNombreRevealGeneration((generation) => generation + 1);
  };

  const modalBottom = getColaModalBottomCss();
  const listaVacia = sortedItems.length === 0;

  function renderColaListBody() {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col bg-bg-cola-list">
        <div
          className="min-h-0 flex-1 touch-pan-y select-none overflow-y-auto overscroll-none px-3 py-3"
          style={{
            paddingBottom: activeDragId
              ? "max(4.5rem, env(safe-area-inset-bottom, 0px))"
              : "max(1rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          {listaVacia ? (
            <p className="py-8 text-center text-sm text-text-muted">
              {COLA_PANEL_EMPTY_MESSAGE}
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
                      showAgregadoAvatar={false}
                      onVolverAPendiente={(id) => void onVolverAPendiente(id)}
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
                    showAgregadoAvatar={false}
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
                      <SortableColaIndividualRow
                        key={item.id}
                        item={item}
                        items={items}
                        listIndex={index}
                        nombreRevealGeneration={nombreRevealGeneration}
                        premiumIds={premiumIds}
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
    );
  }

  function renderColaPanelShell(
    shellClassName: string,
    shellStyle?: CSSProperties,
    dialogProps?: { role: "dialog"; "aria-modal": true },
    onClose?: () => void,
  ) {
    return (
      <div
        className={shellClassName}
        style={shellStyle}
        aria-label={COLA_PANEL_ARIA_LABEL}
        {...dialogProps}
      >
        <ColaPanelHeader
          pendientesCount={pendientesCount}
          onDeleteAll={() => setShowDeleteAllDialog(true)}
          onSiguiente={() => void handleSiguiente()}
          onAdd={handleOpenBuscador}
          onClose={onClose}
        />
        {renderColaListBody()}
      </div>
    );
  }

  const colaDndLayer = (
    <DndContext
      sensors={sensors}
      collisionDetection={colaDragCollisionDetection}
      measuring={{
        droppable: { strategy: MeasuringStrategy.Always },
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={(event) => void handleDragEnd(event)}
      onDragCancel={() => {
        setActiveDragId(null);
        setDragOverDelete(false);
      }}
    >
      {colaSidePanelMode
        ? renderColaPanelShell("flex min-h-0 flex-1 flex-col")
        : null}

      <DragOverlay dropAnimation={null} style={{ zIndex: COLA_MODAL_LAYER_Z + 2 }}>
        {activeDragItem ? (
          <div className="opacity-80 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
            <ColaJuntadaItem
              item={activeDragItem}
              variant={getIndividualVariant(activeDragItem, items)}
              premium={isColaItemPremium(activeDragItem, premiumIds)}
              showAgregadoAvatar={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );

  const colaSheetLayer =
    !colaSidePanelMode && sheetVisible && portalMounted
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Cerrar fila"
              data-no-tap-feedback
              className={`fixed inset-0 bg-black/50 ${
                sheetExiting ? "sala-cola-sheet-backdrop--exit" : ""
              }`}
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
              onDragCancel={() => {
                setActiveDragId(null);
                setDragOverDelete(false);
              }}
            >
              {renderColaPanelShell(
                `sala-cola-panel fixed flex flex-col overflow-hidden rounded-2xl border-[3px] border-bg-cola-sheet bg-bg-dark shadow-[0_0_0_1px_rgba(0,0,0,0.65),0_20px_56px_rgba(0,0,0,0.62)] ${
                  sheetExiting ? "sala-cola-sheet-panel--exit" : ""
                }`,
                {
                  zIndex: COLA_MODAL_LAYER_Z + 1,
                  top: `calc(${COLA_MODAL_TOP_INSET_PX}px + env(safe-area-inset-top, 0px))`,
                  bottom: modalBottom,
                  left: COLA_MODAL_HORIZONTAL_INSET_PX,
                  right: COLA_MODAL_HORIZONTAL_INSET_PX,
                },
                { role: "dialog", "aria-modal": true },
                closeCola,
              )}

              <DragOverlay
                dropAnimation={null}
                style={{ zIndex: COLA_MODAL_LAYER_Z + 2 }}
              >
                {activeDragItem ? (
                  <div className="opacity-80 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                    <ColaJuntadaItem
                      item={activeDragItem}
                      variant={getIndividualVariant(activeDragItem, items)}
                      premium={isColaItemPremium(activeDragItem, premiumIds)}
                      showAgregadoAvatar={false}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      {colaSidePanelMode ? (
        <aside className={COLA_SIDE_PANEL_CLASS}>{colaDndLayer}</aside>
      ) : null}

      {colaSheetLayer}

      <DoubleConfirmDialog
        open={showDeleteAllDialog}
        step1Message={COLA_DELETE_ALL_STEP1}
        step2Message={COLA_DELETE_ALL_STEP2}
        zIndex={COLA_MODAL_LAYER_Z + 10}
        onCancel={() => setShowDeleteAllDialog(false)}
        onConfirm={() => {
          setShowDeleteAllDialog(false);
          void onDeleteAll();
        }}
      />
    </>
  );
}
