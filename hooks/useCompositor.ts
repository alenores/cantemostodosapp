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
  setCompositorTonalidadComposicion,
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
import {
  ensureCompositorSamplesForPiece,
  loadCompositorCoreSamples,
  prefetchCompositorSamplePack,
} from "@/lib/compositor-samples";
import { useCompositorCycles, type UseCompositorCyclesResult } from "@/hooks/useCompositorCycles";
import {
  BPM_MAX,
  BPM_MIN,
  METRONOME_PATTERN_DEFAULT,
  type MetronomeBeatDuration,
  type MetronomeBeatDurationPattern,
} from "@/lib/metronomo";
import type { NotaIndex } from "@/lib/cifrado";
import { useCallback, useEffect, useRef, useState } from "react";

const TAP_TEMPO_RESET_MS = 2200;
const TAP_TEMPO_MIN_TAPS = 2;

function clampBpm(value: number): number {
  return Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(value)));
}

export type UseCompositorOptions = {
  isLoggedIn?: boolean;
  online?: boolean;
  cyclesEnabled?: boolean;
};

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
  samplesLoading: boolean;
  setActiveTrackId: (instrumentId: CompositorInstrumentId) => void;
  setSelectedEventId: (eventId: string | null) => void;
  setBpm: (value: number) => void;
  setCycleGolpes: (value: number) => void;
  setCycleBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  tonalidadComposicion: NotaIndex;
  setTonalidadComposicion: (value: NotaIndex) => void;
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
  discardCycleChanges: () => void;
} & UseCompositorCyclesResult;

export function useCompositor({
  isLoggedIn = false,
  online = true,
  cyclesEnabled = false,
}: UseCompositorOptions = {}): UseCompositorResult {
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
  const [samplesLoading, setSamplesLoading] = useState(false);
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
        await loadCompositorCoreSamples(audioContext);
        samplesReadyRef.current = true;
      } catch {
        samplesReadyRef.current = true;
      }
    }

    if (!engineRef.current) {
      try {
        const samples = await loadCompositorCoreSamples(audioContext);
        engineRef.current = createCompositorEngine(audioContext, samples);
      } catch {
        engineRef.current = createCompositorEngine(audioContext, null);
      }
    }

    return audioContext;
  }, []);

  const prepareSamplesForPlayback = useCallback(
    async (options?: { includeInstrumentId?: CompositorInstrumentId }) => {
      setSamplesLoading(true);

      try {
        const audioContext = await ensureAudioContext();
        const samples = await ensureCompositorSamplesForPiece(
          audioContext,
          pieceRef.current,
          options,
        );
        engineRef.current?.stop();
        engineRef.current = createCompositorEngine(audioContext, samples);
      } finally {
        setSamplesLoading(false);
      }
    },
    [ensureAudioContext],
  );

  const handleProgress = useCallback((progress: number) => {
    setCycleProgress(progress);
  }, []);

  const start = useCallback(async () => {
    if (isPreviewingRef.current) {
      stop();
    }

    try {
      await prepareSamplesForPlayback();
      setCycleProgress(0);

      engineRef.current?.start(pieceRef.current, (progress) => {
        handleProgress(progress);
      });

      setIsPlaying(true);
      isPlayingRef.current = true;
    } catch {
      stop();
    }
  }, [handleProgress, prepareSamplesForPlayback, stop]);

  const previewActiveTrack = useCallback(async () => {
    if (isPlayingRef.current) {
      return;
    }

    if (isPreviewingRef.current) {
      stop();
      return;
    }

    try {
      await prepareSamplesForPlayback({ includeInstrumentId: activeTrackId });
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
  }, [activeTrackId, handleProgress, prepareSamplesForPlayback, stop]);

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

  const setTonalidadComposicion = useCallback(
    (value: NotaIndex) => {
      updatePiece((current) =>
        setCompositorTonalidadComposicion(current, value),
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

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void ensureAudioContext()
      .then((audioContext) => prefetchCompositorSamplePack(audioContext, activeTrackId))
      .catch(() => undefined);
  }, [activeTrackId, ensureAudioContext, hydrated]);

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

  const applyPieceFromLibrary = useCallback(
    (nextPiece: CompositorPiece) => {
      stop();
      const normalized = normalizeCompositorPiece(cloneCompositorPiece(nextPiece));
      setPieceState(normalized);
      setBaselinePiece(cloneCompositorPiece(normalized));
      setActivePresetId(null);
      setActiveTrackIdState("bateria");
      setSelectedEventIdState(null);
    },
    [stop],
  );

  const cycles = useCompositorCycles({
    isLoggedIn,
    online,
    enabled: cyclesEnabled,
    getPiece: () => pieceRef.current,
    onApplyPiece: applyPieceFromLibrary,
    onStopPlayback: stop,
  });

  const {
    clearActiveCycle,
    savedCycles,
    activeCycleId,
    activeCycle,
    cyclesLoading,
    cyclesBusy,
    cyclesError,
    refreshCycles,
    saveCurrentCycle,
    updateActiveCycle,
    loadCycle,
    renameCycle,
    deleteCycle,
    suggestCycleName,
  } = cycles;

  const resetPiece = useCallback(() => {
    stop();
    const next = createDefaultCompositorPiece();
    setPieceState(next);
    setBaselinePiece(cloneCompositorPiece(next));
    setActivePresetId(null);
    setActiveTrackIdState("bateria");
    setSelectedEventIdState(null);
    clearActiveCycle();
  }, [clearActiveCycle, stop]);

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
      clearActiveCycle();
    },
    [clearActiveCycle, stop],
  );

  const discardCycleChanges = useCallback(() => {
    stop();

    if (activeCycleId) {
      const cycle = savedCycles.find((entry) => entry.id === activeCycleId);

      if (cycle) {
        applyPieceFromLibrary(cycle.piece);
        return;
      }
    }

    resetPiece();
  }, [activeCycleId, applyPieceFromLibrary, resetPiece, savedCycles, stop]);

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
    samplesLoading,
    setActiveTrackId,
    setSelectedEventId: setSelectedEventIdState,
    setBpm,
    setCycleGolpes,
    setCycleBeatDurationAtSlot,
    tonalidadComposicion: piece.tonalidadComposicion,
    setTonalidadComposicion,
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
    discardCycleChanges,
    savedCycles,
    activeCycleId,
    activeCycle,
    cyclesLoading,
    cyclesBusy,
    cyclesError,
    refreshCycles,
    saveCurrentCycle,
    updateActiveCycle,
    loadCycle,
    renameCycle,
    deleteCycle,
    suggestCycleName,
    clearActiveCycle,
  };
}

export const COMPOSITOR_DUMMY_BEAT_PATTERN = METRONOME_PATTERN_DEFAULT;
