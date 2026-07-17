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
  resolveMelodicPitchToNote,
} from "@/lib/compositor-melodic-pitch";
import {
  buildMelodicTimelineRows,
  COMPOSITOR_TIMELINE_ROW_HEIGHT_PX,
  COMPOSITOR_TIMELINE_STEP_MIN_PX,
  getMelodicEventRowId,
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

export function getNextMelodicPlacementStep(
  events: CompositorTrackEvent[],
  gridSteps: number,
  durationSteps: number,
): number | null {
  if (events.length === 0) {
    return durationSteps > gridSteps ? null : 0;
  }

  let maxEnd = 0;

  for (const event of events) {
    maxEnd = Math.max(maxEnd, event.startStep + event.durationSteps);
  }

  if (maxEnd + durationSteps > gridSteps) {
    return null;
  }

  return maxEnd;
}

export function getMelodicRowIdForDraft(
  draft: CompositorMelodicDraft,
  instrumentId: CompositorInstrumentId,
  tonalidadComposicion: NotaIndex,
): string | null {
  const note = resolveMelodicPitchToNote(
    {
      gradoCromatico: draft.gradoCromatico,
      octavaRelativa: clampMelodicOctaveForInstrument(
        draft.octavaRelativa,
        instrumentId,
      ),
    },
    tonalidadComposicion,
  );
  const rows = buildMelodicTimelineRows([], true, instrumentId);
  const syntheticEvent = {
    gradoCromatico: draft.gradoCromatico,
    octavaRelativa: draft.octavaRelativa,
    note,
  } as CompositorTrackEvent;

  return getMelodicEventRowId(syntheticEvent, rows, true);
}

export function buildMelodicAddPartial(
  draft: CompositorMelodicDraft,
  events: CompositorTrackEvent[],
  instrumentId: CompositorInstrumentId,
  tonalidadComposicion: NotaIndex,
  subdivisionsPerGolpe: number,
  gridSteps: number,
): Partial<CompositorTrackEvent> | null {
  const durationSteps = Math.max(1, subdivisionsPerGolpe);
  const startStep = getNextMelodicPlacementStep(
    events,
    gridSteps,
    durationSteps,
  );

  if (startStep == null) {
    return null;
  }

  const octavaRelativa = clampMelodicOctaveForInstrument(
    draft.octavaRelativa,
    instrumentId,
  );

  return {
    startStep,
    durationSteps,
    ...draftToEventPatch(
      draft,
      instrumentId,
      tonalidadComposicion,
      octavaRelativa,
    ),
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

export function getNextDrumPlacementStep(
  events: CompositorTrackEvent[],
  gridSteps: number,
): number | null {
  const durationSteps = 1;

  if (events.length === 0) {
    return durationSteps > gridSteps ? null : 0;
  }

  let maxEnd = 0;

  for (const event of events) {
    maxEnd = Math.max(maxEnd, event.startStep + event.durationSteps);
  }

  if (maxEnd + durationSteps > gridSteps) {
    return null;
  }

  return maxEnd;
}

export function buildDrumAddPartial(
  draft: { drumSound: CompositorDrumSound; level: CompositorTrackEvent["level"] },
  events: CompositorTrackEvent[],
  gridSteps: number,
): Partial<CompositorTrackEvent> | null {
  const startStep = getNextDrumPlacementStep(events, gridSteps);

  if (startStep == null) {
    return null;
  }

  return buildDrumPlacementPartial(draft.drumSound, startStep, draft.level);
}

export function getTimelineRowHeightPx(): number {
  return COMPOSITOR_TIMELINE_ROW_HEIGHT_PX;
}
