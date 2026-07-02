import type {
  CompositorDrumSound,
  CompositorGuitarArticulation,
  CompositorInstrumentId,
  CompositorPiece,
  CompositorSlotNote,
  CompositorTrackEvent,
} from "@/lib/compositor";
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
  note: CompositorSlotNote;
  drumSound: CompositorDrumSound;
  guitarArticulation: CompositorGuitarArticulation;
};

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
        note: event.note,
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
