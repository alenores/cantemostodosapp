import {
  BPM_DEFAULT,
  METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
  METRONOME_PATTERN_DEFAULT,
  METRONOME_PATTERN_LENGTH,
  METRONOME_PATTERN_LENGTH_DEFAULT,
  normalizeBeatDurationPattern,
  normalizeMetronomePattern,
  resizeMetronomePatternLength,
  type MetronomeBeatDuration,
  type MetronomeBeatDurationPattern,
  type MetronomeBeatLevel,
  type MetronomeBeatPattern,
} from "@/lib/metronomo";
import type { VozTarget } from "@/lib/voz";
import { clampTargetOctave } from "@/lib/voz";

export const COMPOSITOR_STORAGE_KEY = "compositor-piece-v1";

export type CompositorInstrumentId = "piano" | "guitarra" | "bateria";

export type CompositorDrumSound = "kick" | "snare" | "hihat" | "silencio";

export type CompositorGuitarArticulation = "pua" | "rasguido" | "silencio";

export type CompositorSlotNote = VozTarget;

export type CompositorTrack = {
  instrumentId: CompositorInstrumentId;
  enabled: boolean;
  levels: MetronomeBeatPattern;
  notes: CompositorSlotNote[];
  drumSounds: CompositorDrumSound[];
  guitarArticulations: CompositorGuitarArticulation[];
};

export type CompositorPiece = {
  bpm: number;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
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

const DEFAULT_MELODY_NOTES: CompositorSlotNote[] = [
  { note: "C", octave: 4 },
  { note: "E", octave: 4 },
  { note: "G", octave: 4 },
  { note: "C", octave: 4 },
  { note: "C", octave: 4 },
  { note: "C", octave: 4 },
  { note: "C", octave: 4 },
  { note: "C", octave: 4 },
  { note: "C", octave: 4 },
  { note: "C", octave: 4 },
];

const DEFAULT_DRUM_SOUNDS: CompositorDrumSound[] = [
  "kick",
  "snare",
  "hihat",
  "snare",
  "silencio",
  "silencio",
  "silencio",
  "silencio",
  "silencio",
  "silencio",
];

const DEFAULT_GUITAR_ARTICULATIONS: CompositorGuitarArticulation[] = [
  "pua",
  "pua",
  "pua",
  "rasguido",
  "silencio",
  "silencio",
  "silencio",
  "silencio",
  "silencio",
  "silencio",
];

function normalizeSlotNotes(notes: CompositorSlotNote[]): CompositorSlotNote[] {
  const normalized = notes.slice(0, METRONOME_PATTERN_LENGTH);

  while (normalized.length < METRONOME_PATTERN_LENGTH) {
    normalized.push({ note: "C", octave: 4 });
  }

  return normalized.map((entry) => ({
    note: entry.note,
    octave: clampTargetOctave(entry.octave),
  }));
}

function normalizeDrumSounds(sounds: CompositorDrumSound[]): CompositorDrumSound[] {
  const normalized = sounds.slice(0, METRONOME_PATTERN_LENGTH);

  while (normalized.length < METRONOME_PATTERN_LENGTH) {
    normalized.push("silencio");
  }

  return normalized;
}

function normalizeGuitarArticulations(
  articulations: CompositorGuitarArticulation[],
): CompositorGuitarArticulation[] {
  const normalized = articulations.slice(0, METRONOME_PATTERN_LENGTH);

  while (normalized.length < METRONOME_PATTERN_LENGTH) {
    normalized.push("pua");
  }

  return normalized;
}

export function createDefaultTrack(
  instrumentId: CompositorInstrumentId,
  enabled: boolean,
): CompositorTrack {
  return {
    instrumentId,
    enabled,
    levels: [...METRONOME_PATTERN_DEFAULT],
    notes: normalizeSlotNotes(DEFAULT_MELODY_NOTES),
    drumSounds: [...DEFAULT_DRUM_SOUNDS],
    guitarArticulations: [...DEFAULT_GUITAR_ARTICULATIONS],
  };
}

export function createDefaultCompositorPiece(): CompositorPiece {
  return {
    bpm: BPM_DEFAULT,
    patternLength: METRONOME_PATTERN_LENGTH_DEFAULT,
    beatDurations: [...METRONOME_BEAT_DURATION_PATTERN_DEFAULT],
    tracks: [
      createDefaultTrack("piano", true),
      createDefaultTrack("guitarra", false),
      createDefaultTrack("bateria", true),
    ],
  };
}

export function normalizeCompositorPiece(piece: CompositorPiece): CompositorPiece {
  const patternLength = Math.max(
    1,
    Math.min(METRONOME_PATTERN_LENGTH, Math.round(piece.patternLength)),
  );

  return {
    bpm: piece.bpm,
    patternLength,
    beatDurations: normalizeBeatDurationPattern(piece.beatDurations),
    tracks: piece.tracks.map((track) => ({
      instrumentId: track.instrumentId,
      enabled: track.enabled,
      levels: normalizeMetronomePattern(track.levels),
      notes: normalizeSlotNotes(track.notes),
      drumSounds: normalizeDrumSounds(track.drumSounds),
      guitarArticulations: normalizeGuitarArticulations(track.guitarArticulations),
    })),
  };
}

export function getCompositorTrack(
  piece: CompositorPiece,
  instrumentId: CompositorInstrumentId,
): CompositorTrack {
  return (
    piece.tracks.find((track) => track.instrumentId === instrumentId) ??
    createDefaultTrack(instrumentId, false)
  );
}

export function cycleDrumSound(sound: CompositorDrumSound): CompositorDrumSound {
  const index = COMPOSITOR_DRUM_SOUND_OPTIONS.findIndex(
    (option) => option.id === sound,
  );
  const safeIndex = index === -1 ? 0 : index;
  return COMPOSITOR_DRUM_SOUND_OPTIONS[
    (safeIndex + 1) % COMPOSITOR_DRUM_SOUND_OPTIONS.length
  ]!.id;
}

export function cycleGuitarArticulation(
  articulation: CompositorGuitarArticulation,
): CompositorGuitarArticulation {
  const index = COMPOSITOR_GUITAR_ARTICULATION_OPTIONS.findIndex(
    (option) => option.id === articulation,
  );
  const safeIndex = index === -1 ? 0 : index;
  return COMPOSITOR_GUITAR_ARTICULATION_OPTIONS[
    (safeIndex + 1) % COMPOSITOR_GUITAR_ARTICULATION_OPTIONS.length
  ]!.id;
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

export function setCompositorPatternLength(
  piece: CompositorPiece,
  nextLength: number,
): CompositorPiece {
  const resizedTracks = piece.tracks.map((track) => {
    const resized = resizeMetronomePatternLength(
      track.levels,
      piece.patternLength,
      nextLength,
    );

    return {
      ...track,
      levels: resized.pattern,
    };
  });

  return normalizeCompositorPiece({
    ...piece,
    patternLength: nextLength,
    tracks: resizedTracks,
  });
}

export function setCompositorBeatDurationAtSlot(
  piece: CompositorPiece,
  slotIndex: number,
  duration: MetronomeBeatDuration,
): CompositorPiece {
  const beatDurations = normalizeBeatDurationPattern(piece.beatDurations);
  const index = Math.max(0, Math.min(METRONOME_PATTERN_LENGTH - 1, slotIndex));
  beatDurations[index] = duration;

  return normalizeCompositorPiece({
    ...piece,
    beatDurations,
  });
}

export function setCompositorBeatLevelAtSlot(
  piece: CompositorPiece,
  instrumentId: CompositorInstrumentId,
  slotIndex: number,
  level: MetronomeBeatLevel,
): CompositorPiece {
  const tracks = piece.tracks.map((track) => {
    if (track.instrumentId !== instrumentId) {
      return track;
    }

    const levels = normalizeMetronomePattern(track.levels);
    const index = Math.max(0, Math.min(METRONOME_PATTERN_LENGTH - 1, slotIndex));
    levels[index] = level;

    return { ...track, levels };
  });

  return normalizeCompositorPiece({ ...piece, tracks });
}

export function setCompositorNoteAtSlot(
  piece: CompositorPiece,
  instrumentId: CompositorInstrumentId,
  slotIndex: number,
  note: CompositorSlotNote,
): CompositorPiece {
  const tracks = piece.tracks.map((track) => {
    if (track.instrumentId !== instrumentId) {
      return track;
    }

    const notes = normalizeSlotNotes(track.notes);
    const index = Math.max(0, Math.min(METRONOME_PATTERN_LENGTH - 1, slotIndex));
    notes[index] = {
      note: note.note,
      octave: clampTargetOctave(note.octave),
    };

    return { ...track, notes };
  });

  return normalizeCompositorPiece({ ...piece, tracks });
}

export function setCompositorDrumSoundAtSlot(
  piece: CompositorPiece,
  slotIndex: number,
  sound: CompositorDrumSound,
): CompositorPiece {
  const tracks = piece.tracks.map((track) => {
    if (track.instrumentId !== "bateria") {
      return track;
    }

    const drumSounds = normalizeDrumSounds(track.drumSounds);
    const index = Math.max(0, Math.min(METRONOME_PATTERN_LENGTH - 1, slotIndex));
    drumSounds[index] = sound;

    return { ...track, drumSounds };
  });

  return normalizeCompositorPiece({ ...piece, tracks });
}

export function setCompositorGuitarArticulationAtSlot(
  piece: CompositorPiece,
  slotIndex: number,
  articulation: CompositorGuitarArticulation,
): CompositorPiece {
  const tracks = piece.tracks.map((track) => {
    if (track.instrumentId !== "guitarra") {
      return track;
    }

    const guitarArticulations = normalizeGuitarArticulations(
      track.guitarArticulations,
    );
    const index = Math.max(0, Math.min(METRONOME_PATTERN_LENGTH - 1, slotIndex));
    guitarArticulations[index] = articulation;

    return { ...track, guitarArticulations };
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

export function readStoredCompositorPiece(): CompositorPiece | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(COMPOSITOR_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return normalizeCompositorPiece(JSON.parse(raw) as CompositorPiece);
  } catch {
    return null;
  }
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
