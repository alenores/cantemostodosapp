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
import type { MetronomeBeatLevel } from "@/lib/metronomo";

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
  | "arpegio-cuerdas-a"
  | "rasguido-negras"
  | "rasguido-corcheas"
  | "rasguido-ddudu"
  | "rasguido-con-bajo";

export type CompositorPatternFamilia = "melodia" | "acompanamiento";

export type CompositorMelodicPattern = {
  id: CompositorMelodicPatternId;
  label: string;
  descripcion: string;
  familia: CompositorPatternFamilia;
  aptoPara: readonly CompositorMelodicInstrumentId[];
  cycleGolpes: number;
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

/**
 * Voicing de acorde I en “cuerdas” (1 aguda → 6 grave) para arpegios clásicos.
 * Aproxima un punteo folk con bajo en 6ª.
 */
const CUERDA_A_GRADO: Record<
  1 | 2 | 3 | 6,
  { gradoCromatico: CompositorGradoCromatico; octaveOffset: number }
> = {
  6: { gradoCromatico: 1, octaveOffset: 0 },
  3: { gradoCromatico: 8, octaveOffset: 0 },
  2: { gradoCromatico: 1, octaveOffset: 1 },
  1: { gradoCromatico: 5, octaveOffset: 1 },
};

function hitsToEvents(hits: MelodicHit[]): CompositorTrackEvent[] {
  return hits.map((hit) =>
    createCompositorEvent({
      startStep: hit.step,
      durationSteps: hit.durationSteps,
      level: hit.level ?? "medio",
      gradoCromatico: hit.gradoCromatico,
      octavaRelativa: PATTERN_BASE_OCTAVE + (hit.octaveOffset ?? 0),
      guitarArticulation: hit.guitarArticulation ?? "pua",
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
  },
): CompositorMelodicPattern {
  return {
    id,
    label,
    descripcion,
    familia: options.familia,
    aptoPara: options.aptoPara,
    cycleGolpes: options.cycleGolpes ?? CYCLE_GOLPES,
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
  cuerda: 1 | 2 | 3 | 6,
  durationSteps = 2,
  level: MetronomeBeatLevel = "medio",
): MelodicHit {
  const pitch = CUERDA_A_GRADO[cuerda];
  return {
    step,
    durationSteps,
    gradoCromatico: pitch.gradoCromatico,
    octaveOffset: pitch.octaveOffset,
    level,
    guitarArticulation: "pua",
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
    "arpegio-cuerdas-a",
    "Arpegio de cuerdas",
    "Punteo 6-3-2-3-1-2-3-2 · base típica de guitarra",
    90,
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
    "rasguido-negras",
    "Rasguido en negras",
    "Un rasguido por tiempo · acorde de tónica",
    96,
    [
      {
        step: 0,
        durationSteps: 4,
        gradoCromatico: 1,
        level: "fuerte",
        guitarArticulation: "rasguido",
      },
      {
        step: 4,
        durationSteps: 4,
        gradoCromatico: 1,
        level: "medio",
        guitarArticulation: "rasguido",
      },
      {
        step: 8,
        durationSteps: 4,
        gradoCromatico: 1,
        level: "fuerte",
        guitarArticulation: "rasguido",
      },
      {
        step: 12,
        durationSteps: 4,
        gradoCromatico: 1,
        level: "medio",
        guitarArticulation: "rasguido",
      },
    ],
    { familia: "acompanamiento", aptoPara: GUITARRA_ONLY },
  ),
  buildPattern(
    "rasguido-corcheas",
    "Rasguido en corcheas",
    "↓ ↑ ↓ ↑ · abajo en tiempos, arriba en contratiempos",
    100,
    [
      {
        step: 0,
        durationSteps: 2,
        gradoCromatico: 1,
        level: "fuerte",
        guitarArticulation: "rasguido",
      },
      {
        step: 2,
        durationSteps: 2,
        gradoCromatico: 1,
        level: "suave",
        guitarArticulation: "rasguidoArriba",
      },
      {
        step: 4,
        durationSteps: 2,
        gradoCromatico: 1,
        level: "medio",
        guitarArticulation: "rasguido",
      },
      {
        step: 6,
        durationSteps: 2,
        gradoCromatico: 1,
        level: "suave",
        guitarArticulation: "rasguidoArriba",
      },
      {
        step: 8,
        durationSteps: 2,
        gradoCromatico: 1,
        level: "fuerte",
        guitarArticulation: "rasguido",
      },
      {
        step: 10,
        durationSteps: 2,
        gradoCromatico: 1,
        level: "suave",
        guitarArticulation: "rasguidoArriba",
      },
      {
        step: 12,
        durationSteps: 2,
        gradoCromatico: 1,
        level: "medio",
        guitarArticulation: "rasguido",
      },
      {
        step: 14,
        durationSteps: 2,
        gradoCromatico: 1,
        level: "suave",
        guitarArticulation: "rasguidoArriba",
      },
    ],
    { familia: "acompanamiento", aptoPara: GUITARRA_ONLY },
  ),
  buildPattern(
    "rasguido-ddudu",
    "Rasguido ↓↓↑↑↓",
    "Abajo, abajo, arriba, arriba y abajo · patrón clásico",
    96,
    [
      {
        step: 0,
        durationSteps: 2,
        gradoCromatico: 1,
        level: "fuerte",
        guitarArticulation: "rasguido",
      },
      {
        step: 4,
        durationSteps: 2,
        gradoCromatico: 1,
        level: "medio",
        guitarArticulation: "rasguido",
      },
      {
        step: 6,
        durationSteps: 2,
        gradoCromatico: 1,
        level: "suave",
        guitarArticulation: "rasguidoArriba",
      },
      {
        step: 10,
        durationSteps: 2,
        gradoCromatico: 1,
        level: "suave",
        guitarArticulation: "rasguidoArriba",
      },
      {
        step: 12,
        durationSteps: 2,
        gradoCromatico: 1,
        level: "fuerte",
        guitarArticulation: "rasguido",
      },
    ],
    { familia: "acompanamiento", aptoPara: GUITARRA_ONLY },
  ),
  buildPattern(
    "rasguido-con-bajo",
    "Rasguido con bajo",
    "Bajo en 1 y 3 · rasguido en 2 y 4",
    92,
    [
      {
        step: 0,
        durationSteps: 4,
        gradoCromatico: 1,
        level: "fuerte",
        guitarArticulation: "pua",
      },
      {
        step: 4,
        durationSteps: 4,
        gradoCromatico: 1,
        level: "medio",
        guitarArticulation: "rasguido",
      },
      {
        step: 8,
        durationSteps: 4,
        gradoCromatico: 1,
        level: "fuerte",
        guitarArticulation: "pua",
      },
      {
        step: 12,
        durationSteps: 4,
        gradoCromatico: 1,
        level: "medio",
        guitarArticulation: "rasguido",
      },
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
      isGuitarChordArticulation(guitarArticulation);

    return createCompositorEvent({
      startStep: event.startStep,
      durationSteps: event.durationSteps,
      level: event.level,
      gradoCromatico: event.gradoCromatico,
      octavaRelativa,
      note,
      guitarArticulation,
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

  return normalizeCompositorPiece({
    ...piece,
    tracks: piece.tracks.map((track) =>
      track.instrumentId === instrumentId
        ? { ...track, enabled: true, events }
        : track,
    ),
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
