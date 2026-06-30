export const BPM_MIN = 40;
export const BPM_MAX = 240;
export const BPM_DEFAULT = 80;

export type MetronomeHit = {
  timestamp: number;
  beatIndex: number;
  expectedTime: number;
  deltaMsClamped: number;
};

export type MetronomeBeatMarker = {
  timestamp: number;
  beatIndex: number;
};

export type HitAccuracy = "en-tiempo" | "cerca" | "lejos";

export const TIMELINE_MEASURE_CYCLES = 5;

export function getTimelineWindowMs(
  bpm: number,
  beatsPerMeasure: number,
): number {
  return (60000 / bpm) * beatsPerMeasure * TIMELINE_MEASURE_CYCLES;
}

export function getHitAccuracy(deltaMs: number): HitAccuracy {
  const abs = Math.abs(deltaMs);

  if (abs <= 50) {
    return "en-tiempo";
  }

  if (abs <= 150) {
    return "cerca";
  }

  return "lejos";
}

export function getHitAccuracyColor(accuracy: HitAccuracy): string {
  switch (accuracy) {
    case "en-tiempo":
      return "var(--tuner-in-tune)";
    case "cerca":
      return "var(--tuner-cerca)";
    default:
      return "var(--tuner-flat-sharp)";
  }
}

export const HIT_LANE_MAX_MS = 200;

export function getHitFeedbackLabel(deltaMs: number): string {
  const accuracy = getHitAccuracy(deltaMs);
  const ms = Math.round(deltaMs);

  if (accuracy === "en-tiempo") {
    if (ms === 0) {
      return "¡En tiempo!";
    }

    return `¡En tiempo! (${ms > 0 ? "+" : ""}${ms} ms)`;
  }

  if (accuracy === "cerca") {
    return ms > 0
      ? `Cerca · ${ms} ms tarde`
      : `Cerca · ${Math.abs(ms)} ms adelantado`;
  }

  return ms > 0 ? `${ms} ms tarde` : `${Math.abs(ms)} ms adelantado`;
}

export function getHitLanePositionPercent(deltaMs: number): number {
  const clamped = Math.max(-HIT_LANE_MAX_MS, Math.min(HIT_LANE_MAX_MS, deltaMs));
  return 50 + (clamped / HIT_LANE_MAX_MS) * 50;
}

export function computeOnTimeStreak(hits: MetronomeHit[]): number {
  let streak = 0;

  for (let index = hits.length - 1; index >= 0; index -= 1) {
    if (getHitAccuracy(hits[index].deltaMsClamped) !== "en-tiempo") {
      break;
    }

    streak += 1;
  }

  return streak;
}

/** Latencia típica cuando el navegador no reporta outputLatency (móvil). */
export const DEFAULT_OUTPUT_LATENCY_MS = 120;

/** Margen extra por el intervalo de análisis (~1 frame). */
export const ANALYSIS_FRAME_LATENCY_MS = 8;

export type MetronomeLatencyCompensation = {
  inputMs: number;
  outputMs: number;
  sessionOffsetMs: number;
};

export function getMetronomeLatencyCompensation(
  audioContext: AudioContext | null,
  analyserFftSize: number,
  sessionOffsetMs = 0,
): MetronomeLatencyCompensation {
  if (!audioContext) {
    return {
      inputMs: ANALYSIS_FRAME_LATENCY_MS,
      outputMs: DEFAULT_OUTPUT_LATENCY_MS,
      sessionOffsetMs,
    };
  }

  const reportedOutputMs = Math.round(
    ((audioContext.outputLatency ?? 0) + (audioContext.baseLatency ?? 0)) *
      1000,
  );

  return {
    inputMs:
      Math.round((analyserFftSize / audioContext.sampleRate) * 500) +
      ANALYSIS_FRAME_LATENCY_MS,
    outputMs: Math.max(reportedOutputMs, DEFAULT_OUTPUT_LATENCY_MS),
    sessionOffsetMs,
  };
}

/**
 * Estima el ataque del golpe más reciente dentro del buffer del analyser.
 * Los samples más nuevos están al final del buffer.
 */
export function estimateAttackOnsetMs(
  buffer: Float32Array,
  sampleRate: number,
  analysisTimeMs: number,
): number {
  const length = buffer.length;
  const scanStart = Math.floor(length * 0.35);
  let peak = 0;
  let peakIndex = length - 1;

  for (let index = scanStart; index < length; index += 1) {
    const sample = Math.abs(buffer[index]);
    if (sample > peak) {
      peak = sample;
      peakIndex = index;
    }
  }

  if (peak <= 0) {
    return analysisTimeMs;
  }

  const onsetThreshold = peak * 0.18;
  let onsetIndex = peakIndex;

  for (let index = peakIndex; index >= scanStart; index -= 1) {
    if (Math.abs(buffer[index]) >= onsetThreshold) {
      onsetIndex = index;
    } else {
      break;
    }
  }

  const samplesAfterOnset = length - 1 - onsetIndex;
  return analysisTimeMs - (samplesAfterOnset / sampleRate) * 1000;
}

export function computeHitDeltaMs(
  onsetMs: number,
  scheduledBeatMs: number,
  compensation: MetronomeLatencyCompensation,
): number {
  const perceivedHitMs =
    onsetMs - ANALYSIS_FRAME_LATENCY_MS - compensation.sessionOffsetMs;
  const perceivedBeatMs = scheduledBeatMs + compensation.outputMs;
  return perceivedHitMs - perceivedBeatMs;
}

export function onsetToPerceivedHitMs(
  onsetMs: number,
  sessionOffsetMs = 0,
): number {
  return onsetMs - ANALYSIS_FRAME_LATENCY_MS - sessionOffsetMs;
}

/** Aprende el desfase persistente del dispositivo a partir de golpes recientes. */
export function updateSessionLatencyOffset(
  currentOffsetMs: number,
  latestRawDeltaMs: number,
): number {
  if (Math.abs(latestRawDeltaMs) > 280) {
    return currentOffsetMs;
  }

  return currentOffsetMs * 0.55 + latestRawDeltaMs * 0.45;
}

const LOOK_AHEAD_SECONDS = 0.1;
const SCHEDULE_INTERVAL_MS = 25;

function scheduleClick(
  audioContext: AudioContext,
  time: number,
  beatIndex: number,
): void {
  const isDownbeat = beatIndex === 0;
  const frequency = isDownbeat ? 1500 : 700;
  const peakGain = isDownbeat ? 0.72 : 0.1;
  const duration = isDownbeat ? 0.045 : 0.012;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(peakGain, time);
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(time);
  oscillator.stop(time + duration);
}

export type MetronomeEngine = {
  start(
    bpm: number,
    beatsPerMeasure: number,
    onBeat: (beatIndex: number, expectedTimeMs: number) => void,
  ): void;
  stop(): void;
};

export function createMetronomeEngine(
  audioContext: AudioContext,
): MetronomeEngine {
  let running = false;
  let bpm = BPM_DEFAULT;
  let beatsPerMeasure = 4;
  let nextBeatTime = 0;
  let currentBeatIndex = 0;
  let schedulerTimer: ReturnType<typeof setInterval> | null = null;
  let onBeat: ((beatIndex: number, expectedTimeMs: number) => void) | null =
    null;
  const beatTimeouts = new Set<ReturnType<typeof setTimeout>>();

  function audioTimeToPerformanceMs(audioTime: number): number {
    return (
      performance.now() +
      (audioTime - audioContext.currentTime) * 1000
    );
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
    if (!running) {
      return;
    }

    const secondsPerBeat = 60 / bpm;

    while (nextBeatTime < audioContext.currentTime + LOOK_AHEAD_SECONDS) {
      const beatIndex = currentBeatIndex;
      const beatTime = nextBeatTime;

      scheduleClick(audioContext, beatTime, beatIndex);
      scheduleBeatCallback(beatIndex, beatTime);

      nextBeatTime += secondsPerBeat;
      currentBeatIndex = (currentBeatIndex + 1) % beatsPerMeasure;
    }
  }

  return {
    start(
      nextBpm: number,
      nextBeatsPerMeasure: number,
      nextOnBeat: (beatIndex: number, expectedTimeMs: number) => void,
    ) {
      if (running) {
        clearBeatTimeouts();
      }

      bpm = nextBpm;
      beatsPerMeasure = nextBeatsPerMeasure;
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

      if (schedulerTimer !== null) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
      }

      clearBeatTimeouts();
    },
  };
}
