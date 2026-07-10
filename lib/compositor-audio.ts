import {
  createPlaybackBus,
  type AudioPlaybackBus,
} from "@/lib/audio-playback-bus";
import {
  isGuitarChordArticulation,
  type CompositorDrumSound,
  type CompositorGuitarArticulation,
  type CompositorInstrumentId,
  type CompositorPiece,
  type CompositorSlotNote,
} from "@/lib/compositor";
import {
  buildCompositorScheduledSounds,
  getCompositorCycleDurationSeconds,
  type CompositorScheduledSound,
} from "@/lib/compositor-timeline";
import {
  pickNearestMultiSample,
  type CompositorResolvedSample,
  type CompositorSampleBank,
} from "@/lib/compositor-samples";
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import { targetToFrequency } from "@/lib/voz";

const COMPOSITOR_GUITAR_PUA_ROOT: CompositorSlotNote = { note: "E", octave: 2 };

function resolveGuitarPitchedSample(
  note: CompositorSlotNote,
  samples: CompositorSampleBank | null,
  articulation: "pua" | "dedo" | "bloque",
): CompositorResolvedSample | null {
  const set =
    articulation === "pua" ? samples?.guitar?.pua : samples?.guitar?.dedo;

  return pickNearestMultiSample(note, set ?? null);
}

type GuitarStringVoice = "pua" | "dedo" | "bloque" | "rasguido";

/** Perfiles audibles: púa brillante/seca, dedo suave/cálido, acordes con cuerdas reales. */
function getGuitarStringVoiceProfile(voice: GuitarStringVoice): {
  gainScale: number;
  attackSeconds: number;
  lowpassHz: number;
  highpassHz: number;
} {
  switch (voice) {
    case "pua":
      return {
        gainScale: 0.7,
        attackSeconds: 0.004,
        lowpassHz: 12000,
        highpassHz: 180,
      };
    case "dedo":
      return {
        gainScale: 0.48,
        attackSeconds: 0.028,
        lowpassHz: 4200,
        highpassHz: 60,
      };
    case "bloque":
      return {
        gainScale: 0.38,
        attackSeconds: 0.012,
        lowpassHz: 6500,
        highpassHz: 80,
      };
    case "rasguido":
      return {
        gainScale: 0.34,
        attackSeconds: 0.008,
        lowpassHz: 7800,
        highpassHz: 100,
      };
    default:
      return {
        gainScale: 0.55,
        attackSeconds: 0.01,
        lowpassHz: 8000,
        highpassHz: 80,
      };
  }
}

function scheduleGuitarStringSample(
  audioContext: AudioContext,
  time: number,
  buffer: AudioBuffer,
  peakGain: number,
  playbackRate: number,
  maxDuration: number,
  voice: GuitarStringVoice,
  bus?: AudioPlaybackBus | null,
): void {
  const profile = getGuitarStringVoiceProfile(voice);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;

  const highpass = audioContext.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = profile.highpassHz;
  highpass.Q.value = 0.7;

  const lowpass = audioContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = profile.lowpassHz;
  lowpass.Q.value = 0.85;

  const gainNode = audioContext.createGain();
  const naturalDuration = buffer.duration / Math.max(playbackRate, 0.01);
  const duration = Math.min(naturalDuration, maxDuration);
  const attack = Math.min(profile.attackSeconds, duration * 0.35);
  const safePeak = Math.max(peakGain * profile.gainScale, 0.0002);

  gainNode.gain.setValueAtTime(0.0001, time);
  gainNode.gain.exponentialRampToValueAtTime(safePeak, time + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gainNode);
  gainNode.connect(bus?.output ?? audioContext.destination);
  bus?.track(source);

  source.start(time);
  source.stop(time + duration + 0.03);
}

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
  bus?: AudioPlaybackBus | null,
): void {
  const safeDuration = clampMelodicDuration(duration);
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = wave;
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(peakGain, time);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + safeDuration);

  oscillator.connect(gainNode);
  gainNode.connect(bus?.output ?? audioContext.destination);
  bus?.track(oscillator);

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
  bus?: AudioPlaybackBus | null,
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
  gainNode.connect(bus?.output ?? audioContext.destination);
  bus?.track(source);

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
  bus?: AudioPlaybackBus | null,
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
  gainNode.connect(bus?.output ?? audioContext.destination);
  bus?.track(source);

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
  bus?: AudioPlaybackBus | null,
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
  gainNode.connect(bus?.output ?? audioContext.destination);
  bus?.track(source);

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
  bus?: AudioPlaybackBus | null,
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
    bus,
  );
}

function scheduleResolvedSample(
  audioContext: AudioContext,
  time: number,
  resolved: CompositorResolvedSample,
  level: MetronomeBeatLevel,
  gainScale: number,
  maxDuration?: number,
  bus?: AudioPlaybackBus | null,
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
    bus,
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
  bus?: AudioPlaybackBus | null,
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
      bus,
    );
    return;
  }

  schedulePitchedNoteSynth(audioContext, time, note, level, synthWave, duration, bus);
}

function schedulePianoNote(
  audioContext: AudioContext,
  time: number,
  note: CompositorSlotNote,
  level: MetronomeBeatLevel,
  durationSeconds: number,
  samples: CompositorSampleBank | null,
  bus?: AudioPlaybackBus | null,
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
    bus,
  );
}

function schedulePianoNotes(
  audioContext: AudioContext,
  time: number,
  notes: CompositorSlotNote[],
  level: MetronomeBeatLevel,
  durationSeconds: number,
  samples: CompositorSampleBank | null,
  bus?: AudioPlaybackBus | null,
): void {
  for (const note of notes) {
    schedulePianoNote(audioContext, time, note, level, durationSeconds, samples, bus);
  }
}

function scheduleVientoNote(
  audioContext: AudioContext,
  time: number,
  note: CompositorSlotNote,
  level: MetronomeBeatLevel,
  durationSeconds: number,
  samples: CompositorSampleBank | null,
  bus?: AudioPlaybackBus | null,
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
      bus,
    );
    return;
  }

  schedulePitchedNoteSynth(audioContext, time, note, level, "triangle", duration, bus);
}

function scheduleGuitarChordNotes(
  audioContext: AudioContext,
  time: number,
  notes: CompositorSlotNote[],
  level: MetronomeBeatLevel,
  durationSeconds: number,
  samples: CompositorSampleBank | null,
  mode: "rasguido" | "bloque",
  bus?: AudioPlaybackBus | null,
): void {
  const gain = levelToGain(level);

  if (gain === null) {
    return;
  }

  const duration = clampMelodicDuration(durationSeconds);
  /** Rasguido: abanico audible; bloque: todas juntas. */
  const strumDelays =
    mode === "bloque"
      ? notes.map(() => 0)
      : [0, 0.022, 0.044, 0.066, 0.088, 0.11];

  for (let index = 0; index < notes.length; index += 1) {
    const note = notes[index]!;
    const delay =
      strumDelays[index] ?? strumDelays[strumDelays.length - 1] ?? 0;
    const noteTime = time + delay;
    const resolved = resolveGuitarPitchedSample(note, samples, "dedo");

    if (resolved) {
      scheduleGuitarStringSample(
        audioContext,
        noteTime,
        resolved.buffer,
        gain,
        resolved.playbackRate,
        duration,
        mode,
        bus,
      );
      continue;
    }

    scheduleTone(
      audioContext,
      noteTime,
      targetToFrequency(note),
      gain * (mode === "bloque" ? 0.22 : 0.28),
      duration * 0.9,
      "triangle",
      bus,
    );
  }
}

function scheduleGuitarNote(
  audioContext: AudioContext,
  time: number,
  note: CompositorSlotNote,
  level: MetronomeBeatLevel,
  articulation: CompositorGuitarArticulation,
  durationSeconds: number,
  samples: CompositorSampleBank | null,
  bus?: AudioPlaybackBus | null,
): void {
  if (articulation === "silencio") {
    return;
  }

  const gain = levelToGain(level);

  if (gain === null) {
    return;
  }

  const duration = clampMelodicDuration(durationSeconds);

  if (articulation === "rasguido" || articulation === "bloque") {
    const resolved = resolveGuitarPitchedSample(note, samples, "dedo");

    if (resolved) {
      scheduleGuitarStringSample(
        audioContext,
        time,
        resolved.buffer,
        gain,
        resolved.playbackRate,
        duration,
        articulation,
        bus,
      );
      return;
    }
  }

  const voice: GuitarStringVoice = articulation === "dedo" ? "dedo" : "pua";
  const resolved = resolveGuitarPitchedSample(
    note,
    samples,
    articulation === "dedo" ? "dedo" : "pua",
  );

  if (resolved) {
    scheduleGuitarStringSample(
      audioContext,
      time,
      resolved.buffer,
      gain,
      resolved.playbackRate,
      duration,
      voice,
      bus,
    );
    return;
  }

  scheduleTone(
    audioContext,
    time,
    targetToFrequency(note),
    gain * (voice === "dedo" ? 0.38 : 0.55),
    Math.min(duration, voice === "dedo" ? 0.55 : 0.35),
    "triangle",
    bus,
  );
}

function scheduleDrumHitSynth(
  audioContext: AudioContext,
  time: number,
  sound: CompositorDrumSound,
  level: MetronomeBeatLevel,
  bus?: AudioPlaybackBus | null,
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
      gainNode.connect(bus?.output ?? audioContext.destination);
      bus?.track(oscillator);
      oscillator.start(time);
      oscillator.stop(time + 0.18);
      break;
    }
    case "snare":
      scheduleNoiseBurst(audioContext, time, 0.09, gain * 0.55, "bandpass", 1800, bus);
      scheduleTone(audioContext, time, 180, gain * 0.2, 0.05, "triangle", bus);
      break;
    case "hihat":
      scheduleNoiseBurst(audioContext, time, 0.04, gain * 0.35, "highpass", 6000, bus);
      break;
    case "hihatOpen":
      scheduleNoiseBurst(audioContext, time, 0.14, gain * 0.42, "highpass", 5200, bus);
      break;
    case "crash":
      scheduleNoiseBurst(audioContext, time, 0.55, gain * 0.48, "highpass", 4200, bus);
      scheduleTone(audioContext, time, 280, gain * 0.12, 0.35, "sine", bus);
      break;
    case "ride":
      scheduleNoiseBurst(audioContext, time, 0.22, gain * 0.3, "bandpass", 5200, bus);
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
  bus?: AudioPlaybackBus | null,
): void {
  if (sound === "silencio") {
    return;
  }

  const gain = levelToGain(level);

  if (gain === null) {
    return;
  }

  if (!samples) {
    scheduleDrumHitSynth(audioContext, time, sound, level, bus);
    return;
  }

  const buffer = samples?.drums?.[sound] ?? null;

  if (!buffer) {
    scheduleDrumHitSynth(audioContext, time, sound, level, bus);
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
  scheduleSample(audioContext, time, buffer, gain * gainScale, 1, undefined, bus);
}

export function scheduleCompositorSound(
  audioContext: AudioContext,
  time: number,
  sound: CompositorScheduledSound,
  samples: CompositorSampleBank | null = null,
  bus?: AudioPlaybackBus | null,
): void {
  switch (sound.instrumentId) {
    case "piano":
      schedulePianoNotes(
        audioContext,
        time,
        sound.notes,
        sound.level,
        sound.durationSeconds,
        samples,
        bus,
      );
      break;
    case "guitarra":
      if (
        isGuitarChordArticulation(sound.guitarArticulation) &&
        sound.notes.length > 1
      ) {
        scheduleGuitarChordNotes(
          audioContext,
          time,
          sound.notes,
          sound.level,
          sound.durationSeconds,
          samples,
          sound.guitarArticulation === "bloque" ? "bloque" : "rasguido",
          bus,
        );
      } else {
        scheduleGuitarNote(
          audioContext,
          time,
          sound.notes[0] ?? COMPOSITOR_GUITAR_PUA_ROOT,
          sound.level,
          sound.guitarArticulation,
          sound.durationSeconds,
          samples,
          bus,
        );
      }
      break;
    case "bateria":
      scheduleDrumHit(
        audioContext,
        time,
        sound.drumSound,
        sound.level,
        samples,
        bus,
      );
      break;
    case "viento":
      scheduleVientoNote(
        audioContext,
        time,
        sound.notes[0] ?? { note: "C", octave: 4 },
        sound.level,
        sound.durationSeconds,
        samples,
        bus,
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
  playTrackCycles(
    piece: CompositorPiece,
    instrumentId: CompositorInstrumentId,
    cycleCount: number,
    onProgress: (cycleProgress: number) => void,
    onComplete?: () => void,
  ): void;
  playOnce(
    piece: CompositorPiece,
    onProgress: (cycleProgress: number) => void,
    onComplete?: () => void,
  ): void;
  stop(): void;
};

export function createCompositorEngine(
  audioContext: AudioContext,
  samples: CompositorSampleBank | null = null,
): CompositorEngine {
  const playbackBus = createPlaybackBus(audioContext);
  let running = false;
  let piece: CompositorPiece | null = null;
  let cycleDurationSeconds = 1;
  let loopStartAudioTime = 0;
  let scheduledUntilAudioTime = 0;
  let schedulerTimer: ReturnType<typeof setInterval> | null = null;
  let onProgress: ((cycleProgress: number) => void) | null = null;
  let progressAnimationFrame: number | null = null;
  let previewOnComplete: (() => void) | null = null;

  function stopProgressLoop(): void {
    if (progressAnimationFrame !== null) {
      cancelAnimationFrame(progressAnimationFrame);
      progressAnimationFrame = null;
    }
  }

  function startProgressLoop(
    looping: boolean,
    onComplete?: () => void,
  ): void {
    stopProgressLoop();
    previewOnComplete = onComplete ?? null;

    const tick = () => {
      if (!running || !onProgress || cycleDurationSeconds <= 0) {
        progressAnimationFrame = null;
        return;
      }

      const elapsed = audioContext.currentTime - loopStartAudioTime;

      if (looping) {
        const wrapped =
          ((elapsed % cycleDurationSeconds) + cycleDurationSeconds) %
          cycleDurationSeconds;
        onProgress(wrapped / cycleDurationSeconds);
        progressAnimationFrame = requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min(1, Math.max(0, elapsed / cycleDurationSeconds));
      onProgress(progress);

      if (elapsed >= cycleDurationSeconds) {
        progressAnimationFrame = null;
        const complete = previewOnComplete;
        previewOnComplete = null;
        stopInternal();
        complete?.();
        return;
      }

      progressAnimationFrame = requestAnimationFrame(tick);
    };

    onProgress?.(0);
    progressAnimationFrame = requestAnimationFrame(tick);
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

        scheduleCompositorSound(audioContext, eventAudioTime, sound, samples, playbackBus);
      }
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

  function stopInternal(): void {
    running = false;
    onProgress = null;
    piece = null;
    scheduledUntilAudioTime = 0;
    previewOnComplete = null;
    playbackBus.cut();

    if (schedulerTimer !== null) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }

    stopProgressLoop();
  }

  return {
    start(nextPiece: CompositorPiece, nextOnProgress) {
      stopInternal();
      playbackBus.reset();

      piece = nextPiece;
      cycleDurationSeconds = getCompositorCycleDurationSeconds(nextPiece);
      onProgress = nextOnProgress;
      running = true;
      loopStartAudioTime = audioContext.currentTime;
      scheduledUntilAudioTime = 0;

      scheduler();
      schedulerTimer = setInterval(scheduler, SCHEDULE_INTERVAL_MS);
      startProgressLoop(true);
    },
    playSingleCycle(
      nextPiece,
      instrumentId,
      nextOnProgress,
      onComplete,
    ) {
      stopInternal();
      playbackBus.reset();

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
          playbackBus,
        );
      }

      startProgressLoop(false, onComplete);
    },
    playTrackCycles(
      nextPiece,
      instrumentId,
      cycleCount,
      nextOnProgress,
      onComplete,
    ) {
      stopInternal();
      playbackBus.reset();

      const safeCycleCount = Math.max(1, Math.round(cycleCount));
      const singleCycleDurationSeconds =
        getCompositorCycleDurationSeconds(nextPiece);

      piece = nextPiece;
      cycleDurationSeconds = singleCycleDurationSeconds * safeCycleCount;
      onProgress = nextOnProgress;
      running = true;
      loopStartAudioTime = audioContext.currentTime;
      scheduledUntilAudioTime =
        loopStartAudioTime + cycleDurationSeconds;

      const sounds = buildCompositorScheduledSounds(nextPiece, {
        onlyInstrumentId: instrumentId,
      });

      for (let cycleIndex = 0; cycleIndex < safeCycleCount; cycleIndex += 1) {
        const cycleOffsetSeconds = cycleIndex * singleCycleDurationSeconds;

        for (const sound of sounds) {
          scheduleCompositorSound(
            audioContext,
            loopStartAudioTime + cycleOffsetSeconds + sound.cycleOffsetSeconds,
            sound,
            samples,
            playbackBus,
          );
        }
      }

      startProgressLoop(false, onComplete);
    },
    playOnce(nextPiece, nextOnProgress, onComplete) {
      stopInternal();
      playbackBus.reset();

      piece = nextPiece;
      cycleDurationSeconds = getCompositorCycleDurationSeconds(nextPiece);
      onProgress = nextOnProgress;
      running = true;
      loopStartAudioTime = audioContext.currentTime;
      scheduledUntilAudioTime = loopStartAudioTime + cycleDurationSeconds;

      const sounds = buildCompositorScheduledSounds(nextPiece);

      for (const sound of sounds) {
        scheduleCompositorSound(
          audioContext,
          loopStartAudioTime + sound.cycleOffsetSeconds,
          sound,
          samples,
          playbackBus,
        );
      }

      startProgressLoop(false, onComplete);
    },
    stop() {
      stopInternal();
    },
  };
}
