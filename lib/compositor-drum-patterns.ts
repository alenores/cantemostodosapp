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
  | "cumbia-2"
  | "bossa"
  | "funk"
  | "balada"
  | "marcha"
  | "hip-hop"
  | "tren"
  | "vals"
  | "disco"
  | "salsa"
  | "bachata"
  | "merengue"
  | "reggaeton"
  | "ska"
  | "shuffle-blues"
  | "jazz-swing"
  | "metal"
  | "tango"
  | "chacarera"
  | "zamba"
  | "samba"
  | "forro"
  | "bolero"
  | "afrobeat"
  | "dubstep"
  | "country"
  | "rumba";

export type CompositorDrumPattern = {
  id: CompositorDrumPatternId;
  label: string;
  descripcion: string;
  cycleGolpes: number;
  suggestedBpm: number;
  beatDuration: "negra" | "corchea";
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

function offbeatOpenHiHatSteps(cycleGolpes: number): DrumHit[] {
  const gridSteps = cycleGolpes * COMPOSITOR_SUBDIVISIONS_PER_GOLPE;
  const hits: DrumHit[] = [];

  for (let step = 2; step < gridSteps; step += 4) {
    hits.push({ step, drumSound: "hihatOpen", level: "medio" });
  }

  return hits;
}

function shuffleRideSteps(cycleGolpes: number): DrumHit[] {
  const gridSteps = cycleGolpes * COMPOSITOR_SUBDIVISIONS_PER_GOLPE;
  const hits: DrumHit[] = [];

  for (let step = 0; step < gridSteps; step += 1) {
    const posInBeat = step % 4;
    if (posInBeat === 0 || posInBeat === 3) {
      hits.push({
        step,
        drumSound: "ride",
        level: posInBeat === 0 ? "medio" : "suave",
      });
    }
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

function createCycleBeatDurations(
  cycleGolpes: number,
  beatDuration: "negra" | "corchea",
): MetronomeBeatDurationPattern {
  return [
    ...Array(cycleGolpes).fill(beatDuration),
    ...Array(METRONOME_PATTERN_LENGTH - cycleGolpes).fill(beatDuration),
  ] as MetronomeBeatDurationPattern;
}

function buildPattern(
  id: CompositorDrumPatternId,
  label: string,
  descripcion: string,
  suggestedBpm: number,
  hits: DrumHit[],
  cycleGolpes = 4,
  beatDuration: "negra" | "corchea" = "negra",
): CompositorDrumPattern {
  return {
    id,
    label,
    descripcion,
    cycleGolpes,
    suggestedBpm,
    beatDuration,
    events: hitsToEvents(hits),
  };
}

const CYCLE_GOLPES = 4;

export const COMPOSITOR_DRUM_PATTERNS: CompositorDrumPattern[] = [
  // —— Rock / pop / urbano ——
  buildPattern(
    "rock-basico",
    "Rock básico",
    "Bombo en 1 y 3 · caja en 2 y 4 · hi-hat en corcheas",
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
    "Bombo en los cuatro tiempos · caja en 2 y 4",
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
    "metal",
    "Metal",
    "Doble bombo en corcheas · caja en 2 y 4",
    140,
    [
      { step: 0, drumSound: "crash", level: "fuerte" },
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 2, drumSound: "kick", level: "fuerte" },
      { step: 4, drumSound: "kick", level: "fuerte" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 6, drumSound: "kick", level: "fuerte" },
      { step: 8, drumSound: "kick", level: "fuerte" },
      { step: 10, drumSound: "kick", level: "fuerte" },
      { step: 12, drumSound: "kick", level: "fuerte" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      { step: 14, drumSound: "kick", level: "fuerte" },
      { step: 2, drumSound: "hihat", level: "medio" },
      { step: 6, drumSound: "hihat", level: "medio" },
      { step: 10, drumSound: "hihat", level: "medio" },
      { step: 14, drumSound: "hihat", level: "medio" },
    ],
  ),
  buildPattern(
    "tren",
    "Rodapié",
    "Bombo en corcheas continuas · caja en 2 y 4",
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
  buildPattern(
    "hip-hop",
    "Hip-hop",
    "Bombo sincopado · caja en la espalda · hi-hat con acentos",
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
    "dubstep",
    "Dubstep",
    "Half-time · bombo en 1 · caja en 3",
    140,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 8, drumSound: "snare", level: "fuerte" },
      { step: 2, drumSound: "hihat", level: "medio" },
      { step: 4, drumSound: "hihat", level: "suave" },
      { step: 6, drumSound: "hihat", level: "medio" },
      { step: 10, drumSound: "hihat", level: "suave" },
      { step: 12, drumSound: "hihat", level: "medio" },
      { step: 14, drumSound: "hihat", level: "suave" },
      { step: 3, drumSound: "hihatOpen", level: "medio" },
      { step: 11, drumSound: "hihatOpen", level: "medio" },
    ],
  ),
  buildPattern(
    "disco",
    "Disco",
    "Four on the floor · charles en contratiempos",
    118,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 4, drumSound: "kick", level: "fuerte" },
      { step: 8, drumSound: "kick", level: "fuerte" },
      { step: 12, drumSound: "kick", level: "fuerte" },
      { step: 4, drumSound: "snare", level: "medio" },
      { step: 12, drumSound: "snare", level: "medio" },
      ...offbeatOpenHiHatSteps(CYCLE_GOLPES),
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
    "Ride en negras · caja suave · bombo en 1 y 3",
    68,
    [
      { step: 0, drumSound: "kick", level: "suave" },
      { step: 8, drumSound: "kick", level: "suave" },
      { step: 4, drumSound: "snare", level: "suave" },
      { step: 12, drumSound: "snare", level: "suave" },
      { step: 0, drumSound: "ride", level: "suave" },
      { step: 4, drumSound: "ride", level: "suave" },
      { step: 8, drumSound: "ride", level: "suave" },
      { step: 12, drumSound: "ride", level: "suave" },
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

  // —— Jazz / blues / bossa ——
  buildPattern(
    "bossa",
    "Bossa nova",
    "Ride en semicorcheas · bombo y caja discretos",
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
    "jazz-swing",
    "Jazz swing",
    "Ride con swing · bombo ligero · caja suave en 2",
    120,
    [
      { step: 0, drumSound: "ride", level: "medio" },
      { step: 4, drumSound: "ride", level: "medio" },
      { step: 6, drumSound: "ride", level: "suave" },
      { step: 8, drumSound: "ride", level: "medio" },
      { step: 12, drumSound: "ride", level: "medio" },
      { step: 14, drumSound: "ride", level: "suave" },
      { step: 0, drumSound: "kick", level: "suave" },
      { step: 10, drumSound: "kick", level: "suave" },
      { step: 4, drumSound: "snare", level: "suave" },
    ],
  ),
  buildPattern(
    "shuffle-blues",
    "Blues shuffle",
    "Shuffle en ride · bombo en 1 y 3",
    72,
    [
      { step: 0, drumSound: "kick", level: "medio" },
      { step: 8, drumSound: "kick", level: "medio" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      ...shuffleRideSteps(CYCLE_GOLPES),
    ],
  ),
  buildPattern(
    "bolero",
    "Bolero",
    "Pulso lento en ride · caja suave en 2 y 4",
    60,
    [
      { step: 0, drumSound: "kick", level: "suave" },
      { step: 8, drumSound: "kick", level: "suave" },
      { step: 4, drumSound: "snare", level: "suave" },
      { step: 12, drumSound: "snare", level: "suave" },
      { step: 0, drumSound: "ride", level: "suave" },
      { step: 4, drumSound: "ride", level: "suave" },
      { step: 8, drumSound: "ride", level: "suave" },
      { step: 12, drumSound: "ride", level: "suave" },
    ],
  ),

  // —— Caribe / reggae / ska ——
  buildPattern(
    "reggae",
    "Reggae",
    "One drop · bombo solo en 3 · caja suave en 2 y 4",
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
    "ska",
    "Ska",
    "Golpe en 2 y 4 · charles abiertos en contratiempos",
    150,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 8, drumSound: "kick", level: "fuerte" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      ...offbeatOpenHiHatSteps(CYCLE_GOLPES),
    ],
  ),
  buildPattern(
    "afrobeat",
    "Afrobeat",
    "Bombo y caja polirítmicos · hi-hat en corcheas",
    95,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 5, drumSound: "kick", level: "medio" },
      { step: 8, drumSound: "kick", level: "fuerte" },
      { step: 13, drumSound: "kick", level: "medio" },
      { step: 3, drumSound: "snare", level: "fuerte" },
      { step: 7, drumSound: "snare", level: "medio" },
      { step: 11, drumSound: "snare", level: "fuerte" },
      { step: 15, drumSound: "snare", level: "medio" },
      ...eighthHiHatSteps(CYCLE_GOLPES),
    ],
  ),

  // —— Latinoamérica ——
  buildPattern(
    "cumbia",
    "Cumbia",
    "Tumbao de tambora · guiro sincopado · sin corcheas rectas",
    92,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 6, drumSound: "kick", level: "medio" },
      { step: 10, drumSound: "kick", level: "medio" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 11, drumSound: "snare", level: "medio" },
      { step: 2, drumSound: "hihat", level: "suave" },
      { step: 5, drumSound: "hihat", level: "medio" },
      { step: 8, drumSound: "hihat", level: "suave" },
      { step: 11, drumSound: "hihat", level: "medio" },
      { step: 14, drumSound: "hihat", level: "suave" },
    ],
  ),
  buildPattern(
    "cumbia-2",
    "Cumbia 2",
    "Tum chi chi tum chi chi · ritmo de tribuna",
    96,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 3, drumSound: "snare", level: "fuerte" },
      { step: 4, drumSound: "snare", level: "medio" },
      { step: 8, drumSound: "kick", level: "fuerte" },
      { step: 11, drumSound: "snare", level: "fuerte" },
      { step: 12, drumSound: "snare", level: "medio" },
      { step: 3, drumSound: "hihat", level: "medio" },
      { step: 4, drumSound: "hihat", level: "suave" },
      { step: 11, drumSound: "hihat", level: "medio" },
      { step: 12, drumSound: "hihat", level: "suave" },
    ],
  ),
  buildPattern(
    "salsa",
    "Salsa",
    "Tumbao de conga · acentos de clave en caja",
    180,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 3, drumSound: "kick", level: "medio" },
      { step: 6, drumSound: "kick", level: "fuerte" },
      { step: 10, drumSound: "kick", level: "medio" },
      { step: 0, drumSound: "snare", level: "fuerte" },
      { step: 3, drumSound: "snare", level: "medio" },
      { step: 8, drumSound: "snare", level: "fuerte" },
      { step: 10, drumSound: "snare", level: "medio" },
      { step: 2, drumSound: "hihat", level: "medio" },
      { step: 6, drumSound: "hihat", level: "medio" },
      { step: 10, drumSound: "hihat", level: "medio" },
      { step: 14, drumSound: "hihat", level: "medio" },
    ],
  ),
  buildPattern(
    "bachata",
    "Bachata",
    "Dembow bachatero · caja en 2 y 4",
    130,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 7, drumSound: "kick", level: "fuerte" },
      { step: 10, drumSound: "kick", level: "medio" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      ...eighthHiHatSteps(CYCLE_GOLPES),
    ],
  ),
  buildPattern(
    "merengue",
    "Merengue",
    "Tambora rápida · caja en corcheas continuas",
    160,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 4, drumSound: "kick", level: "medio" },
      { step: 8, drumSound: "kick", level: "fuerte" },
      { step: 12, drumSound: "kick", level: "medio" },
      { step: 0, drumSound: "snare", level: "fuerte" },
      { step: 2, drumSound: "snare", level: "medio" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 6, drumSound: "snare", level: "medio" },
      { step: 8, drumSound: "snare", level: "fuerte" },
      { step: 10, drumSound: "snare", level: "medio" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      { step: 14, drumSound: "snare", level: "medio" },
    ],
  ),
  buildPattern(
    "reggaeton",
    "Reggaetón",
    "Dembow · bombo en 1 y syncopes · caja en 2 y 4",
    92,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 6, drumSound: "kick", level: "fuerte" },
      { step: 10, drumSound: "kick", level: "medio" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      { step: 2, drumSound: "hihat", level: "medio" },
      { step: 4, drumSound: "hihat", level: "suave" },
      { step: 6, drumSound: "hihat", level: "medio" },
      { step: 8, drumSound: "hihat", level: "suave" },
      { step: 10, drumSound: "hihat", level: "medio" },
      { step: 12, drumSound: "hihat", level: "suave" },
      { step: 14, drumSound: "hihat", level: "medio" },
      { step: 15, drumSound: "hihat", level: "fuerte" },
    ],
  ),
  buildPattern(
    "tango",
    "Tango",
    "Marcato en negras · platillo en 1",
    120,
    [
      { step: 0, drumSound: "crash", level: "fuerte" },
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 4, drumSound: "kick", level: "fuerte" },
      { step: 8, drumSound: "kick", level: "fuerte" },
      { step: 12, drumSound: "kick", level: "fuerte" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      { step: 2, drumSound: "hihat", level: "medio" },
      { step: 6, drumSound: "hihat", level: "medio" },
      { step: 10, drumSound: "hihat", level: "medio" },
      { step: 14, drumSound: "hihat", level: "medio" },
    ],
  ),
  buildPattern(
    "rumba",
    "Rumba",
    "Compás flamenco · bombo y caja sincopados",
    120,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 3, drumSound: "kick", level: "medio" },
      { step: 6, drumSound: "kick", level: "fuerte" },
      { step: 10, drumSound: "kick", level: "medio" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 8, drumSound: "snare", level: "medio" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      { step: 14, drumSound: "snare", level: "medio" },
      { step: 2, drumSound: "hihat", level: "medio" },
      { step: 6, drumSound: "hihat", level: "medio" },
      { step: 10, drumSound: "hihat", level: "medio" },
      { step: 14, drumSound: "hihat", level: "medio" },
    ],
  ),
  buildPattern(
    "chacarera",
    "Chacarera",
    "Bombo legüero en 6/8 · acentos de esquila",
    108,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 12, drumSound: "kick", level: "fuerte" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 8, drumSound: "snare", level: "medio" },
      { step: 16, drumSound: "snare", level: "fuerte" },
      { step: 20, drumSound: "snare", level: "medio" },
      { step: 6, drumSound: "hihat", level: "medio" },
      { step: 10, drumSound: "hihat", level: "suave" },
      { step: 14, drumSound: "hihat", level: "medio" },
      { step: 18, drumSound: "hihat", level: "suave" },
      { step: 22, drumSound: "hihat", level: "medio" },
    ],
    6,
    "corchea",
  ),
  buildPattern(
    "zamba",
    "Zamba",
    "Compás de 6/8 pausado · bombo en 1 y 4",
    70,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 12, drumSound: "kick", level: "medio" },
      { step: 10, drumSound: "snare", level: "suave" },
      { step: 16, drumSound: "snare", level: "medio" },
      { step: 22, drumSound: "snare", level: "suave" },
      { step: 0, drumSound: "ride", level: "suave" },
      { step: 6, drumSound: "ride", level: "suave" },
      { step: 12, drumSound: "ride", level: "suave" },
      { step: 18, drumSound: "ride", level: "suave" },
    ],
    6,
    "corchea",
  ),

  // —— Brasil ——
  buildPattern(
    "samba",
    "Samba",
    "Surdo en tumbao · caja con ghost notes",
    100,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 3, drumSound: "kick", level: "medio" },
      { step: 6, drumSound: "kick", level: "fuerte" },
      { step: 10, drumSound: "kick", level: "medio" },
      { step: 2, drumSound: "snare", level: "suave" },
      { step: 5, drumSound: "snare", level: "suave" },
      { step: 8, drumSound: "snare", level: "suave" },
      { step: 11, drumSound: "snare", level: "suave" },
      { step: 14, drumSound: "snare", level: "suave" },
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
    "forro",
    "Forró",
    "Zabumba · bombo en 1 y syncopes · caja marcada",
    110,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 8, drumSound: "kick", level: "medio" },
      { step: 10, drumSound: "kick", level: "fuerte" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 7, drumSound: "snare", level: "medio" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      { step: 14, drumSound: "snare", level: "medio" },
      { step: 2, drumSound: "hihat", level: "medio" },
      { step: 6, drumSound: "hihat", level: "medio" },
      { step: 10, drumSound: "hihat", level: "medio" },
      { step: 14, drumSound: "hihat", level: "medio" },
    ],
  ),

  // —— Folk / country / vals ——
  buildPattern(
    "country",
    "Country",
    "Train beat · bombo sincopado · caja en 2 y 4",
    90,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 6, drumSound: "kick", level: "medio" },
      { step: 8, drumSound: "kick", level: "fuerte" },
      { step: 14, drumSound: "kick", level: "medio" },
      { step: 4, drumSound: "snare", level: "fuerte" },
      { step: 12, drumSound: "snare", level: "fuerte" },
      { step: 2, drumSound: "hihat", level: "medio" },
      { step: 6, drumSound: "hihat", level: "suave" },
      { step: 10, drumSound: "hihat", level: "medio" },
      { step: 14, drumSound: "hihat", level: "suave" },
    ],
  ),
  buildPattern(
    "vals",
    "Vals",
    "Tres tiempos · bombo en 1 · platillos en 2 y 3",
    90,
    [
      { step: 0, drumSound: "kick", level: "fuerte" },
      { step: 4, drumSound: "snare", level: "medio" },
      { step: 8, drumSound: "snare", level: "suave" },
      { step: 2, drumSound: "hihat", level: "suave" },
      { step: 6, drumSound: "hihat", level: "suave" },
      { step: 10, drumSound: "hihat", level: "suave" },
    ],
    3,
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
    cycleBeatDurations: createCycleBeatDurations(
      pattern.cycleGolpes,
      pattern.beatDuration,
    ),
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
      cycleBeatDurations: createCycleBeatDurations(
        pattern.cycleGolpes,
        pattern.beatDuration,
      ),
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
