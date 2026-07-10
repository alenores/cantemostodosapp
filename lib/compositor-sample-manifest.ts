import type { CompositorDrumSound, CompositorSlotNote } from "@/lib/compositor";

/** Packs de samples cargados bajo demanda para controlar peso en la PWA. */
export type CompositorSamplePackId =
  | "core"
  | "piano"
  | "guitarra"
  | "bateria"
  | "viento";

export type CompositorMultiSampleDef = {
  file: string;
  root: CompositorSlotNote;
};

export type CompositorGuitarSampleDef = {
  /** Cuerdas al aire para púa (multi-sample). */
  pua: CompositorMultiSampleDef[];
  /** Mismas cuerdas al aire para dedo/bloque/rasguido (multi-sample). */
  dedo: CompositorMultiSampleDef[];
};

export type CompositorDrumSampleDef = Record<
  Exclude<CompositorDrumSound, "silencio">,
  string
>;

const SAMPLE_BASE = "/samples/compositor";

/** Salamander densificado: cada 3ª menor C2–C6. */
export const COMPOSITOR_PIANO_SAMPLES: CompositorMultiSampleDef[] = [
  { file: `${SAMPLE_BASE}/piano/c2.mp3`, root: { note: "C", octave: 2 } },
  { file: `${SAMPLE_BASE}/piano/ds2.mp3`, root: { note: "D#", octave: 2 } },
  { file: `${SAMPLE_BASE}/piano/fs2.mp3`, root: { note: "F#", octave: 2 } },
  { file: `${SAMPLE_BASE}/piano/a2.mp3`, root: { note: "A", octave: 2 } },
  { file: `${SAMPLE_BASE}/piano/c3.mp3`, root: { note: "C", octave: 3 } },
  { file: `${SAMPLE_BASE}/piano/ds3.mp3`, root: { note: "D#", octave: 3 } },
  { file: `${SAMPLE_BASE}/piano/fs3.mp3`, root: { note: "F#", octave: 3 } },
  { file: `${SAMPLE_BASE}/piano/a3.mp3`, root: { note: "A", octave: 3 } },
  { file: `${SAMPLE_BASE}/piano/c4.mp3`, root: { note: "C", octave: 4 } },
  { file: `${SAMPLE_BASE}/piano/ds4.mp3`, root: { note: "D#", octave: 4 } },
  { file: `${SAMPLE_BASE}/piano/fs4.mp3`, root: { note: "F#", octave: 4 } },
  { file: `${SAMPLE_BASE}/piano/a4.mp3`, root: { note: "A", octave: 4 } },
  { file: `${SAMPLE_BASE}/piano/c5.mp3`, root: { note: "C", octave: 5 } },
  { file: `${SAMPLE_BASE}/piano/ds5.mp3`, root: { note: "D#", octave: 5 } },
  { file: `${SAMPLE_BASE}/piano/fs5.mp3`, root: { note: "F#", octave: 5 } },
  { file: `${SAMPLE_BASE}/piano/a5.mp3`, root: { note: "A", octave: 5 } },
  { file: `${SAMPLE_BASE}/piano/c6.mp3`, root: { note: "C", octave: 6 } },
];

export const COMPOSITOR_PIANO_CORE_SAMPLE =
  COMPOSITOR_PIANO_SAMPLES.find(
    (entry) => entry.root.note === "C" && entry.root.octave === 4,
  ) ?? COMPOSITOR_PIANO_SAMPLES[8]!;

/** Flauta acústica (tonejs-instruments / CC-BY 3.0), C4–A6. */
export const COMPOSITOR_VIENTO_SAMPLES: CompositorMultiSampleDef[] = [
  { file: `${SAMPLE_BASE}/viento/c4.mp3`, root: { note: "C", octave: 4 } },
  { file: `${SAMPLE_BASE}/viento/e4.mp3`, root: { note: "E", octave: 4 } },
  { file: `${SAMPLE_BASE}/viento/a4.mp3`, root: { note: "A", octave: 4 } },
  { file: `${SAMPLE_BASE}/viento/c5.mp3`, root: { note: "C", octave: 5 } },
  { file: `${SAMPLE_BASE}/viento/e5.mp3`, root: { note: "E", octave: 5 } },
  { file: `${SAMPLE_BASE}/viento/a5.mp3`, root: { note: "A", octave: 5 } },
  { file: `${SAMPLE_BASE}/viento/c6.mp3`, root: { note: "C", octave: 6 } },
  { file: `${SAMPLE_BASE}/viento/e6.mp3`, root: { note: "E", octave: 6 } },
  { file: `${SAMPLE_BASE}/viento/a6.mp3`, root: { note: "A", octave: 6 } },
];

const GUITAR_OPEN_STRINGS: CompositorMultiSampleDef[] = [
  { file: `${SAMPLE_BASE}/guitar/e2.mp3`, root: { note: "E", octave: 2 } },
  { file: `${SAMPLE_BASE}/guitar/a2.mp3`, root: { note: "A", octave: 2 } },
  { file: `${SAMPLE_BASE}/guitar/d3.mp3`, root: { note: "D", octave: 3 } },
  { file: `${SAMPLE_BASE}/guitar/g3.mp3`, root: { note: "G", octave: 3 } },
  { file: `${SAMPLE_BASE}/guitar/b3.mp3`, root: { note: "B", octave: 3 } },
  { file: `${SAMPLE_BASE}/guitar/e4.mp3`, root: { note: "E", octave: 4 } },
];

export const COMPOSITOR_GUITAR_SAMPLES: CompositorGuitarSampleDef = {
  pua: GUITAR_OPEN_STRINGS,
  dedo: GUITAR_OPEN_STRINGS,
};

export const COMPOSITOR_DRUM_SAMPLES: CompositorDrumSampleDef = {
  kick: `${SAMPLE_BASE}/drums/kick.mp3`,
  snare: `${SAMPLE_BASE}/drums/snare.mp3`,
  hihat: `${SAMPLE_BASE}/drums/hihat.mp3`,
  hihatOpen: `${SAMPLE_BASE}/drums/hihat-open.mp3`,
  crash: `${SAMPLE_BASE}/drums/crash.mp3`,
  ride: `${SAMPLE_BASE}/drums/ride.mp3`,
};

/** Samples mínimos para feedback rápido al abrir el Compositor. */
export const COMPOSITOR_CORE_DRUM_FILES: Pick<
  CompositorDrumSampleDef,
  "kick" | "snare" | "hihat"
> = {
  kick: COMPOSITOR_DRUM_SAMPLES.kick,
  snare: COMPOSITOR_DRUM_SAMPLES.snare,
  hihat: COMPOSITOR_DRUM_SAMPLES.hihat,
};

export const COMPOSITOR_SAMPLE_PACKS: Record<
  CompositorSamplePackId,
  readonly string[]
> = {
  core: [
    COMPOSITOR_CORE_DRUM_FILES.kick,
    COMPOSITOR_CORE_DRUM_FILES.snare,
    COMPOSITOR_CORE_DRUM_FILES.hihat,
    COMPOSITOR_PIANO_CORE_SAMPLE.file,
  ],
  piano: COMPOSITOR_PIANO_SAMPLES.map((entry) => entry.file),
  guitarra: COMPOSITOR_GUITAR_SAMPLES.pua.map((entry) => entry.file),
  bateria: Object.values(COMPOSITOR_DRUM_SAMPLES),
  viento: COMPOSITOR_VIENTO_SAMPLES.map((entry) => entry.file),
};

export function getCompositorPacksForInstrument(
  instrumentId: "piano" | "guitarra" | "bateria" | "viento",
): CompositorSamplePackId[] {
  switch (instrumentId) {
    case "piano":
      return ["piano"];
    case "guitarra":
      return ["guitarra"];
    case "bateria":
      return ["bateria"];
    case "viento":
      return ["viento"];
    default:
      return [];
  }
}
