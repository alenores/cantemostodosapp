"use client";

import type { CompositorInstrumentId, CompositorTrackEvent } from "@/lib/compositor";
import {
  canResizeEventSustento,
  getPrimaryOctave,
  isMelodicTimelineInstrument,
  pixelDeltaToRowDelta,
  pixelDeltaToStepDelta,
  COMPOSITOR_TIMELINE_ROW_HEIGHT_PX,
  type CompositorTimelineEventPatch,
} from "@/lib/compositor-timeline-layout";
import {
  buildGroupDragOrigins,
  buildGroupMovePatches,
  buildGroupResizePatches,
  buildOriginRestorePatches,
  isGroupMoveLegal,
  isGroupResizeLegal,
  selectedEventsShareDuration,
  type GroupDragMelodicContext,
  type GroupDragMemberOrigin,
} from "@/lib/compositor-timeline-multi-select";
import { useCallback, useEffect, useRef, useState } from "react";

const DRAG_THRESHOLD_PX = 6;

export type TimelineBlockDragMode = "move" | "resize-start" | "resize-end";
export type MelodicRowDragContext = GroupDragMelodicContext & {
  rowHeightPx?: number;
};

type SelectOptions = {
  additive?: boolean;
};

type UseCompositorTimelineBlockDragOptions = {
  event: CompositorTrackEvent;
  instrumentId: CompositorInstrumentId;
  gridSteps: number;
  subdivisionsPerGolpe: number;
  stepDurationSeconds: number;
  disabled?: boolean;
  selectedEventIds: string[];
  trackEvents: CompositorTrackEvent[];
  melodicRowDrag?: MelodicRowDragContext;
  moveRejected: boolean;
  onMoveRejectedChange: (rejected: boolean) => void;
  onSelect: (options?: SelectOptions) => void;
  onUpdateEvents: (
    updates: { id: string; patch: CompositorTimelineEventPatch }[],
  ) => void;
};

export function useCompositorTimelineBlockDrag({
  event,
  instrumentId,
  gridSteps,
  subdivisionsPerGolpe,
  stepDurationSeconds,
  disabled = false,
  selectedEventIds,
  trackEvents,
  melodicRowDrag,
  moveRejected,
  onMoveRejectedChange,
  onSelect,
  onUpdateEvents,
}: UseCompositorTimelineBlockDragOptions) {
  const melodicRowDragRef = useRef(melodicRowDrag);
  melodicRowDragRef.current = melodicRowDrag;

  const eventRef = useRef(event);
  eventRef.current = event;

  const trackEventsRef = useRef(trackEvents);
  trackEventsRef.current = trackEvents;

  const selectedEventIdsRef = useRef(selectedEventIds);
  selectedEventIdsRef.current = selectedEventIds;

  const onUpdateEventsRef = useRef(onUpdateEvents);
  onUpdateEventsRef.current = onUpdateEvents;

  const onMoveRejectedChangeRef = useRef(onMoveRejectedChange);
  onMoveRejectedChangeRef.current = onMoveRejectedChange;

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const originRef = useRef({
    pointerX: 0,
    pointerY: 0,
    mode: "move" as TimelineBlockDragMode,
    active: false,
    moved: false,
    dragEventIds: [] as string[],
    members: [] as GroupDragMemberOrigin[],
    primaryOctave: 3,
    rowHeightPx: COMPOSITOR_TIMELINE_ROW_HEIGHT_PX,
    lastLegal: true,
  });

  const listenersRef = useRef<{
    move: (ev: PointerEvent) => void;
    up: (ev: PointerEvent) => void;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragIdsForResize = selectedEventIds.includes(event.id)
    ? selectedEventIds
    : [event.id];

  const canResize =
    canResizeEventSustento(
      instrumentId,
      event,
      gridSteps,
      subdivisionsPerGolpe,
      stepDurationSeconds,
    ) && selectedEventsShareDuration(trackEvents, dragIdsForResize);

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

  useEffect(
    () => () => {
      if (!originRef.current.active) {
        removeListeners();
      }
    },
    [removeListeners],
  );

  const handlePointerDown = useCallback(
    (mode: TimelineBlockDragMode) => (pointerEvent: React.PointerEvent) => {
      if (disabled) {
        return;
      }

      pointerEvent.stopPropagation();
      pointerEvent.preventDefault();

      const additive = pointerEvent.ctrlKey || pointerEvent.metaKey;

      if (additive && mode === "move") {
        onSelectRef.current({ additive: true });
        return;
      }

      const currentSelected = selectedEventIdsRef.current;
      const alreadyInSelection = currentSelected.includes(event.id);
      const dragEventIds =
        alreadyInSelection && currentSelected.length > 0
          ? [...currentSelected]
          : [event.id];

      if (!alreadyInSelection) {
        onSelectRef.current({ additive: false });
      }

      const currentMelodic = melodicRowDragRef.current;
      const members = buildGroupDragOrigins(
        trackEventsRef.current,
        dragEventIds,
        currentMelodic,
      );

      if (members.length === 0) {
        return;
      }

      if (mode !== "move") {
        if (
          !selectedEventsShareDuration(trackEventsRef.current, dragEventIds)
        ) {
          return;
        }
      }

      originRef.current = {
        pointerX: pointerEvent.clientX,
        pointerY: pointerEvent.clientY,
        mode,
        active: false,
        moved: false,
        dragEventIds,
        members,
        primaryOctave: currentMelodic
          ? getPrimaryOctave(currentMelodic.events)
          : 3,
        rowHeightPx:
          currentMelodic?.rowHeightPx ?? COMPOSITOR_TIMELINE_ROW_HEIGHT_PX,
        lastLegal: true,
      };

      removeListeners();
      onMoveRejectedChangeRef.current(false);

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
        }

        ev.preventDefault();

        const deltaSteps = pixelDeltaToStepDelta(deltaPxX);
        const deltaRows =
          origin.mode === "move" && canChangeRow
            ? pixelDeltaToRowDelta(deltaPxY, origin.rowHeightPx)
            : 0;

        const eventsById = new Map(
          trackEventsRef.current.map((entry) => [entry.id, entry]),
        );
        const currentMelodicRowDrag = melodicRowDragRef.current;

        if (origin.mode === "move") {
          const legal = isGroupMoveLegal(
            origin.members,
            deltaSteps,
            deltaRows,
            gridSteps,
            canChangeRow,
            currentMelodicRowDrag?.rows.length ?? 0,
          );

          onMoveRejectedChangeRef.current(!legal);
          origin.lastLegal = legal;

          if (!legal) {
            onUpdateEventsRef.current(
              buildOriginRestorePatches(origin.members),
            );
            return;
          }

          onUpdateEventsRef.current(
            buildGroupMovePatches(
              instrumentId,
              eventsById,
              origin.members,
              deltaSteps,
              deltaRows,
              gridSteps,
              subdivisionsPerGolpe,
              stepDurationSeconds,
              currentMelodicRowDrag,
              origin.primaryOctave,
              currentMelodicRowDrag?.tonalidadComposicion ?? 0,
            ),
          );
          return;
        }

        const legal = isGroupResizeLegal(
          instrumentId,
          eventsById,
          origin.members,
          origin.mode,
          deltaSteps,
          gridSteps,
          subdivisionsPerGolpe,
          stepDurationSeconds,
        );

        onMoveRejectedChangeRef.current(!legal);
        origin.lastLegal = legal;

        if (!legal) {
          onUpdateEventsRef.current(buildOriginRestorePatches(origin.members));
          return;
        }

        onUpdateEventsRef.current(
          buildGroupResizePatches(origin.members, origin.mode, deltaSteps),
        );
      };

      const onUp = (ev: PointerEvent) => {
        const origin = originRef.current;

        if (!origin.active && !origin.moved && !additive) {
          onSelectRef.current({ additive: false });
        }

        if (origin.active && !origin.lastLegal) {
          onUpdateEventsRef.current(buildOriginRestorePatches(origin.members));
        }

        origin.active = false;
        setIsDragging(false);
        onMoveRejectedChangeRef.current(false);
        removeListeners();
        ev.preventDefault();
      };

      listenersRef.current = { move: onMove, up: onUp };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    },
    [
      canChangeRow,
      disabled,
      event.id,
      gridSteps,
      instrumentId,
      removeListeners,
      stepDurationSeconds,
      subdivisionsPerGolpe,
    ],
  );

  return {
    canResize,
    isDragging,
    moveRejected,
    handlePointerDown,
  };
}
