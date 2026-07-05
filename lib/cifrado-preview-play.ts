import type { BarraCompas, CompasMarker, CompasMarkerKind } from "@/lib/cifrado";

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
  kind: CompasMarkerKind,
): Promise<void> {
  const audioContext = await getAudioContext();

  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime;
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
  kind: CompasMarkerKind;
  anchors: PreviewPlaybackAnchor[];
};

/** Secuencia de golpes usando las pastillas visibles (posiciones exactas en pantalla). */
export function buildDisplayedPreviewPlaybackBeats(
  markersByLine: Record<number, CompasMarker[]>,
  lineCount: number,
): PreviewPlaybackBeat[] {
  const beats: PreviewPlaybackBeat[] = [];

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const lineMarkers = markersByLine[lineIndex] ?? [];
    let startIndex = 0;

    if (lineIndex > 0 && lineMarkers.length > 0 && beats.length > 0) {
      const sharedMarker = lineMarkers[0];
      const lastBeat = beats[beats.length - 1];

      lastBeat.anchors.push({
        lineIndex,
        leftPx: sharedMarker.leftPx,
      });

      if (sharedMarker.kind === "measure") {
        lastBeat.kind = "measure";
      }

      startIndex = 1;
    }

    for (
      let markerIndex = startIndex;
      markerIndex < lineMarkers.length;
      markerIndex += 1
    ) {
      const marker = lineMarkers[markerIndex];

      beats.push({
        kind: marker.kind,
        anchors: [{ lineIndex, leftPx: marker.leftPx }],
      });
    }
  }

  return beats;
}

export function findNearestMarkerLeftPx(
  markers: CompasMarker[],
  targetLeftPx: number,
  preferredKind?: CompasMarkerKind,
): number | null {
  if (markers.length === 0) {
    return null;
  }

  const pool =
    preferredKind !== undefined
      ? markers.filter((marker) => marker.kind === preferredKind)
      : markers;
  const candidates = pool.length > 0 ? pool : markers;

  let nearest = candidates[0];
  let nearestDistance = Math.abs(candidates[0].leftPx - targetLeftPx);

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
  barras: BarraCompas[],
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
  markersByLine: Record<number, { kind: CompasMarkerKind; leftPx: number }[]>,
  lineCount: number,
): PreviewPlaybackBeat[] {
  return buildDisplayedPreviewPlaybackBeats(markersByLine, lineCount);
}
