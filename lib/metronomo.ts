import {
  createPlaybackBus,
  type AudioPlaybackBus,
} from "@/lib/audio-playback-bus";

export const BPM_MIN = 40;
export const BPM_MAX = 240;
export const BPM_DEFAULT = 80;

export const BEATS_PER_MEASURE_MIN = 1;
export const BEATS_PER_MEASURE_MAX = 10;
export const BEATS_PER_MEASURE_DEFAULT = 4;

export const METRONOME_PATTERN_LENGTH = BEATS_PER_MEASURE_MAX;
export const METRONOME_PATTERN_LENGTH_DEFAULT = BEATS_PER_MEASURE_DEFAULT;

export type MetronomeBeatDuration =
  | "redonda"
  | "blanca"
  | "negra"
  | "corchea"
  | "semicorchea";

export const METRONOME_BEAT_DURATION_OPTIONS = [
  { id: "redonda" as const, label: "Redonda" },
  { id: "blanca" as const, label: "Blanca" },
  { id: "negra" as const, label: "Negra" },
  { id: "corchea" as const, label: "Corchea" },
  { id: "semicorchea" as const, label: "Semicorchea" },
] as const;

export const METRONOME_BEAT_DURATION_DEFAULT: MetronomeBeatDuration = "negra";

export type MetronomeBeatDurationPattern = MetronomeBeatDuration[];

export const METRONOME_BEAT_DURATION_PATTERN_DEFAULT: MetronomeBeatDurationPattern =
  Array.from(
    { length: METRONOME_PATTERN_LENGTH },
    () => METRONOME_BEAT_DURATION_DEFAULT,
  );

const BEAT_DURATION_MULTIPLIERS: Record<MetronomeBeatDuration, number> = {
  redonda: 4,
  blanca: 2,
  negra: 1,
  corchea: 0.5,
  semicorchea: 0.25,
};

export function getBeatDurationMultiplier(
  duration: MetronomeBeatDuration,
): number {
  return BEAT_DURATION_MULTIPLIERS[duration] ?? 1;
}

export function getBeatDurationLabel(
  duration: MetronomeBeatDuration,
): string {
  return (
    METRONOME_BEAT_DURATION_OPTIONS.find((option) => option.id === duration)
      ?.label ?? duration
  );
}

export function getBeatDurationRelativeToNegraLabel(
  duration: MetronomeBeatDuration,
): string {
  switch (duration) {
    case "redonda":
      return "4 tiempos de negra";
    case "blanca":
      return "2 tiempos de negra";
    case "negra":
      return "1 tiempo de negra";
    case "corchea":
      return "½ tiempo de negra";
    case "semicorchea":
      return "¼ tiempo de negra";
    default:
      return "";
  }
}

export function getBeatDurationOptionIndex(
  duration: MetronomeBeatDuration,
): number {
  const index = METRONOME_BEAT_DURATION_OPTIONS.findIndex(
    (option) => option.id === duration,
  );

  return index === -1 ? 2 : index;
}

export function getBeatDurationAtIndex(index: number): MetronomeBeatDuration {
  const wrapped =
    ((index % METRONOME_BEAT_DURATION_OPTIONS.length) +
      METRONOME_BEAT_DURATION_OPTIONS.length) %
    METRONOME_BEAT_DURATION_OPTIONS.length;

  return METRONOME_BEAT_DURATION_OPTIONS[wrapped]!.id;
}

export function normalizeBeatDurationPattern(
  pattern: MetronomeBeatDuration[],
): MetronomeBeatDurationPattern {
  const normalized = pattern.slice(0, METRONOME_PATTERN_LENGTH);

  while (normalized.length < METRONOME_PATTERN_LENGTH) {
    normalized.push(METRONOME_BEAT_DURATION_DEFAULT);
  }

  return normalized;
}

export function getActiveBeatDurationSlice(
  pattern: MetronomeBeatDurationPattern,
  patternLength: number,
): MetronomeBeatDuration[] {
  return normalizeBeatDurationPattern(pattern).slice(
    0,
    getActivePatternLength(patternLength),
  );
}

export function setBeatDurationAtSlot(
  pattern: MetronomeBeatDurationPattern,
  slotIndex: number,
  duration: MetronomeBeatDuration,
): MetronomeBeatDurationPattern {
  const next = normalizeBeatDurationPattern(pattern);
  const index = Math.max(
    0,
    Math.min(METRONOME_PATTERN_LENGTH - 1, slotIndex),
  );
  next[index] = duration;
  return next;
}

export function getCycleMs(
  bpm: number,
  beatDurations: MetronomeBeatDurationPattern,
  patternLength: number,
): number {
  return getActiveBeatDurationSlice(beatDurations, patternLength).reduce(
    (sum, duration) => sum + getMsPerBeat(bpm, duration),
    0,
  );
}

export function getBeatDurationPatternSummary(
  beatDurations: MetronomeBeatDurationPattern,
  patternLength: number,
): string {
  const active = getActiveBeatDurationSlice(beatDurations, patternLength);
  const first = active[0] ?? METRONOME_BEAT_DURATION_DEFAULT;

  if (active.every((duration) => duration === first)) {
    return getBeatDurationLabel(first);
  }

  return "Figuras variadas";
}

export type BeatPositionAtTime = {
  beatIndex: number;
  msIntoBeat: number;
  msPerBeat: number;
  beatStartMs: number;
};

export function getBeatPositionAtTime(
  now: number,
  beatMarkers: { timestamp: number; beatIndex: number }[],
  bpm: number,
  beatDurations: MetronomeBeatDurationPattern,
  patternLength: number,
): BeatPositionAtTime | null {
  if (beatMarkers.length === 0) {
    return null;
  }

  const activeLength = getActivePatternLength(patternLength);
  const durations = getActiveBeatDurationSlice(beatDurations, patternLength);

  let anchor = beatMarkers[0]!;

  for (const marker of beatMarkers) {
    if (marker.timestamp <= now) {
      anchor = marker;
    } else {
      break;
    }
  }

  let beatIndex = anchor.beatIndex;
  let beatStartMs = anchor.timestamp;
  let msPerBeat = getMsPerBeat(
    bpm,
    durations[beatIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
  );

  if (now < beatStartMs) {
    return {
      beatIndex,
      msIntoBeat: 0,
      msPerBeat,
      beatStartMs,
    };
  }

  let safety = 0;
  const maxIterations = activeLength * 256;

  while (beatStartMs + msPerBeat <= now && safety < maxIterations) {
    beatStartMs += msPerBeat;
    beatIndex = (beatIndex + 1) % activeLength;
    msPerBeat = getMsPerBeat(
      bpm,
      durations[beatIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
    );
    safety += 1;
  }

  return {
    beatIndex,
    msIntoBeat: now - beatStartMs,
    msPerBeat,
    beatStartMs,
  };
}

export function getBeatPositionFromOrigin(
  timeMs: number,
  originMs: number,
  startBeatIndex: number,
  bpm: number,
  beatDurations: MetronomeBeatDurationPattern,
  patternLength: number,
): BeatPositionAtTime {
  const activeLength = getActivePatternLength(patternLength);
  const durations = getActiveBeatDurationSlice(beatDurations, patternLength);

  let beatIndex = ((startBeatIndex % activeLength) + activeLength) % activeLength;
  let beatStartMs = originMs;
  let msPerBeat = getMsPerBeat(
    bpm,
    durations[beatIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
  );

  if (timeMs < beatStartMs) {
    return {
      beatIndex,
      msIntoBeat: 0,
      msPerBeat,
      beatStartMs,
    };
  }

  let safety = 0;
  const maxIterations = activeLength * 256;

  while (beatStartMs + msPerBeat <= timeMs && safety < maxIterations) {
    beatStartMs += msPerBeat;
    beatIndex = (beatIndex + 1) % activeLength;
    msPerBeat = getMsPerBeat(
      bpm,
      durations[beatIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
    );
    safety += 1;
  }

  return {
    beatIndex,
    msIntoBeat: timeMs - beatStartMs,
    msPerBeat,
    beatStartMs,
  };
}

export function getUpcomingBeatMarkers(
  beatMarkers: MetronomeBeatMarker[],
  now: number,
  bpm: number,
  patternLength: number,
  beatDurations: MetronomeBeatDurationPattern,
  lookAheadMs: number,
): MetronomeBeatMarker[] {
  if (beatMarkers.length === 0) {
    return [];
  }

  const activeLength = getActivePatternLength(patternLength);
  const durations = getActiveBeatDurationSlice(beatDurations, patternLength);
  const lastBeat = beatMarkers[beatMarkers.length - 1]!;
  const upcoming: MetronomeBeatMarker[] = [];

  let nextTime = lastBeat.timestamp;
  let nextIndex = lastBeat.beatIndex;
  let msForBeat = getMsPerBeat(
    bpm,
    durations[nextIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
  );

  nextTime += msForBeat;
  nextIndex = (nextIndex + 1) % activeLength;

  while (nextTime <= now + lookAheadMs) {
    if (nextTime > now) {
      upcoming.push({ timestamp: nextTime, beatIndex: nextIndex });
    }

    msForBeat = getMsPerBeat(
      bpm,
      durations[nextIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
    );
    nextTime += msForBeat;
    nextIndex = (nextIndex + 1) % activeLength;
  }

  return upcoming;
}

export type BeatTimelineSegment = {
  beatIndex: number;
  startMs: number;
  endMs: number;
};

export function getBeatTimelineSegmentsInWindow(
  beatMarkers: { timestamp: number; beatIndex: number }[],
  bpm: number,
  beatDurations: MetronomeBeatDurationPattern,
  patternLength: number,
  windowStartMs: number,
  windowEndMs: number,
): BeatTimelineSegment[] {
  if (beatMarkers.length === 0) {
    return [];
  }

  const activeLength = getActivePatternLength(patternLength);
  const durations = getActiveBeatDurationSlice(beatDurations, patternLength);
  const position = getBeatPositionAtTime(
    windowStartMs,
    beatMarkers,
    bpm,
    beatDurations,
    patternLength,
  );

  if (!position) {
    return [];
  }

  let beatIndex = position.beatIndex;
  let beatStartMs = position.beatStartMs;
  let msPerBeat = position.msPerBeat;
  const segments: BeatTimelineSegment[] = [];
  let safety = 0;
  const maxIterations = activeLength * 512;

  while (beatStartMs > windowStartMs && safety < maxIterations) {
    const previousIndex = (beatIndex - 1 + activeLength) % activeLength;
    const previousMs = getMsPerBeat(
      bpm,
      durations[previousIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
    );
    beatStartMs -= previousMs;
    beatIndex = previousIndex;
    msPerBeat = getMsPerBeat(
      bpm,
      durations[beatIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
    );
    safety += 1;
  }

  safety = 0;

  while (beatStartMs < windowEndMs && safety < maxIterations) {
    const endMs = beatStartMs + msPerBeat;

    if (endMs > windowStartMs) {
      segments.push({
        beatIndex,
        startMs: beatStartMs,
        endMs,
      });
    }

    beatStartMs = endMs;
    beatIndex = (beatIndex + 1) % activeLength;
    msPerBeat = getMsPerBeat(
      bpm,
      durations[beatIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
    );
    safety += 1;
  }

  return segments;
}

export function getBeatTimelineSegmentsFromOrigin(
  originMs: number,
  startBeatIndex: number,
  bpm: number,
  beatDurations: MetronomeBeatDurationPattern,
  patternLength: number,
  windowStartMs: number,
  windowEndMs: number,
): BeatTimelineSegment[] {
  const activeLength = getActivePatternLength(patternLength);
  const durations = getActiveBeatDurationSlice(beatDurations, patternLength);
  const position = getBeatPositionFromOrigin(
    windowStartMs,
    originMs,
    startBeatIndex,
    bpm,
    beatDurations,
    patternLength,
  );

  let beatIndex = position.beatIndex;
  let beatStartMs = position.beatStartMs;
  let msPerBeat = position.msPerBeat;
  const segments: BeatTimelineSegment[] = [];
  let safety = 0;
  const maxIterations = activeLength * 512;

  while (beatStartMs > windowStartMs && safety < maxIterations) {
    const previousIndex = (beatIndex - 1 + activeLength) % activeLength;
    const previousMs = getMsPerBeat(
      bpm,
      durations[previousIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
    );
    beatStartMs -= previousMs;
    beatIndex = previousIndex;
    msPerBeat = getMsPerBeat(
      bpm,
      durations[beatIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
    );
    safety += 1;
  }

  safety = 0;

  while (beatStartMs < windowEndMs && safety < maxIterations) {
    const endMs = beatStartMs + msPerBeat;

    if (endMs > windowStartMs) {
      segments.push({
        beatIndex,
        startMs: beatStartMs,
        endMs,
      });
    }

    beatStartMs = endMs;
    beatIndex = (beatIndex + 1) % activeLength;
    msPerBeat = getMsPerBeat(
      bpm,
      durations[beatIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
    );
    safety += 1;
  }

  return segments;
}

export function getMsPerBeat(
  bpm: number,
  beatDuration: MetronomeBeatDuration = METRONOME_BEAT_DURATION_DEFAULT,
): number {
  return (60000 / bpm) * getBeatDurationMultiplier(beatDuration);
}

export function getSecondsPerBeat(
  bpm: number,
  beatDuration: MetronomeBeatDuration = METRONOME_BEAT_DURATION_DEFAULT,
): number {
  return getMsPerBeat(bpm, beatDuration) / 1000;
}

export function clampPatternLength(value: number): number {
  return Math.max(
    BEATS_PER_MEASURE_MIN,
    Math.min(BEATS_PER_MEASURE_MAX, Math.round(value)),
  );
}

export function getActivePatternLength(
  patternLength: number,
): number {
  return clampPatternLength(patternLength);
}

export function getActivePatternSlice(
  pattern: MetronomeBeatLevel[],
  patternLength: number,
): MetronomeBeatLevel[] {
  return normalizeMetronomePattern(pattern).slice(
    0,
    getActivePatternLength(patternLength),
  );
}

export type MetronomeBeatLevel = "silencio" | "suave" | "medio" | "fuerte";

export type MetronomeBeatPattern = MetronomeBeatLevel[];

export const METRONOME_BEAT_LEVELS: MetronomeBeatLevel[] = [
  "silencio",
  "suave",
  "medio",
  "fuerte",
];

export const METRONOME_PATTERN_DEFAULT: MetronomeBeatPattern = Array.from(
  { length: METRONOME_PATTERN_LENGTH },
  () => "medio",
);

export function normalizeMetronomePattern(
  pattern: MetronomeBeatLevel[],
): MetronomeBeatPattern {
  const normalized = pattern.slice(0, METRONOME_PATTERN_LENGTH);

  while (normalized.length < METRONOME_PATTERN_LENGTH) {
    normalized.push("medio");
  }

  return normalized;
}

export function cycleMetronomeBeatLevel(
  level: MetronomeBeatLevel,
): MetronomeBeatLevel {
  const index = METRONOME_BEAT_LEVELS.indexOf(level);
  const safeIndex = index === -1 ? 0 : index;

  return METRONOME_BEAT_LEVELS[
    (safeIndex + 1) % METRONOME_BEAT_LEVELS.length
  ]!;
}

export function cycleMetronomePatternSlot(
  pattern: MetronomeBeatLevel[],
  slotIndex: number,
): MetronomeBeatPattern {
  const next = normalizeMetronomePattern(pattern);
  const index = Math.max(0, Math.min(METRONOME_PATTERN_LENGTH - 1, slotIndex));
  next[index] = cycleMetronomeBeatLevel(next[index]!);
  return next;
}

export function setBeatLevelAtSlot(
  pattern: MetronomeBeatPattern,
  slotIndex: number,
  level: MetronomeBeatLevel,
): MetronomeBeatPattern {
  const next = normalizeMetronomePattern(pattern);
  const index = Math.max(
    0,
    Math.min(METRONOME_PATTERN_LENGTH - 1, slotIndex),
  );
  next[index] = level;
  return next;
}

export function getBeatLevelAtOffset(
  level: MetronomeBeatLevel,
  delta: number,
): MetronomeBeatLevel {
  const index = METRONOME_BEAT_LEVELS.indexOf(level);
  const safeIndex = index === -1 ? 0 : index;

  return METRONOME_BEAT_LEVELS[
    (safeIndex + delta + METRONOME_BEAT_LEVELS.length) %
      METRONOME_BEAT_LEVELS.length
  ]!;
}

export function resizeMetronomePatternLength(
  pattern: MetronomeBeatLevel[],
  currentLength: number,
  nextLength: number,
): { pattern: MetronomeBeatPattern; patternLength: number } {
  const normalized = normalizeMetronomePattern(pattern);
  const clampedLength = clampPatternLength(nextLength);
  const safeCurrent = clampPatternLength(currentLength);

  for (let index = safeCurrent; index < clampedLength; index += 1) {
    if (normalized[index] === "silencio") {
      normalized[index] = "medio";
    }
  }

  return {
    pattern: normalized,
    patternLength: clampedLength,
  };
}

export function getBeatLevelLabel(level: MetronomeBeatLevel): string {
  switch (level) {
    case "suave":
      return "Suave";
    case "medio":
      return "Medio";
    case "fuerte":
      return "Fuerte";
    default:
      return "Silencio";
  }
}

export function getBeatSoundLabel(level: MetronomeBeatLevel): string {
  return level === "silencio" ? "Silencio" : "Suena";
}

export function toggleBeatSoundLevel(
  level: MetronomeBeatLevel,
): MetronomeBeatLevel {
  return level === "silencio" ? "fuerte" : "silencio";
}

export function getBeatLevelBarHeightPercent(level: MetronomeBeatLevel): number {
  switch (level) {
    case "fuerte":
      return 100;
    case "medio":
      return 68;
    case "suave":
      return 42;
    default:
      return 0;
  }
}

export function getBeatLevelConfigColor(level: MetronomeBeatLevel): string {
  switch (level) {
    case "fuerte":
      return "var(--voz-config)";
    case "medio":
      return "color-mix(in srgb, var(--voz-config) 62%, transparent)";
    case "suave":
      return "color-mix(in srgb, var(--voz-config) 32%, transparent)";
    default:
      return "var(--cola-sheet-pill)";
  }
}

export type MetronomeBeatLevelBarAppearance = {
  backgroundColor: string;
  border: string;
};

export function getBeatLevelBarAppearance(
  level: MetronomeBeatLevel,
): MetronomeBeatLevelBarAppearance {
  if (level === "silencio") {
    return {
      backgroundColor: getBeatLevelConfigColor(level),
      border: "1px solid var(--border)",
    };
  }

  return {
    backgroundColor: getBeatLevelConfigColor(level),
    border: "none",
  };
}

/** Grosor de la línea objetivo en gráficos de melodía/combo según intensidad. */
export function getMelodiaTargetLineStrokeWidth(
  level: MetronomeBeatLevel,
  emphasized = false,
): number {
  const heightPercent = getBeatLevelBarHeightPercent(level);

  if (heightPercent === 0) {
    return emphasized ? 2 : 1;
  }

  const base = 1.5 + (heightPercent / 100) * 4;

  return emphasized ? base + 2.5 : base;
}

/** Color de la línea objetivo en gráficos de melodía/combo según intensidad. */
export function getMelodiaTargetLineColor(level: MetronomeBeatLevel): string {
  return getBeatLevelConfigColor(level);
}

export function getMelodiaTargetLineOpacity(
  level: MetronomeBeatLevel,
  emphasized: boolean,
): number {
  if (level === "silencio") {
    return emphasized ? 0.35 : 0.2;
  }

  return emphasized ? 1 : 0.55;
}

export function getPatternLength(patternLength: number): number {
  return getActivePatternLength(patternLength);
}

export type MetronomeHit = {
  timestamp: number;
  beatIndex: number;
  expectedTime: number;
  deltaMsClamped: number;
};

export type MetronomeBeatMarker = {
  timestamp: number;
  beatIndex: number;
};

export type HitAccuracy = "en-tiempo" | "cerca" | "lejos";

export const TIMELINE_MEASURE_CYCLES = 5;

export function getTimelineWindowMs(
  bpm: number,
  patternLength = METRONOME_PATTERN_LENGTH,
  beatDurations: MetronomeBeatDurationPattern = METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
): number {
  return getCycleMs(bpm, beatDurations, patternLength) * TIMELINE_MEASURE_CYCLES;
}

export function getHitAccuracy(deltaMs: number): HitAccuracy {
  const abs = Math.abs(deltaMs);

  if (abs <= 50) {
    return "en-tiempo";
  }

  if (abs <= 150) {
    return "cerca";
  }

  return "lejos";
}

export function getHitAccuracyColor(accuracy: HitAccuracy): string {
  switch (accuracy) {
    case "en-tiempo":
      return "var(--tuner-in-tune)";
    case "cerca":
      return "var(--tuner-cerca)";
    default:
      return "var(--tuner-flat-sharp)";
  }
}

export const HIT_LANE_MAX_MS = 200;

export function getHitFeedbackLabel(deltaMs: number): string {
  const accuracy = getHitAccuracy(deltaMs);
  const ms = Math.round(deltaMs);

  if (accuracy === "en-tiempo") {
    if (ms === 0) {
      return "¡En tiempo!";
    }

    return `¡En tiempo! (${ms > 0 ? "+" : ""}${ms} ms)`;
  }

  if (accuracy === "cerca") {
    return ms > 0
      ? `Cerca · ${ms} ms tarde`
      : `Cerca · ${Math.abs(ms)} ms adelantado`;
  }

  return ms > 0 ? `${ms} ms tarde` : `${Math.abs(ms)} ms adelantado`;
}

export function getHitLanePositionPercent(deltaMs: number): number {
  const clamped = Math.max(-HIT_LANE_MAX_MS, Math.min(HIT_LANE_MAX_MS, deltaMs));
  return 50 + (clamped / HIT_LANE_MAX_MS) * 50;
}

export function computeOnTimeStreak(hits: MetronomeHit[]): number {
  let streak = 0;

  for (let index = hits.length - 1; index >= 0; index -= 1) {
    if (getHitAccuracy(hits[index].deltaMsClamped) !== "en-tiempo") {
      break;
    }

    streak += 1;
  }

  return streak;
}

/** Latencia típica cuando el navegador no reporta outputLatency (móvil). */
export const DEFAULT_OUTPUT_LATENCY_MS = 120;

/** Margen extra por el intervalo de análisis (~1 frame). */
export const ANALYSIS_FRAME_LATENCY_MS = 8;

export type MetronomeLatencyCompensation = {
  inputMs: number;
  outputMs: number;
  sessionOffsetMs: number;
};

export function getMetronomeLatencyCompensation(
  audioContext: AudioContext | null,
  analyserFftSize: number,
  sessionOffsetMs = 0,
): MetronomeLatencyCompensation {
  if (!audioContext) {
    return {
      inputMs: ANALYSIS_FRAME_LATENCY_MS,
      outputMs: DEFAULT_OUTPUT_LATENCY_MS,
      sessionOffsetMs,
    };
  }

  const reportedOutputMs = Math.round(
    ((audioContext.outputLatency ?? 0) + (audioContext.baseLatency ?? 0)) *
      1000,
  );

  return {
    inputMs:
      Math.round((analyserFftSize / audioContext.sampleRate) * 500) +
      ANALYSIS_FRAME_LATENCY_MS,
    outputMs: Math.max(reportedOutputMs, DEFAULT_OUTPUT_LATENCY_MS),
    sessionOffsetMs,
  };
}

/**
 * Estima el ataque del golpe más reciente dentro del buffer del analyser.
 * Los samples más nuevos están al final del buffer.
 */
export function estimateAttackOnsetMs(
  buffer: Float32Array,
  sampleRate: number,
  analysisTimeMs: number,
): number {
  const length = buffer.length;
  const scanStart = Math.floor(length * 0.35);
  let peak = 0;
  let peakIndex = length - 1;

  for (let index = scanStart; index < length; index += 1) {
    const sample = Math.abs(buffer[index]);
    if (sample > peak) {
      peak = sample;
      peakIndex = index;
    }
  }

  if (peak <= 0) {
    return analysisTimeMs;
  }

  const onsetThreshold = peak * 0.18;
  let onsetIndex = peakIndex;

  for (let index = peakIndex; index >= scanStart; index -= 1) {
    if (Math.abs(buffer[index]) >= onsetThreshold) {
      onsetIndex = index;
    } else {
      break;
    }
  }

  const samplesAfterOnset = length - 1 - onsetIndex;
  return analysisTimeMs - (samplesAfterOnset / sampleRate) * 1000;
}

export function computeHitDeltaMs(
  onsetMs: number,
  scheduledBeatMs: number,
  compensation: MetronomeLatencyCompensation,
): number {
  const perceivedHitMs =
    onsetMs - ANALYSIS_FRAME_LATENCY_MS - compensation.sessionOffsetMs;
  const perceivedBeatMs = scheduledBeatMs + compensation.outputMs;
  return perceivedHitMs - perceivedBeatMs;
}

export function onsetToPerceivedHitMs(
  onsetMs: number,
  sessionOffsetMs = 0,
): number {
  return onsetMs - ANALYSIS_FRAME_LATENCY_MS - sessionOffsetMs;
}

/** Aprende el desfase persistente del dispositivo a partir de golpes recientes. */
export function updateSessionLatencyOffset(
  currentOffsetMs: number,
  latestRawDeltaMs: number,
): number {
  if (Math.abs(latestRawDeltaMs) > 280) {
    return currentOffsetMs;
  }

  return currentOffsetMs * 0.55 + latestRawDeltaMs * 0.45;
}

const LOOK_AHEAD_SECONDS = 0.1;
const SCHEDULE_INTERVAL_MS = 25;

function getBeatLevelAudio(level: MetronomeBeatLevel): {
  frequency: number;
  peakGain: number;
  duration: number;
} | null {
  switch (level) {
    case "suave":
      return { frequency: 620, peakGain: 0.14, duration: 0.014 };
    case "medio":
      return { frequency: 900, peakGain: 0.38, duration: 0.022 };
    case "fuerte":
      return { frequency: 1500, peakGain: 0.72, duration: 0.045 };
    default:
      return null;
  }
}

function scheduleClick(
  audioContext: AudioContext,
  time: number,
  level: MetronomeBeatLevel,
  bus: AudioPlaybackBus,
): void {
  const audio = getBeatLevelAudio(level);

  if (!audio) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = audio.frequency;

  gainNode.gain.setValueAtTime(audio.peakGain, time);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + audio.duration);

  oscillator.connect(gainNode);
  gainNode.connect(bus.output);
  bus.track(oscillator);

  oscillator.start(time);
  oscillator.stop(time + audio.duration);
}

export type MetronomeEngine = {
  start(
    bpm: number,
    pattern: MetronomeBeatPattern,
    patternLength: number,
    beatDurations: MetronomeBeatDurationPattern,
    onBeat: (beatIndex: number, expectedTimeMs: number) => void,
  ): void;
  stop(): void;
};

export function createMetronomeEngine(
  audioContext: AudioContext,
): MetronomeEngine {
  const playbackBus = createPlaybackBus(audioContext);
  let running = false;
  let bpm = BPM_DEFAULT;
  let pattern: MetronomeBeatPattern = [...METRONOME_PATTERN_DEFAULT];
  let patternLength = METRONOME_PATTERN_LENGTH_DEFAULT;
  let beatDurations: MetronomeBeatDurationPattern = [
    ...METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
  ];
  let nextBeatTime = 0;
  let currentBeatIndex = 0;
  let schedulerTimer: ReturnType<typeof setInterval> | null = null;
  let onBeat: ((beatIndex: number, expectedTimeMs: number) => void) | null =
    null;
  const beatTimeouts = new Set<ReturnType<typeof setTimeout>>();

  function audioTimeToPerformanceMs(audioTime: number): number {
    return (
      performance.now() +
      (audioTime - audioContext.currentTime) * 1000
    );
  }

  function clearBeatTimeouts(): void {
    for (const timeoutId of beatTimeouts) {
      clearTimeout(timeoutId);
    }
    beatTimeouts.clear();
  }

  function scheduleBeatCallback(beatIndex: number, beatAudioTime: number): void {
    const delayMs = Math.max(
      0,
      (beatAudioTime - audioContext.currentTime) * 1000,
    );

    const timeoutId = setTimeout(() => {
      beatTimeouts.delete(timeoutId);

      if (!running || !onBeat) {
        return;
      }

      onBeat(beatIndex, audioTimeToPerformanceMs(beatAudioTime));
    }, delayMs);

    beatTimeouts.add(timeoutId);
  }

  function scheduler(): void {
    if (!running) {
      return;
    }

    const activeDurations = getActiveBeatDurationSlice(
      beatDurations,
      patternLength,
    );

    while (nextBeatTime < audioContext.currentTime + LOOK_AHEAD_SECONDS) {
      const beatIndex = currentBeatIndex;
      const beatTime = nextBeatTime;
      const level = pattern[beatIndex] ?? "silencio";
      const secondsPerBeat = getSecondsPerBeat(
        bpm,
        activeDurations[beatIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
      );

      scheduleClick(audioContext, beatTime, level, playbackBus);
      scheduleBeatCallback(beatIndex, beatTime);

      nextBeatTime += secondsPerBeat;
      currentBeatIndex = (currentBeatIndex + 1) % patternLength;
    }
  }

  return {
    start(
      nextBpm: number,
      nextPattern: MetronomeBeatPattern,
      nextPatternLength: number,
      nextBeatDurations: MetronomeBeatDurationPattern,
      nextOnBeat: (beatIndex: number, expectedTimeMs: number) => void,
    ) {
      if (running) {
        clearBeatTimeouts();
      }

      bpm = nextBpm;
      pattern = normalizeMetronomePattern(nextPattern);
      patternLength = getActivePatternLength(nextPatternLength);
      beatDurations = normalizeBeatDurationPattern(nextBeatDurations);
      onBeat = nextOnBeat;
      running = true;
      currentBeatIndex = 0;
      nextBeatTime = audioContext.currentTime;
      playbackBus.reset();

      if (schedulerTimer !== null) {
        clearInterval(schedulerTimer);
      }

      scheduler();
      schedulerTimer = setInterval(scheduler, SCHEDULE_INTERVAL_MS);
    },
    stop() {
      running = false;
      onBeat = null;
      playbackBus.cut();

      if (schedulerTimer !== null) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
      }

      clearBeatTimeouts();
    },
  };
}
