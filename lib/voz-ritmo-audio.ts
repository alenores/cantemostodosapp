import {
  createPlaybackBus,
  type AudioPlaybackBus,
} from "@/lib/audio-playback-bus";
import {
  BPM_DEFAULT,
  getActiveBeatDurationSlice,
  getActivePatternLength,
  getSecondsPerBeat,
  METRONOME_BEAT_DURATION_DEFAULT,
  METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
  METRONOME_PATTERN_DEFAULT,
  METRONOME_PATTERN_LENGTH_DEFAULT,
  normalizeBeatDurationPattern,
  normalizeMetronomePattern,
  type MetronomeBeatDurationPattern,
  type MetronomeBeatLevel,
  type MetronomeBeatPattern,
} from "@/lib/metronomo";
import { targetToFrequency, type VozTarget } from "@/lib/voz";
import { scheduleVozPracticeNote } from "@/lib/voz-practice-audio";

const LOOK_AHEAD_SECONDS = 0.1;
const SCHEDULE_INTERVAL_MS = 25;
const MELODIA_START_OFFSET_SECONDS = 0.05;
const VOZ_RITMO_PRACTICE_FREQUENCY = 440;
const IMMEDIATE_BEAT_CALLBACK_MS = 4;

export type AudioClockAnchor = {
  performanceMs: number;
  audioContextTime: number;
};

let playbackClockAnchor: AudioClockAnchor | null = null;
let playbackAudioContext: AudioContext | null = null;

export function setPlaybackClock(
  audioContext: AudioContext,
  audioAnchorTime = audioContext.currentTime,
): void {
  playbackAudioContext = audioContext;
  playbackClockAnchor = {
    performanceMs: performance.now(),
    audioContextTime: audioAnchorTime,
  };
}

export function clearPlaybackClock(): void {
  playbackClockAnchor = null;
  playbackAudioContext = null;
}

export function getPlaybackNow(): number {
  if (playbackClockAnchor && playbackAudioContext) {
    return audioTimeToTimelineMs(
      playbackAudioContext.currentTime,
      playbackClockAnchor,
    );
  }

  return performance.now();
}

export function getPlaybackStartMs(): number | null {
  return playbackClockAnchor?.performanceMs ?? null;
}

/** Mapea un instante del reloj de audio al tiempo del gráfico (ancla fija). */
export function audioTimeToTimelineMs(
  audioTime: number,
  anchor: AudioClockAnchor = playbackClockAnchor!,
): number {
  return (
    anchor.performanceMs + (audioTime - anchor.audioContextTime) * 1000
  );
}

const LEVEL_PEAK_GAIN: Record<Exclude<MetronomeBeatLevel, "silencio">, number> =
  {
    suave: 0.14,
    medio: 0.28,
    fuerte: 0.38,
  };

/** Ganancias base para notas (más altas que el click sostenido del ritmo). */
const NOTE_LEVEL_PEAK_GAIN: Record<
  Exclude<MetronomeBeatLevel, "silencio">,
  number
> = {
  suave: 0.42,
  medio: 0.58,
  fuerte: 0.78,
};

function scheduleSustainedBeat(
  audioContext: AudioContext,
  time: number,
  durationSeconds: number,
  level: MetronomeBeatLevel,
  frequency = VOZ_RITMO_PRACTICE_FREQUENCY,
  bus?: AudioPlaybackBus | null,
): void {
  if (level === "silencio" || durationSeconds <= 0.01) {
    return;
  }

  if (!Number.isFinite(frequency) || frequency <= 0) {
    return;
  }

  const peakGain = LEVEL_PEAK_GAIN[level];
  const attack = 0.02;
  const release = Math.min(0.05, durationSeconds * 0.15);
  const sustainEnd = time + durationSeconds - release;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(0.001, time);
  gainNode.gain.exponentialRampToValueAtTime(peakGain, time + attack);
  gainNode.gain.setValueAtTime(peakGain, Math.max(time + attack, sustainEnd));
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + durationSeconds);

  oscillator.connect(gainNode);
  gainNode.connect(bus?.output ?? audioContext.destination);
  bus?.track(oscillator);

  oscillator.start(time);
  oscillator.stop(time + durationSeconds + 0.02);
}

export type VozRitmoPracticeStartOptions = {
  /** Combo: el volumen lo marca solo suave/medio/fuerte, no la altura de la nota. */
  intensidadOnlyLoudness?: boolean;
};

export type VozRitmoPracticeEngine = {
  start(
    bpm: number,
    pattern: MetronomeBeatPattern,
    patternLength: number,
    beatDurations: MetronomeBeatDurationPattern,
    onBeat: (beatIndex: number, expectedTimeMs: number) => void,
    notes?: VozTarget[],
    options?: VozRitmoPracticeStartOptions,
  ): void;
  stop(): void;
};

export function createVozRitmoPracticeEngine(
  audioContext: AudioContext,
): VozRitmoPracticeEngine {
  const playbackBus = createPlaybackBus(audioContext);
  let running = false;
  let bpm = BPM_DEFAULT;
  let pattern: MetronomeBeatPattern = [...METRONOME_PATTERN_DEFAULT];
  let patternLength = METRONOME_PATTERN_LENGTH_DEFAULT;
  let beatDurations: MetronomeBeatDurationPattern = [
    ...METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
  ];
  let nextBeatTime = 0;
  let currentBeatIndex = 0;
  let schedulerTimer: ReturnType<typeof setInterval> | null = null;
  let onBeat: ((beatIndex: number, expectedTimeMs: number) => void) | null =
    null;
  let playbackNotes: VozTarget[] | null = null;
  let intensidadOnlyLoudness = false;
  const beatTimeouts = new Set<ReturnType<typeof setTimeout>>();

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

    const fireBeatCallback = () => {
      if (!running || !onBeat) {
        return;
      }

      if (!playbackClockAnchor) {
        return;
      }

      onBeat(beatIndex, audioTimeToTimelineMs(beatAudioTime, playbackClockAnchor));
    };

    if (delayMs <= IMMEDIATE_BEAT_CALLBACK_MS) {
      fireBeatCallback();
      return;
    }

    const timeoutId = setTimeout(() => {
      beatTimeouts.delete(timeoutId);
      fireBeatCallback();
    }, delayMs);

    beatTimeouts.add(timeoutId);
  }

  function scheduler(): void {
    if (!running) {
      return;
    }

    const activeDurations = getActiveBeatDurationSlice(
      beatDurations,
      patternLength,
    );

    while (nextBeatTime < audioContext.currentTime + LOOK_AHEAD_SECONDS) {
      const beatIndex = currentBeatIndex;
      const beatTime = nextBeatTime;
      const level = pattern[beatIndex] ?? "silencio";
      const secondsPerBeat = getSecondsPerBeat(
        bpm,
        activeDurations[beatIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
      );
      const note =
        playbackNotes !== null
          ? playbackNotes[beatIndex % playbackNotes.length]
          : undefined;
      const frequency =
        note !== undefined ? targetToFrequency(note) : VOZ_RITMO_PRACTICE_FREQUENCY;

      if (level !== "silencio") {
        if (playbackNotes) {
          scheduleVozPracticeNote(
            audioContext,
            frequency,
            beatTime,
            secondsPerBeat,
            NOTE_LEVEL_PEAK_GAIN[level],
            { pitchCompensation: !intensidadOnlyLoudness },
            playbackBus,
          );
        } else {
          scheduleSustainedBeat(
            audioContext,
            beatTime,
            secondsPerBeat,
            level,
            frequency,
            playbackBus,
          );
        }
      }
      scheduleBeatCallback(beatIndex, beatTime);

      nextBeatTime += secondsPerBeat;
      currentBeatIndex = (currentBeatIndex + 1) % patternLength;
    }
  }

  return {
    start(
      nextBpm: number,
      nextPattern: MetronomeBeatPattern,
      nextPatternLength: number,
      nextBeatDurations: MetronomeBeatDurationPattern,
      nextOnBeat: (beatIndex: number, expectedTimeMs: number) => void,
      nextNotes?: VozTarget[],
      nextOptions?: VozRitmoPracticeStartOptions,
    ) {
      if (running) {
        clearBeatTimeouts();
      }

      bpm = nextBpm;
      pattern = normalizeMetronomePattern(nextPattern);
      patternLength = getActivePatternLength(nextPatternLength);
      beatDurations = normalizeBeatDurationPattern(nextBeatDurations);
      onBeat = nextOnBeat;
      playbackNotes =
        nextNotes !== undefined && nextNotes.length > 0 ? nextNotes : null;
      intensidadOnlyLoudness = nextOptions?.intensidadOnlyLoudness === true;
      running = true;
      currentBeatIndex = 0;
      const beatZeroTime = audioContext.currentTime;
      nextBeatTime = beatZeroTime;
      setPlaybackClock(audioContext, beatZeroTime);
      playbackBus.reset();

      if (schedulerTimer !== null) {
        clearInterval(schedulerTimer);
      }

      scheduler();
      schedulerTimer = setInterval(scheduler, SCHEDULE_INTERVAL_MS);
    },
    stop() {
      running = false;
      onBeat = null;
      playbackBus.cut();

      if (schedulerTimer !== null) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
      }

      clearBeatTimeouts();
    },
  };
}


export type VozMelodiaPracticeEngine = {
  start(
    bpm: number,
    notes: VozTarget[],
    patternLength: number,
    beatDurations: MetronomeBeatDurationPattern,
    onBeat: (beatIndex: number, expectedTimeMs: number) => void,
  ): void;
  stop(): void;
};

export function createVozMelodiaPracticeEngine(
  audioContext: AudioContext,
): VozMelodiaPracticeEngine {
  const playbackBus = createPlaybackBus(audioContext);
  let running = false;
  let bpm = BPM_DEFAULT;
  let notes: VozTarget[] = [];
  let patternLength = METRONOME_PATTERN_LENGTH_DEFAULT;
  let beatDurations: MetronomeBeatDurationPattern = [
    ...METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
  ];
  let nextBeatTime = 0;
  let currentBeatIndex = 0;
  let schedulerTimer: ReturnType<typeof setInterval> | null = null;
  let onBeat: ((beatIndex: number, expectedTimeMs: number) => void) | null =
    null;
  const beatTimeouts = new Set<ReturnType<typeof setTimeout>>();

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

    const fireBeatCallback = () => {
      if (!running || !onBeat) {
        return;
      }

      if (!playbackClockAnchor) {
        return;
      }

      onBeat(beatIndex, audioTimeToTimelineMs(beatAudioTime, playbackClockAnchor));
    };

    if (delayMs <= IMMEDIATE_BEAT_CALLBACK_MS) {
      fireBeatCallback();
      return;
    }

    const timeoutId = setTimeout(() => {
      beatTimeouts.delete(timeoutId);
      fireBeatCallback();
    }, delayMs);

    beatTimeouts.add(timeoutId);
  }

  function scheduler(): void {
    if (!running) {
      return;
    }

    const activeDurations = getActiveBeatDurationSlice(
      beatDurations,
      patternLength,
    );

    while (nextBeatTime < audioContext.currentTime + LOOK_AHEAD_SECONDS) {
      const beatIndex = currentBeatIndex;
      const beatTime = nextBeatTime;
      const secondsPerBeat = getSecondsPerBeat(
        bpm,
        activeDurations[beatIndex] ?? METRONOME_BEAT_DURATION_DEFAULT,
      );
      if (notes.length > 0) {
        const note = notes[beatIndex % notes.length]!;
        scheduleVozPracticeNote(
          audioContext,
          targetToFrequency(note),
          beatTime,
          secondsPerBeat,
          undefined,
          {},
          playbackBus,
        );
      }

      scheduleBeatCallback(beatIndex, beatTime);
      nextBeatTime += secondsPerBeat;
      currentBeatIndex = (currentBeatIndex + 1) % patternLength;
    }
  }

  return {
    start(
      nextBpm: number,
      nextNotes: VozTarget[],
      nextPatternLength: number,
      nextBeatDurations: MetronomeBeatDurationPattern,
      nextOnBeat: (beatIndex: number, expectedTimeMs: number) => void,
    ) {
      if (running) {
        clearBeatTimeouts();
      }

      bpm = nextBpm;
      notes = nextNotes;
      patternLength = getActivePatternLength(nextPatternLength);
      beatDurations = normalizeBeatDurationPattern(nextBeatDurations);
      onBeat = nextOnBeat;
      running = true;
      currentBeatIndex = 0;
      const beatZeroTime =
        audioContext.currentTime + MELODIA_START_OFFSET_SECONDS;
      nextBeatTime = beatZeroTime;
      setPlaybackClock(audioContext, beatZeroTime);
      playbackBus.reset();

      if (schedulerTimer !== null) {
        clearInterval(schedulerTimer);
      }

      scheduler();
      schedulerTimer = setInterval(scheduler, SCHEDULE_INTERVAL_MS);
    },
    stop() {
      running = false;
      onBeat = null;
      playbackBus.cut();

      if (schedulerTimer !== null) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
      }

      clearBeatTimeouts();
    },
  };
}
