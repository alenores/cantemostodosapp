import type {
  CompositorDrumSound,
  CompositorGuitarArticulation,
  CompositorPiece,
  CompositorSlotNote,
} from "@/lib/compositor";
import {
  COMPOSITOR_GUITAR_ROOT,
  COMPOSITOR_PIANO_ROOT,
  getCompositorPlaybackRate,
  type CompositorSampleBank,
} from "@/lib/compositor-samples";
import {
  getActiveBeatDurationSlice,
  getActivePatternLength,
  getSecondsPerBeat,
  METRONOME_BEAT_DURATION_DEFAULT,
  type MetronomeBeatLevel,
} from "@/lib/metronomo";
import { targetToFrequency } from "@/lib/voz";

const LOOK_AHEAD_SECONDS = 0.1;
const SCHEDULE_INTERVAL_MS = 25;

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

function scheduleTone(
  audioContext: AudioContext,
  time: number,
  frequency: number,
  peakGain: number,
  duration: number,
  wave: OscillatorType,
): void {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = wave;
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(peakGain, time);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(time);
  oscillator.stop(time + duration + 0.01);
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
  const duration = Math.min(
    buffer.duration / Math.max(playbackRate, 0.01),
    maxDuration ?? buffer.duration / Math.max(playbackRate, 0.01),
  );

  gainNode.gain.setValueAtTime(peakGain, time);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  source.start(time);
  source.stop(time + duration + 0.02);
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

function schedulePitchedSample(
  audioContext: AudioContext,
  time: number,
  buffer: AudioBuffer,
  note: CompositorSlotNote,
  rootNote: CompositorSlotNote,
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
    buffer,
    gain * gainScale,
    getCompositorPlaybackRate(note, rootNote),
    maxDuration,
  );
}

function schedulePianoNote(
  audioContext: AudioContext,
  time: number,
  note: CompositorSlotNote,
  level: MetronomeBeatLevel,
  samples: CompositorSampleBank | null,
): void {
  if (samples) {
    schedulePitchedSample(
      audioContext,
      time,
      samples.piano,
      note,
      COMPOSITOR_PIANO_ROOT,
      level,
      0.72,
      2.4,
    );
    return;
  }

  schedulePitchedNoteSynth(audioContext, time, note, level, "sine", 0.32);
}

function scheduleGuitarNote(
  audioContext: AudioContext,
  time: number,
  note: CompositorSlotNote,
  level: MetronomeBeatLevel,
  articulation: CompositorGuitarArticulation,
  samples: CompositorSampleBank | null,
): void {
  if (articulation === "silencio") {
    return;
  }

  const gain = levelToGain(level);

  if (gain === null) {
    return;
  }

  if (samples) {
    if (articulation === "rasguido") {
      schedulePitchedSample(
        audioContext,
        time,
        samples.guitarStrum,
        note,
        COMPOSITOR_GUITAR_ROOT,
        level,
        0.58,
        0.85,
      );
      return;
    }

    schedulePitchedSample(
      audioContext,
      time,
      samples.guitarNote,
      note,
      COMPOSITOR_GUITAR_ROOT,
      level,
      0.62,
      1.1,
    );
    return;
  }

  if (articulation === "rasguido") {
    scheduleTone(
      audioContext,
      time,
      targetToFrequency(note),
      gain * 0.42,
      0.28,
      "triangle",
    );
    scheduleTone(
      audioContext,
      time,
      targetToFrequency(note) * 1.007,
      gain * 0.18,
      0.22,
      "sine",
    );
    return;
  }

  scheduleTone(
    audioContext,
    time,
    targetToFrequency(note),
    gain * 0.5,
    0.1,
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

  const buffer =
    sound === "kick"
      ? samples.kick
      : sound === "snare"
        ? samples.snare
        : sound === "hihat"
          ? samples.hihat
          : null;

  if (!buffer) {
    return;
  }

  const gainScale = sound === "kick" ? 0.95 : sound === "snare" ? 0.78 : 0.62;
  scheduleSample(audioContext, time, buffer, gain * gainScale);
}

export function scheduleCompositorBeat(
  audioContext: AudioContext,
  time: number,
  piece: CompositorPiece,
  beatIndex: number,
  samples: CompositorSampleBank | null = null,
): void {
  for (const track of piece.tracks) {
    if (!track.enabled) {
      continue;
    }

    const level = track.levels[beatIndex] ?? "silencio";

    switch (track.instrumentId) {
      case "piano":
        schedulePianoNote(
          audioContext,
          time,
          track.notes[beatIndex] ?? { note: "C", octave: 4 },
          level,
          samples,
        );
        break;
      case "guitarra":
        scheduleGuitarNote(
          audioContext,
          time,
          track.notes[beatIndex] ?? { note: "C", octave: 4 },
          level,
          track.guitarArticulations[beatIndex] ?? "pua",
          samples,
        );
        break;
      case "bateria":
        scheduleDrumHit(
          audioContext,
          time,
          track.drumSounds[beatIndex] ?? "silencio",
          level,
          samples,
        );
        break;
      default:
        break;
    }
  }
}

export type CompositorEngine = {
  start(
    piece: CompositorPiece,
    onBeat: (beatIndex: number, expectedTimeMs: number) => void,
  ): void;
  stop(): void;
};

export function createCompositorEngine(
  audioContext: AudioContext,
  samples: CompositorSampleBank | null = null,
): CompositorEngine {
  let running = false;
  let piece: CompositorPiece | null = null;
  let bpm = 80;
  let patternLength = 4;
  let beatDurations = getActiveBeatDurationSlice(
    [...Array(10).fill("negra")],
    patternLength,
  );
  let nextBeatTime = 0;
  let currentBeatIndex = 0;
  let schedulerTimer: ReturnType<typeof setInterval> | null = null;
  let onBeat: ((beatIndex: number, expectedTimeMs: number) => void) | null =
    null;
  const beatTimeouts = new Set<ReturnType<typeof setTimeout>>();

  function audioTimeToPerformanceMs(audioTime: number): number {
    return performance.now() + (audioTime - audioContext.currentTime) * 1000;
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
    if (!running || !piece) {
      return;
    }

    while (nextBeatTime < audioContext.currentTime + LOOK_AHEAD_SECONDS) {
      const beatIndex = currentBeatIndex;
      const beatTime = nextBeatTime;
      const secondsPerBeat = getSecondsPerBeat(
        bpm,
        beatDurations[beatIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
      );

      scheduleCompositorBeat(
        audioContext,
        beatTime,
        piece,
        beatIndex,
        samples,
      );
      scheduleBeatCallback(beatIndex, beatTime);

      nextBeatTime += secondsPerBeat;
      currentBeatIndex = (currentBeatIndex + 1) % patternLength;
    }
  }

  return {
    start(nextPiece: CompositorPiece, nextOnBeat) {
      if (running) {
        clearBeatTimeouts();
      }

      piece = nextPiece;
      bpm = nextPiece.bpm;
      patternLength = getActivePatternLength(nextPiece.patternLength);
      beatDurations = getActiveBeatDurationSlice(
        nextPiece.beatDurations,
        patternLength,
      );
      onBeat = nextOnBeat;
      running = true;
      currentBeatIndex = 0;
      nextBeatTime = audioContext.currentTime;

      if (schedulerTimer !== null) {
        clearInterval(schedulerTimer);
      }

      scheduler();
      schedulerTimer = setInterval(scheduler, SCHEDULE_INTERVAL_MS);
    },
    stop() {
      running = false;
      onBeat = null;
      piece = null;

      if (schedulerTimer !== null) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
      }

      clearBeatTimeouts();
    },
  };
}
