import type { CompositorSlotNote } from "@/lib/compositor";
import { targetToFrequency } from "@/lib/voz";

/** Nota de referencia del sample de piano (Salamander C4). */
export const COMPOSITOR_PIANO_ROOT: CompositorSlotNote = {
  note: "C",
  octave: 4,
};

/** Nota de referencia del sample de guitarra (cuerda Mi grave). */
export const COMPOSITOR_GUITAR_ROOT: CompositorSlotNote = {
  note: "E",
  octave: 2,
};

export type CompositorSampleBank = {
  piano: AudioBuffer;
  guitarNote: AudioBuffer;
  guitarStrum: AudioBuffer;
  kick: AudioBuffer;
  snare: AudioBuffer;
  hihat: AudioBuffer;
};

const SAMPLE_FILES = {
  piano: "/samples/compositor/piano-c4.mp3",
  guitarNote: "/samples/compositor/guitar-note.mp3",
  guitarStrum: "/samples/compositor/guitar-strum.mp3",
  kick: "/samples/compositor/kick.mp3",
  snare: "/samples/compositor/snare.mp3",
  hihat: "/samples/compositor/hihat.mp3",
} as const;

let loadPromise: Promise<CompositorSampleBank> | null = null;
let cachedBank: CompositorSampleBank | null = null;

async function fetchSampleBuffer(
  audioContext: AudioContext,
  url: string,
): Promise<AudioBuffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`No se pudo cargar el sample ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return audioContext.decodeAudioData(arrayBuffer);
}

export function getCompositorPlaybackRate(
  note: CompositorSlotNote,
  rootNote: CompositorSlotNote,
): number {
  const target = targetToFrequency(note);
  const root = targetToFrequency(rootNote);

  if (root <= 0) {
    return 1;
  }

  return target / root;
}

export async function loadCompositorSamples(
  audioContext: AudioContext,
): Promise<CompositorSampleBank> {
  if (cachedBank) {
    return cachedBank;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      const [piano, guitarNote, guitarStrum, kick, snare, hihat] =
        await Promise.all([
          fetchSampleBuffer(audioContext, SAMPLE_FILES.piano),
          fetchSampleBuffer(audioContext, SAMPLE_FILES.guitarNote),
          fetchSampleBuffer(audioContext, SAMPLE_FILES.guitarStrum),
          fetchSampleBuffer(audioContext, SAMPLE_FILES.kick),
          fetchSampleBuffer(audioContext, SAMPLE_FILES.snare),
          fetchSampleBuffer(audioContext, SAMPLE_FILES.hihat),
        ]);

      cachedBank = {
        piano,
        guitarNote,
        guitarStrum,
        kick,
        snare,
        hihat,
      };

      return cachedBank;
    })();
  }

  try {
    return await loadPromise;
  } catch (error) {
    loadPromise = null;
    throw error;
  }
}

export function clearCompositorSampleCache(): void {
  cachedBank = null;
  loadPromise = null;
}
