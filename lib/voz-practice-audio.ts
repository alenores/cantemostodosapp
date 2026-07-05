const NOTE_REFERENCE_PEAK_GAIN = 0.68;
const MIN_PRACTICE_NOTE_DURATION_SECONDS = 0.04;
/** Frecuencia de referencia para igualar volumen percibido con el metrónomo. */
const NOTE_LOUDNESS_REFERENCE_HZ = 440;
const NOTE_LOUDNESS_BOOST_MAX = 3.2;

let sharedPracticeAudioContext: AudioContext | null = null;

function getCompensatedPeakGain(frequency: number, peakGain: number): number {
  const bassBoost = Math.min(
    NOTE_LOUDNESS_BOOST_MAX,
    Math.sqrt(NOTE_LOUDNESS_REFERENCE_HZ / Math.max(frequency, 72)),
  );

  return Math.min(0.98, peakGain * bassBoost);
}

function getPracticeOscillatorType(frequency: number): OscillatorType {
  return frequency < 280 ? "triangle" : "sine";
}

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ||
    null
  );
}

/** Reserva el AudioContext en el mismo gesto del usuario (click/tap). */
export function primePracticeAudioOnGesture(): AudioContext | null {
  const AudioContextClass = getAudioContextClass();

  if (!AudioContextClass) {
    return null;
  }

  if (
    !sharedPracticeAudioContext ||
    sharedPracticeAudioContext.state === "closed"
  ) {
    sharedPracticeAudioContext = new AudioContextClass();
  }

  void sharedPracticeAudioContext.resume();

  return sharedPracticeAudioContext;
}

export async function ensurePracticeAudioContext(): Promise<AudioContext | null> {
  const primed = primePracticeAudioOnGesture();

  if (!primed) {
    return null;
  }

  if (primed.state === "suspended") {
    await primed.resume();
  }

  return primed;
}

function isValidPracticeFrequency(frequency: number): boolean {
  return Number.isFinite(frequency) && frequency > 0;
}

function connectPracticeOscillator(
  audioContext: AudioContext,
  frequency: number,
  time: number,
  durationSeconds: number,
  peakGain: number,
  pitchCompensation: boolean,
): void {
  const safeDuration = Math.max(
    durationSeconds,
    MIN_PRACTICE_NOTE_DURATION_SECONDS,
  );
  const release = Math.min(0.06, safeDuration * 0.12);
  const releaseStart = Math.max(time + 0.02, time + safeDuration - release);
  const outputGain = pitchCompensation
    ? getCompensatedPeakGain(frequency, peakGain)
    : Math.min(0.98, peakGain);

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = pitchCompensation
    ? getPracticeOscillatorType(frequency)
    : "sine";
  oscillator.frequency.value = frequency;
  gainNode.gain.setValueAtTime(outputGain, time);
  gainNode.gain.setValueAtTime(outputGain, releaseStart);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + safeDuration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(time);
  oscillator.stop(time + safeDuration + 0.03);
}

export type VozPracticeNoteOptions = {
  /** Si false, solo importa el volumen pedido (p. ej. intensidad en Combo). */
  pitchCompensation?: boolean;
};

/** Tono sostenido para melodía, referencias y ritmo con nota objetivo. */
export function scheduleVozPracticeNote(
  audioContext: AudioContext,
  frequency: number,
  time: number,
  durationSeconds: number,
  peakGain = NOTE_REFERENCE_PEAK_GAIN,
  options: VozPracticeNoteOptions = {},
): void {
  if (!isValidPracticeFrequency(frequency) || durationSeconds <= 0.01) {
    return;
  }

  const pitchCompensation = options.pitchCompensation !== false;

  if (!pitchCompensation) {
    connectPracticeOscillator(
      audioContext,
      frequency,
      time,
      durationSeconds,
      peakGain,
      false,
    );
    return;
  }

  const useLowHarmonics = frequency < 250;
  const fundamentalGain = useLowHarmonics ? peakGain * 0.78 : peakGain;

  connectPracticeOscillator(
    audioContext,
    frequency,
    time,
    durationSeconds,
    fundamentalGain,
    true,
  );

  if (useLowHarmonics) {
    connectPracticeOscillator(
      audioContext,
      frequency * 2,
      time,
      durationSeconds,
      peakGain * 0.38,
      true,
    );
  }

  if (frequency < 140) {
    connectPracticeOscillator(
      audioContext,
      frequency * 3,
      time,
      durationSeconds,
      peakGain * 0.18,
      true,
    );
  }
}
