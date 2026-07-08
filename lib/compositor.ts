import {
  getCompositorCycleDurationSeconds,
  getCompositorGridSteps,
  rescaleTrackEvents,
} from "@/lib/compositor-timeline";
import {
  DEFAULT_TONALIDAD,
  normalizeNotaIndex,
  NOTAS_ES,
  type NotaIndex,
} from "@/lib/cifrado";
import {
  DEFAULT_MODO_TONAL,
  MODOS_TONALES,
  normalizeModoTonal,
  type ModoTonal,
} from "@/lib/cifrado-escala";
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
import { clampTargetOctave, createVozTarget } from "@/lib/voz";
import { clampEventDurationSteps } from "@/lib/compositor-timeline-layout";
import type { Modificador } from "@/lib/cifrado";
import {
  clampGradoCromatico,
  clampMelodicOctaveForInstrument,
  isMelodicCompositorInstrument,
  melodicPitchFromAbsoluteNote,
  resolveMelodicPitchToNote,
} from "@/lib/compositor-melodic-pitch";

export const COMPOSITOR_STORAGE_KEY = "compositor-piece-v2";
export const COMPOSITOR_LEGACY_STORAGE_KEY = "compositor-piece-v1";
export const COMPOSITOR_SUBDIVISIONS_PER_GOLPE = 4;
export const COMPOSITOR_MAX_EVENTS_PER_TRACK = 24;

export type CompositorInstrumentId = "piano" | "guitarra" | "bateria" | "viento";

export type CompositorDrumSound =
  | "kick"
  | "snare"
  | "hihat"
  | "hihatOpen"
  | "crash"
  | "ride"
  | "silencio";

export type CompositorGuitarArticulation =
  | "pua"
  | "rasguido"
  | "bloque"
  | "dedo"
  | "silencio";

export function isGuitarChordArticulation(
  articulation: CompositorGuitarArticulation,
): boolean {
  return articulation === "rasguido" || articulation === "bloque";
}

export type CompositorSlotNote = VozTarget;

export type CompositorTrackEvent = {
  id: string;
  startStep: number;
  durationSteps: number;
  level: MetronomeBeatLevel;
  /** Grado cromático 1–12 desde la tónica del ciclo (melodías). */
  gradoCromatico: number;
  /** Octava del evento (2–5 según capa). */
  octavaRelativa: number;
  /**
   * Modificador para reproducir/interpretar este evento como acorde.
   * - Guitarra: aplica cuando `guitarArticulation` es rasguido o bloque.
   * - Piano: aplica cuando `pianoHarmonyMode === "acorde"`.
   * - Viento: se ignora (solo notas).
   */
  chordModifier: Modificador;
  /** Solo piano: "nota" (default) o "acorde". */
  pianoHarmonyMode: "nota" | "acorde";
  /** Legacy / caché; no usar como fuente de verdad en melodías. */
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
  tonalidadComposicion: NotaIndex;
  modoTonalComposicion: ModoTonal;
  tracks: CompositorTrack[];
};

export function formatCompositorTonalidadLabel(
  tonalidadComposicion: NotaIndex,
  modoTonalComposicion: ModoTonal = DEFAULT_MODO_TONAL,
): string {
  const modoLabel =
    MODOS_TONALES.find((item) => item.id === modoTonalComposicion)?.label ??
    "Mayor";

  return `${NOTAS_ES[tonalidadComposicion]} ${modoLabel.toLowerCase()}`;
}

export const COMPOSITOR_MELODIC_INSTRUMENT_IDS = [
  "piano",
  "guitarra",
  "viento",
] as const satisfies readonly CompositorInstrumentId[];

export type CompositorMelodicInstrumentId =
  (typeof COMPOSITOR_MELODIC_INSTRUMENT_IDS)[number];

export const COMPOSITOR_INSTRUMENT_OPTIONS = [
  { id: "bateria" as const, label: "Batería" },
  { id: "guitarra" as const, label: "Guitarra" },
  { id: "piano" as const, label: "Piano" },
  { id: "viento" as const, label: "Viento" },
] as const;

const COMPOSITOR_INSTRUMENT_ORDER = COMPOSITOR_INSTRUMENT_OPTIONS.map(
  (option) => option.id,
);

function sortCompositorTracks(tracks: CompositorTrack[]): CompositorTrack[] {
  return [...tracks].sort(
    (left, right) =>
      COMPOSITOR_INSTRUMENT_ORDER.indexOf(left.instrumentId) -
      COMPOSITOR_INSTRUMENT_ORDER.indexOf(right.instrumentId),
  );
}

export const COMPOSITOR_DRUM_SOUND_OPTIONS = [
  { id: "kick" as const, label: "Bombo" },
  { id: "snare" as const, label: "Caja" },
  { id: "hihat" as const, label: "Hi-hat" },
  { id: "hihatOpen" as const, label: "Hi-hat abierto" },
  { id: "crash" as const, label: "Platillo crash" },
  { id: "ride" as const, label: "Platillo ride" },
  { id: "silencio" as const, label: "Silencio" },
] as const;

export const COMPOSITOR_GUITAR_ARTICULATION_OPTIONS = [
  { id: "pua" as const, label: "Púa" },
  { id: "rasguido" as const, label: "Rasguido" },
  { id: "bloque" as const, label: "Bloque" },
  { id: "dedo" as const, label: "Dedo" },
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
  const note = partial.note ?? createVozTarget("C");

  return {
    id: partial.id ?? createEventId(),
    startStep: partial.startStep ?? 0,
    durationSteps: Math.max(1, partial.durationSteps ?? 1),
    level: partial.level ?? "medio",
    gradoCromatico: partial.gradoCromatico ?? 1,
    octavaRelativa: partial.octavaRelativa ?? note.octave,
    chordModifier: partial.chordModifier ?? "",
    pianoHarmonyMode: partial.pianoHarmonyMode ?? "nota",
    note,
    drumSound: partial.drumSound ?? "kick",
    guitarArticulation: partial.guitarArticulation ?? "pua",
  };
}

function normalizeEvent(
  event: CompositorTrackEvent,
  gridSteps: number,
  instrumentId: CompositorInstrumentId,
  subdivisionsPerGolpe: number,
  tonalidadComposicion: NotaIndex,
): CompositorTrackEvent {
  const noteOctave = clampTargetOctave(
    event.note?.octave ?? createVozTarget("C").octave,
  );

  const draft: CompositorTrackEvent = {
    id: event.id || createEventId(),
    startStep: event.startStep,
    durationSteps: event.durationSteps,
    level: event.level ?? "medio",
    note: {
      note: event.note?.note ?? "C",
      octave: noteOctave,
    },
    gradoCromatico: event.gradoCromatico ?? 1,
    octavaRelativa: event.octavaRelativa ?? noteOctave,
    chordModifier: (event.chordModifier ?? "") as Modificador,
    pianoHarmonyMode: event.pianoHarmonyMode === "acorde" ? "acorde" : "nota",
    drumSound: event.drumSound ?? "kick",
    guitarArticulation: event.guitarArticulation ?? "pua",
  };

  if (isMelodicCompositorInstrument(instrumentId)) {
    const hasStoredPitch =
      typeof event.gradoCromatico === "number" &&
      typeof event.octavaRelativa === "number";

    const pitch = hasStoredPitch
      ? {
          gradoCromatico: clampGradoCromatico(event.gradoCromatico),
          octavaRelativa: clampMelodicOctaveForInstrument(
            event.octavaRelativa,
            instrumentId,
          ),
        }
      : melodicPitchFromAbsoluteNote(draft.note, tonalidadComposicion);

    draft.gradoCromatico = pitch.gradoCromatico;
    draft.octavaRelativa = clampMelodicOctaveForInstrument(
      pitch.octavaRelativa,
      instrumentId,
    );
    draft.note = resolveMelodicPitchToNote(
      {
        gradoCromatico: clampGradoCromatico(draft.gradoCromatico),
        octavaRelativa: draft.octavaRelativa,
      },
      tonalidadComposicion,
    );
  }

  const durationSteps = clampEventDurationSteps(
    instrumentId,
    draft,
    draft.durationSteps,
    gridSteps,
    subdivisionsPerGolpe,
  );
  const maxStart = Math.max(0, gridSteps - durationSteps);
  const startStep = Math.max(
    0,
    Math.min(maxStart, Math.round(draft.startStep)),
  );

  return {
    ...draft,
    startStep,
    durationSteps,
  };
}

function normalizeTrackEvents(
  events: CompositorTrackEvent[],
  gridSteps: number,
  instrumentId: CompositorInstrumentId,
  subdivisionsPerGolpe: number,
  tonalidadComposicion: NotaIndex,
): CompositorTrackEvent[] {
  const normalized = events
    .map((event) =>
      normalizeEvent(
        event,
        gridSteps,
        instrumentId,
        subdivisionsPerGolpe,
        tonalidadComposicion,
      ),
    )
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
      gradoCromatico: 8,
      octavaRelativa: 3,
      guitarArticulation: "rasguido",
    }),
    createCompositorEvent({
      startStep: secondStart,
      durationSteps: longDuration,
      level: "medio",
      gradoCromatico: 1,
      octavaRelativa: 4,
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
      gradoCromatico: 3,
      octavaRelativa: 4,
    }),
  ];
}

function createDefaultVientoEvents(gridSteps: number): CompositorTrackEvent[] {
  const stepStride = Math.max(1, Math.floor(gridSteps / 6));

  return [
    createCompositorEvent({
      startStep: stepStride,
      durationSteps: Math.max(1, stepStride),
      level: "suave",
      gradoCromatico: 8,
      octavaRelativa: 4,
    }),
    createCompositorEvent({
      startStep: stepStride * 3,
      durationSteps: Math.max(1, stepStride),
      level: "medio",
      gradoCromatico: 1,
      octavaRelativa: 5,
    }),
  ];
}

export function createEmptyCompositorTrack(
  instrumentId: CompositorInstrumentId,
  enabled: boolean,
): CompositorTrack {
  return {
    instrumentId,
    enabled,
    events: [],
  };
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
        : instrumentId === "viento"
          ? createDefaultVientoEvents(gridSteps)
          : createDefaultPianoEvents(gridSteps);

  return {
    instrumentId,
    enabled,
    events,
  };
}

export function createDefaultCompositorPiece(): CompositorPiece {
  const cycleGolpes = 4;
  const subdivisionsPerGolpe = COMPOSITOR_SUBDIVISIONS_PER_GOLPE;

  return normalizeCompositorPiece({
    version: 2,
    bpm: 60,
    cycleGolpes,
    cycleBeatDurations: Array.from({ length: METRONOME_PATTERN_LENGTH }, () => "negra"),
    subdivisionsPerGolpe,
    tonalidadComposicion: DEFAULT_TONALIDAD,
    modoTonalComposicion: DEFAULT_MODO_TONAL,
    tracks: [
      createEmptyCompositorTrack("bateria", true),
      createEmptyCompositorTrack("guitarra", true),
      createEmptyCompositorTrack("piano", true),
      createEmptyCompositorTrack("viento", true),
    ],
  });
}

function ensureAllInstrumentTracks(piece: CompositorPiece): CompositorTrack[] {
  const existingIds = new Set(piece.tracks.map((track) => track.instrumentId));
  const tracks = [...piece.tracks];

  for (const option of COMPOSITOR_INSTRUMENT_OPTIONS) {
    if (!existingIds.has(option.id)) {
      tracks.push(createEmptyCompositorTrack(option.id, false));
    }
  }

  return tracks;
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
    tonalidadComposicion: normalizeNotaIndex(
      piece.tonalidadComposicion ?? DEFAULT_TONALIDAD,
    ),
    modoTonalComposicion: normalizeModoTonal(
      piece.modoTonalComposicion ?? DEFAULT_MODO_TONAL,
    ),
    tracks: sortCompositorTracks(
      ensureAllInstrumentTracks(piece).map((track) => ({
        instrumentId: track.instrumentId,
        enabled: track.enabled,
        events: normalizeTrackEvents(
          track.events,
          gridSteps,
          track.instrumentId,
          subdivisionsPerGolpe,
          piece.tonalidadComposicion ?? DEFAULT_TONALIDAD,
        ),
      })),
    ),
  };
}

export function getCompositorTrack(
  piece: CompositorPiece,
  instrumentId: CompositorInstrumentId,
): CompositorTrack {
  return (
    piece.tracks.find((track) => track.instrumentId === instrumentId) ??
    createEmptyCompositorTrack(instrumentId, false)
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

export type CompositorTrackCapacityReport = {
  instrumentId: CompositorInstrumentId;
  count: number;
  max: number;
  overflow: number;
};

export function getTrackCapacityReports(
  piece: CompositorPiece,
  max = COMPOSITOR_MAX_EVENTS_PER_TRACK,
): CompositorTrackCapacityReport[] {
  return piece.tracks
    .map((track) => ({
      instrumentId: track.instrumentId,
      count: track.events.length,
      max,
      overflow: Math.max(0, track.events.length - max),
    }))
    .filter((report) => report.overflow > 0);
}

export function pieceHasTrackOverflow(
  piece: CompositorPiece,
  max = COMPOSITOR_MAX_EVENTS_PER_TRACK,
): boolean {
  return getTrackCapacityReports(piece, max).length > 0;
}

export function isTrackAtCapacity(
  track: CompositorTrack,
  max = COMPOSITOR_MAX_EVENTS_PER_TRACK,
): boolean {
  return track.events.length >= max;
}

export function formatTrackCapacityLabel(
  count: number,
  max = COMPOSITOR_MAX_EVENTS_PER_TRACK,
): string {
  return `${count}/${max} bloque${count === 1 ? "" : "s"}`;
}

export function formatTrackOverflowDetails(piece: CompositorPiece): string {
  return getTrackCapacityReports(piece)
    .map(
      (report) =>
        `${getInstrumentLabel(report.instrumentId)} tiene ${report.count} bloques (máximo ${report.max})`,
    )
    .join("; ");
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

export function setCompositorTonalidadComposicion(
  piece: CompositorPiece,
  tonalidadComposicion: NotaIndex,
): CompositorPiece {
  return normalizeCompositorPiece({
    ...piece,
    tonalidadComposicion: normalizeNotaIndex(tonalidadComposicion),
  });
}

export function setCompositorModoTonalComposicion(
  piece: CompositorPiece,
  modoTonalComposicion: ModoTonal,
): CompositorPiece {
  return normalizeCompositorPiece({
    ...piece,
    modoTonalComposicion: normalizeModoTonal(modoTonalComposicion),
  });
}

export function pieceHasCompositorEvents(piece: CompositorPiece): boolean {
  return piece.tracks.some((track) => track.events.length > 0);
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
        instrumentId,
        piece.subdivisionsPerGolpe,
        piece.tonalidadComposicion,
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
        instrumentId,
        piece.subdivisionsPerGolpe,
        piece.tonalidadComposicion,
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

export function isCompositorCycleLayer(track: CompositorTrack): boolean {
  return track.enabled;
}

export function getCompositorCycleLayerTracks(
  piece: CompositorPiece,
): CompositorTrack[] {
  return piece.tracks.filter(isCompositorCycleLayer);
}

export function applyCompositorListenMutes(
  piece: CompositorPiece,
  mutedInstrumentIds: ReadonlySet<CompositorInstrumentId>,
): CompositorPiece {
  if (mutedInstrumentIds.size === 0) {
    return piece;
  }

  return normalizeCompositorPiece({
    ...piece,
    tracks: piece.tracks.map((track) => ({
      ...track,
      enabled: mutedInstrumentIds.has(track.instrumentId)
        ? false
        : track.enabled,
    })),
  });
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
          note: track.notes[index] ?? createVozTarget("C"),
          drumSound,
          guitarArticulation,
        }),
      );
    }

    return {
      instrumentId: track.instrumentId,
      enabled: track.enabled,
      events,
    };
  });

  return normalizeCompositorPiece({
    version: 2,
    bpm: legacy.bpm,
    cycleGolpes,
    cycleBeatDurations: legacy.beatDurations,
    subdivisionsPerGolpe,
    tonalidadComposicion: DEFAULT_TONALIDAD,
    modoTonalComposicion: DEFAULT_MODO_TONAL,
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

function compositorPieceWithoutEventIds(piece: CompositorPiece): CompositorPiece {
  return {
    ...piece,
    tracks: piece.tracks.map((track) => ({
      ...track,
      events: track.events.map((event) => ({
        ...event,
        id: "",
      })),
    })),
  };
}

export function compositorPiecesEqualContent(
  left: CompositorPiece,
  right: CompositorPiece,
): boolean {
  const normalizedLeft = compositorPieceWithoutEventIds(normalizeCompositorPiece(left));
  const normalizedRight = compositorPieceWithoutEventIds(normalizeCompositorPiece(right));

  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}

export function isDefaultCompositorPiece(piece: CompositorPiece): boolean {
  return compositorPiecesEqualContent(piece, createDefaultCompositorPiece());
}

export function cloneCompositorPiece(piece: CompositorPiece): CompositorPiece {
  return normalizeCompositorPiece(
    JSON.parse(JSON.stringify(piece)) as CompositorPiece,
  );
}

export type CompositorPresetId = "4-4" | "3-4" | "6-8";

export type CompositorPreset = {
  id: CompositorPresetId;
  label: string;
  descripcion: string;
  piece: CompositorPiece;
};

export const COMPOSITOR_PRESETS: CompositorPreset[] = [
  {
    id: "4-4",
    label: "4/4",
    descripcion: "Cuatro tiempos · rock, cumbia, folclore",
    piece: normalizeCompositorPiece({
      version: 2,
      bpm: 80,
      cycleGolpes: 4,
      cycleBeatDurations: [
        "negra",
        "negra",
        "negra",
        "negra",
        ...Array(METRONOME_PATTERN_LENGTH - 4).fill("negra"),
      ] as MetronomeBeatDurationPattern,
      subdivisionsPerGolpe: COMPOSITOR_SUBDIVISIONS_PER_GOLPE,
      tonalidadComposicion: DEFAULT_TONALIDAD,
      modoTonalComposicion: DEFAULT_MODO_TONAL,
      tracks: [
        {
          instrumentId: "bateria",
          enabled: true,
          events: [
            createCompositorEvent({
              startStep: 0,
              durationSteps: 1,
              level: "fuerte",
              drumSound: "kick",
            }),
            createCompositorEvent({
              startStep: 4,
              durationSteps: 1,
              level: "medio",
              drumSound: "hihat",
            }),
            createCompositorEvent({
              startStep: 8,
              durationSteps: 1,
              level: "fuerte",
              drumSound: "snare",
            }),
            createCompositorEvent({
              startStep: 12,
              durationSteps: 1,
              level: "medio",
              drumSound: "hihat",
            }),
          ],
        },
        {
          instrumentId: "guitarra",
          enabled: true,
          events: [
            createCompositorEvent({
              startStep: 0,
              durationSteps: 6,
              level: "medio",
              note: { note: "G", octave: 3 },
              guitarArticulation: "rasguido",
            }),
            createCompositorEvent({
              startStep: 8,
              durationSteps: 6,
              level: "medio",
              note: { note: "C", octave: 4 },
              guitarArticulation: "rasguido",
            }),
          ],
        },
        {
          instrumentId: "piano",
          enabled: false,
          events: [],
        },
      ],
    }),
  },
  {
    id: "3-4",
    label: "3/4",
    descripcion: "Tres tiempos · vals, chamamé",
    piece: normalizeCompositorPiece({
      version: 2,
      bpm: 120,
      cycleGolpes: 3,
      cycleBeatDurations: [
        "negra",
        "negra",
        "negra",
        ...Array(METRONOME_PATTERN_LENGTH - 3).fill("negra"),
      ] as MetronomeBeatDurationPattern,
      subdivisionsPerGolpe: COMPOSITOR_SUBDIVISIONS_PER_GOLPE,
      tonalidadComposicion: DEFAULT_TONALIDAD,
      modoTonalComposicion: DEFAULT_MODO_TONAL,
      tracks: [
        {
          instrumentId: "bateria",
          enabled: true,
          events: [
            createCompositorEvent({
              startStep: 0,
              durationSteps: 1,
              level: "fuerte",
              drumSound: "kick",
            }),
            createCompositorEvent({
              startStep: 4,
              durationSteps: 1,
              level: "suave",
              drumSound: "hihat",
            }),
            createCompositorEvent({
              startStep: 8,
              durationSteps: 1,
              level: "suave",
              drumSound: "hihat",
            }),
          ],
        },
        {
          instrumentId: "guitarra",
          enabled: true,
          events: [
            createCompositorEvent({
              startStep: 0,
              durationSteps: 3,
              level: "fuerte",
              note: { note: "G", octave: 3 },
              guitarArticulation: "rasguido",
            }),
            createCompositorEvent({
              startStep: 4,
              durationSteps: 3,
              level: "suave",
              note: { note: "G", octave: 3 },
              guitarArticulation: "rasguido",
            }),
            createCompositorEvent({
              startStep: 8,
              durationSteps: 3,
              level: "suave",
              note: { note: "G", octave: 3 },
              guitarArticulation: "rasguido",
            }),
          ],
        },
        {
          instrumentId: "piano",
          enabled: false,
          events: [],
        },
      ],
    }),
  },
  {
    id: "6-8",
    label: "6/8",
    descripcion: "Seis por ocho · milonga, zamba",
    piece: normalizeCompositorPiece({
      version: 2,
      bpm: 80,
      cycleGolpes: 6,
      cycleBeatDurations: [
        "corchea",
        "corchea",
        "corchea",
        "corchea",
        "corchea",
        "corchea",
        ...Array(METRONOME_PATTERN_LENGTH - 6).fill("corchea"),
      ] as MetronomeBeatDurationPattern,
      subdivisionsPerGolpe: COMPOSITOR_SUBDIVISIONS_PER_GOLPE,
      tonalidadComposicion: DEFAULT_TONALIDAD,
      modoTonalComposicion: DEFAULT_MODO_TONAL,
      tracks: [
        {
          instrumentId: "bateria",
          enabled: true,
          events: [
            createCompositorEvent({
              startStep: 0,
              durationSteps: 1,
              level: "fuerte",
              drumSound: "kick",
            }),
            createCompositorEvent({
              startStep: 4,
              durationSteps: 1,
              level: "suave",
              drumSound: "hihat",
            }),
            createCompositorEvent({
              startStep: 8,
              durationSteps: 1,
              level: "suave",
              drumSound: "hihat",
            }),
            createCompositorEvent({
              startStep: 12,
              durationSteps: 1,
              level: "fuerte",
              drumSound: "snare",
            }),
            createCompositorEvent({
              startStep: 16,
              durationSteps: 1,
              level: "suave",
              drumSound: "hihat",
            }),
            createCompositorEvent({
              startStep: 20,
              durationSteps: 1,
              level: "suave",
              drumSound: "hihat",
            }),
          ],
        },
        {
          instrumentId: "guitarra",
          enabled: true,
          events: [
            createCompositorEvent({
              startStep: 0,
              durationSteps: 5,
              level: "fuerte",
              note: { note: "G", octave: 3 },
              guitarArticulation: "rasguido",
            }),
            createCompositorEvent({
              startStep: 12,
              durationSteps: 5,
              level: "fuerte",
              note: { note: "G", octave: 3 },
              guitarArticulation: "rasguido",
            }),
          ],
        },
        {
          instrumentId: "piano",
          enabled: false,
          events: [],
        },
      ],
    }),
  },
];

export function getCompositorPresetById(
  presetId: CompositorPresetId,
): CompositorPreset | undefined {
  return COMPOSITOR_PRESETS.find((preset) => preset.id === presetId);
}
