import {
  BPM_DEFAULT,
  BPM_MAX,
  BPM_MIN,
  clampPatternLength,
  getActivePatternSlice,
  getBeatPositionAtTime,
  getCycleMs,
  getMsPerBeat,
  METRONOME_BEAT_DURATION_DEFAULT,
  METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
  METRONOME_PATTERN_LENGTH,
  type MetronomeBeatDuration,
  type MetronomeBeatDurationPattern,
  type MetronomeBeatLevel,
  type MetronomeBeatPattern,
} from "@/lib/metronomo";
import type { VozAccuracy } from "@/lib/voz";

export { BPM_DEFAULT, BPM_MAX, BPM_MIN };

export type VozRitmoPhase = "cantar" | "silencio";

export type VozRitmoBeatMarker = {
  timestamp: number;
  beatIndex: number;
  phase: VozRitmoPhase;
  isPhaseStart: boolean;
};

export const VOZ_RITMO_PATTERN_LENGTH_DEFAULT = 8;
export const VOZ_MELODIA_PATTERN_LENGTH_DEFAULT = 4;
export const VOZ_RITMO_BEAT_PATTERN_DEFAULT: MetronomeBeatPattern = [
  "fuerte",
  "silencio",
  "fuerte",
  "silencio",
  "fuerte",
  "silencio",
  "fuerte",
  "silencio",
  "silencio",
  "silencio",
];

export function buildMelodiaSingPattern(
  patternLength: number,
): MetronomeBeatPattern {
  const length = clampPatternLength(patternLength);
  const pattern: MetronomeBeatLevel[] = [];

  for (let index = 0; index < METRONOME_PATTERN_LENGTH; index += 1) {
    pattern.push(index < length ? "fuerte" : "silencio");
  }

  return pattern;
}

export function buildUniformBeatDurations(
  duration: MetronomeBeatDuration,
): MetronomeBeatDurationPattern {
  return Array.from(
    { length: METRONOME_PATTERN_LENGTH },
    () => duration,
  );
}

export const VOZ_RITMO_TIMELINE_CYCLES = 4;
/** Fracción del ancho a la izquierda de «ahora» (resto = futuro visible). */
export const VOZ_RITMO_TIMELINE_PAST_RATIO = 0.42;

export type VozRitmoVoiceCompliance = "correcto" | "cerca" | "incorrecto";

export type VozRitmoVoiceSample = {
  timestamp: number;
  hasVoice: boolean;
  expectedPhase: VozRitmoPhase;
  compliance: VozRitmoVoiceCompliance;
};

export function clampRitmoBpm(value: number): number {
  return Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(value)));
}

export function beatLevelToPhase(level: MetronomeBeatLevel): VozRitmoPhase {
  return level === "silencio" ? "silencio" : "cantar";
}

export function getCycleBeats(patternLength: number): number {
  return clampPatternLength(patternLength);
}

export function getPhaseAtBeat(
  beatIndex: number,
  pattern: MetronomeBeatPattern,
  patternLength: number,
): VozRitmoPhase {
  const active = getActivePatternSlice(pattern, patternLength);
  const cycle = active.length;
  const position = ((beatIndex % cycle) + cycle) % cycle;

  return beatLevelToPhase(active[position]!);
}

export function isPhaseStartAtBeat(
  beatIndex: number,
  pattern: MetronomeBeatPattern,
  patternLength: number,
): boolean {
  if (beatIndex === 0) {
    return true;
  }

  return (
    getPhaseAtBeat(beatIndex, pattern, patternLength) !==
    getPhaseAtBeat(beatIndex - 1, pattern, patternLength)
  );
}

export function getRitmoTimelineWindowMs(
  bpm: number,
  patternLength: number,
  beatDurations: MetronomeBeatDurationPattern = METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
): number {
  return getCycleMs(bpm, beatDurations, patternLength) * VOZ_RITMO_TIMELINE_CYCLES;
}

export function getRitmoNowLinePercent(
  pastRatio = VOZ_RITMO_TIMELINE_PAST_RATIO,
): number {
  return pastRatio * 100;
}

export function ritmoTimeToPercent(
  timeMs: number,
  now: number,
  totalSpanMs: number,
  pastRatio = VOZ_RITMO_TIMELINE_PAST_RATIO,
): number {
  const windowStart = now - totalSpanMs * pastRatio;
  return Math.max(
    0,
    Math.min(100, ((timeMs - windowStart) / totalSpanMs) * 100),
  );
}

export function getRitmoPhaseAtTime(
  now: number,
  beatMarkers: VozRitmoBeatMarker[],
  bpm: number,
  pattern: MetronomeBeatPattern,
  patternLength: number,
  beatDurations: MetronomeBeatDurationPattern = METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
): VozRitmoPhase | null {
  if (beatMarkers.length === 0) {
    return null;
  }

  const position = getBeatPositionAtTime(
    now,
    beatMarkers,
    bpm,
    beatDurations,
    patternLength,
  );

  if (!position) {
    return null;
  }

  return getPhaseAtBeat(position.beatIndex, pattern, patternLength);
}

export function getMsIntoCurrentBeat(
  now: number,
  beatMarkers: VozRitmoBeatMarker[],
  bpm: number,
  beatDurations: MetronomeBeatDurationPattern = METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
  patternLength: number,
): number {
  if (beatMarkers.length === 0) {
    return 0;
  }

  const position = getBeatPositionAtTime(
    now,
    beatMarkers,
    bpm,
    beatDurations,
    patternLength,
  );

  return position?.msIntoBeat ?? 0;
}

export function getMsPerBeatAtTime(
  now: number,
  beatMarkers: VozRitmoBeatMarker[],
  bpm: number,
  beatDurations: MetronomeBeatDurationPattern,
  patternLength: number,
): number {
  const position = getBeatPositionAtTime(
    now,
    beatMarkers,
    bpm,
    beatDurations,
    patternLength,
  );

  return position?.msPerBeat ?? getMsPerBeat(bpm, METRONOME_BEAT_DURATION_DEFAULT);
}

export function getRitmoVoiceCompliance(
  expectedPhase: VozRitmoPhase,
  hasVoice: boolean,
  msIntoBeat: number,
  msPerBeat: number,
): VozRitmoVoiceCompliance {
  const shouldSing = expectedPhase === "cantar";
  const correct =
    (shouldSing && hasVoice) || (!shouldSing && !hasVoice);

  if (correct) {
    return "correcto";
  }

  const edgeWindow = msPerBeat * 0.22;

  if (msIntoBeat < edgeWindow || msIntoBeat > msPerBeat - edgeWindow) {
    return "cerca";
  }

  return "incorrecto";
}

export function getRitmoComplianceColor(
  compliance: VozRitmoVoiceCompliance,
): string {
  switch (compliance) {
    case "correcto":
      return "var(--tuner-in-tune)";
    case "cerca":
      return "var(--tuner-cerca)";
    default:
      return "var(--tuner-flat-sharp)";
  }
}

export function getPhaseLabel(phase: VozRitmoPhase): string {
  return phase === "cantar" ? "Cantá" : "Silencio";
}

export function getPatternDescription(
  pattern: MetronomeBeatPattern,
  patternLength: number,
): string {
  const active = getActivePatternSlice(pattern, patternLength);
  const singCount = active.filter((level) => level !== "silencio").length;
  const restCount = active.length - singCount;
  const singLabel = singCount === 1 ? "1 tiempo" : `${singCount} tiempos`;
  const restLabel = restCount === 1 ? "1 tiempo" : `${restCount} tiempos`;

  return `${singLabel} cantando · ${restLabel} en silencio`;
}

/** Referencia del patrón durante la práctica (neutro, sin color de config). */
export const VOZ_RITMO_PRACTICE_SOUND_COLOR =
  "color-mix(in srgb, var(--text-primary) 72%, transparent)";
export const VOZ_RITMO_PRACTICE_SILENCE_COLOR = "var(--bg-cola-aviso)";

export function getRitmoPhaseFeedback(
  phase: VozRitmoPhase | null,
  accuracy: VozAccuracy,
): string | null {
  if (!phase) {
    return null;
  }

  if (phase === "cantar" && accuracy === "silencio") {
    return "¡Cantá ahora!";
  }

  if (phase === "silencio" && accuracy !== "silencio") {
    return "Pará · es silencio";
  }

  if (phase === "cantar" && accuracy === "en-tono") {
    return "¡Bien! Mantené la nota";
  }

  if (phase === "silencio" && accuracy === "silencio") {
    return "¡Bien! Silencio correcto";
  }

  return null;
}

export function createVozRitmoBeatMarker(
  beatIndex: number,
  timestamp: number,
  pattern: MetronomeBeatPattern,
  patternLength: number,
): VozRitmoBeatMarker {
  return {
    timestamp,
    beatIndex,
    phase: getPhaseAtBeat(beatIndex, pattern, patternLength),
    isPhaseStart: isPhaseStartAtBeat(beatIndex, pattern, patternLength),
  };
}
