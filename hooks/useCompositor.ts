"use client";

import {
  createDefaultCompositorPiece,
  getCompositorTrack,
  normalizeCompositorPiece,
  readStoredCompositorPiece,
  setCompositorBeatDurationAtSlot,
  setCompositorBeatLevelAtSlot,
  setCompositorDrumSoundAtSlot,
  setCompositorGuitarArticulationAtSlot,
  setCompositorNoteAtSlot,
  setCompositorPatternLength,
  toggleCompositorTrack,
  writeStoredCompositorPiece,
  type CompositorDrumSound,
  type CompositorGuitarArticulation,
  type CompositorInstrumentId,
  type CompositorPiece,
  type CompositorSlotNote,
} from "@/lib/compositor";
import { createCompositorEngine, type CompositorEngine } from "@/lib/compositor-audio";
import { loadCompositorSamples } from "@/lib/compositor-samples";
import {
  BPM_MAX,
  BPM_MIN,
  type MetronomeBeatDuration,
  type MetronomeBeatDurationPattern,
  type MetronomeBeatLevel,
  type MetronomeBeatPattern,
} from "@/lib/metronomo";
import { useCallback, useEffect, useRef, useState } from "react";

const TAP_TEMPO_RESET_MS = 2200;
const TAP_TEMPO_MIN_TAPS = 2;

function clampBpm(value: number): number {
  return Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(value)));
}

export type UseCompositorResult = {
  piece: CompositorPiece;
  activeTrackId: CompositorInstrumentId;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  bpm: number;
  isPlaying: boolean;
  currentBeat: number | null;
  tapTempoTapCount: number;
  setActiveTrackId: (instrumentId: CompositorInstrumentId) => void;
  setBpm: (value: number) => void;
  setPatternLength: (value: number) => void;
  setBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  setBeatLevelAtSlot: (
    slotIndex: number,
    level: MetronomeBeatLevel,
  ) => void;
  setNoteAtSlot: (slotIndex: number, note: CompositorSlotNote) => void;
  setDrumSoundAtSlot: (slotIndex: number, sound: CompositorDrumSound) => void;
  setGuitarArticulationAtSlot: (
    slotIndex: number,
    articulation: CompositorGuitarArticulation,
  ) => void;
  toggleTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
  tapTempo: () => void;
  start: () => Promise<void>;
  stop: () => void;
  resetPiece: () => void;
};

export function useCompositor(): UseCompositorResult {
  const [piece, setPieceState] = useState<CompositorPiece>(
    createDefaultCompositorPiece,
  );
  const [activeTrackId, setActiveTrackIdState] =
    useState<CompositorInstrumentId>("piano");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState<number | null>(null);
  const [tapTempoTapCount, setTapTempoTapCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const pieceRef = useRef(piece);
  const isPlayingRef = useRef(false);
  const tapTimestampsRef = useRef<number[]>([]);
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const engineRef = useRef<CompositorEngine | null>(null);
  const samplesReadyRef = useRef(false);

  pieceRef.current = piece;
  isPlayingRef.current = isPlaying;

  const activeTrack = getCompositorTrack(piece, activeTrackId);

  useEffect(() => {
    const stored = readStoredCompositorPiece();

    if (stored) {
      setPieceState(stored);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    writeStoredCompositorPiece(piece);
  }, [hydrated, piece]);

  const updatePiece = useCallback(
    (updater: (current: CompositorPiece) => CompositorPiece) => {
      setPieceState((current) => normalizeCompositorPiece(updater(current)));
    },
    [],
  );

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentBeat(null);
  }, []);

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

    if (!samplesReadyRef.current) {
      try {
        const samples = await loadCompositorSamples(audioContext);
        engineRef.current = createCompositorEngine(audioContext, samples);
        samplesReadyRef.current = true;
      } catch {
        engineRef.current = createCompositorEngine(audioContext, null);
        samplesReadyRef.current = true;
      }
    } else if (!engineRef.current) {
      engineRef.current = createCompositorEngine(audioContext, null);
    }

    return audioContext;
  }, []);

  const handleBeat = useCallback((beatIndex: number) => {
    setCurrentBeat(beatIndex);
  }, []);

  const start = useCallback(async () => {
    try {
      await ensureAudioContext();
      setCurrentBeat(null);

      engineRef.current?.start(pieceRef.current, (beatIndex) => {
        handleBeat(beatIndex);
      });

      setIsPlaying(true);
      isPlayingRef.current = true;
    } catch {
      stop();
    }
  }, [ensureAudioContext, handleBeat, stop]);

  const restartIfPlaying = useCallback(() => {
    if (!isPlayingRef.current) {
      return;
    }

    void start();
  }, [start]);

  const setBpm = useCallback(
    (value: number) => {
      updatePiece((current) => ({
        ...current,
        bpm: clampBpm(value),
      }));
      restartIfPlaying();
    },
    [restartIfPlaying, updatePiece],
  );

  const setPatternLength = useCallback(
    (value: number) => {
      updatePiece((current) => setCompositorPatternLength(current, value));
      restartIfPlaying();
    },
    [restartIfPlaying, updatePiece],
  );

  const setBeatDurationAtSlot = useCallback(
    (slotIndex: number, duration: MetronomeBeatDuration) => {
      updatePiece((current) =>
        setCompositorBeatDurationAtSlot(current, slotIndex, duration),
      );
      restartIfPlaying();
    },
    [restartIfPlaying, updatePiece],
  );

  const setBeatLevelAtSlot = useCallback(
    (slotIndex: number, level: MetronomeBeatLevel) => {
      updatePiece((current) =>
        setCompositorBeatLevelAtSlot(
          current,
          activeTrackId,
          slotIndex,
          level,
        ),
      );
      restartIfPlaying();
    },
    [activeTrackId, restartIfPlaying, updatePiece],
  );

  const setNoteAtSlot = useCallback(
    (slotIndex: number, note: CompositorSlotNote) => {
      updatePiece((current) =>
        setCompositorNoteAtSlot(current, activeTrackId, slotIndex, note),
      );
      restartIfPlaying();
    },
    [activeTrackId, restartIfPlaying, updatePiece],
  );

  const setDrumSoundAtSlot = useCallback(
    (slotIndex: number, sound: CompositorDrumSound) => {
      updatePiece((current) =>
        setCompositorDrumSoundAtSlot(current, slotIndex, sound),
      );
      restartIfPlaying();
    },
    [restartIfPlaying, updatePiece],
  );

  const setGuitarArticulationAtSlot = useCallback(
    (slotIndex: number, articulation: CompositorGuitarArticulation) => {
      updatePiece((current) =>
        setCompositorGuitarArticulationAtSlot(current, slotIndex, articulation),
      );
      restartIfPlaying();
    },
    [restartIfPlaying, updatePiece],
  );

  const toggleTrack = useCallback(
    (instrumentId: CompositorInstrumentId, enabled: boolean) => {
      updatePiece((current) =>
        toggleCompositorTrack(current, instrumentId, enabled),
      );
      restartIfPlaying();
    },
    [restartIfPlaying, updatePiece],
  );

  const tapTempo = useCallback(() => {
    const now = performance.now();
    tapTimestampsRef.current = [...tapTimestampsRef.current, now].slice(-8);
    setTapTempoTapCount(tapTimestampsRef.current.length);

    if (tapResetTimerRef.current !== null) {
      clearTimeout(tapResetTimerRef.current);
    }

    tapResetTimerRef.current = setTimeout(() => {
      tapTimestampsRef.current = [];
      setTapTempoTapCount(0);
    }, TAP_TEMPO_RESET_MS);

    if (tapTimestampsRef.current.length < TAP_TEMPO_MIN_TAPS) {
      return;
    }

    const intervals: number[] = [];

    for (let index = 1; index < tapTimestampsRef.current.length; index += 1) {
      intervals.push(
        tapTimestampsRef.current[index]! - tapTimestampsRef.current[index - 1]!,
      );
    }

    const averageInterval =
      intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    const nextBpm = clampBpm(60_000 / averageInterval);

    updatePiece((current) => ({
      ...current,
      bpm: nextBpm,
    }));
    restartIfPlaying();
  }, [restartIfPlaying, updatePiece]);

  const resetPiece = useCallback(() => {
    stop();
    setPieceState(createDefaultCompositorPiece());
    setActiveTrackIdState("piano");
  }, [stop]);

  useEffect(() => {
    return () => {
      stop();

      if (tapResetTimerRef.current !== null) {
        clearTimeout(tapResetTimerRef.current);
      }
    };
  }, [stop]);

  return {
    piece,
    activeTrackId,
    beatPattern: activeTrack.levels,
    patternLength: piece.patternLength,
    beatDurations: piece.beatDurations,
    bpm: piece.bpm,
    isPlaying,
    currentBeat,
    tapTempoTapCount,
    setActiveTrackId: setActiveTrackIdState,
    setBpm,
    setPatternLength,
    setBeatDurationAtSlot,
    setBeatLevelAtSlot,
    setNoteAtSlot,
    setDrumSoundAtSlot,
    setGuitarArticulationAtSlot,
    toggleTrack,
    tapTempo,
    start,
    stop,
    resetPiece,
  };
}
