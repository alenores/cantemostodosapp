"use client";

import type { NotaIndex } from "@/lib/cifrado";
import type { CompositorInstrumentId, CompositorTrackEvent } from "@/lib/compositor";
import {
  canResizeEventSustento,
  computeMovedEventPatch,
  computeMovedEventSteps,
  computeResizedEndEventSteps,
  computeResizedStartEventSteps,
  COMPOSITOR_TIMELINE_ROW_HEIGHT_PX,
  getMelodicEventRowId,
  getPrimaryOctave,
  isMelodicTimelineInstrument,
  pixelDeltaToRowDelta,
  pixelDeltaToStepDelta,
  type CompositorMelodicRow,
  type CompositorTimelineEventPatch,
} from "@/lib/compositor-timeline-layout";
import { useCallback, useEffect, useRef, useState } from "react";

const DRAG_THRESHOLD_PX = 6;

export type TimelineBlockDragMode = "move" | "resize-start" | "resize-end";

export type MelodicRowDragContext = {
  rows: CompositorMelodicRow[];
  octaveExact: boolean;
  events: CompositorTrackEvent[];
  tonalidadComposicion: NotaIndex;
  rowHeightPx?: number;
};

type UseCompositorTimelineBlockDragOptions = {
  event: CompositorTrackEvent;
  instrumentId: CompositorInstrumentId;
  gridSteps: number;
  subdivisionsPerGolpe: number;
  disabled?: boolean;
  melodicRowDrag?: MelodicRowDragContext;
  onSelect: () => void;
  onUpdate: (patch: CompositorTimelineEventPatch) => void;
};

export function useCompositorTimelineBlockDrag({
  event,
  instrumentId,
  gridSteps,
  subdivisionsPerGolpe,
  disabled = false,
  melodicRowDrag,
  onSelect,
  onUpdate,
}: UseCompositorTimelineBlockDragOptions) {
  const originRef = useRef({
    startStep: event.startStep,
    durationSteps: event.durationSteps,
    note: event.note,
    pointerX: 0,
    pointerY: 0,
    mode: "move" as TimelineBlockDragMode,
    active: false,
    moved: false,
    rowsSnapshot: [] as CompositorMelodicRow[],
    originRowIndex: -1,
    primaryOctave: 3,
    rowHeightPx: COMPOSITOR_TIMELINE_ROW_HEIGHT_PX,
  });
  const listenersRef = useRef<{
    move: (ev: PointerEvent) => void;
    up: (ev: PointerEvent) => void;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const canResize = canResizeEventSustento(
    instrumentId,
    event,
    gridSteps,
    subdivisionsPerGolpe,
  );

  const canChangeRow =
    melodicRowDrag != null && isMelodicTimelineInstrument(instrumentId);

  const removeListeners = useCallback(() => {
    if (!listenersRef.current) {
      return;
    }

    document.removeEventListener("pointermove", listenersRef.current.move);
    document.removeEventListener("pointerup", listenersRef.current.up);
    document.removeEventListener("pointercancel", listenersRef.current.up);
    listenersRef.current = null;
  }, []);

  useEffect(() => removeListeners, [removeListeners]);

  const applyDrag = useCallback(
    (mode: TimelineBlockDragMode, deltaSteps: number, deltaRows: number) => {
      const origin = originRef.current;

      if (mode === "move") {
        if (canChangeRow && melodicRowDrag) {
          onUpdate(
            computeMovedEventPatch(
              instrumentId,
              event,
              origin.startStep,
              origin.durationSteps,
              origin.note,
              origin.rowsSnapshot,
              origin.originRowIndex,
              deltaSteps,
              deltaRows,
              gridSteps,
              subdivisionsPerGolpe,
              origin.primaryOctave,
              melodicRowDrag.tonalidadComposicion,
            ),
          );
          return;
        }

        onUpdate(
          computeMovedEventSteps(
            instrumentId,
            event,
            origin.startStep,
            origin.durationSteps,
            deltaSteps,
            gridSteps,
            subdivisionsPerGolpe,
          ),
        );
        return;
      }

      if (mode === "resize-end") {
        onUpdate(
          computeResizedEndEventSteps(
            instrumentId,
            event,
            origin.startStep,
            origin.durationSteps,
            deltaSteps,
            gridSteps,
            subdivisionsPerGolpe,
          ),
        );
        return;
      }

      onUpdate(
        computeResizedStartEventSteps(
          instrumentId,
          event,
          origin.startStep,
          origin.durationSteps,
          deltaSteps,
          gridSteps,
          subdivisionsPerGolpe,
        ),
      );
    },
    [
      canChangeRow,
      event,
      gridSteps,
      instrumentId,
      melodicRowDrag,
      onUpdate,
      subdivisionsPerGolpe,
    ],
  );

  const handlePointerDown = useCallback(
    (mode: TimelineBlockDragMode) => (pointerEvent: React.PointerEvent) => {
      if (disabled) {
        return;
      }

      pointerEvent.stopPropagation();
      pointerEvent.preventDefault();

      const rowsSnapshot =
        canChangeRow && melodicRowDrag ? melodicRowDrag.rows : [];
      const originRowIndex =
        canChangeRow && melodicRowDrag
          ? rowsSnapshot.findIndex(
              (row) =>
                row.id ===
                getMelodicEventRowId(
                  event,
                  rowsSnapshot,
                  melodicRowDrag.octaveExact,
                ),
            )
          : -1;
      const primaryOctave =
        canChangeRow && melodicRowDrag
          ? getPrimaryOctave(melodicRowDrag.events)
          : 3;

      originRef.current = {
        startStep: event.startStep,
        durationSteps: event.durationSteps,
        note: event.note,
        pointerX: pointerEvent.clientX,
        pointerY: pointerEvent.clientY,
        mode,
        active: false,
        moved: false,
        rowsSnapshot,
        originRowIndex,
        primaryOctave,
        rowHeightPx:
          melodicRowDrag?.rowHeightPx ?? COMPOSITOR_TIMELINE_ROW_HEIGHT_PX,
      };

      removeListeners();

      const onMove = (ev: PointerEvent) => {
        const origin = originRef.current;
        const deltaPxX = ev.clientX - origin.pointerX;
        const deltaPxY = ev.clientY - origin.pointerY;

        if (!origin.active) {
          if (
            Math.abs(deltaPxX) < DRAG_THRESHOLD_PX &&
            Math.abs(deltaPxY) < DRAG_THRESHOLD_PX
          ) {
            return;
          }

          origin.active = true;
          origin.moved = true;
          setIsDragging(true);
          onSelect();
        }

        ev.preventDefault();

        const deltaSteps = pixelDeltaToStepDelta(deltaPxX);
        const deltaRows =
          origin.mode === "move" && canChangeRow
            ? pixelDeltaToRowDelta(deltaPxY, origin.rowHeightPx)
            : 0;

        applyDrag(origin.mode, deltaSteps, deltaRows);
      };

      const onUp = (ev: PointerEvent) => {
        const origin = originRef.current;

        if (!origin.active && !origin.moved) {
          onSelect();
        }

        origin.active = false;
        setIsDragging(false);
        removeListeners();
        ev.preventDefault();
      };

      listenersRef.current = { move: onMove, up: onUp };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    },
    [
      applyDrag,
      canChangeRow,
      disabled,
      event,
      melodicRowDrag,
      onSelect,
      removeListeners,
    ],
  );

  return {
    canResize,
    isDragging,
    handlePointerDown,
  };
}
