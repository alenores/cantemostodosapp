"use client";

import {
  addCompositorTrackEvent,
  cloneCompositorPiece,
  compositorPiecesEqualContent,
  createDefaultCompositorPiece,
  getCompositorPresetById,
  getCompositorTrack,
  normalizeCompositorPiece,
  readStoredCompositorPiece,
  removeCompositorTrackEvent,
  setCompositorCycleBeatDurationAtSlot,
  setCompositorCycleGolpes,
  toggleCompositorTrack,
  updateCompositorTrackEvent,
  writeStoredCompositorPiece,
  type CompositorInstrumentId,
  type CompositorPiece,
  type CompositorPresetId,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import { getCompositorGridSteps } from "@/lib/compositor-timeline";
import { createCompositorEngine, type CompositorEngine } from "@/lib/compositor-audio";
import { loadCompositorSamples } from "@/lib/compositor-samples";
import {
  BPM_MAX,
  BPM_MIN,
  METRONOME_PATTERN_DEFAULT,
  type MetronomeBeatDuration,
  type MetronomeBeatDurationPattern,
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
  activePresetId: CompositorPresetId | null;
  selectedEventId: string | null;
  cycleGolpes: number;
  cycleBeatDurations: MetronomeBeatDurationPattern;
  bpm: number;
  isPlaying: boolean;
  isPreviewingTrack: boolean;
  cycleProgress: number | null;
  tapTempoTapCount: number;
  setActiveTrackId: (instrumentId: CompositorInstrumentId) => void;
  setSelectedEventId: (eventId: string | null) => void;
  setBpm: (value: number) => void;
  setCycleGolpes: (value: number) => void;
  setCycleBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  addTrackEvent: (instrumentId?: CompositorInstrumentId) => void;
  updateTrackEvent: (
    eventId: string,
    patch: Partial<CompositorTrackEvent>,
    instrumentId?: CompositorInstrumentId,
  ) => void;
  removeTrackEvent: (eventId: string, instrumentId?: CompositorInstrumentId) => void;
  toggleTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
  tapTempo: () => void;
  start: () => Promise<void>;
  previewActiveTrack: () => Promise<void>;
  stop: () => void;
  resetPiece: () => void;
  applyPreset: (presetId: CompositorPresetId) => void;
  isPieceModifiedFromBaseline: boolean;
};

export function useCompositor(): UseCompositorResult {
  const [piece, setPieceState] = useState<CompositorPiece>(
    createDefaultCompositorPiece,
  );
  const [activeTrackId, setActiveTrackIdState] =
    useState<CompositorInstrumentId>("bateria");
  const [activePresetId, setActivePresetId] = useState<CompositorPresetId | null>(
    null,
  );
  const [selectedEventId, setSelectedEventIdState] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewingTrack, setIsPreviewingTrack] = useState(false);
  const [cycleProgress, setCycleProgress] = useState<number | null>(null);
  const [tapTempoTapCount, setTapTempoTapCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [baselinePiece, setBaselinePiece] = useState<CompositorPiece>(
    createDefaultCompositorPiece,
  );

  const pieceRef = useRef(piece);
  const isPlayingRef = useRef(false);
  const isPreviewingRef = useRef(false);
  const tapTimestampsRef = useRef<number[]>([]);
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const engineRef = useRef<CompositorEngine | null>(null);
  const samplesReadyRef = useRef(false);

  pieceRef.current = piece;
  isPlayingRef.current = isPlaying;

  const activeTrack = getCompositorTrack(piece, activeTrackId);
  const isPieceModifiedFromBaseline = !compositorPiecesEqualContent(
    piece,
    baselinePiece,
  );

  useEffect(() => {
    const stored = readStoredCompositorPiece();
    const initial = stored ?? createDefaultCompositorPiece();

    setPieceState(initial);
    setBaselinePiece(cloneCompositorPiece(initial));
    setSelectedEventIdState(null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    writeStoredCompositorPiece(piece);
  }, [hydrated, piece]);

  useEffect(() => {
    if (
      selectedEventId &&
      !activeTrack.events.some((event) => event.id === selectedEventId)
    ) {
      setSelectedEventIdState(null);
    }
  }, [activeTrack.events, selectedEventId]);

  const updatePiece = useCallback(
    (updater: (current: CompositorPiece) => CompositorPiece) => {
      setActivePresetId(null);
      setPieceState((current) => normalizeCompositorPiece(updater(current)));
    },
    [],
  );

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setIsPlaying(false);
    setIsPreviewingTrack(false);
    isPlayingRef.current = false;
    isPreviewingRef.current = false;
    setCycleProgress(null);
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

  const handleProgress = useCallback((progress: number) => {
    setCycleProgress(progress);
  }, []);

  const start = useCallback(async () => {
    if (isPreviewingRef.current) {
      stop();
    }

    try {
      await ensureAudioContext();
      setCycleProgress(0);

      engineRef.current?.start(pieceRef.current, (progress) => {
        handleProgress(progress);
      });

      setIsPlaying(true);
      isPlayingRef.current = true;
    } catch {
      stop();
    }
  }, [ensureAudioContext, handleProgress, stop]);

  const previewActiveTrack = useCallback(async () => {
    if (isPlayingRef.current) {
      return;
    }

    if (isPreviewingRef.current) {
      stop();
      return;
    }

    try {
      await ensureAudioContext();
      setCycleProgress(0);
      setIsPreviewingTrack(true);
      isPreviewingRef.current = true;

      engineRef.current?.playSingleCycle(
        pieceRef.current,
        activeTrackId,
        handleProgress,
        () => {
          setIsPreviewingTrack(false);
          isPreviewingRef.current = false;
          setCycleProgress(null);
        },
      );
    } catch {
      stop();
    }
  }, [activeTrackId, ensureAudioContext, handleProgress, stop]);

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

  const setCycleGolpes = useCallback(
    (value: number) => {
      updatePiece((current) => setCompositorCycleGolpes(current, value));
      restartIfPlaying();
    },
    [restartIfPlaying, updatePiece],
  );

  const setCycleBeatDurationAtSlot = useCallback(
    (slotIndex: number, duration: MetronomeBeatDuration) => {
      updatePiece((current) =>
        setCompositorCycleBeatDurationAtSlot(current, slotIndex, duration),
      );
      restartIfPlaying();
    },
    [restartIfPlaying, updatePiece],
  );

  const addTrackEvent = useCallback(
    (instrumentId: CompositorInstrumentId = activeTrackId) => {
      const gridSteps = getCompositorGridSteps(pieceRef.current);
      const track = getCompositorTrack(pieceRef.current, instrumentId);
      const occupied = new Set<number>();

      for (const event of track.events) {
        for (
          let step = event.startStep;
          step < event.startStep + event.durationSteps;
          step += 1
        ) {
          occupied.add(step);
        }
      }

      let startStep = 0;

      while (startStep < gridSteps && occupied.has(startStep)) {
        startStep += 1;
      }

      updatePiece((current) => {
        const next = addCompositorTrackEvent(current, instrumentId, {
          startStep: Math.min(startStep, Math.max(0, gridSteps - 1)),
          durationSteps: Math.max(1, Math.floor(gridSteps / 10)),
        });
        const newEvent = getCompositorTrack(next, instrumentId).events.at(-1);

        if (newEvent) {
          setSelectedEventIdState(newEvent.id);
        }

        return next;
      });

      restartIfPlaying();
    },
    [activeTrackId, restartIfPlaying, updatePiece],
  );

  const updateTrackEvent = useCallback(
    (
      eventId: string,
      patch: Partial<CompositorTrackEvent>,
      instrumentId: CompositorInstrumentId = activeTrackId,
    ) => {
      updatePiece((current) =>
        updateCompositorTrackEvent(current, instrumentId, eventId, patch),
      );
      restartIfPlaying();
    },
    [activeTrackId, restartIfPlaying, updatePiece],
  );

  const removeTrackEvent = useCallback(
    (
      eventId: string,
      instrumentId: CompositorInstrumentId = activeTrackId,
    ) => {
      updatePiece((current) =>
        removeCompositorTrackEvent(current, instrumentId, eventId),
      );
      setSelectedEventIdState((current) =>
        current === eventId ? null : current,
      );
      restartIfPlaying();
    },
    [activeTrackId, restartIfPlaying, updatePiece],
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

  const setActiveTrackId = useCallback((instrumentId: CompositorInstrumentId) => {
    if (isPreviewingRef.current) {
      engineRef.current?.stop();
      setIsPreviewingTrack(false);
      isPreviewingRef.current = false;
      setCycleProgress(null);
    }

    setActiveTrackIdState(instrumentId);
    setSelectedEventIdState(null);
  }, []);

  const resetPiece = useCallback(() => {
    stop();
    const next = createDefaultCompositorPiece();
    setPieceState(next);
    setBaselinePiece(cloneCompositorPiece(next));
    setActivePresetId(null);
    setActiveTrackIdState("bateria");
    setSelectedEventIdState(null);
  }, [stop]);

  const applyPreset = useCallback(
    (presetId: CompositorPresetId) => {
      const preset = getCompositorPresetById(presetId);

      if (!preset) {
        return;
      }

      stop();
      const next = cloneCompositorPiece(preset.piece);
      setPieceState(next);
      setBaselinePiece(cloneCompositorPiece(next));
      setActivePresetId(presetId);
      setActiveTrackIdState("bateria");
      setSelectedEventIdState(null);
    },
    [stop],
  );

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
    activePresetId,
    selectedEventId,
    cycleGolpes: piece.cycleGolpes,
    cycleBeatDurations: piece.cycleBeatDurations,
    bpm: piece.bpm,
    isPlaying,
    isPreviewingTrack,
    cycleProgress,
    tapTempoTapCount,
    setActiveTrackId,
    setSelectedEventId: setSelectedEventIdState,
    setBpm,
    setCycleGolpes,
    setCycleBeatDurationAtSlot,
    addTrackEvent,
    updateTrackEvent,
    removeTrackEvent,
    toggleTrack,
    tapTempo,
    start,
    previewActiveTrack,
    stop,
    resetPiece,
    applyPreset,
    isPieceModifiedFromBaseline,
  };
}

export const COMPOSITOR_DUMMY_BEAT_PATTERN = METRONOME_PATTERN_DEFAULT;
