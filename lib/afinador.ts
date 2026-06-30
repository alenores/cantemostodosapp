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
  { label: "Mi", frequency: 82.41 },
  { label: "La", frequency: 110.0 },
  { label: "Re", frequency: 146.83 },
  { label: "Sol", frequency: 196.0 },
  { label: "Si", frequency: 246.94 },
  { label: "Mi", frequency: 329.63 },
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
const MIN_DETECTABLE_HZ = 60;
const MAX_DETECTABLE_HZ = 1200;
const MIN_RMS = 0.002;

/** Suavizado de frecuencia (~300 ms a 60 fps). */
export const TUNER_FREQUENCY_EMA_ALPHA = 0.06;
/** Suavizado de cents para la aguja (~250 ms a 60 fps). */
export const TUNER_CENTS_EMA_ALPHA = 0.1;
/** Cents necesarios para llevar la aguja de punta a punta (menor = menos expresiva). */
export const NEEDLE_FULL_DEFLECTION_CENTS = 22;

export function ema(
  current: number | null,
  next: number,
  alpha: number,
): number {
  if (current === null) {
    return next;
  }

  return current + alpha * (next - current);
}

export function computeBufferRms(buffer: Float32Array): number {
  let sum = 0;

  for (let index = 0; index < buffer.length; index += 1) {
    sum += buffer[index] * buffer[index];
  }

  return Math.sqrt(sum / buffer.length);
}

export function autoCorrelate(
  buffer: Float32Array,
  sampleRate: number,
): number | null {
  const bufferLength = buffer.length;
  const rms = computeBufferRms(buffer);

  if (rms < MIN_RMS) {
    return null;
  }

  const minLag = Math.floor(sampleRate / MAX_DETECTABLE_HZ);
  const maxLag = Math.ceil(sampleRate / MIN_DETECTABLE_HZ);

  const correlations = new Float32Array(maxLag + 1);

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;

    for (let index = 0; index < bufferLength - lag; index += 1) {
      sum += buffer[index] * buffer[index + lag];
    }

    correlations[lag] = sum;
  }

  let peakLag = minLag;

  for (let lag = minLag + 1; lag <= maxLag; lag += 1) {
    if (correlations[lag] > correlations[peakLag]) {
      peakLag = lag;
    }
  }

  if (correlations[peakLag] <= 0) {
    return null;
  }

  let refinedLag = peakLag;
  const previous = correlations[peakLag - 1] ?? correlations[peakLag];
  const current = correlations[peakLag];
  const next = correlations[peakLag + 1] ?? correlations[peakLag];
  const denominator = 2 * current - previous - next;

  if (denominator !== 0) {
    refinedLag += (next - previous) / (2 * denominator);
  }

  const frequency = sampleRate / refinedLag;

  if (frequency < MIN_DETECTABLE_HZ || frequency > MAX_DETECTABLE_HZ) {
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
      return "Escuchando...";
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
  const clamped = Math.max(
    -NEEDLE_FULL_DEFLECTION_CENTS,
    Math.min(NEEDLE_FULL_DEFLECTION_CENTS, cents),
  );
  return (clamped / NEEDLE_FULL_DEFLECTION_CENTS) * 45;
}
