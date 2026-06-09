export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export type GuitarString = {
  label: string;
  frequency: number;
};

export const GUITAR_STRINGS: GuitarString[] = [
  { label: "E2", frequency: 82.41 },
  { label: "A2", frequency: 110.0 },
  { label: "D3", frequency: 146.83 },
  { label: "G3", frequency: 196.0 },
  { label: "B3", frequency: 246.94 },
  { label: "E4", frequency: 329.63 },
];

export type NoteDetection = {
  note: string;
  frequency: number;
  cents: number;
};

export type TunerStatus = "in-tune" | "flat" | "sharp" | "silent";

const A4_FREQUENCY = 440;
const IN_TUNE_THRESHOLD_CENTS = 5;
const FLAT_SHARP_THRESHOLD_CENTS = 15;

export function autoCorrelate(
  buffer: Float32Array,
  sampleRate: number,
): number | null {
  const bufferLength = buffer.length;
  let rms = 0;

  for (let index = 0; index < bufferLength; index += 1) {
    rms += buffer[index] * buffer[index];
  }

  rms = Math.sqrt(rms / bufferLength);

  if (rms < 0.01) {
    return null;
  }

  let start = 0;
  let end = bufferLength - 1;
  const threshold = 0.2;

  for (let index = 0; index < bufferLength / 2; index += 1) {
    if (Math.abs(buffer[index]) < threshold) {
      start = index;
      break;
    }
  }

  for (let index = 1; index < bufferLength / 2; index += 1) {
    if (Math.abs(buffer[bufferLength - index]) < threshold) {
      end = bufferLength - index;
      break;
    }
  }

  const trimmed = buffer.subarray(start, end);
  const size = trimmed.length;
  const correlations = new Float32Array(size);

  for (let lag = 0; lag < size; lag += 1) {
    let sum = 0;

    for (let index = 0; index < size - lag; index += 1) {
      sum += trimmed[index] * trimmed[index + lag];
    }

    correlations[lag] = sum;
  }

  let peakLag = 0;

  while (peakLag + 1 < size && correlations[peakLag] <= correlations[peakLag + 1]) {
    peakLag += 1;
  }

  let maxLag = peakLag;
  let maxValue = correlations[peakLag];

  for (let lag = peakLag; lag < size; lag += 1) {
    if (correlations[lag] > maxValue) {
      maxValue = correlations[lag];
      maxLag = lag;
    }
  }

  if (maxLag <= 0) {
    return null;
  }

  let refinedLag = maxLag;
  const previous = correlations[maxLag - 1] ?? correlations[maxLag];
  const current = correlations[maxLag];
  const next = correlations[maxLag + 1] ?? correlations[maxLag];
  const denominator = 2 * current - previous - next;

  if (denominator !== 0) {
    refinedLag += (next - previous) / (2 * denominator);
  }

  const frequency = sampleRate / refinedLag;

  if (frequency < 60 || frequency > 1200) {
    return null;
  }

  return frequency;
}

export function frequencyToNote(frequency: number): NoteDetection {
  const midi = 69 + 12 * Math.log2(frequency / A4_FREQUENCY);
  const roundedMidi = Math.round(midi);
  const cents = Math.round((midi - roundedMidi) * 100);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;

  return {
    note: NOTE_NAMES[noteIndex],
    frequency,
    cents,
  };
}

export function getTunerStatus(cents: number, hasSignal: boolean): TunerStatus {
  if (!hasSignal) {
    return "silent";
  }

  if (Math.abs(cents) <= IN_TUNE_THRESHOLD_CENTS) {
    return "in-tune";
  }

  if (cents < -FLAT_SHARP_THRESHOLD_CENTS) {
    return "flat";
  }

  if (cents > FLAT_SHARP_THRESHOLD_CENTS) {
    return "sharp";
  }

  return cents < 0 ? "flat" : "sharp";
}

export function getStatusLabel(status: TunerStatus): string {
  switch (status) {
    case "in-tune":
      return "Afinada ✓";
    case "flat":
      return "Muy baja";
    case "sharp":
      return "Muy alta";
    default:
      return "Escuchá una nota...";
  }
}

export function getClosestStringIndex(frequency: number | null): number | null {
  if (frequency === null) {
    return null;
  }

  let closestIndex = 0;
  let smallestDelta = Math.abs(frequency - GUITAR_STRINGS[0].frequency);

  for (let index = 1; index < GUITAR_STRINGS.length; index += 1) {
    const delta = Math.abs(frequency - GUITAR_STRINGS[index].frequency);

    if (delta < smallestDelta) {
      smallestDelta = delta;
      closestIndex = index;
    }
  }

  return closestIndex;
}

export function centsToNeedleAngle(cents: number): number {
  const clamped = Math.max(-50, Math.min(50, cents));
  return (clamped / 50) * 45;
}
