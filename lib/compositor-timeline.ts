import {
  isGuitarChordArticulation,
  type CompositorDrumSound,
  type CompositorGuitarArticulation,
  type CompositorInstrumentId,
  type CompositorPiece,
  type CompositorSlotNote,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import { resolveEventMelodicNote } from "@/lib/compositor-melodic-pitch";
import { buildChordNotesFromRoot, getDefaultChordModifierForRoot } from "@/lib/compositor-chords";
import type { Modificador } from "@/lib/cifrado";
import { gradoToNotaIndex } from "@/lib/compositor-melodic-pitch";
import {
  getActiveBeatDurationSlice,
  getSecondsPerBeat,
  METRONOME_BEAT_DURATION_DEFAULT,
  type MetronomeBeatDuration,
  type MetronomeBeatDurationPattern,
  type MetronomeBeatLevel,
} from "@/lib/metronomo";

export type CompositorScheduledSound = {
  instrumentId: CompositorInstrumentId;
  cycleOffsetSeconds: number;
  durationSeconds: number;
  level: MetronomeBeatLevel;
  notes: CompositorSlotNote[];
  drumSound: CompositorDrumSound;
  guitarArticulation: CompositorGuitarArticulation;
};

function resolveEventNotes(
  piece: CompositorPiece,
  instrumentId: CompositorInstrumentId,
  event: CompositorTrackEvent,
): CompositorSlotNote[] {
  const root = resolveEventMelodicNote(event, piece.tonalidadComposicion, instrumentId);

  if (instrumentId === "viento") {
    return [root];
  }

  if (instrumentId === "guitarra") {
    if (!isGuitarChordArticulation(event.guitarArticulation)) {
      return [root];
    }

    const rootIndex = gradoToNotaIndex(event.gradoCromatico, piece.tonalidadComposicion);
    const modifier: Modificador =
      (event.chordModifier ??
        getDefaultChordModifierForRoot(
          rootIndex,
          piece.tonalidadComposicion,
          piece.modoTonalComposicion,
        )) as Modificador;
    return buildChordNotesFromRoot(root, modifier, instrumentId);
  }

  if (instrumentId === "piano" && event.pianoHarmonyMode === "acorde") {
    const rootIndex = gradoToNotaIndex(event.gradoCromatico, piece.tonalidadComposicion);
    const modifier: Modificador =
      (event.chordModifier ??
        getDefaultChordModifierForRoot(
          rootIndex,
          piece.tonalidadComposicion,
          piece.modoTonalComposicion,
        )) as Modificador;
    return buildChordNotesFromRoot(root, modifier, instrumentId);
  }

  return [root];
}

export function getCompositorGridSteps(piece: CompositorPiece): number {
  return piece.cycleGolpes * piece.subdivisionsPerGolpe;
}

export function getCompositorStepDurationSeconds(piece: CompositorPiece): number {
  const gridSteps = getCompositorGridSteps(piece);

  if (gridSteps <= 0) {
    return 0;
  }

  return getCompositorCycleDurationSeconds(piece) / gridSteps;
}

export function getCompositorCycleDurationSeconds(piece: CompositorPiece): number {
  const durations = getActiveBeatDurationSlice(
    piece.cycleBeatDurations,
    piece.cycleGolpes,
  );

  let total = 0;

  for (let index = 0; index < piece.cycleGolpes; index += 1) {
    total += getSecondsPerBeat(
      piece.bpm,
      durations[index] ?? METRONOME_BEAT_DURATION_DEFAULT,
    );
  }

  return total;
}

export function stepToCycleOffsetSeconds(
  piece: CompositorPiece,
  startStep: number,
): number {
  return startStep * getCompositorStepDurationSeconds(piece);
}

export function durationStepsToSeconds(
  piece: CompositorPiece,
  durationSteps: number,
): number {
  return Math.max(
    getCompositorStepDurationSeconds(piece),
    durationSteps * getCompositorStepDurationSeconds(piece),
  );
}

export function secondsToCycleProgress(
  piece: CompositorPiece,
  elapsedSeconds: number,
): number {
  const cycleDuration = getCompositorCycleDurationSeconds(piece);

  if (cycleDuration <= 0) {
    return 0;
  }

  const normalized = elapsedSeconds % cycleDuration;
  return normalized / cycleDuration;
}

export function cycleProgressToStep(
  piece: CompositorPiece,
  progress: number,
): number {
  const gridSteps = getCompositorGridSteps(piece);
  const clamped = Math.max(0, Math.min(1, progress));
  return Math.min(gridSteps - 1, Math.floor(clamped * gridSteps));
}

export function eventOverlapsStep(
  event: CompositorTrackEvent,
  step: number,
): boolean {
  return step >= event.startStep && step < event.startStep + event.durationSteps;
}

export function isDrumCellOccupied(
  events: CompositorTrackEvent[],
  drumSound: CompositorDrumSound,
  step: number,
): boolean {
  return events.some(
    (event) => event.drumSound === drumSound && event.startStep === step,
  );
}

export function isMelodicCellOccupied(
  events: CompositorTrackEvent[],
  rowId: string,
  step: number,
  rowIdForEvent: (
    event: CompositorTrackEvent,
  ) => string,
): boolean {
  return events.some((event) => {
    if (rowIdForEvent(event) !== rowId) {
      return false;
    }

    return eventOverlapsStep(event, step);
  });
}

export function buildCompositorScheduledSounds(
  piece: CompositorPiece,
  options?: {
    onlyInstrumentId?: CompositorInstrumentId;
  },
): CompositorScheduledSound[] {
  const sounds: CompositorScheduledSound[] = [];

  for (const track of piece.tracks) {
    if (options?.onlyInstrumentId) {
      if (track.instrumentId !== options.onlyInstrumentId) {
        continue;
      }
    } else if (!track.enabled) {
      continue;
    }

    for (const event of track.events) {
      if (event.level === "silencio") {
        continue;
      }

      if (track.instrumentId === "bateria" && event.drumSound === "silencio") {
        continue;
      }

      if (
        track.instrumentId === "guitarra" &&
        event.guitarArticulation === "silencio"
      ) {
        continue;
      }

      sounds.push({
        instrumentId: track.instrumentId,
        cycleOffsetSeconds: stepToCycleOffsetSeconds(piece, event.startStep),
        durationSeconds: durationStepsToSeconds(piece, event.durationSteps),
        level: event.level,
        notes: resolveEventNotes(piece, track.instrumentId, event),
        drumSound: event.drumSound,
        guitarArticulation: event.guitarArticulation,
      });
    }
  }

  return sounds.sort(
    (left, right) => left.cycleOffsetSeconds - right.cycleOffsetSeconds,
  );
}

export function rescaleTrackEvents(
  events: CompositorTrackEvent[],
  oldGridSteps: number,
  newGridSteps: number,
): CompositorTrackEvent[] {
  if (oldGridSteps <= 0 || newGridSteps <= 0 || oldGridSteps === newGridSteps) {
    return events;
  }

  return events.map((event) => {
    const startStep = Math.round((event.startStep / oldGridSteps) * newGridSteps);
    const durationSteps = Math.max(
      1,
      Math.round((event.durationSteps / oldGridSteps) * newGridSteps),
    );
    const maxStart = Math.max(0, newGridSteps - durationSteps);

    return {
      ...event,
      startStep: Math.min(maxStart, startStep),
      durationSteps: Math.min(durationSteps, newGridSteps - startStep),
    };
  });
}

export function formatCycleDurationLabel(seconds: number): string {
  if (seconds < 10) {
    return `${seconds.toFixed(1)} s`;
  }

  return `${Math.round(seconds)} s`;
}

export function getCycleBeatDurationsSummary(
  beatDurations: MetronomeBeatDurationPattern,
  cycleGolpes: number,
): string {
  const durations = getActiveBeatDurationSlice(beatDurations, cycleGolpes);

  return durations
    .slice(0, cycleGolpes)
    .map((duration: MetronomeBeatDuration) => duration)
    .join(" · ");
}
