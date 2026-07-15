import {
  COMPOSITOR_SUBDIVISIONS_PER_GOLPE,
  createCompositorEvent,
  createDefaultCompositorPiece,
  getCompositorTrack,
  isGuitarChordArticulation,
  normalizeCompositorPiece,
  type CompositorGuitarArticulation,
  type CompositorInstrumentId,
  type CompositorMelodicInstrumentId,
  type CompositorPiece,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import {
  clampMelodicOctaveForInstrument,
  resolveMelodicPitchToNote,
  type CompositorGradoCromatico,
} from "@/lib/compositor-melodic-pitch";
import { suggestedChordModifier } from "@/lib/compositor-melodic-draft";
import { getMelodicOctaveRange } from "@/lib/compositor-timeline-layout";
import type { NotaIndex } from "@/lib/cifrado";
import type { ModoTonal } from "@/lib/cifrado-escala";
import {
  METRONOME_PATTERN_LENGTH,
  type MetronomeBeatDuration,
  type MetronomeBeatLevel,
} from "@/lib/metronomo";

export type CompositorMelodicPatternId =
  | "escala-ascendente"
  | "escala-descendente"
  | "arpegio-tonica"
  | "arpegio-descendente"
  | "motivo-pregunta"
  | "motivo-respuesta"
  | "cadencia-v-i"
  | "pentatonica"
  | "terceras"
  | "bordon"
  | "arpegio-folk"
  | "arpegio-balada"
  | "arpegio-seis-ocho"
  | "rasgueo-pop"
  | "rasgueo-corcheas"
  | "rasgueo-rock"
  | "rasgueo-vals"
  | "rasgueo-seis-ocho"
  | "bajo-rasgueo-folk"
  | "progresion-pop";

export type CompositorPatternFamilia = "melodia" | "acompanamiento";

export type CompositorMelodicPattern = {
  id: CompositorMelodicPatternId;
  label: string;
  descripcion: string;
  familia: CompositorPatternFamilia;
  aptoPara: readonly CompositorMelodicInstrumentId[];
  cycleGolpes: number;
  beatDuration: MetronomeBeatDuration;
  suggestedBpm: number;
  events: CompositorTrackEvent[];
};

type MelodicHit = {
  step: number;
  durationSteps: number;
  gradoCromatico: CompositorGradoCromatico;
  /** Offset respecto a la octava base del instrumento al aplicar. */
  octaveOffset?: number;
  level?: MetronomeBeatLevel;
  guitarArticulation?: CompositorGuitarArticulation;
  guitarString?: 1 | 2 | 3 | 4 | 5 | 6;
};

const CYCLE_GOLPES = 4;
/** Octava de referencia en el catálogo; al aplicar se clampea por capa. */
const PATTERN_BASE_OCTAVE = 4;

const ALL_MELODIC: readonly CompositorMelodicInstrumentId[] = [
  "piano",
  "guitarra",
  "viento",
];

const GUITARRA_ONLY: readonly CompositorMelodicInstrumentId[] = ["guitarra"];

function hitsToEvents(hits: MelodicHit[]): CompositorTrackEvent[] {
  return hits.map((hit) =>
    createCompositorEvent({
      startStep: hit.step,
      durationSteps: hit.durationSteps,
      level: hit.level ?? "medio",
      gradoCromatico: hit.gradoCromatico,
      octavaRelativa: PATTERN_BASE_OCTAVE + (hit.octaveOffset ?? 0),
      guitarArticulation: hit.guitarArticulation ?? "pua",
      guitarString: hit.guitarString ?? null,
    }),
  );
}

function buildPattern(
  id: CompositorMelodicPatternId,
  label: string,
  descripcion: string,
  suggestedBpm: number,
  hits: MelodicHit[],
  options: {
    familia: CompositorPatternFamilia;
    aptoPara: readonly CompositorMelodicInstrumentId[];
    cycleGolpes?: number;
    beatDuration?: MetronomeBeatDuration;
  },
): CompositorMelodicPattern {
  return {
    id,
    label,
    descripcion,
    familia: options.familia,
    aptoPara: options.aptoPara,
    cycleGolpes: options.cycleGolpes ?? CYCLE_GOLPES,
    beatDuration: options.beatDuration ?? "negra",
    suggestedBpm,
    events: hitsToEvents(hits),
  };
}

function buildMelodia(
  id: CompositorMelodicPatternId,
  label: string,
  descripcion: string,
  suggestedBpm: number,
  hits: MelodicHit[],
): CompositorMelodicPattern {
  return buildPattern(id, label, descripcion, suggestedBpm, hits, {
    familia: "melodia",
    aptoPara: ALL_MELODIC,
  });
}

function cuerdaHit(
  step: number,
  cuerda: 1 | 2 | 3 | 4 | 5 | 6,
  durationSteps = 2,
  level: MetronomeBeatLevel = "medio",
): MelodicHit {
  return {
    step,
    durationSteps,
    gradoCromatico: 1,
    level,
    guitarArticulation: "dedo",
    guitarString: cuerda,
  };
}

function rasgueoHit(
  step: number,
  direction: "abajo" | "arriba",
  level: MetronomeBeatLevel = "medio",
  gradoCromatico: CompositorGradoCromatico = 1,
  durationSteps = 2,
): MelodicHit {
  return {
    step,
    durationSteps,
    gradoCromatico,
    level,
    guitarArticulation:
      direction === "arriba" ? "rasguidoArriba" : "rasguido",
  };
}

export const COMPOSITOR_MELODIC_PATTERNS: CompositorMelodicPattern[] = [
  buildMelodia(
    "escala-ascendente",
    "Escala ascendente",
    "Grados 1–8 en corcheas · una octava",
    88,
    [
      { step: 0, durationSteps: 2, gradoCromatico: 1 },
      { step: 2, durationSteps: 2, gradoCromatico: 3 },
      { step: 4, durationSteps: 2, gradoCromatico: 5 },
      { step: 6, durationSteps: 2, gradoCromatico: 6 },
      { step: 8, durationSteps: 2, gradoCromatico: 8 },
      { step: 10, durationSteps: 2, gradoCromatico: 10 },
      { step: 12, durationSteps: 2, gradoCromatico: 12 },
      { step: 14, durationSteps: 2, gradoCromatico: 1, octaveOffset: 1 },
    ],
  ),
  buildMelodia(
    "escala-descendente",
    "Escala descendente",
    "Grados 8–1 en corcheas · una octava",
    88,
    [
      { step: 0, durationSteps: 2, gradoCromatico: 1, octaveOffset: 1 },
      { step: 2, durationSteps: 2, gradoCromatico: 12 },
      { step: 4, durationSteps: 2, gradoCromatico: 10 },
      { step: 6, durationSteps: 2, gradoCromatico: 8 },
      { step: 8, durationSteps: 2, gradoCromatico: 6 },
      { step: 10, durationSteps: 2, gradoCromatico: 5 },
      { step: 12, durationSteps: 2, gradoCromatico: 3 },
      { step: 14, durationSteps: 2, gradoCromatico: 1 },
    ],
  ),
  buildMelodia(
    "arpegio-tonica",
    "Arpegio tónica",
    "1 · 3 · 5 · 8 en negras",
    96,
    [
      { step: 0, durationSteps: 4, gradoCromatico: 1, level: "fuerte" },
      { step: 4, durationSteps: 4, gradoCromatico: 5 },
      { step: 8, durationSteps: 4, gradoCromatico: 8 },
      {
        step: 12,
        durationSteps: 4,
        gradoCromatico: 1,
        octaveOffset: 1,
        level: "fuerte",
      },
    ],
  ),
  buildMelodia(
    "arpegio-descendente",
    "Arpegio descendente",
    "8 · 5 · 3 · 1 en negras",
    96,
    [
      {
        step: 0,
        durationSteps: 4,
        gradoCromatico: 1,
        octaveOffset: 1,
        level: "fuerte",
      },
      { step: 4, durationSteps: 4, gradoCromatico: 8 },
      { step: 8, durationSteps: 4, gradoCromatico: 5 },
      { step: 12, durationSteps: 4, gradoCromatico: 1, level: "fuerte" },
    ],
  ),
  buildMelodia(
    "motivo-pregunta",
    "Motivo pregunta",
    "1 · 5 · 8 · 5 · frase que sube",
    100,
    [
      { step: 0, durationSteps: 4, gradoCromatico: 1, level: "fuerte" },
      { step: 4, durationSteps: 4, gradoCromatico: 5 },
      { step: 8, durationSteps: 4, gradoCromatico: 8, level: "fuerte" },
      { step: 12, durationSteps: 4, gradoCromatico: 5 },
    ],
  ),
  buildMelodia(
    "motivo-respuesta",
    "Motivo respuesta",
    "8 · 5 · 3 · 1 · frase que baja",
    100,
    [
      { step: 0, durationSteps: 4, gradoCromatico: 8, level: "fuerte" },
      { step: 4, durationSteps: 4, gradoCromatico: 5 },
      { step: 8, durationSteps: 4, gradoCromatico: 3 },
      { step: 12, durationSteps: 4, gradoCromatico: 1, level: "fuerte" },
    ],
  ),
  buildMelodia(
    "cadencia-v-i",
    "Cadencia V–I",
    "Dominante (5) y tónica (1) · dos negras cada una",
    80,
    [
      { step: 0, durationSteps: 8, gradoCromatico: 8, level: "medio" },
      { step: 8, durationSteps: 8, gradoCromatico: 1, level: "fuerte" },
    ],
  ),
  buildMelodia(
    "pentatonica",
    "Pentatónica",
    "1 · 3 · 5 · 8 · 10 · sube y baja",
    92,
    [
      { step: 0, durationSteps: 2, gradoCromatico: 1 },
      { step: 2, durationSteps: 2, gradoCromatico: 3 },
      { step: 4, durationSteps: 2, gradoCromatico: 5 },
      { step: 6, durationSteps: 2, gradoCromatico: 8 },
      { step: 8, durationSteps: 2, gradoCromatico: 10 },
      { step: 10, durationSteps: 2, gradoCromatico: 8 },
      { step: 12, durationSteps: 2, gradoCromatico: 5 },
      { step: 14, durationSteps: 2, gradoCromatico: 1 },
    ],
  ),
  buildMelodia(
    "terceras",
    "Terceras",
    "Saltos de tercera · 1-3 · 3-5 · 5-8 · 8-10",
    96,
    [
      { step: 0, durationSteps: 2, gradoCromatico: 1, level: "fuerte" },
      { step: 2, durationSteps: 2, gradoCromatico: 5 },
      { step: 4, durationSteps: 2, gradoCromatico: 3 },
      { step: 6, durationSteps: 2, gradoCromatico: 6 },
      { step: 8, durationSteps: 2, gradoCromatico: 5, level: "fuerte" },
      { step: 10, durationSteps: 2, gradoCromatico: 8 },
      { step: 12, durationSteps: 2, gradoCromatico: 8 },
      { step: 14, durationSteps: 2, gradoCromatico: 10 },
    ],
  ),
  buildMelodia(
    "bordon",
    "Bordón",
    "Tónica en negras · adorno en contratiempos",
    84,
    [
      { step: 0, durationSteps: 4, gradoCromatico: 1, level: "fuerte" },
      { step: 6, durationSteps: 2, gradoCromatico: 3, level: "suave" },
      { step: 8, durationSteps: 4, gradoCromatico: 1, level: "medio" },
      { step: 14, durationSteps: 2, gradoCromatico: 5, level: "suave" },
    ],
  ),

  // —— Acompañamiento (guitarra) ——
  buildPattern(
    "arpegio-folk",
    "Arpegio folk",
    "Bajo–3–2–3–1–2–3–2 · cada nota sale de una cuerda real del acorde",
    86,
    [
      cuerdaHit(0, 6, 2, "fuerte"),
      cuerdaHit(2, 3),
      cuerdaHit(4, 2),
      cuerdaHit(6, 3),
      cuerdaHit(8, 1, 2, "fuerte"),
      cuerdaHit(10, 2),
      cuerdaHit(12, 3),
      cuerdaHit(14, 2),
    ],
    { familia: "acompanamiento", aptoPara: GUITARRA_ONLY },
  ),
  buildPattern(
    "arpegio-balada",
    "Arpegio de balada",
    "Bajo–4–3–2–1–2–3–4 · recorrido amplio y parejo",
    72,
    [
      cuerdaHit(0, 6, 2, "fuerte"),
      cuerdaHit(2, 4),
      cuerdaHit(4, 3),
      cuerdaHit(6, 2),
      cuerdaHit(8, 1, 2, "medio"),
      cuerdaHit(10, 2),
      cuerdaHit(12, 3),
      cuerdaHit(14, 4),
    ],
    { familia: "acompanamiento", aptoPara: GUITARRA_ONLY },
  ),
  buildPattern(
    "arpegio-seis-ocho",
    "Arpegio 6/8",
    "Bajo–3–2–1–2–3 · balance natural en dos grupos de tres",
    76,
    [
      cuerdaHit(0, 6, 4, "fuerte"),
      cuerdaHit(4, 3, 4),
      cuerdaHit(8, 2, 4),
      cuerdaHit(12, 1, 4, "medio"),
      cuerdaHit(16, 2, 4),
      cuerdaHit(20, 3, 4),
    ],
    {
      familia: "acompanamiento",
      aptoPara: GUITARRA_ONLY,
      cycleGolpes: 6,
      beatDuration: "corchea",
    },
  ),
  buildPattern(
    "rasgueo-pop",
    "Pop universal",
    "↓ – ↓ ↑ – ↑ ↓ ↑ · patrón completo de ocho movimientos",
    96,
    [
      rasgueoHit(0, "abajo", "fuerte"),
      rasgueoHit(4, "abajo", "medio"),
      rasgueoHit(6, "arriba", "suave"),
      rasgueoHit(10, "arriba", "suave"),
      rasgueoHit(12, "abajo", "fuerte"),
      rasgueoHit(14, "arriba", "suave"),
    ],
    { familia: "acompanamiento", aptoPara: GUITARRA_ONLY },
  ),
  buildPattern(
    "rasgueo-corcheas",
    "Corcheas continuas",
    "↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑ · acentos humanos en 1 y 3",
    104,
    [
      rasgueoHit(0, "abajo", "fuerte"),
      rasgueoHit(2, "arriba", "suave"),
      rasgueoHit(4, "abajo", "medio"),
      rasgueoHit(6, "arriba", "suave"),
      rasgueoHit(8, "abajo", "fuerte"),
      rasgueoHit(10, "arriba", "suave"),
      rasgueoHit(12, "abajo", "medio"),
      rasgueoHit(14, "arriba", "suave"),
    ],
    { familia: "acompanamiento", aptoPara: GUITARRA_ONLY },
  ),
  buildPattern(
    "rasgueo-rock",
    "Rock en negras",
    "↓ ↓ ↓ ↓ · ataque firme, acentos en 2 y 4",
    112,
    [
      rasgueoHit(0, "abajo", "medio", 1, 4),
      rasgueoHit(4, "abajo", "fuerte", 1, 4),
      rasgueoHit(8, "abajo", "medio", 1, 4),
      rasgueoHit(12, "abajo", "fuerte", 1, 4),
    ],
    { familia: "acompanamiento", aptoPara: GUITARRA_ONLY },
  ),
  buildPattern(
    "rasgueo-vals",
    "Vals 3/4",
    "Bajo en 1, acordes en 2 y 3 · acompañamiento tradicional",
    108,
    [
      cuerdaHit(0, 6, 4, "fuerte"),
      rasgueoHit(4, "abajo", "medio", 1, 4),
      rasgueoHit(8, "arriba", "suave", 1, 4),
    ],
    {
      familia: "acompanamiento",
      aptoPara: GUITARRA_ONLY,
      cycleGolpes: 3,
    },
  ),
  buildPattern(
    "rasgueo-seis-ocho",
    "Rasgueo 6/8",
    "↓ – – ↓ ↑ – · dos pulsos grandes, sin convertirlo en 4/4",
    82,
    [
      rasgueoHit(0, "abajo", "fuerte", 1, 4),
      rasgueoHit(12, "abajo", "medio", 1, 4),
      rasgueoHit(16, "arriba", "suave", 1, 4),
    ],
    {
      familia: "acompanamiento",
      aptoPara: GUITARRA_ONLY,
      cycleGolpes: 6,
      beatDuration: "corchea",
    },
  ),
  buildPattern(
    "bajo-rasgueo-folk",
    "Bajo y rasgueo folk",
    "Bajo–acorde–bajo–acorde · mano derecha práctica y reconocible",
    92,
    [
      cuerdaHit(0, 6, 4, "fuerte"),
      rasgueoHit(4, "abajo", "medio", 1, 4),
      cuerdaHit(8, 5, 4, "fuerte"),
      rasgueoHit(12, "abajo", "medio", 1, 4),
    ],
    { familia: "acompanamiento", aptoPara: GUITARRA_ONLY },
  ),
  buildPattern(
    "progresion-pop",
    "Progresión I–V–vi–IV",
    "Un acorde real por tiempo · base inmediata para componer canciones",
    88,
    [
      rasgueoHit(0, "abajo", "fuerte", 1, 4),
      rasgueoHit(4, "abajo", "medio", 8, 4),
      rasgueoHit(8, "abajo", "fuerte", 10, 4),
      rasgueoHit(12, "abajo", "medio", 6, 4),
    ],
    { familia: "acompanamiento", aptoPara: GUITARRA_ONLY },
  ),
];

export function getCompositorMelodicPatternById(
  patternId: CompositorMelodicPatternId,
): CompositorMelodicPattern | undefined {
  return COMPOSITOR_MELODIC_PATTERNS.find((pattern) => pattern.id === patternId);
}

export function isPatternAptoParaInstrument(
  pattern: CompositorMelodicPattern,
  instrumentId: CompositorMelodicInstrumentId,
): boolean {
  return pattern.aptoPara.includes(instrumentId);
}

export function getPatternsForInstrument(
  instrumentId: CompositorMelodicInstrumentId,
): CompositorMelodicPattern[] {
  return COMPOSITOR_MELODIC_PATTERNS.filter((pattern) =>
    isPatternAptoParaInstrument(pattern, instrumentId),
  );
}

export function getPatternsByFamilia(
  instrumentId: CompositorMelodicInstrumentId,
  familia: CompositorPatternFamilia,
): CompositorMelodicPattern[] {
  return getPatternsForInstrument(instrumentId).filter(
    (pattern) => pattern.familia === familia,
  );
}

export function melodicTrackHasEvents(
  piece: CompositorPiece,
  instrumentId: CompositorMelodicInstrumentId,
): boolean {
  return getCompositorTrack(piece, instrumentId).events.length > 0;
}

function materializeMelodicEvents(
  pattern: CompositorMelodicPattern,
  instrumentId: CompositorInstrumentId,
  tonalidadComposicion: NotaIndex,
  modoTonalComposicion: ModoTonal,
): CompositorTrackEvent[] {
  const { min: baseOctave } = getMelodicOctaveRange(instrumentId);

  return pattern.events.map((event) => {
    const octavaRelativa = clampMelodicOctaveForInstrument(
      baseOctave + (event.octavaRelativa - PATTERN_BASE_OCTAVE),
      instrumentId,
    );
    const note = resolveMelodicPitchToNote(
      {
        gradoCromatico: event.gradoCromatico as CompositorGradoCromatico,
        octavaRelativa,
      },
      tonalidadComposicion,
    );

    const guitarArticulation =
      instrumentId === "guitarra"
        ? event.guitarArticulation
        : ("pua" as const);

    const isChordHit =
      instrumentId === "guitarra" &&
      (isGuitarChordArticulation(guitarArticulation) ||
        event.guitarString !== null);

    return createCompositorEvent({
      startStep: event.startStep,
      durationSteps: event.durationSteps,
      level: event.level,
      gradoCromatico: event.gradoCromatico,
      octavaRelativa,
      note,
      guitarArticulation,
      guitarString: instrumentId === "guitarra" ? event.guitarString : null,
      chordModifier: isChordHit
        ? suggestedChordModifier(
            event.gradoCromatico as CompositorGradoCromatico,
            tonalidadComposicion,
            modoTonalComposicion,
          )
        : "",
      pianoHarmonyMode: "nota",
    });
  });
}

/**
 * Reemplaza solo la capa melódica indicada. No toca batería, tempo ni ciclo.
 * Si la plantilla no aplica a ese instrumento, deja la piece igual.
 */
export function applyMelodicPatternToPiece(
  piece: CompositorPiece,
  pattern: CompositorMelodicPattern,
  instrumentId: CompositorMelodicInstrumentId,
): CompositorPiece {
  if (!isPatternAptoParaInstrument(pattern, instrumentId)) {
    return piece;
  }

  const events = materializeMelodicEvents(
    pattern,
    instrumentId,
    piece.tonalidadComposicion,
    piece.modoTonalComposicion,
  );
  const oldGridSteps = piece.cycleGolpes * piece.subdivisionsPerGolpe;
  const newGridSteps = pattern.cycleGolpes * piece.subdivisionsPerGolpe;

  return normalizeCompositorPiece({
    ...piece,
    cycleGolpes: pattern.cycleGolpes,
    cycleBeatDurations: Array.from(
      { length: METRONOME_PATTERN_LENGTH },
      () => pattern.beatDuration,
    ),
    tracks: piece.tracks.map((track) => {
      if (track.instrumentId === instrumentId) {
        return { ...track, enabled: true, events };
      }

      if (oldGridSteps === newGridSteps || oldGridSteps <= 0) {
        return track;
      }

      return {
        ...track,
        events: track.events.map((event) => ({
          ...event,
          startStep: Math.round(
            (event.startStep / oldGridSteps) * newGridSteps,
          ),
          durationSteps: Math.max(
            1,
            Math.round((event.durationSteps / oldGridSteps) * newGridSteps),
          ),
        })),
      };
    }),
  });
}

export function buildMelodicPatternPreviewPiece(
  pattern: CompositorMelodicPattern,
  instrumentId: CompositorMelodicInstrumentId,
  tonalidadComposicion: NotaIndex,
  modoTonalComposicion: ModoTonal,
): CompositorPiece {
  const base = createDefaultCompositorPiece();
  const events = materializeMelodicEvents(
    pattern,
    instrumentId,
    tonalidadComposicion,
    modoTonalComposicion,
  );

  return normalizeCompositorPiece({
    ...base,
    bpm: pattern.suggestedBpm,
    cycleGolpes: pattern.cycleGolpes,
    cycleBeatDurations: Array.from(
      { length: METRONOME_PATTERN_LENGTH },
      () => pattern.beatDuration,
    ),
    subdivisionsPerGolpe: COMPOSITOR_SUBDIVISIONS_PER_GOLPE,
    tonalidadComposicion,
    modoTonalComposicion,
    tracks: base.tracks.map((track) => {
      if (track.instrumentId === instrumentId) {
        return { ...track, enabled: true, events };
      }

      return { ...track, enabled: false, events: [] };
    }),
  });
}
