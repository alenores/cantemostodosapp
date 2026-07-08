import {
  COMPOSITOR_SUBDIVISIONS_PER_GOLPE,
  createCompositorEvent,
  getCompositorTrack,
  normalizeCompositorPiece,
  setCompositorCycleGolpes,
  type CompositorDrumSound,
  type CompositorPiece,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import {
  METRONOME_PATTERN_LENGTH,
  type MetronomeBeatDurationPattern,
  type MetronomeBeatLevel,
} from "@/lib/metronomo";

export type CompositorDrumPatternId =
  | "rock-basico"
  | "pop-recto"
  | "reggae"
  | "cumbia"
  | "bossa"
  | "funk"
  | "balada"
  | "marcha"
  | "hip-hop"
  | "tren";

export type CompositorDrumPattern = {
  id: CompositorDrumPatternId;
  label: string;
  descripcion: string;
  cycleGolpes: number;
  suggestedBpm: number;
  events: CompositorTrackEvent[];
};

type DrumHit = {
  step: number;
  drumSound: CompositorDrumSound;
  level?: MetronomeBeatLevel;
};

function eighthHiHatSteps(cycleGolpes: number): DrumHit[] {
  const gridSteps = cycleGolpes * COMPOSITOR_SUBDIVISIONS_PER_GOLPE;
  const hits: DrumHit[] = [];

  for (let step = 0; step < gridSteps; step += 2) {
    hits.push({ step, drumSound: "hihat", level: "medio" });
  }

  return hits;
}

function hitsToEvents(hits: DrumHit[]): CompositorTrackEvent[] {
  return hits.map((hit) =>
    createCompositorEvent({
      startStep: hit.step,
      durationSteps: 1,
      level: hit.level ?? "medio",
      drumSound: hit.drumSound,
    }),
  );
}

function createFourFourBeatDurations(
  cycleGolpes: number,
): MetronomeBeatDurationPattern {
  return [
    "negra",
    "negra",
    "negra",
    "negra",
    ...Array(METRONOME_PATTERN_LENGTH - cycleGolpes).fill("negra"),
  ] as MetronomeBeatDurationPattern;
}

function buildPattern(
  id: CompositorDrumPatternId,
  label: string,
  descripcion: string,
  suggestedBpm: number,
  hits: DrumHit[],
  cycleGolpes = 4,
): CompositorDrumPattern {
  return {
    id,
    label,
    descripcion,
    cycleGolpes,
    suggestedBpm,
    events: hitsToEvents(hits),
  };
}

const CYCLE_GOLPES = 4;

export const COMPOSITOR_DRUM_PATTERNS: CompositorDrumPattern[] = [
  buildPattern(
    "rock-basico",
    "Rock básico",
    "Bombo en 1 y 3 · caja en 2 y 4",
    88,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 8, drumSound: "kick", level: "fuerte" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      ...eighthHiHatSteps(CYCLE_GOLPES),
    ],
  ),
  buildPattern(
    "pop-recto",
    "Pop recto",
    "Bombo en los cuatro tiempos",
    102,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 4, drumSound: "kick", level: "medio" },
      { step: 8, drumSound: "kick", level: "fuerte" },
      { step: 12, drumSound: "kick", level: "medio" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      ...eighthHiHatSteps(CYCLE_GOLPES),
    ],
  ),
  buildPattern(
    "reggae",
    "Reggae",
    "Bombo en el 3 · hi-hat en contratiempos",
    74,
    [
      { step: 8, drumSound: "kick", level: "fuerte" },
      { step: 4, drumSound: "snare", level: "medio" },
      { step: 12, drumSound: "snare", level: "medio" },
      { step: 2, drumSound: "hihat", level: "medio" },
      { step: 6, drumSound: "hihat", level: "medio" },
      { step: 10, drumSound: "hihat", level: "medio" },
      { step: 14, drumSound: "hihat", level: "medio" },
    ],
  ),
  buildPattern(
    "cumbia",
    "Cumbia",
    "Bombo marcado · caja en la espalda",
    92,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 6, drumSound: "kick", level: "medio" },
      { step: 10, drumSound: "kick", level: "medio" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      ...eighthHiHatSteps(CYCLE_GOLPES),
    ],
  ),
  buildPattern(
    "bossa",
    "Bossa suave",
    "Ride ligero · bombo y caja discretos",
    118,
    [
      { step: 0, drumSound: "kick", level: "suave" },
      { step: 10, drumSound: "kick", level: "suave" },
      { step: 5, drumSound: "snare", level: "suave" },
      { step: 13, drumSound: "snare", level: "suave" },
      { step: 0, drumSound: "ride", level: "medio" },
      { step: 2, drumSound: "ride", level: "suave" },
      { step: 4, drumSound: "ride", level: "medio" },
      { step: 6, drumSound: "ride", level: "suave" },
      { step: 8, drumSound: "ride", level: "medio" },
      { step: 10, drumSound: "ride", level: "suave" },
      { step: 12, drumSound: "ride", level: "medio" },
      { step: 14, drumSound: "ride", level: "suave" },
    ],
  ),
  buildPattern(
    "funk",
    "Funk",
    "Bombo sincopado · caja con ghost notes",
    96,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 3, drumSound: "kick", level: "medio" },
      { step: 6, drumSound: "kick", level: "fuerte" },
      { step: 10, drumSound: "kick", level: "medio" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 7, drumSound: "snare", level: "suave" },
      { step: 11, drumSound: "snare", level: "suave" },
      { step: 14, drumSound: "snare", level: "medio" },
      ...eighthHiHatSteps(CYCLE_GOLPES),
    ],
  ),
  buildPattern(
    "balada",
    "Balada",
    "Pulso simple y suave",
    68,
    [
      { step: 0, drumSound: "kick", level: "suave" },
      { step: 8, drumSound: "kick", level: "suave" },
      { step: 4, drumSound: "snare", level: "medio" },
      { step: 12, drumSound: "snare", level: "medio" },
      { step: 0, drumSound: "hihat", level: "suave" },
      { step: 4, drumSound: "hihat", level: "suave" },
      { step: 8, drumSound: "hihat", level: "suave" },
      { step: 12, drumSound: "hihat", level: "suave" },
    ],
  ),
  buildPattern(
    "marcha",
    "Marcha",
    "Caja en negras · bombo de apoyo",
    112,
    [
      { step: 0, drumSound: "snare", level: "fuerte" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 8, drumSound: "snare", level: "fuerte" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      { step: 0, drumSound: "kick", level: "medio" },
      { step: 8, drumSound: "kick", level: "medio" },
      { step: 2, drumSound: "hihat", level: "suave" },
      { step: 6, drumSound: "hihat", level: "suave" },
      { step: 10, drumSound: "hihat", level: "suave" },
      { step: 14, drumSound: "hihat", level: "suave" },
    ],
  ),
  buildPattern(
    "hip-hop",
    "Hip-hop",
    "Bombo pesado · caja en la espalda",
    84,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 7, drumSound: "kick", level: "fuerte" },
      { step: 10, drumSound: "kick", level: "medio" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      { step: 0, drumSound: "hihat", level: "medio" },
      { step: 2, drumSound: "hihat", level: "suave" },
      { step: 4, drumSound: "hihat", level: "medio" },
      { step: 6, drumSound: "hihat", level: "suave" },
      { step: 8, drumSound: "hihat", level: "medio" },
      { step: 10, drumSound: "hihat", level: "suave" },
      { step: 12, drumSound: "hihat", level: "medio" },
      { step: 14, drumSound: "hihat", level: "suave" },
    ],
  ),
  buildPattern(
    "tren",
    "Rodapié",
    "Bombo en corcheas · caja en 2 y 4",
    104,
    [
      { step: 0, drumSound: "kick", level: "medio" },
      { step: 2, drumSound: "kick", level: "medio" },
      { step: 4, drumSound: "kick", level: "medio" },
      { step: 6, drumSound: "kick", level: "medio" },
      { step: 8, drumSound: "kick", level: "medio" },
      { step: 10, drumSound: "kick", level: "medio" },
      { step: 12, drumSound: "kick", level: "medio" },
      { step: 14, drumSound: "kick", level: "medio" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 12, drumSound: "snare", level: "fuerte" },
    ],
  ),
];

export function getCompositorDrumPatternById(
  patternId: CompositorDrumPatternId,
): CompositorDrumPattern | undefined {
  return COMPOSITOR_DRUM_PATTERNS.find((pattern) => pattern.id === patternId);
}

export function bateriaTrackHasEvents(piece: CompositorPiece): boolean {
  return getCompositorTrack(piece, "bateria").events.length > 0;
}

export function applyDrumPatternToPiece(
  piece: CompositorPiece,
  pattern: CompositorDrumPattern,
): CompositorPiece {
  const events = pattern.events.map((event) =>
    createCompositorEvent({
      startStep: event.startStep,
      durationSteps: event.durationSteps,
      level: event.level,
      drumSound: event.drumSound,
    }),
  );

  let next: CompositorPiece = normalizeCompositorPiece({
    ...piece,
    bpm: pattern.suggestedBpm,
    cycleBeatDurations: createFourFourBeatDurations(pattern.cycleGolpes),
    tracks: piece.tracks.map((track) =>
      track.instrumentId === "bateria"
        ? { ...track, enabled: true, events }
        : track,
    ),
  });

  if (next.cycleGolpes !== pattern.cycleGolpes) {
    next = setCompositorCycleGolpes(next, pattern.cycleGolpes);
  }

  return next;
}

export function buildDrumPatternPreviewPiece(
  pattern: CompositorDrumPattern,
): CompositorPiece {
  return applyDrumPatternToPiece(
    normalizeCompositorPiece({
      version: 2,
      bpm: pattern.suggestedBpm,
      cycleGolpes: pattern.cycleGolpes,
      cycleBeatDurations: createFourFourBeatDurations(pattern.cycleGolpes),
      subdivisionsPerGolpe: COMPOSITOR_SUBDIVISIONS_PER_GOLPE,
      tonalidadComposicion: 0,
      modoTonalComposicion: "mayor",
      tracks: [
        { instrumentId: "bateria", enabled: true, events: [] },
        { instrumentId: "guitarra", enabled: false, events: [] },
        { instrumentId: "piano", enabled: false, events: [] },
        { instrumentId: "viento", enabled: false, events: [] },
      ],
    }),
    pattern,
  );
}
