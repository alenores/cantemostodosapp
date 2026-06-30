"use client";

import { computeBufferRms } from "@/lib/afinador";
import {
  BPM_DEFAULT,
  BPM_MAX,
  BPM_MIN,
  computeHitDeltaMs,
  createMetronomeEngine,
  estimateAttackOnsetMs,
  getMetronomeLatencyCompensation,
  onsetToPerceivedHitMs,
  updateSessionLatencyOffset,
  type MetronomeBeatMarker,
  type MetronomeHit,
  type MetronomeEngine,
} from "@/lib/metronomo";
import { useCallback, useEffect, useRef, useState } from "react";

const MIC_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

const MIC_GRANTED_STORAGE_KEY = "cantemos-metronomo-mic-granted";
const MIC_RMS_THRESHOLD = 0.015;
const MIC_HIT_COOLDOWN_MS = 150;
const MIC_ANALYSER_FFT_SIZE = 256;
const MAX_HITS = 32;
const HIT_MATCH_WINDOW_MS = 500;
const MAX_HIT_DELTA_MS = 500;

function readStoredMicGranted(): boolean {
  try {
    return localStorage.getItem(MIC_GRANTED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistMicGranted(granted: boolean): void {
  try {
    if (granted) {
      localStorage.setItem(MIC_GRANTED_STORAGE_KEY, "1");
    } else {
      localStorage.removeItem(MIC_GRANTED_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private mode, etc.)
  }
}

function getMicErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Necesitamos permiso para usar el micrófono. Tocá «Permitir micrófono» y aceptá en el cartel del navegador.";
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No encontramos un micrófono en este dispositivo.";
    }

    if (error.name === "NotReadableError") {
      return "El micrófono está en uso por otra app. Cerrala e intentá de nuevo.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No se pudo acceder al micrófono. Intentá de nuevo.";
}

function clampBpm(value: number): number {
  return Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(value)));
}

type ScheduledBeat = {
  beatIndex: number;
  expectedTimeMs: number;
};

type UseMetronomoResult = {
  bpm: number;
  isPlaying: boolean;
  beatsPerMeasure: 2 | 3 | 4;
  currentBeat: number | null;
  micActivo: boolean;
  micPermissionGranted: boolean;
  micError: string | null;
  micReady: boolean;
  micStarting: boolean;
  hits: MetronomeHit[];
  beatMarkers: MetronomeBeatMarker[];
  tapTempoTapCount: number;
  start: () => void;
  stop: () => void;
  setBpm: (value: number) => void;
  setBeatsPerMeasure: (value: 2 | 3 | 4) => void;
  tapTempo: () => void;
  toggleMic: () => void;
  requestMic: () => Promise<void>;
};

export function useMetronomo(): UseMetronomoResult {
  const [bpm, setBpmState] = useState(BPM_DEFAULT);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPerMeasure, setBeatsPerMeasureState] = useState<2 | 3 | 4>(4);
  const [currentBeat, setCurrentBeat] = useState<number | null>(null);
  const [micActivo, setMicActivo] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState(
    readStoredMicGranted,
  );
  const [micError, setMicError] = useState<string | null>(null);
  const [micReady, setMicReady] = useState(false);
  const [micStarting, setMicStarting] = useState(false);
  const [hits, setHits] = useState<MetronomeHit[]>([]);
  const [beatMarkers, setBeatMarkers] = useState<MetronomeBeatMarker[]>([]);
  const [tapTempoTapCount, setTapTempoTapCount] = useState(0);

  const bpmRef = useRef(bpm);
  const beatsPerMeasureRef = useRef(beatsPerMeasure);
  const isPlayingRef = useRef(false);
  const tapTimestampsRef = useRef<number[]>([]);
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const engineRef = useRef<MetronomeEngine | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const micRunningRef = useRef(false);
  const lastMicHitRef = useRef(0);
  const scheduledBeatsRef = useRef<ScheduledBeat[]>([]);
  const sessionLatencyOffsetRef = useRef(0);

  bpmRef.current = bpm;
  beatsPerMeasureRef.current = beatsPerMeasure;
  isPlayingRef.current = isPlaying;

  const stopMicCapture = useCallback(() => {
    micRunningRef.current = false;
    setMicStarting(false);

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    analyserRef.current = null;
    dataBufferRef.current = null;
    setMicReady(false);
  }, []);

  const stopEngine = useCallback(() => {
    engineRef.current?.stop();
    setCurrentBeat(null);
    scheduledBeatsRef.current = [];
    setBeatMarkers([]);
  }, []);

  const closeAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    engineRef.current = null;
  }, []);

  const stop = useCallback(() => {
    stopEngine();
    stopMicCapture();
    closeAudioContext();
    setIsPlaying(false);
    isPlayingRef.current = false;
    setHits([]);
    setBeatMarkers([]);
    setMicActivo(false);
    sessionLatencyOffsetRef.current = 0;
    tapTimestampsRef.current = [];
    setTapTempoTapCount(0);
    if (tapResetTimerRef.current !== null) {
      clearTimeout(tapResetTimerRef.current);
      tapResetTimerRef.current = null;
    }
  }, [closeAudioContext, stopEngine, stopMicCapture]);

  const registerHit = useCallback((rawHitMs: number) => {
    const beats = scheduledBeatsRef.current;
    const audioContext = audioContextRef.current;
    const analyser = analyserRef.current;

    if (beats.length === 0 || !audioContext) {
      return;
    }

    const fftSize = analyser?.fftSize ?? MIC_ANALYSER_FFT_SIZE;
    const baseCompensation = getMetronomeLatencyCompensation(
      audioContext,
      fftSize,
      0,
    );
    const adaptedCompensation = getMetronomeLatencyCompensation(
      audioContext,
      fftSize,
      sessionLatencyOffsetRef.current,
    );

    let closestBeat: ScheduledBeat | null = null;
    let smallestDelta = Infinity;

    for (const beat of beats) {
      const delta = Math.abs(
        computeHitDeltaMs(rawHitMs, beat.expectedTimeMs, adaptedCompensation),
      );

      if (delta < smallestDelta) {
        smallestDelta = delta;
        closestBeat = beat;
      }
    }

    if (!closestBeat || smallestDelta > HIT_MATCH_WINDOW_MS) {
      return;
    }

    const rawDelta = computeHitDeltaMs(
      rawHitMs,
      closestBeat.expectedTimeMs,
      baseCompensation,
    );
    sessionLatencyOffsetRef.current = updateSessionLatencyOffset(
      sessionLatencyOffsetRef.current,
      rawDelta,
    );

    const finalCompensation = getMetronomeLatencyCompensation(
      audioContext,
      fftSize,
      sessionLatencyOffsetRef.current,
    );
    const signedDelta = computeHitDeltaMs(
      rawHitMs,
      closestBeat.expectedTimeMs,
      finalCompensation,
    );
    const deltaMsClamped = Math.max(
      -MAX_HIT_DELTA_MS,
      Math.min(MAX_HIT_DELTA_MS, signedDelta),
    );
    const perceivedHitMs = onsetToPerceivedHitMs(
      rawHitMs,
      sessionLatencyOffsetRef.current,
    );

    const hit: MetronomeHit = {
      timestamp: perceivedHitMs,
      beatIndex: closestBeat.beatIndex,
      expectedTime:
        closestBeat.expectedTimeMs + finalCompensation.outputMs,
      deltaMsClamped,
    };

    setHits((previous) => [...previous, hit].slice(-MAX_HITS));
  }, []);

  const startMicAnalysis = useCallback(() => {
    const updateMic = () => {
      if (!micRunningRef.current) {
        return;
      }

      const analyser = analyserRef.current;
      const buffer = dataBufferRef.current;

      if (!analyser || !buffer) {
        animationFrameRef.current = requestAnimationFrame(updateMic);
        return;
      }

      analyser.getFloatTimeDomainData(buffer);
      const rms = computeBufferRms(buffer);
      const now = performance.now();

      if (
        rms > MIC_RMS_THRESHOLD &&
        now - lastMicHitRef.current >= MIC_HIT_COOLDOWN_MS
      ) {
        lastMicHitRef.current = now;

        const audioContext = audioContextRef.current;
        const onsetMs =
          audioContext !== null
            ? estimateAttackOnsetMs(buffer, audioContext.sampleRate, now)
            : now;

        registerHit(onsetMs);
      }

      animationFrameRef.current = requestAnimationFrame(updateMic);
    };

    animationFrameRef.current = requestAnimationFrame(updateMic);
  }, [registerHit]);

  const ensureAudioContext = useCallback(async () => {
    if (audioContextRef.current) {
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      return audioContextRef.current;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error("AudioContext no disponible en este navegador");
    }

    const audioContext = new AudioContextClass();

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    audioContextRef.current = audioContext;
    engineRef.current = createMetronomeEngine(audioContext);

    return audioContext;
  }, []);

  const handleBeat = useCallback((beatIndex: number, expectedTimeMs: number) => {
    setCurrentBeat(beatIndex);

    const compensation = getMetronomeLatencyCompensation(
      audioContextRef.current,
      analyserRef.current?.fftSize ?? MIC_ANALYSER_FFT_SIZE,
      sessionLatencyOffsetRef.current,
    );
    const perceivedBeatMs = expectedTimeMs + compensation.outputMs;

    scheduledBeatsRef.current = [
      ...scheduledBeatsRef.current,
      { beatIndex, expectedTimeMs },
    ].slice(-32);

    setBeatMarkers((previous) => [
      ...previous,
      { timestamp: perceivedBeatMs, beatIndex },
    ].slice(-64));
  }, []);

  const startEngine = useCallback(async () => {
    try {
      await ensureAudioContext();

      scheduledBeatsRef.current = [];
      setBeatMarkers([]);

      engineRef.current?.start(
        bpmRef.current,
        beatsPerMeasureRef.current,
        handleBeat,
      );

      setIsPlaying(true);
      isPlayingRef.current = true;
    } catch {
      stop();
    }
  }, [ensureAudioContext, handleBeat, stop]);

  const restartEngineIfPlaying = useCallback(() => {
    if (!isPlayingRef.current) {
      return;
    }

    void startEngine();
  }, [startEngine]);

  const start = useCallback(() => {
    if (isPlayingRef.current) {
      return;
    }

    void startEngine();
  }, [startEngine]);

  const setBpm = useCallback(
    (value: number) => {
      const nextBpm = clampBpm(value);
      setBpmState(nextBpm);
      bpmRef.current = nextBpm;
      restartEngineIfPlaying();
    },
    [restartEngineIfPlaying],
  );

  const setBeatsPerMeasure = useCallback(
    (value: 2 | 3 | 4) => {
      setBeatsPerMeasureState(value);
      beatsPerMeasureRef.current = value;
      restartEngineIfPlaying();
    },
    [restartEngineIfPlaying],
  );

  const tapTempo = useCallback(() => {
    if (isPlayingRef.current) {
      return;
    }

    const now = performance.now();
    const recentTaps = tapTimestampsRef.current.filter(
      (timestamp) => now - timestamp < 3000,
    );

    recentTaps.push(now);
    tapTimestampsRef.current = recentTaps;
    setTapTempoTapCount(recentTaps.length);

    if (tapResetTimerRef.current !== null) {
      clearTimeout(tapResetTimerRef.current);
    }

    tapResetTimerRef.current = setTimeout(() => {
      tapTimestampsRef.current = [];
      setTapTempoTapCount(0);
      tapResetTimerRef.current = null;
    }, 3000);

    if (recentTaps.length < 2) {
      return;
    }

    const intervals: number[] = [];

    for (let index = 1; index < recentTaps.length; index += 1) {
      intervals.push(recentTaps[index] - recentTaps[index - 1]);
    }

    const lastIntervals = intervals.slice(-4);
    const averageInterval =
      lastIntervals.reduce((sum, interval) => sum + interval, 0) /
      lastIntervals.length;
    const nextBpm = clampBpm(60000 / averageInterval);

    setBpmState(nextBpm);
    bpmRef.current = nextBpm;
  }, []);

  const requestMic = useCallback(async () => {
    if (micRunningRef.current || micStarting) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("Este navegador no permite acceder al micrófono.");
      return;
    }

    setMicError(null);
    setMicReady(false);
    setMicStarting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: MIC_AUDIO_CONSTRAINTS,
      });

      const audioContext = await ensureAudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = MIC_ANALYSER_FFT_SIZE;
      analyser.smoothingTimeConstant = 0;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      mediaStreamRef.current = stream;
      analyserRef.current = analyser;
      dataBufferRef.current = new Float32Array(
        new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT),
      );
      micRunningRef.current = true;
      lastMicHitRef.current = 0;
      sessionLatencyOffsetRef.current = 0;
      setMicPermissionGranted(true);
      persistMicGranted(true);
      setMicReady(true);
      setMicStarting(false);
      startMicAnalysis();
    } catch (error) {
      stopMicCapture();

      if (
        error instanceof DOMException &&
        (error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError")
      ) {
        setMicPermissionGranted(false);
        persistMicGranted(false);
      }

      setMicError(getMicErrorMessage(error));
    }
  }, [ensureAudioContext, micStarting, startMicAnalysis, stopMicCapture]);

  const toggleMic = useCallback(() => {
    if (micActivo) {
      setMicActivo(false);
      stopMicCapture();
      return;
    }

    setMicActivo(true);

    if (micPermissionGranted) {
      void requestMic();
    }
  }, [micActivo, micPermissionGranted, requestMic, stopMicCapture]);

  useEffect(() => {
    if (!navigator.permissions?.query) {
      return;
    }

    let disposed = false;

    void navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        if (disposed) {
          return;
        }

        const granted = status.state === "granted";
        setMicPermissionGranted(granted);
        persistMicGranted(granted);

        status.onchange = () => {
          const nextGranted = status.state === "granted";
          setMicPermissionGranted(nextGranted);
          persistMicGranted(nextGranted);

          if (!nextGranted) {
            stopMicCapture();
            setMicActivo(false);
          }
        };
      })
      .catch(() => {
        // Permissions API unsupported for microphone (e.g. some iOS versions).
      });

    return () => {
      disposed = true;
    };
  }, [stopMicCapture]);

  useEffect(() => {
    return () => {
      stopEngine();
      stopMicCapture();
      closeAudioContext();
      if (tapResetTimerRef.current !== null) {
        clearTimeout(tapResetTimerRef.current);
      }
    };
  }, [closeAudioContext, stopEngine, stopMicCapture]);

  return {
    bpm,
    isPlaying,
    beatsPerMeasure,
    currentBeat,
    micActivo,
    micPermissionGranted,
    micError,
    micReady,
    micStarting,
    hits,
    beatMarkers,
    tapTempoTapCount,
    start,
    stop,
    setBpm,
    setBeatsPerMeasure,
    tapTempo,
    toggleMic,
    requestMic,
  };
}
