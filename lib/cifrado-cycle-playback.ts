import type { PreviewPlaybackBeat } from "@/lib/cifrado-preview-play";
import { playCifradoClick } from "@/lib/cifrado-preview-play";
import type { CompositorPiece } from "@/lib/compositor";
import { getCompositorTrack } from "@/lib/compositor";
import { scheduleCompositorSound } from "@/lib/compositor-audio";
import { eventOverlapsStep } from "@/lib/compositor-timeline";
import {
  loadCompositorCoreSamples,
  type CompositorSampleBank,
} from "@/lib/compositor-samples";
import type { CompositorSlotNote } from "@/lib/compositor";
import { VOZ_DEFAULT_TARGET } from "@/lib/voz";

let sharedAudioContext: AudioContext | null = null;
let samplesPromise: Promise<CompositorSampleBank> | null = null;

async function getPlaybackAudioContext(): Promise<AudioContext | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextClass();
  }

  if (sharedAudioContext.state === "suspended") {
    await sharedAudioContext.resume();
  }

  return sharedAudioContext;
}

async function getDrumSamples(
  audioContext: AudioContext,
): Promise<CompositorSampleBank> {
  if (!samplesPromise) {
    samplesPromise = loadCompositorCoreSamples(audioContext);
  }

  return samplesPromise;
}

function getDrumEventsForGolpe(
  piece: CompositorPiece,
  golpeIndex: number,
): Array<{ drumSound: import("@/lib/compositor").CompositorDrumSound }> {
  const track = getCompositorTrack(piece, "bateria");

  if (!track.enabled) {
    return [];
  }

  const normalizedGolpe =
    ((golpeIndex % piece.cycleGolpes) + piece.cycleGolpes) % piece.cycleGolpes;
  const stepStart = normalizedGolpe * piece.subdivisionsPerGolpe;
  const stepEnd = stepStart + piece.subdivisionsPerGolpe;
  const hits: Array<{ drumSound: import("@/lib/compositor").CompositorDrumSound }> =
    [];

  for (const event of track.events) {
    if (event.level === "silencio" || event.drumSound === "silencio") {
      continue;
    }

    for (let step = stepStart; step < stepEnd; step += 1) {
      if (eventOverlapsStep(event, step)) {
        hits.push({ drumSound: event.drumSound });
        break;
      }
    }
  }

  return hits;
}

export function buildCompositorCyclePieceLookup(
  cycles: Array<{ id: string; piece: CompositorPiece }>,
): ReadonlyMap<string, CompositorPiece> {
  return new Map(cycles.map((cycle) => [cycle.id, cycle.piece]));
}

export async function playCifradoPreviewBeat(
  beat: PreviewPlaybackBeat,
  cyclesById: ReadonlyMap<string, CompositorPiece>,
): Promise<void> {
  const cycleId = beat.cycleId;

  if (!cycleId || !cyclesById.has(cycleId)) {
    await playCifradoClick(beat.kind, beat.intensidad);
    return;
  }

  const piece = cyclesById.get(cycleId)!;
  const golpeIndex = beat.cycleStepIndex ?? 0;
  const drumHits = getDrumEventsForGolpe(piece, golpeIndex);

  if (drumHits.length === 0) {
    await playCifradoClick(beat.kind, beat.intensidad);
    return;
  }

  const audioContext = await getPlaybackAudioContext();

  if (!audioContext) {
    return;
  }

  const samples = await getDrumSamples(audioContext);
  const now = audioContext.currentTime;
  const silentNote = VOZ_DEFAULT_TARGET as CompositorSlotNote;

  for (const hit of drumHits) {
    scheduleCompositorSound(
      audioContext,
      now,
      {
        instrumentId: "bateria",
        cycleOffsetSeconds: 0,
        durationSeconds: 0.1,
        level: beat.intensidad,
        notes: [silentNote],
        drumSound: hit.drumSound,
        guitarArticulation: "silencio",
      },
      samples,
    );
  }
}
