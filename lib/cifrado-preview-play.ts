import type { MetronomeBeatLevel } from "@/lib/metronomo";

const LEVEL_AUDIO: Record<
  Exclude<MetronomeBeatLevel, "silencio">,
  { frequency: number; peakGain: number; duration: number }
> = {
  suave: { frequency: 620, peakGain: 0.14, duration: 0.014 },
  medio: { frequency: 900, peakGain: 0.38, duration: 0.022 },
  fuerte: { frequency: 1500, peakGain: 0.72, duration: 0.045 },
};

let sharedAudioContext: AudioContext | null = null;

async function getAudioContext(): Promise<AudioContext | null> {
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

export async function playCifradoClick(
  kind: import("@/lib/cifrado").CompasMarkerKind,
  intensidad?: MetronomeBeatLevel,
): Promise<void> {
  const audioContext = await getAudioContext();

  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime;

  if (intensidad !== undefined) {
    if (intensidad === "silencio") {
      return;
    }

    const audio = LEVEL_AUDIO[intensidad];
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = audio.frequency;
    gainNode.gain.setValueAtTime(audio.peakGain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + audio.duration);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + audio.duration);
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.value = kind === "measure" ? 740 : 520;

  const peakGain = kind === "measure" ? 0.12 : 0.08;
  const duration = kind === "measure" ? 0.06 : 0.04;

  gainNode.gain.setValueAtTime(peakGain, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

export type PreviewPlaybackAnchor = {
  lineIndex: number;
  leftPx: number;
};

export type PreviewPlaybackBeat = {
  kind: import("@/lib/cifrado").CompasMarkerKind;
  anchors: PreviewPlaybackAnchor[];
  intensidad: MetronomeBeatLevel;
  cycleId?: string | null;
  cycleStepIndex?: number;
};

/** Secuencia de golpes usando las pastillas visibles (posiciones exactas en pantalla). */
export function buildDisplayedPreviewPlaybackBeats(
  markersByLine: Record<number, import("@/lib/cifrado").CompasMarker[]>,
  lineCount: number,
): PreviewPlaybackBeat[] {
  const beats: PreviewPlaybackBeat[] = [];

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const lineMarkers = markersByLine[lineIndex] ?? [];
    let startIndex = 0;

    if (lineIndex > 0 && lineMarkers.length > 0 && beats.length > 0) {
      const sharedMarker = lineMarkers[0];
      const lastBeat = beats[beats.length - 1]!;

      lastBeat.anchors.push({
        lineIndex,
        leftPx: sharedMarker.leftPx,
      });

      if (sharedMarker.kind === "measure") {
        lastBeat.kind = "measure";
      }

      if (sharedMarker.intensidad) {
        lastBeat.intensidad = sharedMarker.intensidad;
      }

      if (sharedMarker.cycleId) {
        lastBeat.cycleId = sharedMarker.cycleId;
        lastBeat.cycleStepIndex = sharedMarker.cycleStepIndex;
      }

      startIndex = 1;
    }

    for (
      let markerIndex = startIndex;
      markerIndex < lineMarkers.length;
      markerIndex += 1
    ) {
      const marker = lineMarkers[markerIndex]!;

      beats.push({
        kind: marker.kind,
        anchors: [{ lineIndex, leftPx: marker.leftPx }],
        intensidad:
          marker.intensidad ??
          (marker.kind === "measure" ? "fuerte" : "medio"),
        cycleId: marker.cycleId ?? null,
        cycleStepIndex: marker.cycleStepIndex,
      });
    }
  }

  return beats;
}

export function findNearestMarkerLeftPx(
  markers: import("@/lib/cifrado").CompasMarker[],
  targetLeftPx: number,
  preferredKind?: import("@/lib/cifrado").CompasMarkerKind,
): number | null {
  if (markers.length === 0) {
    return null;
  }

  const pool =
    preferredKind !== undefined
      ? markers.filter((marker) => marker.kind === preferredKind)
      : markers;
  const candidates = pool.length > 0 ? pool : markers;

  let nearest = candidates[0]!;
  let nearestDistance = Math.abs(candidates[0]!.leftPx - targetLeftPx);

  for (const marker of candidates) {
    const distance = Math.abs(marker.leftPx - targetLeftPx);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = marker;
    }
  }

  return nearest.leftPx;
}

/** @deprecated Usar buildDisplayedPreviewPlaybackBeats. */
export function buildGlobalPreviewPlaybackBeats(
  lines: string[],
  barras: import("@/lib/cifrado").BarraCompas[],
  beatCount: number,
  _positionsByLine: Record<number, { left: number; center: number }[]>,
): PreviewPlaybackBeat[] {
  void lines;
  void barras;
  void beatCount;
  return [];
}

/** @deprecated Usar buildDisplayedPreviewPlaybackBeats. */
export function flattenPreviewPlaybackBeats(
  markersByLine: Record<number, { kind: import("@/lib/cifrado").CompasMarkerKind; leftPx: number }[]>,
  lineCount: number,
): PreviewPlaybackBeat[] {
  return buildDisplayedPreviewPlaybackBeats(markersByLine, lineCount);
}
