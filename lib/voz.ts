import { frequencyToNote, NOTE_NAMES } from "@/lib/afinador";
import {
  getMsPerBeat,
  type MetronomeBeatDuration,
} from "@/lib/metronomo";
import {
  ensurePracticeAudioContext,
  primePracticeAudioOnGesture,
  scheduleVozPracticeNote,
} from "@/lib/voz-practice-audio";

export type VozCalibre = "principiante" | "estandar" | "avanzado";

export type VozCalibreThresholds = {
  perfectCents: number;
  intuneCents: number;
  cercaCents: number;
  holdCountsCerca: boolean;
};

export const VOZ_CALIBRE_OPTIONS = [
  { id: "principiante", label: "Principiante" },
  { id: "estandar", label: "Estándar" },
  { id: "avanzado", label: "Avanzado" },
] as const satisfies ReadonlyArray<{ id: VozCalibre; label: string }>;

export const VOZ_CALIBRE_THRESHOLDS: Record<VozCalibre, VozCalibreThresholds> = {
  principiante: {
    perfectCents: 14,
    intuneCents: 38,
    cercaCents: 65,
    holdCountsCerca: true,
  },
  estandar: {
    perfectCents: 10,
    intuneCents: 28,
    cercaCents: 50,
    holdCountsCerca: true,
  },
  avanzado: {
    perfectCents: 5,
    intuneCents: 20,
    cercaCents: 45,
    holdCountsCerca: false,
  },
};

export const VOZ_CALIBRE_DEFAULT: VozCalibre = "estandar";

export function getVozCalibreThresholds(
  calibre: VozCalibre,
): VozCalibreThresholds {
  return VOZ_CALIBRE_THRESHOLDS[calibre];
}

export function getVozCalibreDescription(calibre: VozCalibre): string {
  const thresholds = getVozCalibreThresholds(calibre);

  switch (calibre) {
    case "principiante":
      return `Más tolerancia (±${thresholds.cercaCents} ct) para practicar sin frustrarte.`;
    case "avanzado":
      return `Rigor alto (±${thresholds.intuneCents} ct en verde). El cronómetro solo suma en tono.`;
    default:
      return `Equilibrio recomendado (±${thresholds.cercaCents} ct aceptables para sostener).`;
  }
}

/** Umbrales del calibre estándar (compatibilidad con otros modos). */
export const VOZ_PERFECT_CENTS =
  VOZ_CALIBRE_THRESHOLDS.estandar.perfectCents;
export const VOZ_INTUNE_CENTS = VOZ_CALIBRE_THRESHOLDS.estandar.intuneCents;
export const VOZ_CERCA_CENTS = VOZ_CALIBRE_THRESHOLDS.estandar.cercaCents;
export const VOZ_LADDER_SEMITONE_SPAN = 6;
export const VOZ_HISTORY_WINDOW_MS = 12_000;
export const VOZ_HISTORY_SAMPLE_INTERVAL_MS = 100;
export const VOZ_HISTORY_GAP_MS = 300;
/** Suavizado de cents en gráficos de historial (Ritmo, Melodía, etc.). */
export const VOZ_HISTORY_CENTS_EMA_ALPHA = 0.36;

/** --- Sostener: promedio móvil + rechazo de outliers (ajustables) --- */
/** Ventana del promedio móvil de cents (ms). Ej.: 400 = ~4 ticks a 100 ms. */
export const VOZ_HOLD_ROLLING_WINDOW_MS = 400;
/** Intervalo entre muestras del gráfico de Sostener (ms). */
export const VOZ_HOLD_SAMPLE_INTERVAL_MS = VOZ_HISTORY_SAMPLE_INTERVAL_MS;
/** Si una lectura se aleja más que esto del promedio actual, entra en evaluación (no al promedio al instante). */
export const VOZ_HOLD_OUTLIER_CENTS = 65;
/** Cuánto debe sostenerse una nota alejada (ms) para reemplazar el promedio. ~3 ticks a 100 ms. */
export const VOZ_HOLD_SUSTAINED_PITCH_MS = 280;
/** Mínimo de muestras sostenidas para confirmar cambio de nota. */
export const VOZ_HOLD_SUSTAINED_MIN_SAMPLES = 3;
/** Las muestras candidatas deben ser parecidas entre sí (cents). */
export const VOZ_HOLD_CANDIDATE_DRIFT_CENTS = 42;

export const VOZ_HISTORY_CHART_MAX_CENTS = VOZ_CERCA_CENTS;
/** Rango vertical del gráfico de tono en ritmo/combo (±6 semitonos). */
export const VOZ_HISTORY_CHART_WIDE_MAX_CENTS =
  VOZ_LADDER_SEMITONE_SPAN * 100;
export const VOZ_HOLD_TARGET_MIN = 1;
export const VOZ_HOLD_TARGET_MAX = 30;
export const VOZ_HOLD_TARGET_DEFAULT = 10;

export function clampHoldTargetSeconds(value: number): number {
  return Math.max(
    VOZ_HOLD_TARGET_MIN,
    Math.min(VOZ_HOLD_TARGET_MAX, Math.round(value)),
  );
}
export const VOZ_INSTANT_ATTEMPTS_MAX = 15;

export type VozInstantAttempt = {
  id: number;
  result: "en-tono" | "cerca" | "lejos";
};

const INSTANT_ATTEMPT_RANK: Record<VozAccuracy, number> = {
  silencio: 0,
  lejos: 1,
  cerca: 2,
  "en-tono": 3,
};

export function mergeInstantAttemptAccuracy(
  current: VozAccuracy,
  next: VozAccuracy,
): VozAccuracy {
  if (next === "silencio") {
    return current;
  }

  return INSTANT_ATTEMPT_RANK[next] > INSTANT_ATTEMPT_RANK[current]
    ? next
    : current;
}

export function instantAttemptResultFromAccuracy(
  accuracy: VozAccuracy,
): VozInstantAttempt["result"] {
  if (accuracy === "en-tono" || accuracy === "cerca") {
    return accuracy;
  }

  return "lejos";
}

export type VozAccuracy = "en-tono" | "cerca" | "lejos" | "silencio";

export type VozTarget = {
  note: string;
  octave: number;
};

export const VOZ_DEFAULT_OCTAVE = 2 as const;

export const VOZ_DEFAULT_TARGET: VozTarget = {
  note: "A",
  octave: VOZ_DEFAULT_OCTAVE,
};

export const VOZ_OCTAVES = [2, 3, 4, 5, 6] as const;

export function isTargetOctaveInRange(
  octave: number,
): octave is (typeof VOZ_OCTAVES)[number] {
  return VOZ_OCTAVES.includes(octave as (typeof VOZ_OCTAVES)[number]);
}

export function clampTargetOctave(
  octave: number,
): (typeof VOZ_OCTAVES)[number] {
  const match = VOZ_OCTAVES.find((value) => value === octave);

  if (match !== undefined) {
    return match;
  }

  return VOZ_OCTAVES[0];
}

export function createVozTarget(
  note: string,
  octave: number = VOZ_DEFAULT_OCTAVE,
): VozTarget {
  return { note, octave: clampTargetOctave(octave) };
}

export function shiftTargetBySemitones(
  target: VozTarget,
  semitoneOffset: number,
): VozTarget | null {
  const noteIndex = getNoteIndex(target.note);

  if (noteIndex === -1) {
    return target;
  }

  const fromMidi = (target.octave + 1) * 12 + noteIndex;
  const toMidi = fromMidi + semitoneOffset;
  const newOctave = Math.floor(toMidi / 12) - 1;
  const newNoteIndex = ((toMidi % 12) + 12) % 12;

  if (!isTargetOctaveInRange(newOctave)) {
    return null;
  }

  return {
    note: NOTE_NAMES[newNoteIndex]!,
    octave: newOctave,
  };
}

const A4_FREQUENCY = 440;

export function targetToFrequency(target: VozTarget): number {
  const noteIndex = NOTE_NAMES.indexOf(
    target.note as (typeof NOTE_NAMES)[number],
  );

  if (noteIndex === -1) {
    return A4_FREQUENCY;
  }

  const octave = Number.isFinite(target.octave)
    ? target.octave
    : VOZ_DEFAULT_OCTAVE;
  const midi = (octave + 1) * 12 + noteIndex;
  const frequency = A4_FREQUENCY * 2 ** ((midi - 69) / 12);

  return Number.isFinite(frequency) && frequency > 0 ? frequency : A4_FREQUENCY;
}

export function getCentsFromTarget(
  frequency: number,
  targetFrequency: number,
): number {
  if (frequency <= 0 || targetFrequency <= 0) {
    return 0;
  }

  return Math.round(1200 * Math.log2(frequency / targetFrequency));
}

export function getCentsFromTargetWithOctaveFold(
  frequency: number,
  targetFrequency: number,
): number {
  let best = getCentsFromTarget(frequency, targetFrequency);

  for (const factor of [0.5, 2]) {
    const candidate = getCentsFromTarget(frequency * factor, targetFrequency);

    if (Math.abs(candidate) < Math.abs(best)) {
      best = candidate;
    }
  }

  return best;
}

export function getVozAccuracy(
  cents: number,
  hasSignal: boolean,
  calibre: VozCalibre = "estandar",
): VozAccuracy {
  if (!hasSignal) {
    return "silencio";
  }

  const { intuneCents, cercaCents } = getVozCalibreThresholds(calibre);
  const abs = Math.abs(cents);

  if (abs <= intuneCents) {
    return "en-tono";
  }

  if (abs <= cercaCents) {
    return "cerca";
  }

  return "lejos";
}

export function formatTargetLabel(
  target: VozTarget,
  octaveExact = true,
): string {
  return octaveExact ? `${target.note}${target.octave}` : target.note;
}

export function getCentsForPitchClass(
  frequency: number,
  targetNote: string,
): number {
  const detected = frequencyToNote(frequency);
  const targetIndex = NOTE_NAMES.indexOf(
    targetNote as (typeof NOTE_NAMES)[number],
  );

  if (targetIndex === -1) {
    return detected.cents;
  }

  if (detected.note === targetNote) {
    return detected.cents;
  }

  const detectedIndex = NOTE_NAMES.indexOf(
    detected.note as (typeof NOTE_NAMES)[number],
  );
  let semitones = detectedIndex - targetIndex;

  while (semitones > 6) {
    semitones -= 12;
  }

  while (semitones < -6) {
    semitones += 12;
  }

  return semitones * 100 + detected.cents;
}

export type VozComparison = {
  cents: number;
  referenceFrequency: number | null;
  referenceLabel: string;
};

export function resolveTargetComparison(
  frequency: number,
  target: VozTarget,
  octaveExact: boolean,
): VozComparison {
  if (octaveExact) {
    const referenceFrequency = targetToFrequency(target);

    return {
      cents: getCentsFromTarget(frequency, referenceFrequency),
      referenceFrequency,
      referenceLabel: formatTargetLabel(target, true),
    };
  }

  return {
    cents: getCentsForPitchClass(frequency, target.note),
    referenceFrequency: null,
    referenceLabel: target.note,
  };
}

/** Elige la lectura más cercana al objetivo probando octavas (graves en celular). */
export function resolveTargetComparisonWithOctaveFold(
  frequency: number,
  target: VozTarget,
  octaveExact: boolean,
): VozComparison {
  const primary = resolveTargetComparison(frequency, target, octaveExact);

  if (!octaveExact) {
    return primary;
  }

  let best = primary;

  for (const factor of [0.5, 2]) {
    const candidate = resolveTargetComparison(
      frequency * factor,
      target,
      octaveExact,
    );

    if (Math.abs(candidate.cents) < Math.abs(best.cents)) {
      best = candidate;
    }
  }

  return best;
}

export function getVozFeedbackLabel(
  accuracy: VozAccuracy,
  cents: number,
  options?: {
    octaveExact: boolean;
    targetNote: string;
    detectedNote?: string;
  },
  calibre: VozCalibre = "estandar",
): string {
  if (
    accuracy === "lejos" &&
    options &&
    !options.octaveExact &&
    options.detectedNote &&
    options.detectedNote !== options.targetNote
  ) {
    return `Nota distinta · objetivo ${options.targetNote}`;
  }

  switch (accuracy) {
    case "en-tono":
      if (isPerfectPitch(cents, calibre)) {
        return options?.octaveExact ? "¡Tono perfecto!" : "¡Nota perfecta!";
      }

      return options?.octaveExact
        ? "En tono · desvío mínimo"
        : "Nota correcta · desvío mínimo";
    case "cerca":
      return cents > 0
        ? `Cerca · ${cents} ct arriba`
        : `Cerca · ${Math.abs(cents)} ct abajo`;
    case "lejos":
      return cents > 0
        ? `Lejos · ${cents} ct arriba`
        : `Lejos · ${Math.abs(cents)} ct abajo`;
    default:
      return options?.octaveExact
        ? "Cantá la nota y octava objetivo..."
        : "Cantá la nota objetivo...";
  }
}

export function isHoldCountingAccuracy(
  accuracy: VozAccuracy,
  calibre: VozCalibre = "estandar",
): boolean {
  if (accuracy === "en-tono") {
    return true;
  }

  if (accuracy === "cerca") {
    return getVozCalibreThresholds(calibre).holdCountsCerca;
  }

  return false;
}

export function isPerfectPitch(
  cents: number,
  calibre: VozCalibre = "estandar",
): boolean {
  return Math.abs(cents) <= getVozCalibreThresholds(calibre).perfectCents;
}

export function getVozSampleColor(
  cents: number,
  accuracy: VozAccuracy,
  calibre: VozCalibre = "estandar",
): string {
  if (accuracy === "silencio") {
    return "var(--text-muted)";
  }

  if (accuracy === "lejos") {
    return "var(--tuner-flat-sharp)";
  }

  if (accuracy === "cerca") {
    return "var(--tuner-cerca)";
  }

  return isPerfectPitch(cents, calibre)
    ? "var(--tuner-in-tune-perfect)"
    : "var(--tuner-in-tune-sutil)";
}

export function getVozAccuracyColor(
  accuracy: VozAccuracy,
  cents?: number,
  calibre: VozCalibre = "estandar",
): string {
  if (accuracy === "en-tono" && cents !== undefined) {
    return getVozSampleColor(cents, accuracy, calibre);
  }

  switch (accuracy) {
    case "en-tono":
      return "var(--tuner-in-tune-sutil)";
    case "cerca":
      return "var(--tuner-cerca)";
    case "silencio":
      return "var(--text-muted)";
    default:
      return "var(--tuner-flat-sharp)";
  }
}

export function centsToBarPositionPercent(cents: number): number {
  const clamped = Math.max(
    -VOZ_CERCA_CENTS,
    Math.min(VOZ_CERCA_CENTS, cents),
  );
  return 50 + (clamped / VOZ_CERCA_CENTS) * 50;
}

export function getNoteIndex(note: string): number {
  return NOTE_NAMES.indexOf(note as (typeof NOTE_NAMES)[number]);
}

export function wrapNoteIndex(index: number): number {
  return ((index % 12) + 12) % 12;
}

export function getNoteAtSemitoneOffset(
  targetNote: string,
  semitoneOffset: number,
): string {
  const base = getNoteIndex(targetNote);

  if (base === -1) {
    return targetNote;
  }

  return NOTE_NAMES[wrapNoteIndex(base + semitoneOffset)];
}

export function getNoteLabelAtSemitoneOffset(
  targetNote: string,
  targetOctave: number,
  semitoneOffset: number,
  octaveExact = true,
): string {
  const noteIndex = getNoteIndex(targetNote);

  if (noteIndex === -1) {
    return targetNote;
  }

  const note = getNoteAtSemitoneOffset(targetNote, semitoneOffset);

  if (!octaveExact) {
    return note;
  }

  const midi = (targetOctave + 1) * 12 + noteIndex + semitoneOffset;
  const octave = Math.floor(midi / 12) - 1;

  return `${note}${octave}`;
}

export function historyCentsToChartY(
  cents: number,
  chartHeight: number,
  maxCents: number,
): number {
  const paddingY = 10;
  const innerHeight = chartHeight - paddingY * 2;
  const clampedCents = Math.max(-maxCents, Math.min(maxCents, cents));

  return paddingY + innerHeight * (0.5 - clampedCents / (maxCents * 2));
}

export function historyCentsBandHeight(
  centsSpan: number,
  chartHeight: number,
  maxCents: number,
): number {
  return (centsSpan / maxCents) * (chartHeight - 20);
}

export type VozLadderSlot = {
  note: string;
  semitoneOffset: number;
};

export function getLadderNoteSlots(targetNote: string): VozLadderSlot[] {
  return Array.from({ length: 12 }, (_, index) => {
    const semitoneOffset = index - VOZ_LADDER_SEMITONE_SPAN;

    return {
      note: getNoteAtSemitoneOffset(targetNote, semitoneOffset),
      semitoneOffset,
    };
  });
}

export function semitoneOffsetToLadderPercent(semitoneOffset: number): number {
  const clamped = Math.max(
    -VOZ_LADDER_SEMITONE_SPAN,
    Math.min(VOZ_LADDER_SEMITONE_SPAN, semitoneOffset),
  );

  return 50 + (clamped / VOZ_LADDER_SEMITONE_SPAN) * 50;
}

export function centsToLadderPercent(cents: number): number {
  const maxCents = VOZ_LADDER_SEMITONE_SPAN * 100;
  const clamped = Math.max(-maxCents, Math.min(maxCents, cents));

  return 50 + (clamped / maxCents) * 50;
}

export function frequencyToDisplayOctave(frequency: number): number {
  const midi = 69 + 12 * Math.log2(frequency / A4_FREQUENCY);
  return Math.floor(midi / 12) - 1;
}

export type VozHistorySample = {
  timestamp: number;
  cents: number;
  accuracy: VozAccuracy;
};

export function trimHistorySamples(
  samples: VozHistorySample[],
  now: number,
  windowMs = VOZ_HISTORY_WINDOW_MS,
): VozHistorySample[] {
  const cutoff = now - windowMs;
  return samples.filter((sample) => sample.timestamp >= cutoff);
}

export function smoothChartCents(
  previous: number | null,
  next: number,
  emaAlpha = VOZ_HISTORY_CENTS_EMA_ALPHA,
): number {
  if (previous === null) {
    return next;
  }

  return previous + emaAlpha * (next - previous);
}

export type SostenerRollingCentsSample = {
  timestamp: number;
  cents: number;
};

export type SostenerRollingCentsBuffer = {
  samples: SostenerRollingCentsSample[];
  chartCents: number | null;
  /** Lecturas alejadas del promedio en evaluación (¿cambio real o error?). */
  candidateSamples: SostenerRollingCentsSample[];
};

export function createSostenerRollingCentsBuffer(): SostenerRollingCentsBuffer {
  return { samples: [], chartCents: null, candidateSamples: [] };
}

function averageRollingCents(samples: SostenerRollingCentsSample[]): number {
  if (samples.length === 0) {
    return 0;
  }

  let sum = 0;

  for (const sample of samples) {
    sum += sample.cents;
  }

  return sum / samples.length;
}

function trimRollingSamples(
  samples: SostenerRollingCentsSample[],
  timestamp: number,
  windowMs: number,
): SostenerRollingCentsSample[] {
  return samples.filter((sample) => timestamp - sample.timestamp <= windowMs);
}

function isCandidateClusterStable(
  candidateSamples: SostenerRollingCentsSample[],
  driftCents: number,
): boolean {
  if (candidateSamples.length === 0) {
    return false;
  }

  const referenceCents = candidateSamples[0]!.cents;

  return candidateSamples.every(
    (sample) => Math.abs(sample.cents - referenceCents) <= driftCents,
  );
}

function isSustainedPitchChange(
  candidateSamples: SostenerRollingCentsSample[],
  timestamp: number,
  sustainedMs: number,
  minSamples: number,
): boolean {
  if (candidateSamples.length < minSamples) {
    return false;
  }

  const spanMs = timestamp - candidateSamples[0]!.timestamp;

  return spanMs >= sustainedMs;
}

function appendCandidateSample(
  candidateSamples: SostenerRollingCentsSample[],
  timestamp: number,
  rawCents: number,
  driftCents: number,
): SostenerRollingCentsSample[] {
  const nextSample = { timestamp, cents: rawCents };

  if (candidateSamples.length === 0) {
    return [nextSample];
  }

  const candidateAverage = averageRollingCents(candidateSamples);

  if (Math.abs(rawCents - candidateAverage) <= driftCents) {
    return [...candidateSamples, nextSample];
  }

  return [nextSample];
}

export type SostenerRollingCentsUpdate = {
  buffer: SostenerRollingCentsBuffer;
  chartCents: number | null;
  shouldRecord: boolean;
};

/**
 * Sostener: bolita y línea comparten promedio móvil de cents.
 * - Cambios chicos → entran al promedio.
 * - Picos breves lejanos → se ignoran (promedio se mantiene).
 * - Nota lejana sostenida → nuevo promedio.
 */
export function updateSostenerRollingChartCents(
  buffer: SostenerRollingCentsBuffer,
  timestamp: number,
  rawCents: number,
  windowMs = VOZ_HOLD_ROLLING_WINDOW_MS,
  outlierCents = VOZ_HOLD_OUTLIER_CENTS,
  sustainedMs = VOZ_HOLD_SUSTAINED_PITCH_MS,
  sustainedMinSamples = VOZ_HOLD_SUSTAINED_MIN_SAMPLES,
  candidateDriftCents = VOZ_HOLD_CANDIDATE_DRIFT_CENTS,
): SostenerRollingCentsUpdate {
  const trimmedSamples = trimRollingSamples(buffer.samples, timestamp, windowMs);
  const currentAverage =
    buffer.chartCents ??
    (trimmedSamples.length > 0 ? averageRollingCents(trimmedSamples) : null);

  if (currentAverage === null) {
    const nextSamples = [{ timestamp, cents: rawCents }];
    const chartCents = rawCents;

    return {
      buffer: {
        samples: nextSamples,
        chartCents,
        candidateSamples: [],
      },
      chartCents,
      shouldRecord: true,
    };
  }

  const deltaFromAverage = Math.abs(rawCents - currentAverage);

  if (deltaFromAverage <= outlierCents) {
    const nextSamples = trimRollingSamples(
      [...trimmedSamples, { timestamp, cents: rawCents }],
      timestamp,
      windowMs,
    );
    const chartCents = averageRollingCents(nextSamples);

    return {
      buffer: {
        samples: nextSamples,
        chartCents,
        candidateSamples: [],
      },
      chartCents,
      shouldRecord: true,
    };
  }

  const candidateSamples = appendCandidateSample(
    buffer.candidateSamples,
    timestamp,
    rawCents,
    candidateDriftCents,
  );

  if (
    isCandidateClusterStable(candidateSamples, candidateDriftCents) &&
    isSustainedPitchChange(
      candidateSamples,
      timestamp,
      sustainedMs,
      sustainedMinSamples,
    )
  ) {
    const nextSamples = trimRollingSamples(candidateSamples, timestamp, windowMs);
    const chartCents = averageRollingCents(nextSamples);

    return {
      buffer: {
        samples: nextSamples,
        chartCents,
        candidateSamples: [],
      },
      chartCents,
      shouldRecord: true,
    };
  }

  return {
    buffer: {
      samples: trimmedSamples,
      chartCents: currentAverage,
      candidateSamples,
    },
    chartCents: currentAverage,
    shouldRecord: true,
  };
}

export function splitHistorySegments(
  samples: VozHistorySample[],
  gapMs = VOZ_HISTORY_GAP_MS,
): VozHistorySample[][] {
  const segments: VozHistorySample[][] = [];
  let current: VozHistorySample[] = [];

  for (const sample of samples) {
    if (current.length > 0) {
      const gap = sample.timestamp - current[current.length - 1]!.timestamp;

      if (gap > gapMs) {
        segments.push(current);
        current = [];
      }
    }

    current.push(sample);
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}

export function getTargetCentsOffset(
  from: VozTarget,
  to: VozTarget,
  octaveExact: boolean,
): number {
  const fromIndex = getNoteIndex(from.note);
  const toIndex = getNoteIndex(to.note);

  if (fromIndex === -1 || toIndex === -1) {
    return 0;
  }

  if (octaveExact) {
    const fromMidi = (from.octave + 1) * 12 + fromIndex;
    const toMidi = (to.octave + 1) * 12 + toIndex;
    return (toMidi - fromMidi) * 100;
  }

  let semitones = toIndex - fromIndex;

  while (semitones > 6) {
    semitones -= 12;
  }

  while (semitones < -6) {
    semitones += 12;
  }

  return semitones * 100;
}

export type MelodiaChartCentsRange = {
  minCents: number;
  maxCents: number;
};

const MELODIA_CHART_RANGE_PADDING_MIN_CENTS = 100;
const MELODIA_CHART_RANGE_PADDING_RATIO = 0.14;

export function getMelodiaChartCentsRange(
  notes: VozTarget[],
  reference: VozTarget,
  octaveExact: boolean,
): MelodiaChartCentsRange {
  if (notes.length === 0) {
    return { minCents: -200, maxCents: 200 };
  }

  const offsets = notes.map((note) =>
    getTargetCentsOffset(reference, note, octaveExact),
  );
  let minNoteCents = Math.min(...offsets);
  let maxNoteCents = Math.max(...offsets);

  if (minNoteCents === maxNoteCents) {
    minNoteCents -= 100;
    maxNoteCents += 100;
  }

  const span = maxNoteCents - minNoteCents;
  const padding = Math.max(
    MELODIA_CHART_RANGE_PADDING_MIN_CENTS,
    span * MELODIA_CHART_RANGE_PADDING_RATIO,
  );

  return {
    minCents: minNoteCents - padding,
    maxCents: maxNoteCents + padding,
  };
}

export function melodiaCentsToChartY(
  cents: number,
  chartHeight: number,
  range: MelodiaChartCentsRange,
): number {
  const paddingY = 10;
  const innerHeight = chartHeight - paddingY * 2;
  const span = range.maxCents - range.minCents;

  if (span <= 0) {
    return chartHeight / 2;
  }

  const clamped = Math.max(range.minCents, Math.min(range.maxCents, cents));
  const ratio = (clamped - range.minCents) / span;

  return paddingY + innerHeight * (1 - ratio);
}

export function historyTimestampToChartX(
  timestamp: number,
  now: number,
  width: number,
  windowMs = VOZ_HISTORY_WINDOW_MS,
  paddingLeft = 8,
  paddingRight = 8,
  pastRatio?: number,
): number {
  const innerWidth = width - paddingLeft - paddingRight;

  if (pastRatio === undefined) {
    const age = now - timestamp;
    const ratio = Math.max(0, Math.min(1, 1 - age / windowMs));
    return paddingLeft + innerWidth * ratio;
  }

  const pastSpan = windowMs * pastRatio;
  const offset = timestamp - now;
  const ratio = Math.max(0, Math.min(1, (offset + pastSpan) / windowMs));

  return paddingLeft + innerWidth * ratio;
}

export function historySampleToChartPoint(
  sample: VozHistorySample,
  now: number,
  width: number,
  height: number,
  windowMs = VOZ_HISTORY_WINDOW_MS,
  maxCents = VOZ_HISTORY_CHART_MAX_CENTS,
  paddingLeft = 8,
  paddingRight = 8,
  pastRatio?: number,
  melodiaRange?: MelodiaChartCentsRange,
): { x: number; y: number } {
  const x = historyTimestampToChartX(
    sample.timestamp,
    now,
    width,
    windowMs,
    paddingLeft,
    paddingRight,
    pastRatio,
  );
  const y = melodiaRange
    ? melodiaCentsToChartY(sample.cents, height, melodiaRange)
    : historyCentsToChartY(
        Math.max(-maxCents, Math.min(maxCents, sample.cents)),
        height,
        maxCents,
      );

  return { x, y };
}

export function buildHistorySegmentPath(
  segment: VozHistorySample[],
  now: number,
  width: number,
  height: number,
  windowMs = VOZ_HISTORY_WINDOW_MS,
  maxCents = VOZ_HISTORY_CHART_MAX_CENTS,
  paddingLeft = 8,
  paddingRight = 8,
  pastRatio?: number,
  melodiaRange?: MelodiaChartCentsRange,
): string {
  if (segment.length === 0) {
    return "";
  }

  const points = segment.map((sample) =>
    historySampleToChartPoint(
      sample,
      now,
      width,
      height,
      windowMs,
      maxCents,
      paddingLeft,
      paddingRight,
      pastRatio,
      melodiaRange,
    ),
  );

  return points
    .map((point, index) =>
      index === 0
        ? `M ${point.x} ${point.y}`
        : `L ${point.x} ${point.y}`,
    )
    .join(" ");
}

export function computeEnTonoHoldMs(
  samples: VozHistorySample[],
  now: number,
  calibre: VozCalibre = "estandar",
): number {
  if (samples.length === 0) {
    return 0;
  }

  let holdStart: number | null = null;

  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const sample = samples[index]!;
    const accuracy = getVozAccuracy(sample.cents, true, calibre);

    if (!isHoldCountingAccuracy(accuracy, calibre)) {
      break;
    }

    holdStart = sample.timestamp;
  }

  if (holdStart === null) {
    return 0;
  }

  return now - holdStart;
}

export type HoldRingSegment = {
  startFraction: number;
  endFraction: number;
  color: string;
};

export function buildHoldRingSegments(
  samples: VozHistorySample[],
  now: number,
  targetMs: number,
  calibre: VozCalibre = "estandar",
): HoldRingSegment[] {
  if (samples.length === 0 || targetMs <= 0) {
    return [];
  }

  const streak: VozHistorySample[] = [];

  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const sample = samples[index]!;
    const accuracy = getVozAccuracy(sample.cents, true, calibre);

    if (!isHoldCountingAccuracy(accuracy, calibre)) {
      break;
    }

    streak.unshift(sample);
  }

  if (streak.length === 0) {
    return [];
  }

  const holdStart = streak[0]!.timestamp;
  const cappedNow = Math.min(now, holdStart + targetMs);
  const segments: HoldRingSegment[] = [];

  for (let index = 0; index < streak.length; index += 1) {
    const sample = streak[index]!;
    const sampleAccuracy = getVozAccuracy(sample.cents, true, calibre);
    const nextTimestamp =
      index < streak.length - 1 ? streak[index + 1]!.timestamp : cappedNow;
    const startFraction = (sample.timestamp - holdStart) / targetMs;
    const endFraction = (nextTimestamp - holdStart) / targetMs;

    if (endFraction <= startFraction) {
      continue;
    }

    segments.push({
      startFraction: Math.min(1, Math.max(0, startFraction)),
      endFraction: Math.min(1, Math.max(0, endFraction)),
      color: getVozSampleColor(sample.cents, sampleAccuracy, calibre),
    });
  }

  return segments;
}

export function formatHoldDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

export const VOZ_OCTAVAS_NOTE_DURATION_MIN = 1;
export const VOZ_OCTAVAS_NOTE_DURATION_MAX = 8;
export const VOZ_OCTAVAS_NOTE_DURATION_DEFAULT = 3;
export const VOZ_OCTAVAS_PAUSE_MS = 280;
export const VOZ_OCTAVAS_SAMPLE_INTERVAL_MS = 80;
/** Silencio sostenido fuera de la pausa entre notas antes de reiniciar el intento. */
export const VOZ_OCTAVAS_SILENCE_RESET_MS = 200;

export function getOctavasSequenceTotalMs(
  noteDurationSeconds: number,
  pauseMs = VOZ_OCTAVAS_PAUSE_MS,
): number {
  return noteDurationSeconds * 2000 + pauseMs;
}

export function getOctavasOverallProgress(
  phase: "idle" | "first" | "pause" | "second" | "done",
  phaseElapsedMs: number,
  noteDurationMs: number,
  pauseMs = VOZ_OCTAVAS_PAUSE_MS,
): number {
  const totalMs = noteDurationMs * 2 + pauseMs;

  if (totalMs <= 0 || phase === "idle" || phase === "done") {
    return 0;
  }

  if (phase === "first") {
    return Math.min(1, phaseElapsedMs / totalMs);
  }

  if (phase === "pause") {
    return Math.min(1, (noteDurationMs + phaseElapsedMs) / totalMs);
  }

  return Math.min(
    1,
    (noteDurationMs + pauseMs + phaseElapsedMs) / totalMs,
  );
}

export function clampOctavasNoteDurationSeconds(value: number): number {
  return Math.max(
    VOZ_OCTAVAS_NOTE_DURATION_MIN,
    Math.min(VOZ_OCTAVAS_NOTE_DURATION_MAX, Math.round(value)),
  );
}

export type VozOctavasPitchMode = "same" | "scale";

export const VOZ_OCTAVAS_PITCH_MODE_DEFAULT: VozOctavasPitchMode = "same";

export const VOZ_OCTAVAS_SCALE_REPETITIONS_MIN = 1;
export const VOZ_OCTAVAS_SCALE_REPETITIONS_MAX = 12;
export const VOZ_OCTAVAS_SCALE_REPETITIONS_DEFAULT = 1;

const MAJOR_SCALE_DEGREE_OFFSETS = [0, 2, 4, 5, 7, 9, 11] as const;

export function clampOctavasScaleRepetitions(value: number): number {
  return Math.max(
    VOZ_OCTAVAS_SCALE_REPETITIONS_MIN,
    Math.min(VOZ_OCTAVAS_SCALE_REPETITIONS_MAX, Math.round(value)),
  );
}

export function getMajorScaleSemitoneOffset(scaleStepIndex: number): number {
  if (scaleStepIndex <= 0) {
    return 0;
  }

  const octaveSteps = Math.floor(scaleStepIndex / MAJOR_SCALE_DEGREE_OFFSETS.length);
  const stepInOctave = scaleStepIndex % MAJOR_SCALE_DEGREE_OFFSETS.length;

  return (
    octaveSteps * 12 + MAJOR_SCALE_DEGREE_OFFSETS[stepInOctave]!
  );
}

export function getOctavasScaleTarget(
  baseTarget: VozTarget,
  scaleStepIndex: number,
): VozTarget | null {
  if (scaleStepIndex <= 0) {
    return baseTarget;
  }

  return shiftTargetBySemitones(
    baseTarget,
    getMajorScaleSemitoneOffset(scaleStepIndex),
  );
}

export function getOctaveUpFrequency(target: VozTarget): number {
  return targetToFrequency(target) * 2;
}

export function getOctaveUpTarget(target: VozTarget): VozTarget | null {
  const nextOctave = target.octave + 1;

  if (!isTargetOctaveInRange(nextOctave)) {
    return null;
  }

  return { note: target.note, octave: nextOctave };
}

export type VozOctavasChartSample = {
  phase: "first" | "second";
  progress: number;
  cents: number;
  accuracy: VozAccuracy;
};

export function evaluateOctaveIntervalDeviation(
  lowerFrequency: number,
  higherFrequency: number,
): number {
  if (lowerFrequency <= 0 || higherFrequency <= 0) {
    return 0;
  }

  const intervalCents = Math.round(
    1200 * Math.log2(higherFrequency / lowerFrequency),
  );

  return intervalCents - 1200;
}

export function octavasCentsToChartY(
  cents: number,
  targetY: number,
  centsPerPixel = 0.09,
): number {
  return targetY - cents * centsPerPixel;
}

const REFERENCE_NOTE_START_OFFSET_SECONDS = 0.05;

async function createResumedReferenceAudioContext(): Promise<AudioContext | null> {
  return ensurePracticeAudioContext();
}

export function playOctaveReference(
  target: VozTarget,
  noteDurationSeconds: number,
  pauseMs = VOZ_OCTAVAS_PAUSE_MS,
): void {
  primePracticeAudioOnGesture();
  void playOctaveReferenceAsync(target, noteDurationSeconds, pauseMs);
}

async function playOctaveReferenceAsync(
  target: VozTarget,
  noteDurationSeconds: number,
  pauseMs = VOZ_OCTAVAS_PAUSE_MS,
): Promise<void> {
  const audioContext = await createResumedReferenceAudioContext();

  if (!audioContext) {
    return;
  }

  const startTime = audioContext.currentTime + REFERENCE_NOTE_START_OFFSET_SECONDS;
  const durationSeconds = Math.max(0.25, noteDurationSeconds);
  const pauseSeconds = pauseMs / 1000;
  const lowerFrequency = targetToFrequency(target);
  const higherFrequency = getOctaveUpFrequency(target);

  scheduleVozPracticeNote(
    audioContext,
    lowerFrequency,
    startTime,
    durationSeconds,
  );
  scheduleVozPracticeNote(
    audioContext,
    higherFrequency,
    startTime + durationSeconds + pauseSeconds,
    durationSeconds,
  );
}

export function playMelodiaReference(
  notes: VozTarget[],
  bpm: number,
  beatDuration: MetronomeBeatDuration,
): void {
  primePracticeAudioOnGesture();
  void playMelodiaReferenceAsync(notes, bpm, beatDuration);
}

async function playMelodiaReferenceAsync(
  notes: VozTarget[],
  bpm: number,
  beatDuration: MetronomeBeatDuration,
): Promise<void> {
  if (notes.length === 0) {
    return;
  }

  const audioContext = await createResumedReferenceAudioContext();

  if (!audioContext) {
    return;
  }

  const startTime = audioContext.currentTime + REFERENCE_NOTE_START_OFFSET_SECONDS;
  const beatDurationSeconds = getMsPerBeat(bpm, beatDuration) / 1000;
  let offsetSeconds = 0;

  for (const target of notes) {
    scheduleVozPracticeNote(
      audioContext,
      targetToFrequency(target),
      startTime + offsetSeconds,
      beatDurationSeconds,
    );
    offsetSeconds += beatDurationSeconds;
  }
}

export function playHoldCelebration(): void {
  primePracticeAudioOnGesture();
  void playHoldCelebrationAsync();
}

async function playHoldCelebrationAsync(): Promise<void> {
  const audioContext = await createResumedReferenceAudioContext();

  if (!audioContext) {
    return;
  }

  const startTime = audioContext.currentTime + REFERENCE_NOTE_START_OFFSET_SECONDS;
  const notes = [523.25, 659.25, 783.99];

  for (const [index, frequency] of notes.entries()) {
    scheduleVozPracticeNote(
      audioContext,
      frequency,
      startTime + index * 0.08,
      0.22,
      0.35,
    );
  }
}
