import type {
  CompositorDrumSound,
  CompositorGuitarArticulation,
  CompositorInstrumentId,
  CompositorPiece,
  CompositorSlotNote,
} from "@/lib/compositor";
import {
  COMPOSITOR_CORE_DRUM_FILES,
  COMPOSITOR_DRUM_SAMPLES,
  COMPOSITOR_GUITAR_SAMPLES,
  COMPOSITOR_PIANO_SAMPLES,
  COMPOSITOR_SAMPLE_PACKS,
  COMPOSITOR_VIENTO_SAMPLES,
  getCompositorPacksForInstrument,
  type CompositorMultiSampleDef,
  type CompositorSamplePackId,
} from "@/lib/compositor-sample-manifest";
import { getCompositorTrack } from "@/lib/compositor";
import { frequencyToMidi } from "@/lib/afinador";
import { targetToFrequency } from "@/lib/voz";

export type CompositorMultiSampleSet = {
  entries: Array<{
    root: CompositorSlotNote;
    buffer: AudioBuffer;
  }>;
};

export type CompositorSampleBank = {
  loadedPacks: Set<CompositorSamplePackId>;
  piano: CompositorMultiSampleSet | null;
  viento: CompositorMultiSampleSet | null;
  guitar: Partial<
    Record<Exclude<CompositorGuitarArticulation, "silencio">, AudioBuffer>
  > | null;
  drums: Partial<Record<CompositorDrumSound, AudioBuffer>> | null;
};

const MIN_PLAYBACK_RATE = 0.5;
const MAX_PLAYBACK_RATE = 2;
/** Incrementar al cambiar archivos de samples para invalidar caché en memoria. */
const SAMPLE_BANK_VERSION = 2;

let cachedBank: CompositorSampleBank | null = null;
let cachedBankVersion = 0;
let coreLoadPromise: Promise<CompositorSampleBank> | null = null;
const packLoadPromises = new Map<CompositorSamplePackId, Promise<void>>();

function createEmptyBank(): CompositorSampleBank {
  return {
    loadedPacks: new Set(),
    piano: null,
    viento: null,
    guitar: null,
    drums: null,
  };
}

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

function noteToMidi(note: CompositorSlotNote): number {
  return frequencyToMidi(targetToFrequency(note));
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

export type CompositorResolvedSample = {
  buffer: AudioBuffer;
  playbackRate: number;
};

export function pickNearestMultiSample(
  note: CompositorSlotNote,
  sampleSet: CompositorMultiSampleSet | null,
): CompositorResolvedSample | null {
  if (!sampleSet || sampleSet.entries.length === 0) {
    return null;
  }

  const targetMidi = noteToMidi(note);
  let bestEntry = sampleSet.entries[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const entry of sampleSet.entries) {
    const rootMidi = noteToMidi(entry.root);
    const playbackRate = 2 ** ((targetMidi - rootMidi) / 12);
    const clampedRate = Math.max(
      MIN_PLAYBACK_RATE,
      Math.min(MAX_PLAYBACK_RATE, playbackRate),
    );
    const semitoneError =
      Math.abs(Math.log2(clampedRate / playbackRate) * 12) +
      Math.abs(targetMidi - rootMidi) * 0.01;

    if (semitoneError < bestDistance) {
      bestDistance = semitoneError;
      bestEntry = entry;
    }
  }

  const rootMidi = noteToMidi(bestEntry.root);
  const playbackRate = Math.max(
    MIN_PLAYBACK_RATE,
    Math.min(MAX_PLAYBACK_RATE, 2 ** ((targetMidi - rootMidi) / 12)),
  );

  return {
    buffer: bestEntry.buffer,
    playbackRate,
  };
}

async function loadMultiSampleSet(
  audioContext: AudioContext,
  definitions: CompositorMultiSampleDef[],
): Promise<CompositorMultiSampleSet> {
  const entries = await Promise.all(
    definitions.map(async (definition) => ({
      root: definition.root,
      buffer: await fetchSampleBuffer(audioContext, definition.file),
    })),
  );

  return { entries };
}

async function loadPackIntoBank(
  audioContext: AudioContext,
  bank: CompositorSampleBank,
  packId: CompositorSamplePackId,
): Promise<void> {
  if (bank.loadedPacks.has(packId)) {
    return;
  }

  switch (packId) {
    case "core": {
      const [kick, snare, hihat, pianoC4] = await Promise.all([
        fetchSampleBuffer(audioContext, COMPOSITOR_CORE_DRUM_FILES.kick),
        fetchSampleBuffer(audioContext, COMPOSITOR_CORE_DRUM_FILES.snare),
        fetchSampleBuffer(audioContext, COMPOSITOR_CORE_DRUM_FILES.hihat),
        fetchSampleBuffer(audioContext, COMPOSITOR_PIANO_SAMPLES[2]!.file),
      ]);

      bank.drums = {
        ...(bank.drums ?? {}),
        kick,
        snare,
        hihat,
      };
      bank.piano = {
        entries: [{ root: COMPOSITOR_PIANO_SAMPLES[2]!.root, buffer: pianoC4 }],
      };
      break;
    }
    case "piano":
      bank.piano = await loadMultiSampleSet(audioContext, COMPOSITOR_PIANO_SAMPLES);
      break;
    case "guitarra": {
      const [pua, rasguido, dedo] = await Promise.all([
        fetchSampleBuffer(audioContext, COMPOSITOR_GUITAR_SAMPLES.pua),
        fetchSampleBuffer(audioContext, COMPOSITOR_GUITAR_SAMPLES.rasguido),
        fetchSampleBuffer(audioContext, COMPOSITOR_GUITAR_SAMPLES.dedo),
      ]);
      bank.guitar = { pua, rasguido, dedo };
      break;
    }
    case "bateria": {
      const entries = await Promise.all(
        Object.entries(COMPOSITOR_DRUM_SAMPLES).map(async ([sound, url]) => [
          sound,
          await fetchSampleBuffer(audioContext, url),
        ]),
      );
      bank.drums = {
        ...(bank.drums ?? {}),
        ...Object.fromEntries(entries),
      };
      break;
    }
    case "viento":
      bank.viento = await loadMultiSampleSet(audioContext, COMPOSITOR_VIENTO_SAMPLES);
      break;
    default:
      break;
  }

  bank.loadedPacks.add(packId);
}

function getBank(): CompositorSampleBank {
  if (!cachedBank || cachedBankVersion !== SAMPLE_BANK_VERSION) {
    cachedBank = createEmptyBank();
    cachedBankVersion = SAMPLE_BANK_VERSION;
    coreLoadPromise = null;
    packLoadPromises.clear();
  }

  return cachedBank;
}

export async function ensureCompositorSamplePack(
  audioContext: AudioContext,
  packId: CompositorSamplePackId,
): Promise<CompositorSampleBank> {
  const bank = getBank();

  if (bank.loadedPacks.has(packId)) {
    return bank;
  }

  let loadPromise = packLoadPromises.get(packId);

  if (!loadPromise) {
    loadPromise = loadPackIntoBank(audioContext, bank, packId).finally(() => {
      packLoadPromises.delete(packId);
    });
    packLoadPromises.set(packId, loadPromise);
  }

  await loadPromise;
  return bank;
}

export async function loadCompositorCoreSamples(
  audioContext: AudioContext,
): Promise<CompositorSampleBank> {
  if (cachedBank?.loadedPacks.has("core")) {
    return cachedBank;
  }

  if (!coreLoadPromise) {
    coreLoadPromise = ensureCompositorSamplePack(audioContext, "core").finally(() => {
      coreLoadPromise = null;
    });
  }

  return coreLoadPromise;
}

/** Compatibilidad: carga el pack core (drums básicos + piano central). */
export async function loadCompositorSamples(
  audioContext: AudioContext,
): Promise<CompositorSampleBank> {
  return loadCompositorCoreSamples(audioContext);
}

export async function ensureCompositorSamplesForPiece(
  audioContext: AudioContext,
  piece: CompositorPiece,
  options?: {
    includeInstrumentId?: CompositorInstrumentId;
  },
): Promise<CompositorSampleBank> {
  await loadCompositorCoreSamples(audioContext);

  const packs = new Set<CompositorSamplePackId>();

  for (const track of piece.tracks) {
    if (!track.enabled) {
      continue;
    }

    for (const packId of getCompositorPacksForInstrument(track.instrumentId)) {
      packs.add(packId);
    }
  }

  if (options?.includeInstrumentId) {
    for (const packId of getCompositorPacksForInstrument(
      options.includeInstrumentId,
    )) {
      packs.add(packId);
    }
  }

  await Promise.all(
    [...packs].map((packId) => ensureCompositorSamplePack(audioContext, packId)),
  );

  return getBank();
}

export async function prefetchCompositorSamplePack(
  audioContext: AudioContext,
  instrumentId: CompositorInstrumentId,
): Promise<void> {
  await loadCompositorCoreSamples(audioContext);

  const packs = getCompositorPacksForInstrument(instrumentId);

  await Promise.all(
    packs.map((packId) => ensureCompositorSamplePack(audioContext, packId)),
  );
}

export function getCompositorSamplePackSummary(): Array<{
  id: CompositorSamplePackId;
  fileCount: number;
}> {
  return (Object.keys(COMPOSITOR_SAMPLE_PACKS) as CompositorSamplePackId[]).map(
    (id) => ({
      id,
      fileCount: COMPOSITOR_SAMPLE_PACKS[id].length,
    }),
  );
}

export function clearCompositorSampleCache(): void {
  cachedBank = null;
  cachedBankVersion = 0;
  coreLoadPromise = null;
  packLoadPromises.clear();
}

/** Utilidad de prueba: packs necesarios para la pieza actual. */
export function getRequiredPacksForPiece(piece: CompositorPiece): CompositorSamplePackId[] {
  const packs = new Set<CompositorSamplePackId>(["core"]);

  for (const track of piece.tracks) {
    if (!track.enabled) {
      continue;
    }

    for (const packId of getCompositorPacksForInstrument(track.instrumentId)) {
      packs.add(packId);
    }
  }

  return [...packs];
}

export function pieceUsesInstrument(
  piece: CompositorPiece,
  instrumentId: CompositorInstrumentId,
): boolean {
  return getCompositorTrack(piece, instrumentId).enabled;
}
