import { BPM_DEFAULT, BPM_MAX, BPM_MIN } from "@/lib/metronomo";
import type { VozAccuracy } from "@/lib/voz";

export { BPM_DEFAULT, BPM_MAX, BPM_MIN };

export type VozRitmoPhase = "cantar" | "silencio";

export type VozRitmoBeatMarker = {
  timestamp: number;
  beatIndex: number;
  phase: VozRitmoPhase;
  isPhaseStart: boolean;
};

export const VOZ_RITMO_SING_BEATS_DEFAULT = 1;
export const VOZ_RITMO_REST_BEATS_DEFAULT = 1;
export const VOZ_RITMO_BEATS_MIN = 1;
export const VOZ_RITMO_BEATS_MAX = 4;
export const VOZ_RITMO_TIMELINE_CYCLES = 4;
/** Fracción del ancho a la izquierda de «ahora» (resto = futuro visible). */
export const VOZ_RITMO_TIMELINE_PAST_RATIO = 0.42;

export type VozRitmoVoiceCompliance = "correcto" | "cerca" | "incorrecto";

export type VozRitmoVoiceSample = {
  timestamp: number;
  hasVoice: boolean;
  expectedPhase: VozRitmoPhase;
  compliance: VozRitmoVoiceCompliance;
};

const LOOK_AHEAD_SECONDS = 0.1;
const SCHEDULE_INTERVAL_MS = 25;

export function clampRitmoBpm(value: number): number {
  return Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(value)));
}

export function clampPatternBeats(value: number): number {
  return Math.max(
    VOZ_RITMO_BEATS_MIN,
    Math.min(VOZ_RITMO_BEATS_MAX, Math.round(value)),
  );
}

export function getCycleBeats(singBeats: number, restBeats: number): number {
  return singBeats + restBeats;
}

export function getPhaseAtBeat(
  beatIndex: number,
  singBeats: number,
  restBeats: number,
): VozRitmoPhase {
  const cycle = getCycleBeats(singBeats, restBeats);
  const position = ((beatIndex % cycle) + cycle) % cycle;

  return position < singBeats ? "cantar" : "silencio";
}

export function isPhaseStartAtBeat(
  beatIndex: number,
  singBeats: number,
  restBeats: number,
): boolean {
  if (beatIndex === 0) {
    return true;
  }

  return (
    getPhaseAtBeat(beatIndex, singBeats, restBeats) !==
    getPhaseAtBeat(beatIndex - 1, singBeats, restBeats)
  );
}

export function getRitmoTimelineWindowMs(
  bpm: number,
  singBeats: number,
  restBeats: number,
): number {
  return (
    (60000 / bpm) * getCycleBeats(singBeats, restBeats) * VOZ_RITMO_TIMELINE_CYCLES
  );
}

export function getRitmoNowLinePercent(
  pastRatio = VOZ_RITMO_TIMELINE_PAST_RATIO,
): number {
  return pastRatio * 100;
}

export function ritmoTimeToPercent(
  timeMs: number,
  now: number,
  totalSpanMs: number,
  pastRatio = VOZ_RITMO_TIMELINE_PAST_RATIO,
): number {
  const windowStart = now - totalSpanMs * pastRatio;
  return Math.max(
    0,
    Math.min(100, ((timeMs - windowStart) / totalSpanMs) * 100),
  );
}

export function getRitmoPhaseAtTime(
  now: number,
  beatMarkers: VozRitmoBeatMarker[],
  bpm: number,
  singBeats: number,
  restBeats: number,
): VozRitmoPhase | null {
  if (beatMarkers.length === 0) {
    return null;
  }

  const msPerBeat = 60000 / bpm;
  const anchor = beatMarkers[0]!;
  const elapsed = now - anchor.timestamp;

  if (elapsed < 0) {
    return getPhaseAtBeat(anchor.beatIndex, singBeats, restBeats);
  }

  const beatsElapsed = Math.floor(elapsed / msPerBeat);

  return getPhaseAtBeat(
    anchor.beatIndex + beatsElapsed,
    singBeats,
    restBeats,
  );
}

export function getMsIntoCurrentBeat(
  now: number,
  beatMarkers: VozRitmoBeatMarker[],
  bpm: number,
): number {
  if (beatMarkers.length === 0) {
    return 0;
  }

  const msPerBeat = 60000 / bpm;
  const anchor = beatMarkers[0]!;
  const elapsed = Math.max(0, now - anchor.timestamp);

  return elapsed % msPerBeat;
}

export function getRitmoVoiceCompliance(
  expectedPhase: VozRitmoPhase,
  hasVoice: boolean,
  msIntoBeat: number,
  msPerBeat: number,
): VozRitmoVoiceCompliance {
  const shouldSing = expectedPhase === "cantar";
  const correct =
    (shouldSing && hasVoice) || (!shouldSing && !hasVoice);

  if (correct) {
    return "correcto";
  }

  const edgeWindow = msPerBeat * 0.22;

  if (msIntoBeat < edgeWindow || msIntoBeat > msPerBeat - edgeWindow) {
    return "cerca";
  }

  return "incorrecto";
}

export function getRitmoComplianceColor(
  compliance: VozRitmoVoiceCompliance,
): string {
  switch (compliance) {
    case "correcto":
      return "var(--tuner-in-tune)";
    case "cerca":
      return "var(--tuner-cerca)";
    default:
      return "var(--tuner-flat-sharp)";
  }
}

export function getPhaseLabel(phase: VozRitmoPhase): string {
  return phase === "cantar" ? "Cantá" : "Silencio";
}

export function getPatternDescription(
  singBeats: number,
  restBeats: number,
): string {
  const singLabel = singBeats === 1 ? "1 tiempo" : `${singBeats} tiempos`;
  const restLabel = restBeats === 1 ? "1 tiempo" : `${restBeats} tiempos`;

  return `${singLabel} cantando · ${restLabel} en silencio`;
}

export function getRitmoPhaseFeedback(
  phase: VozRitmoPhase | null,
  accuracy: VozAccuracy,
): string | null {
  if (!phase) {
    return null;
  }

  if (phase === "cantar" && accuracy === "silencio") {
    return "¡Cantá ahora!";
  }

  if (phase === "silencio" && accuracy !== "silencio") {
    return "Pará · es silencio";
  }

  if (phase === "cantar" && accuracy === "en-tono") {
    return "¡Bien! Mantené la nota";
  }

  if (phase === "silencio" && accuracy === "silencio") {
    return "¡Bien! Silencio correcto";
  }

  return null;
}

function scheduleVozRitmoClick(
  audioContext: AudioContext,
  time: number,
  phase: VozRitmoPhase,
  isPhaseStart: boolean,
): void {
  const isSing = phase === "cantar";
  const frequency = isSing
    ? isPhaseStart
      ? 880
      : 660
    : isPhaseStart
      ? 330
      : 247;
  const peakGain = isSing
    ? isPhaseStart
      ? 0.62
      : 0.24
    : isPhaseStart
      ? 0.4
      : 0.14;
  const duration = isPhaseStart ? 0.055 : 0.028;

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

export type VozRitmoEngine = {
  start(
    bpm: number,
    singBeats: number,
    restBeats: number,
    onBeat: (marker: VozRitmoBeatMarker) => void,
  ): void;
  stop(): void;
};

export function createVozRitmoEngine(
  audioContext: AudioContext,
): VozRitmoEngine {
  let running = false;
  let bpm = BPM_DEFAULT;
  let singBeats = VOZ_RITMO_SING_BEATS_DEFAULT;
  let restBeats = VOZ_RITMO_REST_BEATS_DEFAULT;
  let nextBeatTime = 0;
  let globalBeatIndex = 0;
  let schedulerTimer: ReturnType<typeof setInterval> | null = null;
  let onBeat: ((marker: VozRitmoBeatMarker) => void) | null = null;
  const beatTimeouts = new Set<ReturnType<typeof setTimeout>>();

  function audioTimeToPerformanceMs(audioTime: number): number {
    return (
      performance.now() + (audioTime - audioContext.currentTime) * 1000
    );
  }

  function clearBeatTimeouts(): void {
    for (const timeoutId of beatTimeouts) {
      clearTimeout(timeoutId);
    }

    beatTimeouts.clear();
  }

  function scheduleBeatCallback(
    marker: VozRitmoBeatMarker,
    beatAudioTime: number,
  ): void {
    const delayMs = Math.max(
      0,
      (beatAudioTime - audioContext.currentTime) * 1000,
    );

    const timeoutId = setTimeout(() => {
      beatTimeouts.delete(timeoutId);

      if (!running || !onBeat) {
        return;
      }

      onBeat(marker);
    }, delayMs);

    beatTimeouts.add(timeoutId);
  }

  function scheduler(): void {
    if (!running) {
      return;
    }

    const secondsPerBeat = 60 / bpm;

    while (nextBeatTime < audioContext.currentTime + LOOK_AHEAD_SECONDS) {
      const beatIndex = globalBeatIndex;
      const beatTime = nextBeatTime;
      const phase = getPhaseAtBeat(beatIndex, singBeats, restBeats);
      const phaseStart = isPhaseStartAtBeat(beatIndex, singBeats, restBeats);

      scheduleVozRitmoClick(audioContext, beatTime, phase, phaseStart);
      scheduleBeatCallback(
        {
          timestamp: audioTimeToPerformanceMs(beatTime),
          beatIndex,
          phase,
          isPhaseStart: phaseStart,
        },
        beatTime,
      );

      nextBeatTime += secondsPerBeat;
      globalBeatIndex += 1;
    }
  }

  return {
    start(
      nextBpm: number,
      nextSingBeats: number,
      nextRestBeats: number,
      nextOnBeat: (marker: VozRitmoBeatMarker) => void,
    ) {
      if (running) {
        clearBeatTimeouts();
      }

      bpm = nextBpm;
      singBeats = nextSingBeats;
      restBeats = nextRestBeats;
      onBeat = nextOnBeat;
      running = true;
      globalBeatIndex = 0;
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
