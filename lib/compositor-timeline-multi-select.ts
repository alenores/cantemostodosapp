import type { CompositorInstrumentId, CompositorTrackEvent } from "@/lib/compositor";
import {
  computeMovedEventPatch,
  getEventMaxDurationSteps,
  getMelodicEventRowId,
  isMelodicTimelineInstrument,
  type CompositorMelodicRow,
  type CompositorTimelineEventPatch,
} from "@/lib/compositor-timeline-layout";
import type { NotaIndex } from "@/lib/cifrado";

export type GroupDragMelodicContext = {
  rows: CompositorMelodicRow[];
  octaveExact: boolean;
  events: CompositorTrackEvent[];
  tonalidadComposicion: NotaIndex;
};

export type GroupDragMemberOrigin = {
  id: string;
  startStep: number;
  durationSteps: number;
  note: CompositorTrackEvent["note"];
  gradoCromatico: number;
  octavaRelativa: number;
  originRowIndex: number;
};

/** True si todos los bloques tienen el mismo largo horizontal. */
export function selectedEventsShareDuration(
  events: CompositorTrackEvent[],
  selectedEventIds: string[],
): boolean {
  const selected = events.filter((event) => selectedEventIds.includes(event.id));

  if (selected.length === 0) {
    return false;
  }

  const duration = selected[0]!.durationSteps;
  return selected.every((event) => event.durationSteps === duration);
}

export function buildGroupDragOrigins(
  events: CompositorTrackEvent[],
  selectedEventIds: string[],
  melodicRowDrag: GroupDragMelodicContext | undefined,
): GroupDragMemberOrigin[] {
  return selectedEventIds.flatMap((id) => {
    const event = events.find((entry) => entry.id === id);

    if (!event) {
      return [];
    }

    const originRowIndex =
      melodicRowDrag == null
        ? -1
        : melodicRowDrag.rows.findIndex(
            (row) =>
              row.id ===
              getMelodicEventRowId(
                event,
                melodicRowDrag.rows,
                melodicRowDrag.octaveExact,
              ),
          );

    return [
      {
        id: event.id,
        startStep: event.startStep,
        durationSteps: event.durationSteps,
        note: event.note,
        gradoCromatico: event.gradoCromatico,
        octavaRelativa: event.octavaRelativa,
        originRowIndex,
      },
    ];
  });
}

/**
 * Movimiento grupal permitido solo si TODOS caben con el mismo desplazamiento,
 * sin pegar al borde ni acortar. Si uno se sale, es ilegal.
 */
export function isGroupMoveLegal(
  origins: GroupDragMemberOrigin[],
  deltaSteps: number,
  deltaRows: number,
  gridSteps: number,
  allowRowChange: boolean,
  rowCount: number,
): boolean {
  for (const origin of origins) {
    const startStep = origin.startStep + deltaSteps;

    if (startStep < 0 || startStep + origin.durationSteps > gridSteps) {
      return false;
    }

    if (allowRowChange && origin.originRowIndex >= 0) {
      const rowIndex = origin.originRowIndex + deltaRows;

      if (rowIndex < 0 || rowIndex >= rowCount) {
        return false;
      }
    }
  }

  return true;
}

export function isGroupResizeLegal(
  instrumentId: CompositorInstrumentId,
  eventsById: Map<string, CompositorTrackEvent>,
  origins: GroupDragMemberOrigin[],
  mode: "resize-start" | "resize-end",
  deltaSteps: number,
  gridSteps: number,
  subdivisionsPerGolpe: number,
  stepDurationSeconds: number,
): boolean {
  for (const origin of origins) {
    const event = eventsById.get(origin.id);

    if (!event) {
      return false;
    }

    if (mode === "resize-end") {
      const durationSteps = origin.durationSteps + deltaSteps;

      if (durationSteps < 1) {
        return false;
      }

      if (origin.startStep + durationSteps > gridSteps) {
        return false;
      }

      const maxDuration = getEventMaxDurationSteps(
        instrumentId,
        { ...event, startStep: origin.startStep },
        gridSteps,
        subdivisionsPerGolpe,
        stepDurationSeconds,
      );

      if (durationSteps > maxDuration) {
        return false;
      }

      continue;
    }

    const endStep = origin.startStep + origin.durationSteps;
    const startStep = origin.startStep + deltaSteps;
    const durationSteps = endStep - startStep;

    if (startStep < 0 || durationSteps < 1) {
      return false;
    }

    if (startStep + durationSteps > gridSteps) {
      return false;
    }

    const maxDuration = getEventMaxDurationSteps(
      instrumentId,
      { ...event, startStep },
      gridSteps,
      subdivisionsPerGolpe,
      stepDurationSeconds,
    );

    if (durationSteps > maxDuration) {
      return false;
    }
  }

  return true;
}

export function buildGroupMovePatches(
  instrumentId: CompositorInstrumentId,
  eventsById: Map<string, CompositorTrackEvent>,
  origins: GroupDragMemberOrigin[],
  deltaSteps: number,
  deltaRows: number,
  gridSteps: number,
  subdivisionsPerGolpe: number,
  stepDurationSeconds: number,
  melodicRowDrag: GroupDragMelodicContext | undefined,
  primaryOctave: number,
  tonalidadComposicion: NotaIndex,
): { id: string; patch: CompositorTimelineEventPatch }[] {
  const allowRowChange =
    melodicRowDrag != null && isMelodicTimelineInstrument(instrumentId);

  return origins.map((origin) => {
    const event = eventsById.get(origin.id)!;
    const exactTiming = {
      startStep: origin.startStep + deltaSteps,
      durationSteps: origin.durationSteps,
    };

    if (allowRowChange && melodicRowDrag) {
      const pitchPatch = computeMovedEventPatch(
        instrumentId,
        event,
        origin.startStep,
        origin.durationSteps,
        origin.note,
        melodicRowDrag.rows,
        origin.originRowIndex,
        deltaSteps,
        deltaRows,
        gridSteps,
        subdivisionsPerGolpe,
        primaryOctave,
        tonalidadComposicion,
        stepDurationSeconds,
      );

      return {
        id: origin.id,
        patch: {
          ...pitchPatch,
          ...exactTiming,
        },
      };
    }

    return {
      id: origin.id,
      patch: exactTiming,
    };
  });
}

export function buildGroupResizePatches(
  origins: GroupDragMemberOrigin[],
  mode: "resize-start" | "resize-end",
  deltaSteps: number,
): { id: string; patch: CompositorTimelineEventPatch }[] {
  return origins.map((origin) => {
    if (mode === "resize-end") {
      return {
        id: origin.id,
        patch: {
          startStep: origin.startStep,
          durationSteps: origin.durationSteps + deltaSteps,
        },
      };
    }

    return {
      id: origin.id,
      patch: {
        startStep: origin.startStep + deltaSteps,
        durationSteps: origin.durationSteps - deltaSteps,
      },
    };
  });
}

export function buildOriginRestorePatches(
  origins: GroupDragMemberOrigin[],
): { id: string; patch: CompositorTimelineEventPatch }[] {
  return origins.map((origin) => ({
    id: origin.id,
    patch: {
      startStep: origin.startStep,
      durationSteps: origin.durationSteps,
      note: origin.note,
      gradoCromatico: origin.gradoCromatico,
      octavaRelativa: origin.octavaRelativa,
    },
  }));
}

export function eventsIntersectMarquee(
  events: CompositorTrackEvent[],
  rowsLength: number,
  getRowIndex: (event: CompositorTrackEvent) => number,
  marquee: { left: number; top: number; right: number; bottom: number },
  trackRect: DOMRect,
  rowHeightPx: number,
  rulerHeightPx: number,
  stepMinPx: number,
): string[] {
  const selected: string[] = [];

  for (const event of events) {
    const rowIndex = getRowIndex(event);

    if (rowIndex < 0 || rowIndex >= rowsLength) {
      continue;
    }

    const blockLeft = trackRect.left + event.startStep * stepMinPx;
    const blockRight =
      trackRect.left + (event.startStep + event.durationSteps) * stepMinPx;
    const blockTop = trackRect.top + rulerHeightPx + rowIndex * rowHeightPx;
    const blockBottom = blockTop + rowHeightPx;

    const overlaps =
      blockLeft < marquee.right &&
      blockRight > marquee.left &&
      blockTop < marquee.bottom &&
      blockBottom > marquee.top;

    if (overlaps) {
      selected.push(event.id);
    }
  }

  return selected;
}
