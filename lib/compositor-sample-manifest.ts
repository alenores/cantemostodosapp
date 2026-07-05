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
  pua: string;
  rasguido: string;
  dedo: string;
};

export type CompositorDrumSampleDef = Record<
  Exclude<CompositorDrumSound, "silencio">,
  string
>;

const SAMPLE_BASE = "/samples/compositor";

export const COMPOSITOR_PIANO_SAMPLES: CompositorMultiSampleDef[] = [
  { file: `${SAMPLE_BASE}/piano/c2.mp3`, root: { note: "C", octave: 2 } },
  { file: `${SAMPLE_BASE}/piano/c3.mp3`, root: { note: "C", octave: 3 } },
  { file: `${SAMPLE_BASE}/piano/c4.mp3`, root: { note: "C", octave: 4 } },
  { file: `${SAMPLE_BASE}/piano/c5.mp3`, root: { note: "C", octave: 5 } },
  { file: `${SAMPLE_BASE}/piano/c6.mp3`, root: { note: "C", octave: 6 } },
];

/** Flauta acústica (tonejs-instruments / CC-BY 3.0), 6 raíces en octavas 4–5. */
export const COMPOSITOR_VIENTO_SAMPLES: CompositorMultiSampleDef[] = [
  { file: `${SAMPLE_BASE}/viento/c4.mp3`, root: { note: "C", octave: 4 } },
  { file: `${SAMPLE_BASE}/viento/e4.mp3`, root: { note: "E", octave: 4 } },
  { file: `${SAMPLE_BASE}/viento/a4.mp3`, root: { note: "A", octave: 4 } },
  { file: `${SAMPLE_BASE}/viento/c5.mp3`, root: { note: "C", octave: 5 } },
  { file: `${SAMPLE_BASE}/viento/e5.mp3`, root: { note: "E", octave: 5 } },
  { file: `${SAMPLE_BASE}/viento/a5.mp3`, root: { note: "A", octave: 5 } },
];

export const COMPOSITOR_GUITAR_SAMPLES: CompositorGuitarSampleDef = {
  pua: `${SAMPLE_BASE}/guitar/pua.mp3`,
  rasguido: `${SAMPLE_BASE}/guitar/rasguido.mp3`,
  dedo: `${SAMPLE_BASE}/guitar/dedo.mp3`,
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
    COMPOSITOR_PIANO_SAMPLES[2]!.file,
  ],
  piano: COMPOSITOR_PIANO_SAMPLES.map((entry) => entry.file),
  guitarra: [
    COMPOSITOR_GUITAR_SAMPLES.pua,
    COMPOSITOR_GUITAR_SAMPLES.rasguido,
    COMPOSITOR_GUITAR_SAMPLES.dedo,
  ],
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
