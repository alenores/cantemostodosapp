"use client";

import ColaJuntadaItem from "@/components/salas/ColaJuntadaItem";
import ColaPanelHeader from "@/components/salas/ColaPanelHeader";
import { ColaBarraProximaContenido } from "@/components/salas/ColaBarraProxima";
import ColaPanelDeslizable, {
  type ColaPanelDeslizableHandle,
  type ColaPanelEstado,
} from "@/components/salas/ColaPanelDeslizable";
import DoubleConfirmDialog from "@/components/ui/DoubleConfirmDialog";
import { useColaAleatorio } from "@/hooks/useColaAleatorio";
import { useColaSidePanel } from "@/hooks/useColaSidePanel";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { usePremiumCancioneroIds } from "@/hooks/usePremiumCancioneroIds";
import {
  agregarACola,
  applyOrdenUpdates,
  deleteColaCompleta,
  deleteColaItem,
  finalizarCancionActiva,
  getColaVariant,
  reorderColaByDrag,
  type CancionInput,
} from "@/lib/cola-logic";
import { isColaItemPremium } from "@/lib/buscador";
import { triggerHaptic } from "@/lib/haptic";
import {
  COLA_DELETE_ALL_STEP1,
  COLA_DELETE_ALL_STEP2,
  COLA_PANEL_ARIA_LABEL,
  COLA_PANEL_EMPTY_MESSAGE,
  COLA_SIDE_PANEL_CLASS,
} from "@/lib/cola-ui";
import {
  COLA_FINALIZE_BUTTON_MS,
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
import { Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
  /** Oculta fila, buscador y controles (p. ej. sin conexión en sala). */
  controlsHidden?: boolean;
  presenceBarVisible?: boolean;
  onColaChange: () => Promise<void>;
  onItemsReordered: (items: ColaItem[]) => void;
  onOpenBuscador: () => void;
  onSettledOpenChange?: (open: boolean) => void;
  onRequestOpen?: (open: () => void) => void;
  /** Celular: el dedo sobre la barrita cerrada puede arrastrar el panel hacia arriba. */
  onRequestArrastre?: (arrastrar: (clientY: number, clientX: number) => void) => void;
  onRequestSiguiente?: (siguiente: () => void) => void;
  presentacionOculta?: boolean;
  onDragEnd?: () => void;
};

type SortableColaJuntadaRowProps = {
  item: ColaItem;
  items: ColaItem[];
  listIndex: number;
  nombreRevealGeneration: number;
  premiumIds: ReadonlySet<number>;
};

function SortableColaJuntadaRow({
  item,
  items,
  listIndex,
  nombreRevealGeneration,
  premiumIds,
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
      premium={isColaItemPremium(item, premiumIds)}
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
  controlsHidden = false,
  presenceBarVisible = false,
  onColaChange,
  onItemsReordered,
  onOpenBuscador,
  onSettledOpenChange,
  onRequestOpen,
  onRequestArrastre,
  onRequestSiguiente,
  presentacionOculta = false,
  onDragEnd,
}: ColaJuntadaSheetProps) {
  const premiumIds = usePremiumCancioneroIds();
  const colaSidePanelMode =
    useColaSidePanel() && !presentacionOculta && !controlsHidden;
  const [panelEstado, setPanelEstado] = useState<ColaPanelEstado>("cerrado");
  const panelVisible = panelEstado !== "cerrado";
  const panelRef = useRef<ColaPanelDeslizableHandle>(null);
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
        .sort((a, b) => a.orden - b.orden),
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

  const handleAgregarAleatorio = useCallback(
    async (cancion: CancionInput) => {
      const supabase = createClient();
      await agregarACola(supabase, salaId, cancion, { marcaAleatorio: true });
      await onColaChange();
    },
    [onColaChange, salaId],
  );

  const { aleatorioActivo, toggleAleatorio, apagarAleatorio } = useColaAleatorio({
    items: sortedItems,
    pendientesCount,
    onAgregar: handleAgregarAleatorio,
  });

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
    panelRef.current?.abrir();
  }, []);

  const closeCola = useCallback(() => {
    if (colaSidePanelMode) {
      return;
    }

    panelRef.current?.cerrar();
  }, [colaSidePanelMode]);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    onSettledOpenChange?.(panelEstado === "abierto");
  }, [onSettledOpenChange, panelEstado]);

  useEffect(() => {
    onRequestOpen?.(openCola);
  }, [onRequestOpen, openCola]);

  useEffect(() => {
    onRequestArrastre?.((clientY, clientX) =>
      panelRef.current?.prepararArrastre(clientY, clientX),
    );
  }, [onRequestArrastre]);

  useEffect(() => {
    if (controlsHidden) {
      closeCola();
    }
  }, [controlsHidden, closeCola]);

  useHardwareBack(panelVisible && !colaSidePanelMode, () => {
    if (showDeleteAllDialog) {
      setShowDeleteAllDialog(false);
      return;
    }

    closeCola();
  });

  const activeDragIdRef = useRef(activeDragId);
  activeDragIdRef.current = activeDragId;
  const isArrastrandoCancion = useCallback(
    () => activeDragIdRef.current !== null,
    [],
  );

  function handleOpenBuscador() {
    if (!colaSidePanelMode) {
      closeCola();
    }
    onOpenBuscador();
  }

  async function handleConfirmDeleteAll() {
    const supabase = createClient();
    apagarAleatorio();
    await deleteColaCompleta(supabase, salaId);
    setShowDeleteAllDialog(false);
    await onColaChange();
  }

  async function handleSiguiente() {
    if (pendientesCount === 0) {
      return;
    }

    const esperarCierre = !colaSidePanelMode && panelVisible;
    if (esperarCierre) {
      closeCola();
    }
    triggerHaptic();
    if (esperarCierre) {
      await new Promise((resolve) =>
        setTimeout(resolve, COLA_FINALIZE_BUTTON_MS),
      );
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

  const proximaItem = pendientes[0] ?? null;

  const listaVacia = sortedItems.length === 0;

  if (controlsHidden) {
    return null;
  }

  function renderColaListBody() {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col bg-bg-cola-list">
        <div
          ref={listScrollRef}
          data-cola-scroll=""
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
                      onVolverAPendiente={(id) => void handleVolverAPendiente(id)}
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
                  <ColaJuntadaItem item={activaItem} variant="activa" />
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
          aleatorioActivo={aleatorioActivo}
          onDeleteAll={() => setShowDeleteAllDialog(true)}
          onSiguiente={() => void handleSiguiente()}
          onAdd={handleOpenBuscador}
          onAleatorio={() => void toggleAleatorio()}
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
      onDragCancel={handleDragCancel}
    >
      {colaSidePanelMode
        ? renderColaPanelShell("flex min-h-0 flex-1 flex-col")
        : null}

      <DragOverlay dropAnimation={null} style={{ zIndex: COLA_MODAL_LAYER_Z + 2 }}>
        {activeDragItem ? (
          <div className="opacity-80 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
            <ColaJuntadaItem
              item={activeDragItem}
              variant={getColaVariant(
                activeDragItem,
                [...items].sort((a, b) => a.orden - b.orden),
              )}
              premium={isColaItemPremium(activeDragItem, premiumIds)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );

  const colaSheetLayer =
    !colaSidePanelMode && portalMounted
      ? createPortal(
          <ColaPanelDeslizable
            ref={panelRef}
            zIndex={COLA_MODAL_LAYER_Z}
            ariaLabel={COLA_PANEL_ARIA_LABEL}
            isBlocked={isArrastrandoCancion}
            onEstadoChange={setPanelEstado}
            barra={
              <ColaBarraProximaContenido
                decorativa
                proxima={
                  proximaItem
                    ? { nombre: proximaItem.nombre, artista: proximaItem.artista }
                    : null
                }
                pendientesCount={pendientesCount}
                showSiguiente={Boolean(activaItem)}
                siguienteDisabled={pendientesCount === 0}
              />
            }
          >
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
              {renderColaPanelShell(
                "flex h-full min-h-0 flex-col overflow-hidden bg-bg-dark",
                undefined,
                undefined,
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
                      variant={getColaVariant(
                        activeDragItem,
                        [...items].sort((a, b) => a.orden - b.orden),
                      )}
                      premium={isColaItemPremium(activeDragItem, premiumIds)}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </ColaPanelDeslizable>,
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
        onConfirm={() => void handleConfirmDeleteAll()}
      />
    </>
  );
}
