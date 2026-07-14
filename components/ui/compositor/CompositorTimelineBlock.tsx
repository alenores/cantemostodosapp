"use client";

import { CompositorDrumIcon } from "@/components/ui/compositor/CompositorDrumIcon";
import { useCompositorTimelineBlockDrag } from "@/components/ui/compositor/useCompositorTimelineBlockDrag";
import type { MelodicRowDragContext } from "@/components/ui/compositor/useCompositorTimelineBlockDrag";
import type {
  CompositorGuitarArticulation,
  CompositorInstrumentId,
  CompositorTrackEvent,
} from "@/lib/compositor";
import { getCompositorTimelineBlockClassName } from "@/lib/compositor-instrument-colors";
import type { CompositorTimelineEventPatch } from "@/lib/compositor-timeline-layout";
import {
  formatCompositorGradoLabel,
  isMelodicCompositorInstrument,
} from "@/lib/compositor-melodic-pitch";

function GuitarTimbreBadge({
  articulation,
}: {
  articulation: CompositorGuitarArticulation;
}) {
  if (articulation === "pua") {
    return (
      <span
        className="compositor-guitar-timbre-badge compositor-guitar-timbre-badge--pua"
        aria-hidden="true"
      >
        ○
      </span>
    );
  }

  if (articulation === "rasguido") {
    return (
      <span
        className="compositor-guitar-timbre-badge compositor-guitar-timbre-badge--rasguido"
        aria-hidden="true"
      >
        ↓
      </span>
    );
  }

  if (articulation === "rasguidoArriba") {
    return (
      <span
        className="compositor-guitar-timbre-badge compositor-guitar-timbre-badge--rasguido"
        aria-hidden="true"
      >
        ↑
      </span>
    );
  }

  if (articulation === "bloque") {
    return (
      <span
        className="compositor-guitar-timbre-badge compositor-guitar-timbre-badge--bloque"
        aria-hidden="true"
      >
        ▤
      </span>
    );
  }

  if (articulation === "dedo") {
    return (
      <span
        className="compositor-guitar-timbre-badge compositor-guitar-timbre-badge--dedo"
        aria-hidden="true"
      >
        f
      </span>
    );
  }

  return (
    <span
      className="compositor-guitar-timbre-badge compositor-guitar-timbre-badge--silencio"
      aria-hidden="true"
    >
      ⊘
    </span>
  );
}

type CompositorTimelineBlockProps = {
  event: CompositorTrackEvent;
  instrumentId: CompositorInstrumentId;
  gridSteps: number;
  subdivisionsPerGolpe: number;
  stepDurationSeconds: number;
  isSelected: boolean;
  moveRejected?: boolean;
  conflictHighlight?: boolean;
  disabled?: boolean;
  title: string;
  leftPercent?: number;
  widthPercent?: number;
  minWidthPercent?: number;
  positioning?: "absolute" | "fill";
  showNoteLabel?: boolean;
  selectedEventIds: string[];
  trackEvents: CompositorTrackEvent[];
  onSelect: (options?: { additive?: boolean }) => void;
  onUpdateEvents: (
    updates: { id: string; patch: CompositorTimelineEventPatch }[],
  ) => void;
  onMoveRejectedChange: (rejected: boolean) => void;
  melodicRowDrag?: MelodicRowDragContext;
};

export function CompositorTimelineBlock({
  event,
  instrumentId,
  gridSteps,
  subdivisionsPerGolpe,
  stepDurationSeconds,
  isSelected,
  moveRejected = false,
  conflictHighlight = false,
  disabled = false,
  title,
  leftPercent = 0,
  widthPercent = 100,
  minWidthPercent = 0,
  positioning = "absolute",
  showNoteLabel = true,
  selectedEventIds,
  trackEvents,
  onSelect,
  onUpdateEvents,
  onMoveRejectedChange,
  melodicRowDrag,
}: CompositorTimelineBlockProps) {
  const noteLabel = isMelodicCompositorInstrument(instrumentId)
    ? formatCompositorGradoLabel(event.gradoCromatico, event.octavaRelativa)
    : "";

  const { canResize, isDragging, handlePointerDown } =
    useCompositorTimelineBlockDrag({
      event,
      instrumentId,
      gridSteps,
      subdivisionsPerGolpe,
      stepDurationSeconds,
      disabled,
      selectedEventIds,
      trackEvents,
      melodicRowDrag,
      moveRejected,
      onMoveRejectedChange,
      onSelect,
      onUpdateEvents,
    });

  const blockClassName = getCompositorTimelineBlockClassName({
    instrumentId,
    isSelected,
    isDragging,
    moveRejected: isSelected && moveRejected,
    guitarArticulation:
      instrumentId === "guitarra" ? event.guitarArticulation : undefined,
    drumSilencio:
      instrumentId === "bateria" && event.drumSound === "silencio",
  });

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={isSelected}
      aria-label={title}
      title={title}
      data-compositor-timeline-block=""
      data-event-id={event.id}
      onPointerDown={handlePointerDown("move")}
      className={`touch-none rounded-md text-[9px] font-bold select-none ${blockClassName} ${
        positioning === "fill"
          ? "relative h-full w-full"
          : "absolute inset-y-0.5"
      } ${
        conflictHighlight
          ? "compositor-timeline-block--conflict-focus ring-2 ring-[var(--tuner-lejos)]"
          : ""
      } ${disabled ? "pointer-events-none opacity-50" : isDragging ? "pointer-events-none cursor-grabbing" : "cursor-grab"}`}
      style={
        positioning === "fill"
          ? undefined
          : {
              left: `${leftPercent}%`,
              width: `${Math.max(widthPercent, minWidthPercent)}%`,
            }
      }
    >
      {isSelected && canResize && !disabled ? (
        <>
          <span
            aria-hidden="true"
            onPointerDown={handlePointerDown("resize-start")}
            className="absolute inset-y-0 left-0 z-20 w-2 cursor-ew-resize rounded-l-md bg-white/30"
          />
          <span
            aria-hidden="true"
            onPointerDown={handlePointerDown("resize-end")}
            className="absolute inset-y-0 right-0 z-20 w-2 cursor-ew-resize rounded-r-md bg-white/30"
          />
        </>
      ) : null}

      <span className="pointer-events-none relative z-[1] flex h-full items-center justify-center gap-0.5 truncate px-1">
        {instrumentId === "guitarra" ? (
          <GuitarTimbreBadge articulation={event.guitarArticulation} />
        ) : null}
        {instrumentId === "bateria" ? (
          <CompositorDrumIcon sound={event.drumSound} size="sm" />
        ) : null}
        {showNoteLabel && instrumentId !== "bateria" ? (
          <span className="truncate">{noteLabel}</span>
        ) : null}
      </span>
    </div>
  );
}
