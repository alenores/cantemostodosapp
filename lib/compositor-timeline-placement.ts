import type { NotaIndex } from "@/lib/cifrado";
import type {
  CompositorDrumSound,
  CompositorInstrumentId,
  CompositorTrackEvent,
} from "@/lib/compositor";
import {
  draftToEventPatch,
  type CompositorMelodicDraft,
} from "@/lib/compositor-melodic-draft";
import {
  clampMelodicOctaveForInstrument,
} from "@/lib/compositor-melodic-pitch";
import {
  COMPOSITOR_TIMELINE_ROW_HEIGHT_PX,
  COMPOSITOR_TIMELINE_STEP_MIN_PX,
  type CompositorMelodicRow,
} from "@/lib/compositor-timeline-layout";

export type CompositorTimelineDropCell = {
  rowId: string;
  step: number;
};

export function resolveTimelineDropCellFromPointer(
  clientX: number,
  clientY: number,
  gridSteps: number,
): CompositorTimelineDropCell | null {
  const trackElement = document
    .elementFromPoint(clientX, clientY)
    ?.closest("[data-compositor-timeline-track]");

  if (!trackElement) {
    return null;
  }

  const rowElement = document
    .elementFromPoint(clientX, clientY)
    ?.closest("[data-compositor-timeline-row]");

  if (!rowElement) {
    return null;
  }

  const rowId = rowElement.getAttribute("data-compositor-timeline-row");

  if (!rowId) {
    return null;
  }

  const trackRect = trackElement.getBoundingClientRect();
  const relativeX = clientX - trackRect.left;
  const step = Math.max(
    0,
    Math.min(gridSteps - 1, Math.floor(relativeX / COMPOSITOR_TIMELINE_STEP_MIN_PX)),
  );

  return { rowId, step };
}

export function getPrimaryMelodicOctave(
  instrumentId: CompositorInstrumentId,
): number {
  if (instrumentId === "guitarra") {
    return 2;
  }

  if (instrumentId === "viento") {
    return 4;
  }

  return 3;
}

export function buildMelodicPlacementPartial(
  draft: CompositorMelodicDraft,
  row: CompositorMelodicRow,
  step: number,
  instrumentId: CompositorInstrumentId,
  tonalidadComposicion: NotaIndex,
  subdivisionsPerGolpe: number,
): Partial<CompositorTrackEvent> | null {
  if (row.kind === "overflow") {
    return null;
  }

  const primaryOctave = getPrimaryMelodicOctave(instrumentId);
  const octavaRelativa =
    row.kind === "pitchOctave"
      ? clampMelodicOctaveForInstrument(row.octave, instrumentId)
      : clampMelodicOctaveForInstrument(primaryOctave, instrumentId);

  const partial = draftToEventPatch(
    draft,
    instrumentId,
    tonalidadComposicion,
    octavaRelativa,
  );

  return {
    startStep: step,
    durationSteps: Math.max(1, subdivisionsPerGolpe),
    ...partial,
  };
}

export function buildDrumPlacementPartial(
  drumSound: CompositorDrumSound,
  step: number,
  level: CompositorTrackEvent["level"] = "medio",
): Partial<CompositorTrackEvent> {
  return {
    startStep: step,
    durationSteps: 1,
    drumSound,
    level,
  };
}

export function getTimelineRowHeightPx(): number {
  return COMPOSITOR_TIMELINE_ROW_HEIGHT_PX;
}
