import {
  getCompositorCycleDurationSeconds,
  getCompositorGridSteps,
  rescaleTrackEvents,
} from "@/lib/compositor-timeline";
import {
  BPM_DEFAULT,
  METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
  METRONOME_PATTERN_LENGTH,
  METRONOME_PATTERN_LENGTH_DEFAULT,
  normalizeBeatDurationPattern,
  type MetronomeBeatDuration,
  type MetronomeBeatDurationPattern,
  type MetronomeBeatLevel,
} from "@/lib/metronomo";
import type { VozTarget } from "@/lib/voz";
import { clampTargetOctave } from "@/lib/voz";

export const COMPOSITOR_STORAGE_KEY = "compositor-piece-v2";
export const COMPOSITOR_LEGACY_STORAGE_KEY = "compositor-piece-v1";
export const COMPOSITOR_SUBDIVISIONS_PER_GOLPE = 4;
export const COMPOSITOR_MAX_EVENTS_PER_TRACK = 24;

export type CompositorInstrumentId = "piano" | "guitarra" | "bateria";

export type CompositorDrumSound = "kick" | "snare" | "hihat" | "silencio";

export type CompositorGuitarArticulation = "pua" | "rasguido" | "silencio";

export type CompositorSlotNote = VozTarget;

export type CompositorTrackEvent = {
  id: string;
  startStep: number;
  durationSteps: number;
  level: MetronomeBeatLevel;
  note: CompositorSlotNote;
  drumSound: CompositorDrumSound;
  guitarArticulation: CompositorGuitarArticulation;
};

export type CompositorTrack = {
  instrumentId: CompositorInstrumentId;
  enabled: boolean;
  events: CompositorTrackEvent[];
};

export type CompositorPiece = {
  version: 2;
  bpm: number;
  cycleGolpes: number;
  cycleBeatDurations: MetronomeBeatDurationPattern;
  subdivisionsPerGolpe: number;
  tracks: CompositorTrack[];
};

export const COMPOSITOR_INSTRUMENT_OPTIONS = [
  { id: "piano" as const, label: "Piano" },
  { id: "guitarra" as const, label: "Guitarra" },
  { id: "bateria" as const, label: "Batería" },
] as const;

export const COMPOSITOR_DRUM_SOUND_OPTIONS = [
  { id: "kick" as const, label: "Bombo" },
  { id: "snare" as const, label: "Caja" },
  { id: "hihat" as const, label: "Hi-hat" },
  { id: "silencio" as const, label: "Silencio" },
] as const;

export const COMPOSITOR_GUITAR_ARTICULATION_OPTIONS = [
  { id: "pua" as const, label: "Púa" },
  { id: "rasguido" as const, label: "Rasguido" },
  { id: "silencio" as const, label: "Silencio" },
] as const;

type LegacyCompositorTrack = {
  instrumentId: CompositorInstrumentId;
  enabled: boolean;
  levels: MetronomeBeatLevel[];
  notes: CompositorSlotNote[];
  drumSounds: CompositorDrumSound[];
  guitarArticulations: CompositorGuitarArticulation[];
};

type LegacyCompositorPiece = {
  bpm: number;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  tracks: LegacyCompositorTrack[];
};

function createEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createCompositorEvent(
  partial: Partial<CompositorTrackEvent> = {},
): CompositorTrackEvent {
  return {
    id: partial.id ?? createEventId(),
    startStep: partial.startStep ?? 0,
    durationSteps: Math.max(1, partial.durationSteps ?? 1),
    level: partial.level ?? "medio",
    note: partial.note ?? { note: "C", octave: 4 },
    drumSound: partial.drumSound ?? "kick",
    guitarArticulation: partial.guitarArticulation ?? "pua",
  };
}

function normalizeEvent(
  event: CompositorTrackEvent,
  gridSteps: number,
): CompositorTrackEvent {
  const durationSteps = Math.max(
    1,
    Math.min(gridSteps, Math.round(event.durationSteps)),
  );
  const maxStart = Math.max(0, gridSteps - durationSteps);
  const startStep = Math.max(
    0,
    Math.min(maxStart, Math.round(event.startStep)),
  );

  return {
    id: event.id || createEventId(),
    startStep,
    durationSteps,
    level: event.level ?? "medio",
    note: {
      note: event.note?.note ?? "C",
      octave: clampTargetOctave(event.note?.octave ?? 4),
    },
    drumSound: event.drumSound ?? "kick",
    guitarArticulation: event.guitarArticulation ?? "pua",
  };
}

function normalizeTrackEvents(
  events: CompositorTrackEvent[],
  gridSteps: number,
): CompositorTrackEvent[] {
  const normalized = events
    .slice(0, COMPOSITOR_MAX_EVENTS_PER_TRACK)
    .map((event) => normalizeEvent(event, gridSteps))
    .sort((left, right) => left.startStep - right.startStep);

  return normalized;
}

function createDefaultBateriaEvents(gridSteps: number): CompositorTrackEvent[] {
  const stepStride = Math.max(1, Math.floor(gridSteps / 10));

  return Array.from({ length: Math.min(10, gridSteps) }, (_, index) =>
    createCompositorEvent({
      startStep: index * stepStride,
      durationSteps: 1,
      level: "medio",
      drumSound:
        index % 4 === 0
          ? "kick"
          : index % 2 === 0
            ? "snare"
            : "hihat",
    }),
  );
}

function createDefaultGuitarraEvents(gridSteps: number): CompositorTrackEvent[] {
  const longDuration = Math.max(1, Math.floor(gridSteps * 0.3));
  const secondStart = Math.floor(gridSteps * 0.5);

  return [
    createCompositorEvent({
      startStep: 0,
      durationSteps: longDuration,
      level: "medio",
      note: { note: "G", octave: 3 },
      guitarArticulation: "rasguido",
    }),
    createCompositorEvent({
      startStep: secondStart,
      durationSteps: longDuration,
      level: "medio",
      note: { note: "C", octave: 4 },
      guitarArticulation: "rasguido",
    }),
  ];
}

function createDefaultPianoEvents(gridSteps: number): CompositorTrackEvent[] {
  const startStep = Math.floor(gridSteps * 0.4);
  const durationSteps = Math.max(1, Math.floor(gridSteps * 0.2));

  return [
    createCompositorEvent({
      startStep,
      durationSteps,
      level: "medio",
      note: { note: "E", octave: 4 },
    }),
  ];
}

export function createDefaultTrack(
  instrumentId: CompositorInstrumentId,
  enabled: boolean,
  gridSteps: number,
): CompositorTrack {
  const events =
    instrumentId === "bateria"
      ? createDefaultBateriaEvents(gridSteps)
      : instrumentId === "guitarra"
        ? createDefaultGuitarraEvents(gridSteps)
        : createDefaultPianoEvents(gridSteps);

  return {
    instrumentId,
    enabled,
    events,
  };
}

export function createDefaultCompositorPiece(): CompositorPiece {
  const cycleGolpes = 10;
  const subdivisionsPerGolpe = COMPOSITOR_SUBDIVISIONS_PER_GOLPE;
  const gridSteps = cycleGolpes * subdivisionsPerGolpe;

  return normalizeCompositorPiece({
    version: 2,
    bpm: 60,
    cycleGolpes,
    cycleBeatDurations: Array.from({ length: METRONOME_PATTERN_LENGTH }, () => "negra"),
    subdivisionsPerGolpe,
    tracks: [
      createDefaultTrack("piano", true, gridSteps),
      createDefaultTrack("guitarra", true, gridSteps),
      createDefaultTrack("bateria", true, gridSteps),
    ],
  });
}

export function normalizeCompositorPiece(piece: CompositorPiece): CompositorPiece {
  const cycleGolpes = Math.max(
    1,
    Math.min(METRONOME_PATTERN_LENGTH, Math.round(piece.cycleGolpes)),
  );
  const subdivisionsPerGolpe = Math.max(
    1,
    Math.min(8, Math.round(piece.subdivisionsPerGolpe)),
  );
  const gridSteps = cycleGolpes * subdivisionsPerGolpe;

  return {
    version: 2,
    bpm: piece.bpm,
    cycleGolpes,
    cycleBeatDurations: normalizeBeatDurationPattern(piece.cycleBeatDurations),
    subdivisionsPerGolpe,
    tracks: piece.tracks.map((track) => ({
      instrumentId: track.instrumentId,
      enabled: track.enabled,
      events: normalizeTrackEvents(track.events, gridSteps),
    })),
  };
}

export function getCompositorTrack(
  piece: CompositorPiece,
  instrumentId: CompositorInstrumentId,
): CompositorTrack {
  return (
    piece.tracks.find((track) => track.instrumentId === instrumentId) ??
    createDefaultTrack(
      instrumentId,
      false,
      getCompositorGridSteps(piece),
    )
  );
}

export function getDrumSoundLabel(sound: CompositorDrumSound): string {
  return (
    COMPOSITOR_DRUM_SOUND_OPTIONS.find((option) => option.id === sound)?.label ??
    sound
  );
}

export function getGuitarArticulationLabel(
  articulation: CompositorGuitarArticulation,
): string {
  return (
    COMPOSITOR_GUITAR_ARTICULATION_OPTIONS.find(
      (option) => option.id === articulation,
    )?.label ?? articulation
  );
}

export function getInstrumentLabel(
  instrumentId: CompositorInstrumentId,
): string {
  return (
    COMPOSITOR_INSTRUMENT_OPTIONS.find((option) => option.id === instrumentId)
      ?.label ?? instrumentId
  );
}

export function setCompositorCycleGolpes(
  piece: CompositorPiece,
  nextGolpes: number,
): CompositorPiece {
  const oldGridSteps = getCompositorGridSteps(piece);
  const cycleGolpes = Math.max(
    1,
    Math.min(METRONOME_PATTERN_LENGTH, Math.round(nextGolpes)),
  );
  const newGridSteps = cycleGolpes * piece.subdivisionsPerGolpe;

  return normalizeCompositorPiece({
    ...piece,
    cycleGolpes,
    tracks: piece.tracks.map((track) => ({
      ...track,
      events: rescaleTrackEvents(track.events, oldGridSteps, newGridSteps),
    })),
  });
}

export function setCompositorCycleBeatDurationAtSlot(
  piece: CompositorPiece,
  slotIndex: number,
  duration: MetronomeBeatDuration,
): CompositorPiece {
  const cycleBeatDurations = normalizeBeatDurationPattern(piece.cycleBeatDurations);
  const index = Math.max(0, Math.min(METRONOME_PATTERN_LENGTH - 1, slotIndex));
  cycleBeatDurations[index] = duration;

  return normalizeCompositorPiece({
    ...piece,
    cycleBeatDurations,
  });
}

export function setCompositorSubdivisionsPerGolpe(
  piece: CompositorPiece,
  subdivisionsPerGolpe: number,
): CompositorPiece {
  const oldGridSteps = getCompositorGridSteps(piece);
  const nextSubdivisions = Math.max(1, Math.min(8, Math.round(subdivisionsPerGolpe)));
  const newGridSteps = piece.cycleGolpes * nextSubdivisions;

  return normalizeCompositorPiece({
    ...piece,
    subdivisionsPerGolpe: nextSubdivisions,
    tracks: piece.tracks.map((track) => ({
      ...track,
      events: rescaleTrackEvents(track.events, oldGridSteps, newGridSteps),
    })),
  });
}

export function addCompositorTrackEvent(
  piece: CompositorPiece,
  instrumentId: CompositorInstrumentId,
  partial: Partial<CompositorTrackEvent> = {},
): CompositorPiece {
  const track = getCompositorTrack(piece, instrumentId);
  const gridSteps = getCompositorGridSteps(piece);

  if (track.events.length >= COMPOSITOR_MAX_EVENTS_PER_TRACK) {
    return piece;
  }

  const startStep =
    partial.startStep ??
    Math.max(0, gridSteps - Math.max(1, partial.durationSteps ?? 1));

  const tracks = piece.tracks.map((entry) => {
    if (entry.instrumentId !== instrumentId) {
      return entry;
    }

    return {
      ...entry,
      events: normalizeTrackEvents(
        [...entry.events, createCompositorEvent({ ...partial, startStep })],
        gridSteps,
      ),
    };
  });

  return normalizeCompositorPiece({ ...piece, tracks });
}

export function updateCompositorTrackEvent(
  piece: CompositorPiece,
  instrumentId: CompositorInstrumentId,
  eventId: string,
  patch: Partial<CompositorTrackEvent>,
): CompositorPiece {
  const gridSteps = getCompositorGridSteps(piece);

  const tracks = piece.tracks.map((track) => {
    if (track.instrumentId !== instrumentId) {
      return track;
    }

    return {
      ...track,
      events: normalizeTrackEvents(
        track.events.map((event) =>
          event.id === eventId ? { ...event, ...patch, id: event.id } : event,
        ),
        gridSteps,
      ),
    };
  });

  return normalizeCompositorPiece({ ...piece, tracks });
}

export function removeCompositorTrackEvent(
  piece: CompositorPiece,
  instrumentId: CompositorInstrumentId,
  eventId: string,
): CompositorPiece {
  const tracks = piece.tracks.map((track) => {
    if (track.instrumentId !== instrumentId) {
      return track;
    }

    return {
      ...track,
      events: track.events.filter((event) => event.id !== eventId),
    };
  });

  return normalizeCompositorPiece({ ...piece, tracks });
}

export function toggleCompositorTrack(
  piece: CompositorPiece,
  instrumentId: CompositorInstrumentId,
  enabled: boolean,
): CompositorPiece {
  const tracks = piece.tracks.map((track) =>
    track.instrumentId === instrumentId ? { ...track, enabled } : track,
  );

  return normalizeCompositorPiece({ ...piece, tracks });
}

function migrateLegacyPiece(legacy: LegacyCompositorPiece): CompositorPiece {
  const cycleGolpes = Math.max(
    1,
    Math.min(METRONOME_PATTERN_LENGTH, Math.round(legacy.patternLength)),
  );
  const subdivisionsPerGolpe = COMPOSITOR_SUBDIVISIONS_PER_GOLPE;
  const gridSteps = cycleGolpes * subdivisionsPerGolpe;

  const tracks = legacy.tracks.map((track) => {
    const events: CompositorTrackEvent[] = [];

    for (let index = 0; index < cycleGolpes; index += 1) {
      const level = track.levels[index] ?? "silencio";
      const drumSound = track.drumSounds[index] ?? "silencio";
      const guitarArticulation = track.guitarArticulations[index] ?? "pua";
      const hasSound =
        level !== "silencio" &&
        (track.instrumentId !== "bateria" || drumSound !== "silencio") &&
        (track.instrumentId !== "guitarra" || guitarArticulation !== "silencio");

      if (!hasSound) {
        continue;
      }

      const startStep = Math.floor((index / cycleGolpes) * gridSteps);
      const durationSteps = Math.max(
        1,
        Math.floor(gridSteps / cycleGolpes),
      );

      events.push(
        createCompositorEvent({
          startStep,
          durationSteps,
          level,
          note: track.notes[index] ?? { note: "C", octave: 4 },
          drumSound,
          guitarArticulation,
        }),
      );
    }

    return {
      instrumentId: track.instrumentId,
      enabled: track.enabled,
      events:
        events.length > 0
          ? events
          : createDefaultTrack(track.instrumentId, track.enabled, gridSteps)
              .events,
    };
  });

  return normalizeCompositorPiece({
    version: 2,
    bpm: legacy.bpm,
    cycleGolpes,
    cycleBeatDurations: legacy.beatDurations,
    subdivisionsPerGolpe,
    tracks,
  });
}

function parseStoredPiece(raw: string): CompositorPiece | null {
  try {
    const parsed = JSON.parse(raw) as CompositorPiece | LegacyCompositorPiece;

    if (parsed && typeof parsed === "object" && "version" in parsed && parsed.version === 2) {
      return normalizeCompositorPiece(parsed as CompositorPiece);
    }

    if (parsed && typeof parsed === "object" && "patternLength" in parsed) {
      return migrateLegacyPiece(parsed as LegacyCompositorPiece);
    }

    return null;
  } catch {
    return null;
  }
}

export function readStoredCompositorPiece(): CompositorPiece | null {
  if (typeof window === "undefined") {
    return null;
  }

  const v2 = localStorage.getItem(COMPOSITOR_STORAGE_KEY);

  if (v2) {
    return parseStoredPiece(v2);
  }

  const legacy = localStorage.getItem(COMPOSITOR_LEGACY_STORAGE_KEY);

  if (legacy) {
    return parseStoredPiece(legacy);
  }

  return null;
}

export function writeStoredCompositorPiece(piece: CompositorPiece): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      COMPOSITOR_STORAGE_KEY,
      JSON.stringify(normalizeCompositorPiece(piece)),
    );
  } catch {
    // localStorage unavailable
  }
}

export function formatCompositorCycleSummary(piece: CompositorPiece): string {
  const seconds = getCompositorCycleDurationSeconds(piece);
  return `Ciclo de ${piece.cycleGolpes} golpes · ~${seconds.toFixed(1)} s · ${piece.bpm} BPM`;
}
