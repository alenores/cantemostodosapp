import { frequencyToNote, NOTE_NAMES } from "@/lib/afinador";

export const VOZ_INTUNE_CENTS = 20;
export const VOZ_CERCA_CENTS = 45;
export const VOZ_LADDER_SEMITONE_SPAN = 6;
export const VOZ_HISTORY_WINDOW_MS = 12_000;
export const VOZ_HISTORY_SAMPLE_INTERVAL_MS = 100;
export const VOZ_HISTORY_GAP_MS = 300;
export const VOZ_HISTORY_CHART_MAX_CENTS = VOZ_CERCA_CENTS;
/** Rango vertical del gráfico de tono en ritmo/combo (±6 semitonos). */
export const VOZ_HISTORY_CHART_WIDE_MAX_CENTS =
  VOZ_LADDER_SEMITONE_SPAN * 100;
export const VOZ_HOLD_TARGET_OPTIONS = [2, 3, 5, 8] as const;
export const VOZ_HOLD_TARGET_DEFAULT = 3;
export const VOZ_INSTANT_ATTEMPTS_MAX = 12;

export type VozInstantAttempt = {
  id: number;
  hit: boolean;
};

export type VozAccuracy = "en-tono" | "cerca" | "lejos" | "silencio";

export type VozTarget = {
  note: string;
  octave: number;
};

export const VOZ_DEFAULT_TARGET: VozTarget = { note: "A", octave: 3 };

export const VOZ_OCTAVES = [2, 3, 4, 5] as const;

const A4_FREQUENCY = 440;

export function targetToFrequency(target: VozTarget): number {
  const noteIndex = NOTE_NAMES.indexOf(
    target.note as (typeof NOTE_NAMES)[number],
  );

  if (noteIndex === -1) {
    return A4_FREQUENCY;
  }

  const midi = (target.octave + 1) * 12 + noteIndex;
  return A4_FREQUENCY * 2 ** ((midi - 69) / 12);
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

export function getVozAccuracy(cents: number, hasSignal: boolean): VozAccuracy {
  if (!hasSignal) {
    return "silencio";
  }

  const abs = Math.abs(cents);

  if (abs <= VOZ_INTUNE_CENTS) {
    return "en-tono";
  }

  if (abs <= VOZ_CERCA_CENTS) {
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

  return semitones * 100;
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

export function getVozFeedbackLabel(
  accuracy: VozAccuracy,
  cents: number,
  options?: {
    octaveExact: boolean;
    targetNote: string;
    detectedNote?: string;
  },
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
      return options?.octaveExact ? "¡En tono!" : "¡Nota correcta!";
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

export function getVozAccuracyColor(accuracy: VozAccuracy): string {
  switch (accuracy) {
    case "en-tono":
      return "var(--tuner-in-tune)";
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

export function historySampleToChartPoint(
  sample: VozHistorySample,
  now: number,
  width: number,
  height: number,
  windowMs = VOZ_HISTORY_WINDOW_MS,
  maxCents = VOZ_HISTORY_CHART_MAX_CENTS,
  paddingLeft = 8,
  paddingRight = 8,
): { x: number; y: number } {
  const innerWidth = width - paddingLeft - paddingRight;
  const age = now - sample.timestamp;
  const x = paddingLeft + innerWidth * (1 - age / windowMs);
  const clampedCents = Math.max(
    -maxCents,
    Math.min(maxCents, sample.cents),
  );
  const y = historyCentsToChartY(clampedCents, height, maxCents);

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
): number {
  if (samples.length === 0) {
    return 0;
  }

  let holdStart: number | null = null;

  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const sample = samples[index]!;

    if (sample.accuracy !== "en-tono") {
      break;
    }

    holdStart = sample.timestamp;
  }

  if (holdStart === null) {
    return 0;
  }

  return now - holdStart;
}

export function formatHoldDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

export function playHoldCelebration(): void {
  const AudioContextClass =
    typeof window !== "undefined"
      ? window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      : null;

  if (!AudioContextClass) {
    return;
  }

  const audioContext = new AudioContextClass();
  const startTime = audioContext.currentTime;
  const notes = [523.25, 659.25, 783.99];

  for (const [index, frequency] of notes.entries()) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const time = startTime + index * 0.08;

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.001, time);
    gainNode.gain.exponentialRampToValueAtTime(0.35, time + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(time);
    oscillator.stop(time + 0.24);
  }

  window.setTimeout(() => {
    void audioContext.close();
  }, 500);
}
