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

export type TunerInstrumentMode = "guitar" | "chromatic" | "prueba";

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
/** Entrenador vocal: graves más sensibles (C2 ≈ 65 Hz). */
export const VOCAL_MIN_DETECTABLE_HZ = 50;
export const VOCAL_MIN_RMS = 0.001;

export type AutoCorrelateOptions = {
  minHz?: number;
  maxHz?: number;
  minRms?: number;
};

/** Suavizado ligero solo para decidir la nota (~120 ms a 60 fps). */
export const TUNER_NOTE_FREQUENCY_EMA_ALPHA = 0.18;
/** Suavizado de Hz mostrado (~500 ms a 60 fps). */
export const TUNER_DISPLAY_HZ_EMA_ALPHA = 0.04;
/** Suavizado de cents para la aguja (~400 ms a 60 fps). */
export const TUNER_CENTS_EMA_ALPHA = 0.06;
/** Modo libre: nota un poco más viva (~80 ms a 60 fps). */
export const CHROMATIC_NOTE_FREQUENCY_EMA_ALPHA = 0.28;
/** Modo libre: aguja un poco más expresiva (~200 ms a 60 fps). */
export const CHROMATIC_CENTS_EMA_ALPHA = 0.12;
/** Entrenador vocal: cents dentro de la misma nota. */
export const VOCAL_CENTS_EMA_ALPHA = 0.45;
/** Histéresis al cambiar de cuerda en modo guitarra (auto). */
export const GUITAR_STRING_SWITCH_HYSTERESIS_CENTS = 60;
/** Tolerancia para tratar una lectura como armónico de la cuerda bloqueada. */
export const GUITAR_HARMONIC_MATCH_CENTS = 48;
/** Tiempo que se conserva la cuerda bloqueada tras micro-silencios en el sustain. */
export const GUITAR_STRING_LOCK_HANGOVER_MS = 450;
/** Al salir de un grave bloqueado, la otra cuerda debe encajar muy bien (evita Mi→Re). */
export const GUITAR_BASS_CONFIDENT_SWITCH_CENTS = 45;
/** Banda del armónico del Mi grave (ratio respecto a ~82 Hz). */
const LOW_E_HARMONIC_RATIO_MIN = 1.72;
const LOW_E_HARMONIC_RATIO_MAX = 2.55;
/** Otra cuerda encaja claramente como fundamental (no armónico). */
const GUITAR_FUNDAMENTAL_MATCH_CENTS = 38;
/** Ignorar lecturas tras un nuevo golpe (pico agudo del ataque). */
export const TUNER_ATTACK_IGNORE_MS = 220;
/** Modo libre: ventana más corta, el ataque también existe pero suele ser menor. */
export const CHROMATIC_ATTACK_IGNORE_MS = 140;
/** Cents necesarios para llevar la aguja de punta a punta (menor = menos expresiva). */
export const NEEDLE_FULL_DEFLECTION_CENTS = 22;
/** Distancia desde la nota bloqueada para permitir cambiar de nota (histéresis). */
export const TUNER_NOTE_SWITCH_THRESHOLD_CENTS = 42;
/** Tiempo que una nota candidata debe sostenerse antes de actualizar la letra. */
export const TUNER_NOTE_HOLD_MS = 320;

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
  options: AutoCorrelateOptions = {},
): number | null {
  const minHz = options.minHz ?? MIN_DETECTABLE_HZ;
  const maxHz = options.maxHz ?? MAX_DETECTABLE_HZ;
  const minRms = options.minRms ?? MIN_RMS;
  const bufferLength = buffer.length;
  const rms = computeBufferRms(buffer);

  if (rms < minRms) {
    return null;
  }

  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.ceil(sampleRate / minHz);

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

  if (frequency < minHz || frequency > maxHz) {
    return null;
  }

  return frequency;
}

/** Pitch para voz: más sensible en graves y preferencia por fundamental. */
export function detectVocalPitch(
  buffer: Float32Array,
  sampleRate: number,
): number | null {
  const bufferLength = buffer.length;
  const rms = computeBufferRms(buffer);

  if (rms < VOCAL_MIN_RMS) {
    return null;
  }

  const minHz = VOCAL_MIN_DETECTABLE_HZ;
  const maxHz = MAX_DETECTABLE_HZ;
  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.ceil(sampleRate / minHz);
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

  // En graves el mic suele enganchar el 2.º armónico: preferir el lag más largo (más grave).
  for (const harmonic of [2, 3]) {
    const subLag = peakLag * harmonic;

    if (subLag > maxLag) {
      break;
    }

    const subCorrelation = correlations[subLag] ?? 0;

    if (subCorrelation >= correlations[peakLag] * 0.82) {
      peakLag = subLag;
    }
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

  if (frequency < minHz || frequency > maxHz) {
    return null;
  }

  return frequency;
}

export function frequencyToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / A4_FREQUENCY);
}

const TUNER_FOLD_MIN_HZ = 65;
const TUNER_FOLD_MAX_HZ = 500;

/** Corrige lecturas en octava incorrecta (armónicos) sin cambiar la nota. */
export function foldFrequencyToTuningRange(
  frequency: number,
  minHz = TUNER_FOLD_MIN_HZ,
  maxHz = TUNER_FOLD_MAX_HZ,
): number {
  let folded = frequency;

  while (folded > maxHz) {
    folded /= 2;
  }

  while (folded < minHz) {
    folded *= 2;
  }

  return folded;
}

export function midiToNoteName(midi: number): string {
  const noteIndex = ((Math.round(midi) % 12) + 12) % 12;
  return NOTE_NAMES[noteIndex];
}

export type DebouncedNoteState = {
  displayMidi: number | null;
  candidateMidi: number | null;
  candidateSinceMs: number;
};

export function createDebouncedNoteState(): DebouncedNoteState {
  return {
    displayMidi: null,
    candidateMidi: null,
    candidateSinceMs: 0,
  };
}

/**
 * Nota visible con retención temporal: la letra solo cambia si el pitch sugiere
 * otra nota de forma sostenida (~320 ms), evitando parpadeos entre semitonos.
 */
export function updateDebouncedDisplayNote(
  state: DebouncedNoteState,
  frequency: number,
  nowMs: number,
  holdMs = TUNER_NOTE_HOLD_MS,
): { state: DebouncedNoteState; displayMidi: number | null } {
  const candidateMidi = Math.round(frequencyToMidi(frequency));

  if (state.displayMidi === null) {
    return {
      state: {
        displayMidi: candidateMidi,
        candidateMidi: null,
        candidateSinceMs: nowMs,
      },
      displayMidi: candidateMidi,
    };
  }

  if (candidateMidi === state.displayMidi) {
    return {
      state: { ...state, candidateMidi: null },
      displayMidi: state.displayMidi,
    };
  }

  if (state.candidateMidi !== candidateMidi) {
    return {
      state: {
        ...state,
        candidateMidi,
        candidateSinceMs: nowMs,
      },
      displayMidi: state.displayMidi,
    };
  }

  if (nowMs - state.candidateSinceMs >= holdMs) {
    return {
      state: {
        displayMidi: candidateMidi,
        candidateMidi: null,
        candidateSinceMs: nowMs,
      },
      displayMidi: candidateMidi,
    };
  }

  return { state, displayMidi: state.displayMidi };
}

/** Nota estable con histéresis: evita saltos entre semitonos por ruido o microdesvíos. */
export function resolveStableNoteDetection(
  frequency: number,
  lockedMidi: number | null,
  switchThresholdCents = TUNER_NOTE_SWITCH_THRESHOLD_CENTS,
): NoteDetection & { midi: number } {
  const midi = frequencyToMidi(frequency);

  let activeMidi: number;

  if (lockedMidi === null) {
    activeMidi = Math.round(midi);
  } else {
    const centsFromLocked = (midi - lockedMidi) * 100;

    if (Math.abs(centsFromLocked) > switchThresholdCents) {
      activeMidi = Math.round(midi);
    } else {
      activeMidi = lockedMidi;
    }
  }

  return {
    note: midiToNoteName(activeMidi),
    frequency,
    cents: (midi - activeMidi) * 100,
    midi: activeMidi,
  };
}

export function frequencyToNote(frequency: number): NoteDetection {
  const midi = frequencyToMidi(frequency);
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

/** Zoom del afinador: ±3 semitonos (7 etiquetas). */
export const AFINADOR_LADDER_SEMITONE_SPAN = 3;

export type AfinadorLadderSlot = {
  note: string;
  semitoneOffset: number;
};

function noteAtSemitoneOffset(targetNote: string, semitoneOffset: number): string {
  const targetIndex = NOTE_NAMES.indexOf(
    targetNote as (typeof NOTE_NAMES)[number],
  );

  if (targetIndex === -1) {
    return targetNote;
  }

  const nextIndex =
    ((targetIndex + semitoneOffset) % NOTE_NAMES.length + NOTE_NAMES.length) %
    NOTE_NAMES.length;

  return NOTE_NAMES[nextIndex]!;
}

export function getAfinadorLadderSlots(
  targetNote: string,
): AfinadorLadderSlot[] {
  const span = AFINADOR_LADDER_SEMITONE_SPAN;

  return Array.from({ length: span * 2 + 1 }, (_, index) => {
    const semitoneOffset = index - span;

    return {
      note: noteAtSemitoneOffset(targetNote, semitoneOffset),
      semitoneOffset,
    };
  });
}

export function afinadorSemitoneOffsetToLadderPercent(
  semitoneOffset: number,
): number {
  const span = AFINADOR_LADDER_SEMITONE_SPAN;
  const clamped = Math.max(-span, Math.min(span, semitoneOffset));

  return 50 + (clamped / span) * 50;
}

export function afinadorCentsToLadderPercent(cents: number): number {
  const maxCents = AFINADOR_LADDER_SEMITONE_SPAN * 100;
  const clamped = Math.max(-maxCents, Math.min(maxCents, cents));

  return 50 + (clamped / maxCents) * 50;
}

/** Verde / amarillo / rojo según distancia a la nota central. */
export function getTunerMarkerColor(cents: number, hasSignal: boolean): string {
  if (!hasSignal) {
    return "var(--text-muted)";
  }

  const absCents = Math.abs(cents);

  if (absCents <= IN_TUNE_THRESHOLD_CENTS) {
    return "var(--tuner-in-tune)";
  }

  if (absCents <= FLAT_SHARP_THRESHOLD_CENTS) {
    return "var(--tuner-cerca)";
  }

  return "var(--tuner-flat-sharp)";
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

/** ¿La frecuencia es un armónico (octava) de la cuerda dada? */
export function isFrequencyHarmonicOfString(
  frequency: number,
  stringIndex: number,
  maxCents = GUITAR_HARMONIC_MATCH_CENTS,
): boolean {
  const target = GUITAR_STRINGS[stringIndex]?.frequency;

  if (!target) {
    return false;
  }

  const ratio = frequency / target;

  if (ratio <= 0) {
    return false;
  }

  const harmonicOrder = Math.round(Math.log2(ratio));

  if (harmonicOrder < -1 || harmonicOrder > 4) {
    return false;
  }

  const folded = frequency / 2 ** harmonicOrder;
  const cents = Math.abs(1200 * Math.log2(folded / target));

  return cents <= maxCents;
}

/** Lectura típica del sustain del Mi grave (p. ej. ~165 Hz), no otra cuerda. */
export function isConfidentFundamentalMatch(
  frequency: number,
  stringIndex: number,
  maxCents = GUITAR_FUNDAMENTAL_MATCH_CENTS,
): boolean {
  const target = GUITAR_STRINGS[stringIndex]?.frequency;

  if (!target) {
    return false;
  }

  return (
    Math.abs(1200 * Math.log2(frequency / target)) <= maxCents
  );
}

/** Mantener Mi grave bloqueado solo en la banda armónica ambigua (no La/Sol al aire). */
export function shouldHoldLowEStringLock(
  frequency: number,
  lockedIndex: number,
): boolean {
  if (lockedIndex !== 0) {
    return false;
  }

  const target = GUITAR_STRINGS[0].frequency;
  const ratio = frequency / target;

  if (ratio < LOW_E_HARMONIC_RATIO_MIN || ratio > LOW_E_HARMONIC_RATIO_MAX) {
    return false;
  }

  // Re (índice 2) comparte zona con el 2.º armónico del Mi: no usarla para soltar.
  for (let index = 1; index < GUITAR_STRINGS.length; index += 1) {
    if (index === 2) {
      continue;
    }

    if (isConfidentFundamentalMatch(frequency, index)) {
      return false;
    }
  }

  return true;
}

/** @deprecated Usar shouldHoldLowEStringLock */
export function isInLowEHarmonicShadow(
  frequency: number,
  lockedIndex: number,
): boolean {
  return shouldHoldLowEStringLock(frequency, lockedIndex);
}

/** Pliega armónicos hacia la fundamental de una cuerda concreta. */
export function foldFrequencyToStringFundamental(
  frequency: number,
  stringIndex: number,
): number {
  const target = GUITAR_STRINGS[stringIndex]?.frequency;

  if (!target) {
    return frequency;
  }

  if (stringIndex === 0 && shouldHoldLowEStringLock(frequency, 0)) {
    const halved = frequency / 2;
    const halfError = Math.abs(1200 * Math.log2(halved / target));

    if (halfError <= 150) {
      return halved;
    }

    return target;
  }

  // La grave: banda del 2.º armónico → dividir por 2.
  if (stringIndex === 1) {
    const ratio = frequency / target;

    if (ratio >= 1.45 && ratio <= 2.35) {
      const halved = frequency / 2;
      const halfError = Math.abs(1200 * Math.log2(halved / target));

      if (halfError <= 150) {
        return halved;
      }
    }
  }

  let bestFrequency = frequency;
  let bestError = Infinity;

  for (let harmonic = 0; harmonic <= 4; harmonic += 1) {
    const harmonicTarget = target * 2 ** harmonic;
    const error = Math.abs(1200 * Math.log2(frequency / harmonicTarget));
    const candidate = frequency / 2 ** harmonic;

    if (error < bestError) {
      bestError = error;
      bestFrequency = candidate;
    }
  }

  return bestFrequency;
}

export function getStringPitchClass(stringIndex: number): number {
  const midi = Math.round(
    frequencyToMidi(GUITAR_STRINGS[stringIndex]?.frequency ?? A4_FREQUENCY),
  );

  return ((midi % 12) + 12) % 12;
}

export function getGuitarStringMatchError(
  frequency: number,
  stringIndex: number,
): number {
  const target = GUITAR_STRINGS[stringIndex]?.frequency;

  if (!target) {
    return Infinity;
  }

  const folded = foldFrequencyToStringFundamental(frequency, stringIndex);

  return Math.abs(1200 * Math.log2(folded / target));
}

export function getHarmonicClosestStringIndex(frequency: number): number {
  let bestIndex = 0;
  let bestError = Infinity;
  let bestTargetDistance = Infinity;

  for (let index = 0; index < GUITAR_STRINGS.length; index += 1) {
    const error = getGuitarStringMatchError(frequency, index);
    const targetDistance = Math.abs(frequency - GUITAR_STRINGS[index].frequency);

    if (
      error < bestError - 3 ||
      (Math.abs(error - bestError) <= 3 && targetDistance < bestTargetDistance)
    ) {
      bestError = error;
      bestIndex = index;
      bestTargetDistance = targetDistance;
    }
  }

  return bestIndex;
}

export function pickGuitarStringIndex(
  frequency: number,
  lockedIndex: number | null,
  manualIndex: number | null,
): number {
  if (
    manualIndex !== null &&
    manualIndex >= 0 &&
    manualIndex < GUITAR_STRINGS.length
  ) {
    return manualIndex;
  }

  const harmonicClosest = getHarmonicClosestStringIndex(frequency);

  if (lockedIndex === null) {
    return harmonicClosest;
  }

  if (harmonicClosest === lockedIndex) {
    return lockedIndex;
  }

  if (shouldHoldLowEStringLock(frequency, lockedIndex)) {
    return lockedIndex;
  }

  // Mi grave y Mi agudo comparten pitch class: no saltar entre ellos en auto.
  if (
    getStringPitchClass(harmonicClosest) === getStringPitchClass(lockedIndex)
  ) {
    return lockedIndex;
  }

  const lockedError = getGuitarStringMatchError(frequency, lockedIndex);
  const closestError = getGuitarStringMatchError(frequency, harmonicClosest);

  if (closestError + GUITAR_STRING_SWITCH_HYSTERESIS_CENTS < lockedError) {
    const leavingBassString = lockedIndex <= 1;
    const confidentNewString =
      closestError <= GUITAR_BASS_CONFIDENT_SWITCH_CENTS;

    if (leavingBassString && !confidentNewString) {
      return lockedIndex;
    }

    return harmonicClosest;
  }

  return lockedIndex;
}

export function resolveGuitarStringDetection(
  frequency: number,
  stringIndex: number,
): NoteDetection & { stringIndex: number } {
  const targetFrequency = GUITAR_STRINGS[stringIndex].frequency;
  const targetMidi = frequencyToMidi(targetFrequency);
  const midi = frequencyToMidi(frequency);
  const cents = (midi - targetMidi) * 100;

  return {
    note: midiToNoteName(Math.round(targetMidi)),
    frequency,
    cents,
    stringIndex,
  };
}

export function centsToNeedleAngle(cents: number): number {
  const clamped = Math.max(
    -NEEDLE_FULL_DEFLECTION_CENTS,
    Math.min(NEEDLE_FULL_DEFLECTION_CENTS, cents),
  );
  return (clamped / NEEDLE_FULL_DEFLECTION_CENTS) * 45;
}
