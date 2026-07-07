"use client";

import type { CompositorTrackEvent } from "@/lib/compositor";
import type { CompositorDrumDraft } from "@/lib/compositor-drum-draft";
import type { CompositorMelodicDraft } from "@/lib/compositor-melodic-draft";
import {
  buildDrumPlacementPartial,
  buildMelodicPlacementPartial,
  resolveTimelineDropCellFromPointer,
  type CompositorTimelineDropCell,
} from "@/lib/compositor-timeline-placement";
import type { CompositorMelodicRow } from "@/lib/compositor-timeline-layout";
import type { CompositorInstrumentId } from "@/lib/compositor";
import type { NotaIndex } from "@/lib/cifrado";
import { useCallback, useEffect, useRef, useState } from "react";

const DRAG_THRESHOLD_PX = 6;

export type CompositorPalettePayload =
  | { kind: "drum"; draft: CompositorDrumDraft }
  | { kind: "melodic"; draft: CompositorMelodicDraft };

type UseCompositorPalettePlacementOptions = {
  disabled?: boolean;
  gridSteps: number;
  instrumentId: CompositorInstrumentId;
  tonalidadComposicion: NotaIndex;
  subdivisionsPerGolpe: number;
  octaveExact: boolean;
  melodicRows: CompositorMelodicRow[];
  melodicDraft: CompositorMelodicDraft;
  drumDraft: CompositorDrumDraft;
  onPlaceEvent: (
    partial: Partial<CompositorTrackEvent>,
    options?: { rowId?: string; octaveExact?: boolean },
  ) => string | null;
};

export function useCompositorPalettePlacement({
  disabled = false,
  gridSteps,
  instrumentId,
  tonalidadComposicion,
  subdivisionsPerGolpe,
  octaveExact,
  melodicRows,
  melodicDraft,
  drumDraft,
  onPlaceEvent,
}: UseCompositorPalettePlacementOptions) {
  const melodicDraftRef = useRef(melodicDraft);
  melodicDraftRef.current = melodicDraft;

  const drumDraftRef = useRef(drumDraft);
  drumDraftRef.current = drumDraft;

  const [activePayload, setActivePayload] =
    useState<CompositorPalettePayload | null>(null);
  const [placementPreview, setPlacementPreview] =
    useState<CompositorTimelineDropCell | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef<{
    payload: CompositorPalettePayload;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const listenersRef = useRef<{
    move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
  } | null>(null);

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

  const placeAtCell = useCallback(
    (payload: CompositorPalettePayload, cell: CompositorTimelineDropCell) => {
      if (payload.kind === "drum") {
        const partial = buildDrumPlacementPartial(
          payload.draft.drumSound,
          cell.step,
          payload.draft.level,
        );
        return onPlaceEvent(partial);
      }

      const row = melodicRows.find((entry) => entry.id === cell.rowId);

      if (!row) {
        return null;
      }

      const partial = buildMelodicPlacementPartial(
        payload.draft,
        row,
        cell.step,
        instrumentId,
        tonalidadComposicion,
        subdivisionsPerGolpe,
      );

      if (!partial) {
        return null;
      }

      return onPlaceEvent(partial, {
        rowId: cell.rowId,
        octaveExact,
      });
    },
    [
      instrumentId,
      melodicRows,
      octaveExact,
      onPlaceEvent,
      subdivisionsPerGolpe,
      tonalidadComposicion,
    ],
  );

  const tryPlaceAtPointer = useCallback(
    (payload: CompositorPalettePayload, clientX: number, clientY: number) => {
      const cell = resolveTimelineDropCellFromPointer(
        clientX,
        clientY,
        gridSteps,
      );

      if (!cell) {
        return false;
      }

      const targetCell =
        payload.kind === "drum"
          ? { rowId: payload.draft.drumSound, step: cell.step }
          : cell;

      return placeAtCell(payload, targetCell) != null;
    },
    [gridSteps, placeAtCell],
  );

  const startPointerDrag = useCallback(
    (payload: CompositorPalettePayload, event: React.PointerEvent) => {
      if (disabled || event.button !== 0) {
        return;
      }

      dragRef.current = {
        payload,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };

      const handleMove = (moveEvent: PointerEvent) => {
        const drag = dragRef.current;

        if (!drag || moveEvent.pointerId !== drag.pointerId) {
          return;
        }

        const deltaX = moveEvent.clientX - drag.startX;
        const deltaY = moveEvent.clientY - drag.startY;

        if (
          !drag.moved &&
          Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX
        ) {
          return;
        }

        drag.moved = true;
        setIsDragging(true);
        setActivePayload(drag.payload);

        const cell = resolveTimelineDropCellFromPointer(
          moveEvent.clientX,
          moveEvent.clientY,
          gridSteps,
        );

        if (!cell) {
          setPlacementPreview(null);
          return;
        }

        if (drag.payload.kind === "drum") {
          setPlacementPreview({
            rowId: drag.payload.draft.drumSound,
            step: cell.step,
          });
          return;
        }

        setPlacementPreview(cell);
      };

      const handleUp = (upEvent: PointerEvent) => {
        const drag = dragRef.current;
        removeListeners();

        if (!drag || upEvent.pointerId !== drag.pointerId) {
          return;
        }

        if (drag.moved) {
          tryPlaceAtPointer(drag.payload, upEvent.clientX, upEvent.clientY);
        }

        dragRef.current = null;
        setIsDragging(false);
        setPlacementPreview(null);
        setActivePayload(null);
      };

      listenersRef.current = { move: handleMove, up: handleUp };
      document.addEventListener("pointermove", handleMove);
      document.addEventListener("pointerup", handleUp);
      document.addEventListener("pointercancel", handleUp);
    },
    [disabled, gridSteps, removeListeners, tryPlaceAtPointer],
  );

  const handlePointerDownDrumDrag = useCallback(
    (event: React.PointerEvent) => {
      startPointerDrag({ kind: "drum", draft: drumDraftRef.current }, event);
    },
    [startPointerDrag],
  );

  const handlePointerDownMelodicDrag = useCallback(
    (event: React.PointerEvent) => {
      startPointerDrag(
        { kind: "melodic", draft: melodicDraftRef.current },
        event,
      );
    },
    [startPointerDrag],
  );

  const handleTimelineTapPlace = useCallback(
    (clientX: number, clientY: number) => {
      if (!activePayload || isDragging) {
        return false;
      }

      return tryPlaceAtPointer(activePayload, clientX, clientY);
    },
    [activePayload, isDragging, tryPlaceAtPointer],
  );

  return {
    activePayload,
    placementPreview,
    isDragging,
    handlePointerDownDrumDrag,
    handlePointerDownMelodicDrag,
    handleTimelineTapPlace,
  };
}
