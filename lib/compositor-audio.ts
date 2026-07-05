import type {
  CompositorDrumSound,
  CompositorGuitarArticulation,
  CompositorInstrumentId,
  CompositorPiece,
  CompositorSlotNote,
} from "@/lib/compositor";
import {
  buildCompositorScheduledSounds,
  getCompositorCycleDurationSeconds,
  type CompositorScheduledSound,
} from "@/lib/compositor-timeline";
import {
  getCompositorPlaybackRate,
  pickNearestMultiSample,
  type CompositorResolvedSample,
  type CompositorSampleBank,
} from "@/lib/compositor-samples";

const COMPOSITOR_GUITAR_PUA_ROOT: CompositorSlotNote = { note: "E", octave: 2 };

function getGuitarNotePlaybackRate(note: CompositorSlotNote): number {
  return getCompositorPlaybackRate(note, COMPOSITOR_GUITAR_PUA_ROOT);
}
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import { targetToFrequency } from "@/lib/voz";

const LOOK_AHEAD_SECONDS = 0.35;
const SCHEDULE_INTERVAL_MS = 25;
const MIN_MELODIC_DURATION_SECONDS = 0.04;

const LEVEL_GAIN: Record<Exclude<MetronomeBeatLevel, "silencio">, number> = {
  suave: 0.22,
  medio: 0.48,
  fuerte: 0.82,
};

function levelToGain(level: MetronomeBeatLevel): number | null {
  if (level === "silencio") {
    return null;
  }

  return LEVEL_GAIN[level];
}

function clampMelodicDuration(durationSeconds: number): number {
  return Math.max(MIN_MELODIC_DURATION_SECONDS, durationSeconds);
}

function scheduleTone(
  audioContext: AudioContext,
  time: number,
  frequency: number,
  peakGain: number,
  duration: number,
  wave: OscillatorType,
): void {
  const safeDuration = clampMelodicDuration(duration);
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = wave;
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(peakGain, time);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + safeDuration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(time);
  oscillator.stop(time + safeDuration + 0.01);
}

function scheduleNoiseBurst(
  audioContext: AudioContext,
  time: number,
  duration: number,
  peakGain: number,
  filterType: BiquadFilterType,
  filterFrequency: number,
): void {
  const sampleCount = Math.max(1, Math.floor(audioContext.sampleRate * duration));
  const buffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < sampleCount; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  const filter = audioContext.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFrequency;

  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(peakGain, time);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);

  source.start(time);
  source.stop(time + duration + 0.01);
}

function scheduleSample(
  audioContext: AudioContext,
  time: number,
  buffer: AudioBuffer,
  peakGain: number,
  playbackRate = 1,
  maxDuration?: number,
): void {
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;

  const gainNode = audioContext.createGain();
  const naturalDuration = buffer.duration / Math.max(playbackRate, 0.01);
  const duration = Math.min(naturalDuration, maxDuration ?? naturalDuration);

  gainNode.gain.setValueAtTime(peakGain, time);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  source.start(time);
  source.stop(time + duration + 0.02);
}

/** Envolvente y filtro suaves para muestras de viento sostenidas. */
function scheduleWindSample(
  audioContext: AudioContext,
  time: number,
  buffer: AudioBuffer,
  peakGain: number,
  playbackRate: number,
  maxDuration: number,
): void {
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;

  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.7;
  filter.frequency.value =
    playbackRate > 1.08
      ? 7200
      : playbackRate < 0.92
        ? 9800
        : 11000;

  const gainNode = audioContext.createGain();
  const naturalDuration = buffer.duration / Math.max(playbackRate, 0.01);
  const duration = Math.min(naturalDuration, maxDuration);
  const attack = Math.min(0.03, duration * 0.1);
  const release = Math.min(0.14, duration * 0.18);
  const sustainEnd = Math.max(time + attack, time + duration - release);

  gainNode.gain.setValueAtTime(0.0001, time);
  gainNode.gain.exponentialRampToValueAtTime(
    Math.max(peakGain, 0.0002),
    time + attack,
  );
  gainNode.gain.setValueAtTime(peakGain, sustainEnd);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);

  source.start(time);
  source.stop(time + duration + 0.03);
}

function schedulePitchedNoteSynth(
  audioContext: AudioContext,
  time: number,
  note: CompositorSlotNote,
  level: MetronomeBeatLevel,
  wave: OscillatorType,
  duration: number,
): void {
  const gain = levelToGain(level);

  if (gain === null) {
    return;
  }

  scheduleTone(
    audioContext,
    time,
    targetToFrequency(note),
    gain * 0.55,
    duration,
    wave,
  );
}

function scheduleResolvedSample(
  audioContext: AudioContext,
  time: number,
  resolved: CompositorResolvedSample,
  level: MetronomeBeatLevel,
  gainScale: number,
  maxDuration?: number,
): void {
  const gain = levelToGain(level);

  if (gain === null) {
    return;
  }

  scheduleSample(
    audioContext,
    time,
    resolved.buffer,
    gain * gainScale,
    resolved.playbackRate,
    maxDuration,
  );
}

function scheduleMelodicFromMultiSample(
  audioContext: AudioContext,
  time: number,
  note: CompositorSlotNote,
  level: MetronomeBeatLevel,
  durationSeconds: number,
  samples: CompositorSampleBank | null,
  sampleSet: CompositorSampleBank["piano"],
  gainScale: number,
  synthWave: OscillatorType,
): void {
  const duration = clampMelodicDuration(durationSeconds);
  const resolved = pickNearestMultiSample(note, sampleSet);

  if (resolved) {
    scheduleResolvedSample(
      audioContext,
      time,
      resolved,
      level,
      gainScale,
      duration,
    );
    return;
  }

  schedulePitchedNoteSynth(audioContext, time, note, level, synthWave, duration);
}

function schedulePianoNote(
  audioContext: AudioContext,
  time: number,
  note: CompositorSlotNote,
  level: MetronomeBeatLevel,
  durationSeconds: number,
  samples: CompositorSampleBank | null,
): void {
  scheduleMelodicFromMultiSample(
    audioContext,
    time,
    note,
    level,
    durationSeconds,
    samples,
    samples?.piano ?? null,
    0.72,
    "sine",
  );
}

function scheduleVientoNote(
  audioContext: AudioContext,
  time: number,
  note: CompositorSlotNote,
  level: MetronomeBeatLevel,
  durationSeconds: number,
  samples: CompositorSampleBank | null,
): void {
  const gain = levelToGain(level);

  if (gain === null) {
    return;
  }

  const duration = clampMelodicDuration(durationSeconds);
  const resolved = pickNearestMultiSample(note, samples?.viento ?? null);

  if (resolved) {
    scheduleWindSample(
      audioContext,
      time,
      resolved.buffer,
      gain * 0.88,
      resolved.playbackRate,
      duration,
    );
    return;
  }

  schedulePitchedNoteSynth(audioContext, time, note, level, "triangle", duration);
}

function scheduleGuitarNote(
  audioContext: AudioContext,
  time: number,
  note: CompositorSlotNote,
  level: MetronomeBeatLevel,
  articulation: CompositorGuitarArticulation,
  durationSeconds: number,
  samples: CompositorSampleBank | null,
): void {
  if (articulation === "silencio") {
    return;
  }

  const gain = levelToGain(level);

  if (gain === null) {
    return;
  }

  const duration = clampMelodicDuration(durationSeconds);
  const guitarBuffer = samples?.guitar?.[articulation] ?? null;

  if (guitarBuffer) {
    scheduleSample(
      audioContext,
      time,
      guitarBuffer,
      gain * (articulation === "rasguido" ? 0.58 : articulation === "dedo" ? 0.54 : 0.62),
      articulation === "rasguido" || articulation === "dedo" ? 1 : getGuitarNotePlaybackRate(note),
      duration,
    );
    return;
  }

  if (articulation === "rasguido") {
    scheduleTone(
      audioContext,
      time,
      targetToFrequency(note),
      gain * 0.42,
      duration,
      "triangle",
    );
    scheduleTone(
      audioContext,
      time,
      targetToFrequency(note) * 1.007,
      gain * 0.18,
      duration * 0.85,
      "sine",
    );
    return;
  }

  scheduleTone(
    audioContext,
    time,
    targetToFrequency(note),
    gain * 0.5,
    Math.min(duration, 0.35),
    "triangle",
  );
}

function scheduleDrumHitSynth(
  audioContext: AudioContext,
  time: number,
  sound: CompositorDrumSound,
  level: MetronomeBeatLevel,
): void {
  if (sound === "silencio") {
    return;
  }

  const gain = levelToGain(level);

  if (gain === null) {
    return;
  }

  switch (sound) {
    case "kick": {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(150, time);
      oscillator.frequency.exponentialRampToValueAtTime(52, time + 0.12);
      gainNode.gain.setValueAtTime(gain * 0.9, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.18);
      break;
    }
    case "snare":
      scheduleNoiseBurst(audioContext, time, 0.09, gain * 0.55, "bandpass", 1800);
      scheduleTone(audioContext, time, 180, gain * 0.2, 0.05, "triangle");
      break;
    case "hihat":
      scheduleNoiseBurst(audioContext, time, 0.04, gain * 0.35, "highpass", 6000);
      break;
    case "hihatOpen":
      scheduleNoiseBurst(audioContext, time, 0.14, gain * 0.42, "highpass", 5200);
      break;
    case "crash":
      scheduleNoiseBurst(audioContext, time, 0.55, gain * 0.48, "highpass", 4200);
      scheduleTone(audioContext, time, 280, gain * 0.12, 0.35, "sine");
      break;
    case "ride":
      scheduleNoiseBurst(audioContext, time, 0.22, gain * 0.3, "bandpass", 5200);
      break;
    default:
      break;
  }
}

function scheduleDrumHit(
  audioContext: AudioContext,
  time: number,
  sound: CompositorDrumSound,
  level: MetronomeBeatLevel,
  samples: CompositorSampleBank | null,
): void {
  if (sound === "silencio") {
    return;
  }

  const gain = levelToGain(level);

  if (gain === null) {
    return;
  }

  if (!samples) {
    scheduleDrumHitSynth(audioContext, time, sound, level);
    return;
  }

  const buffer = samples?.drums?.[sound] ?? null;

  if (!buffer) {
    scheduleDrumHitSynth(audioContext, time, sound, level);
    return;
  }

  const gainScale =
    sound === "kick"
      ? 0.95
      : sound === "snare"
        ? 0.78
        : sound === "hihat"
          ? 0.62
          : sound === "hihatOpen"
            ? 0.68
            : sound === "crash"
              ? 0.72
              : sound === "ride"
                ? 0.58
                : 0.62;
  scheduleSample(audioContext, time, buffer, gain * gainScale);
}

export function scheduleCompositorSound(
  audioContext: AudioContext,
  time: number,
  sound: CompositorScheduledSound,
  samples: CompositorSampleBank | null = null,
): void {
  switch (sound.instrumentId) {
    case "piano":
      schedulePianoNote(
        audioContext,
        time,
        sound.note,
        sound.level,
        sound.durationSeconds,
        samples,
      );
      break;
    case "guitarra":
      scheduleGuitarNote(
        audioContext,
        time,
        sound.note,
        sound.level,
        sound.guitarArticulation,
        sound.durationSeconds,
        samples,
      );
      break;
    case "bateria":
      scheduleDrumHit(
        audioContext,
        time,
        sound.drumSound,
        sound.level,
        samples,
      );
      break;
    case "viento":
      scheduleVientoNote(
        audioContext,
        time,
        sound.note,
        sound.level,
        sound.durationSeconds,
        samples,
      );
      break;
    default:
      break;
  }
}

export type CompositorEngine = {
  start(
    piece: CompositorPiece,
    onProgress: (cycleProgress: number) => void,
  ): void;
  playSingleCycle(
    piece: CompositorPiece,
    instrumentId: CompositorInstrumentId,
    onProgress: (cycleProgress: number) => void,
    onComplete?: () => void,
  ): void;
  stop(): void;
};

export function createCompositorEngine(
  audioContext: AudioContext,
  samples: CompositorSampleBank | null = null,
): CompositorEngine {
  let running = false;
  let piece: CompositorPiece | null = null;
  let cycleDurationSeconds = 1;
  let loopStartAudioTime = 0;
  let scheduledUntilAudioTime = 0;
  let schedulerTimer: ReturnType<typeof setInterval> | null = null;
  let previewEndTimer: ReturnType<typeof setTimeout> | null = null;
  let onProgress: ((cycleProgress: number) => void) | null = null;
  const progressTimeouts = new Set<ReturnType<typeof setTimeout>>();

  function clearProgressTimeouts(): void {
    for (const timeoutId of progressTimeouts) {
      clearTimeout(timeoutId);
    }
    progressTimeouts.clear();
  }

  function scheduleProgressCallback(
    cycleProgress: number,
    audioTime: number,
  ): void {
    const delayMs = Math.max(
      0,
      (audioTime - audioContext.currentTime) * 1000,
    );

    const timeoutId = setTimeout(() => {
      progressTimeouts.delete(timeoutId);

      if (!running || !onProgress) {
        return;
      }

      onProgress(cycleProgress);
    }, delayMs);

    progressTimeouts.add(timeoutId);
  }

  function scheduleSoundsBetween(startAudioTime: number, endAudioTime: number): void {
    if (!piece || cycleDurationSeconds <= 0) {
      return;
    }

    const sounds = buildCompositorScheduledSounds(piece);
    const startOffset = Math.max(0, startAudioTime - loopStartAudioTime);
    const endOffset = Math.max(startOffset, endAudioTime - loopStartAudioTime);

    const firstCycle = Math.floor(startOffset / cycleDurationSeconds);
    const lastCycle = Math.ceil(endOffset / cycleDurationSeconds);

    for (let cycleIndex = firstCycle; cycleIndex <= lastCycle; cycleIndex += 1) {
      const cycleBase = cycleIndex * cycleDurationSeconds;

      for (const sound of sounds) {
        const eventOffset = cycleBase + sound.cycleOffsetSeconds;
        const eventAudioTime = loopStartAudioTime + eventOffset;

        if (eventAudioTime < startAudioTime || eventAudioTime >= endAudioTime) {
          continue;
        }

        scheduleCompositorSound(audioContext, eventAudioTime, sound, samples);
      }
    }

    const progressStep = cycleDurationSeconds / 24;

    for (
      let offset = Math.floor(startOffset / progressStep) * progressStep;
      offset <= endOffset;
      offset += progressStep
    ) {
      const progress = (offset % cycleDurationSeconds) / cycleDurationSeconds;
      const progressAudioTime = loopStartAudioTime + offset;

      if (progressAudioTime < startAudioTime || progressAudioTime >= endAudioTime) {
        continue;
      }

      scheduleProgressCallback(progress, progressAudioTime);
    }
  }

  function scheduler(): void {
    if (!running || !piece) {
      return;
    }

    const horizon = audioContext.currentTime + LOOK_AHEAD_SECONDS;

    if (scheduledUntilAudioTime < horizon) {
      const scheduleFrom =
        scheduledUntilAudioTime > 0
          ? scheduledUntilAudioTime
          : audioContext.currentTime;
      scheduleSoundsBetween(scheduleFrom, horizon);
      scheduledUntilAudioTime = horizon;
    }
  }

  function clearPreviewEndTimer(): void {
    if (previewEndTimer !== null) {
      clearTimeout(previewEndTimer);
      previewEndTimer = null;
    }
  }

  function stopInternal(): void {
    running = false;
    onProgress = null;
    piece = null;
    scheduledUntilAudioTime = 0;

    if (schedulerTimer !== null) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }

    clearPreviewEndTimer();
    clearProgressTimeouts();
  }

  return {
    start(nextPiece: CompositorPiece, nextOnProgress) {
      stopInternal();

      piece = nextPiece;
      cycleDurationSeconds = getCompositorCycleDurationSeconds(nextPiece);
      onProgress = nextOnProgress;
      running = true;
      loopStartAudioTime = audioContext.currentTime;
      scheduledUntilAudioTime = 0;

      scheduler();
      schedulerTimer = setInterval(scheduler, SCHEDULE_INTERVAL_MS);
    },
    playSingleCycle(
      nextPiece,
      instrumentId,
      nextOnProgress,
      onComplete,
    ) {
      stopInternal();

      piece = nextPiece;
      cycleDurationSeconds = getCompositorCycleDurationSeconds(nextPiece);
      onProgress = nextOnProgress;
      running = true;
      loopStartAudioTime = audioContext.currentTime;
      scheduledUntilAudioTime = loopStartAudioTime + cycleDurationSeconds;

      const sounds = buildCompositorScheduledSounds(nextPiece, {
        onlyInstrumentId: instrumentId,
      });

      for (const sound of sounds) {
        scheduleCompositorSound(
          audioContext,
          loopStartAudioTime + sound.cycleOffsetSeconds,
          sound,
          samples,
        );
      }

      const progressStep = cycleDurationSeconds / 24;

      for (
        let offset = 0;
        offset <= cycleDurationSeconds;
        offset += progressStep
      ) {
        const progress = Math.min(1, offset / cycleDurationSeconds);
        scheduleProgressCallback(progress, loopStartAudioTime + offset);
      }

      previewEndTimer = setTimeout(() => {
        previewEndTimer = null;
        const complete = onComplete;
        stopInternal();
        complete?.();
      }, cycleDurationSeconds * 1000 + 60);
    },
    stop() {
      stopInternal();
    },
  };
}
