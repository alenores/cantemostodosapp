"use client";

import {
  addCompositorTrackEvent,
  applyCompositorListenMutes,
  cloneCompositorPiece,
  COMPOSITOR_MAX_EVENTS_PER_TRACK,
  compositorPiecesEqualContent,
  createDefaultCompositorPiece,
  formatTrackOverflowDetails,
  getCompositorTrack,
  getInstrumentLabel,
  normalizeCompositorPiece,
  pieceHasTrackOverflow,
  readStoredCompositorPiece,
  removeCompositorTrackEvent,
  setCompositorCycleBeatDurationAtSlot,
  setCompositorCycleGolpes,
  setCompositorTonalidadComposicion,
  setCompositorModoTonalComposicion,
  toggleCompositorTrack,
  updateCompositorTrackEvent,
  writeStoredCompositorPiece,
  type CompositorDrumSound,
  type CompositorInstrumentId,
  type CompositorMelodicInstrumentId,
  type CompositorPiece,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import {
  isMelodicCompositorInstrument,
  resolveEventMelodicNote,
} from "@/lib/compositor-melodic-pitch";
import {
  buildMelodicTimelineRows,
  getMelodicEventRowId,
} from "@/lib/compositor-timeline-layout";
import {
  getCompositorGridSteps,
  isDrumCellOccupied,
  isMelodicCellOccupied,
} from "@/lib/compositor-timeline";
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
import type { ModoTonal } from "@/lib/cifrado-escala";
import {
  COMPOSITOR_NOTICE_CELL_OCCUPIED,
  COMPOSITOR_NOTICE_CYCLE_FULL,
  COMPOSITOR_NOTICE_TRACK_AT_CAPACITY,
  COMPOSITOR_NOTICE_TRACK_OVERFLOW_LOAD,
} from "@/lib/ritmo-terminologia";
import {
  applyDrumPatternToPiece,
  buildDrumPatternPreviewPiece,
  getCompositorDrumPatternById,
  type CompositorDrumPatternId,
} from "@/lib/compositor-drum-patterns";
import {
  applyMelodicPatternToPiece,
  buildMelodicPatternPreviewPiece,
  getCompositorMelodicPatternById,
  type CompositorMelodicPatternId,
} from "@/lib/compositor-melodic-patterns";

const EDITOR_NOTICE_DISMISS_MS = 5000;
import { useCallback, useEffect, useRef, useState } from "react";

const TAP_TEMPO_RESET_MS = 2200;
const TAP_TEMPO_MIN_TAPS = 2;
const DRUM_PATTERN_PREVIEW_CYCLES = 3;
const MELODIC_PATTERN_PREVIEW_CYCLES = 3;

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
  activeDrumPatternId: CompositorDrumPatternId | null;
  activeMelodicPatternId: CompositorMelodicPatternId | null;
  activeMelodicPatternInstrumentId: CompositorMelodicInstrumentId | null;
  selectedEventIds: string[];
  cycleGolpes: number;
  cycleBeatDurations: MetronomeBeatDurationPattern;
  bpm: number;
  isPlaying: boolean;
  isPreviewingTrack: boolean;
  isPreviewingCrop: boolean;
  previewingDrumPatternId: CompositorDrumPatternId | null;
  drumPatternPreviewProgress: number | null;
  previewingMelodicPatternId: CompositorMelodicPatternId | null;
  melodicPatternPreviewProgress: number | null;
  cycleProgress: number | null;
  tapTempoTapCount: number;
  samplesLoading: boolean;
  setActiveTrackId: (instrumentId: CompositorInstrumentId) => void;
  setSelectedEventIds: (eventIds: string[]) => void;
  setBpm: (value: number) => void;
  setCycleGolpes: (value: number) => void;
  setCycleBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  tonalidadComposicion: NotaIndex;
  setTonalidadComposicion: (value: NotaIndex) => void;
  modoTonalComposicion: ModoTonal;
  setModoTonalComposicion: (value: ModoTonal) => void;
  addTrackEvent: (instrumentId?: CompositorInstrumentId) => void;
  placeTrackEvent: (
    instrumentId: CompositorInstrumentId,
    partial: Partial<CompositorTrackEvent>,
    options?: {
      rowId?: string;
      octaveExact?: boolean;
      selectOnPlace?: boolean;
    },
  ) => string | null;
  updateTrackEvent: (
    eventId: string,
    patch: Partial<CompositorTrackEvent>,
    instrumentId?: CompositorInstrumentId,
  ) => void;
  updateTrackEvents: (
    updates: { eventId: string; patch: Partial<CompositorTrackEvent> }[],
    instrumentId?: CompositorInstrumentId,
  ) => void;
  removeTrackEvent: (eventId: string, instrumentId?: CompositorInstrumentId) => void;
  removeTrackEvents: (
    eventIds: string[],
    instrumentId?: CompositorInstrumentId,
  ) => void;
  toggleTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
  toggleListenTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
  resetListenPlaybackLayers: () => void;
  listenMutedTrackIds: CompositorInstrumentId[];
  tapTempo: () => void;
  start: () => Promise<void>;
  previewActiveTrack: () => Promise<void>;
  previewDrumPattern: (patternId: CompositorDrumPatternId) => Promise<void>;
  stopDrumPatternPreview: () => void;
  previewMelodicPattern: (
    patternId: CompositorMelodicPatternId,
    instrumentId: CompositorMelodicInstrumentId,
  ) => Promise<void>;
  stopMelodicPatternPreview: () => void;
  previewPieceOnce: (piece: CompositorPiece) => Promise<void>;
  previewPieceTrackOnce: (
    piece: CompositorPiece,
    instrumentId: CompositorInstrumentId,
  ) => Promise<void>;
  stop: () => void;
  resetPiece: () => void;
  applyDrumPattern: (patternId: CompositorDrumPatternId) => void;
  applyMelodicPattern: (
    patternId: CompositorMelodicPatternId,
    instrumentId: CompositorMelodicInstrumentId,
  ) => void;
  isPieceModifiedFromBaseline: boolean;
  discardCycleChanges: () => void;
  editorNotice: string | null;
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
  const [activeDrumPatternId, setActiveDrumPatternId] =
    useState<CompositorDrumPatternId | null>(null);
  const [activeMelodicPatternId, setActiveMelodicPatternId] =
    useState<CompositorMelodicPatternId | null>(null);
  const [activeMelodicPatternInstrumentId, setActiveMelodicPatternInstrumentId] =
    useState<CompositorMelodicInstrumentId | null>(null);
  const [selectedEventIds, setSelectedEventIdsState] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewingTrack, setIsPreviewingTrack] = useState(false);
  const [isPreviewingCrop, setIsPreviewingCrop] = useState(false);
  const [previewingDrumPatternId, setPreviewingDrumPatternId] =
    useState<CompositorDrumPatternId | null>(null);
  const [drumPatternPreviewProgress, setDrumPatternPreviewProgress] =
    useState<number | null>(null);
  const [previewingMelodicPatternId, setPreviewingMelodicPatternId] =
    useState<CompositorMelodicPatternId | null>(null);
  const [melodicPatternPreviewProgress, setMelodicPatternPreviewProgress] =
    useState<number | null>(null);
  const [cycleProgress, setCycleProgress] = useState<number | null>(null);
  const [tapTempoTapCount, setTapTempoTapCount] = useState(0);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [baselinePiece, setBaselinePiece] = useState<CompositorPiece>(
    createDefaultCompositorPiece,
  );
  const [editorNotice, setEditorNotice] = useState<string | null>(null);
  const [listenMutedTrackIds, setListenMutedTrackIds] = useState<
    CompositorInstrumentId[]
  >([]);

  const pieceRef = useRef(piece);
  const listenMutedTrackIdsRef = useRef(listenMutedTrackIds);
  const isPlayingRef = useRef(false);
  const isPreviewingRef = useRef(false);
  const isPreviewingCropRef = useRef(false);
  const isPreviewingDrumPatternRef = useRef(false);
  const isPreviewingMelodicPatternRef = useRef(false);
  const tapTimestampsRef = useRef<number[]>([]);
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const engineRef = useRef<CompositorEngine | null>(null);
  const samplesReadyRef = useRef(false);

  pieceRef.current = piece;
  listenMutedTrackIdsRef.current = listenMutedTrackIds;
  isPlayingRef.current = isPlaying;

  const activeTrack = getCompositorTrack(piece, activeTrackId);
  const isPieceModifiedFromBaseline = !compositorPiecesEqualContent(
    piece,
    baselinePiece,
  );

  const showEditorNotice = useCallback((message: string) => {
    setEditorNotice(message);

    if (editorNoticeTimerRef.current !== null) {
      clearTimeout(editorNoticeTimerRef.current);
    }

    editorNoticeTimerRef.current = setTimeout(() => {
      setEditorNotice(null);
      editorNoticeTimerRef.current = null;
    }, EDITOR_NOTICE_DISMISS_MS);
  }, []);

  const notifyTrackOverflowIfNeeded = useCallback(
    (nextPiece: CompositorPiece) => {
      if (!pieceHasTrackOverflow(nextPiece)) {
        return;
      }

      showEditorNotice(
        COMPOSITOR_NOTICE_TRACK_OVERFLOW_LOAD(formatTrackOverflowDetails(nextPiece)),
      );
    },
    [showEditorNotice],
  );

  useEffect(() => {
    const stored = readStoredCompositorPiece();
    const initial = stored ?? createDefaultCompositorPiece();

    setPieceState(initial);
    setBaselinePiece(cloneCompositorPiece(initial));
    setSelectedEventIdsState([]);
    setHydrated(true);
    notifyTrackOverflowIfNeeded(initial);
  }, [notifyTrackOverflowIfNeeded]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    writeStoredCompositorPiece(piece);
  }, [hydrated, piece]);

  useEffect(() => {
    const validIds = new Set(activeTrack.events.map((event) => event.id));
    setSelectedEventIdsState((current) => {
      const next = current.filter((id) => validIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, [activeTrack.events]);

  const updatePiece = useCallback(
    (updater: (current: CompositorPiece) => CompositorPiece) => {
      setActiveDrumPatternId(null);
      setActiveMelodicPatternId(null);
      setActiveMelodicPatternInstrumentId(null);
      setPieceState((current) => normalizeCompositorPiece(updater(current)));
    },
    [],
  );

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setIsPlaying(false);
    setIsPreviewingTrack(false);
    setIsPreviewingCrop(false);
    setPreviewingDrumPatternId(null);
    setDrumPatternPreviewProgress(null);
    setPreviewingMelodicPatternId(null);
    setMelodicPatternPreviewProgress(null);
    isPlayingRef.current = false;
    isPreviewingRef.current = false;
    isPreviewingCropRef.current = false;
    isPreviewingDrumPatternRef.current = false;
    isPreviewingMelodicPatternRef.current = false;
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

  const prepareSamplesForPiece = useCallback(
    async (targetPiece: CompositorPiece) => {
      setSamplesLoading(true);

      try {
        const audioContext = await ensureAudioContext();
        const samples = await ensureCompositorSamplesForPiece(
          audioContext,
          targetPiece,
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

  const getPlaybackPiece = useCallback(() => {
    return applyCompositorListenMutes(
      pieceRef.current,
      new Set(listenMutedTrackIdsRef.current),
    );
  }, []);

  const start = useCallback(async () => {
    if (isPreviewingRef.current) {
      stop();
    }

    try {
      const playbackPiece = getPlaybackPiece();
      setSamplesLoading(true);

      try {
        const audioContext = await ensureAudioContext();
        const samples = await ensureCompositorSamplesForPiece(
          audioContext,
          playbackPiece,
        );
        engineRef.current?.stop();
        engineRef.current = createCompositorEngine(audioContext, samples);
      } finally {
        setSamplesLoading(false);
      }

      setCycleProgress(0);

      engineRef.current?.start(playbackPiece, (progress) => {
        handleProgress(progress);
      });

      setIsPlaying(true);
      isPlayingRef.current = true;
    } catch {
      stop();
    }
  }, [ensureAudioContext, getPlaybackPiece, handleProgress, stop]);

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

  const previewPieceOnce = useCallback(
    async (previewPiece: CompositorPiece) => {
      if (isPreviewingCropRef.current) {
        stop();
        return;
      }

      if (isPlayingRef.current || isPreviewingRef.current) {
        stop();
      }

      try {
        await prepareSamplesForPiece(previewPiece);
        setCycleProgress(0);
        setIsPreviewingCrop(true);
        isPreviewingCropRef.current = true;

        engineRef.current?.playOnce(previewPiece, handleProgress, () => {
          setIsPreviewingCrop(false);
          isPreviewingCropRef.current = false;
          setCycleProgress(null);
        });
      } catch {
        stop();
      }
    },
    [handleProgress, prepareSamplesForPiece, stop],
  );

  const previewPieceTrackOnce = useCallback(
    async (
      previewPiece: CompositorPiece,
      instrumentId: CompositorInstrumentId,
    ) => {
      if (isPreviewingRef.current) {
        stop();
        return;
      }

      if (isPreviewingCropRef.current) {
        stop();
      }

      if (isPlayingRef.current) {
        return;
      }

      try {
        setSamplesLoading(true);

        const audioContext = await ensureAudioContext();
        const samples = await ensureCompositorSamplesForPiece(
          audioContext,
          previewPiece,
          { includeInstrumentId: instrumentId },
        );
        engineRef.current?.stop();
        engineRef.current = createCompositorEngine(audioContext, samples);
        setCycleProgress(0);
        setIsPreviewingTrack(true);
        isPreviewingRef.current = true;

        engineRef.current?.playSingleCycle(
          previewPiece,
          instrumentId,
          handleProgress,
          () => {
            setIsPreviewingTrack(false);
            isPreviewingRef.current = false;
            setCycleProgress(null);
          },
        );
      } catch {
        stop();
      } finally {
        setSamplesLoading(false);
      }
    },
    [ensureAudioContext, handleProgress, stop],
  );

  const stopDrumPatternPreview = useCallback(() => {
    if (!isPreviewingDrumPatternRef.current) {
      return;
    }

    stop();
  }, [stop]);

  const previewDrumPattern = useCallback(
    async (patternId: CompositorDrumPatternId) => {
      if (isPlayingRef.current) {
        return;
      }

      if (
        isPreviewingDrumPatternRef.current &&
        previewingDrumPatternId === patternId
      ) {
        stopDrumPatternPreview();
        return;
      }

      if (
        isPreviewingRef.current ||
        isPreviewingCropRef.current ||
        isPreviewingDrumPatternRef.current ||
        isPreviewingMelodicPatternRef.current
      ) {
        stop();
      }

      const pattern = getCompositorDrumPatternById(patternId);
      if (!pattern) {
        return;
      }

      const previewPiece = buildDrumPatternPreviewPiece(pattern);

      try {
        await prepareSamplesForPiece(previewPiece);
        setPreviewingDrumPatternId(patternId);
        setDrumPatternPreviewProgress(0);
        isPreviewingDrumPatternRef.current = true;

        engineRef.current?.playTrackCycles(
          previewPiece,
          "bateria",
          DRUM_PATTERN_PREVIEW_CYCLES,
          (progress) => {
            const cycleProgress =
              (progress * DRUM_PATTERN_PREVIEW_CYCLES) % 1;
            setDrumPatternPreviewProgress(cycleProgress);
          },
          () => {
            setPreviewingDrumPatternId(null);
            setDrumPatternPreviewProgress(null);
            isPreviewingDrumPatternRef.current = false;
          },
        );
      } catch {
        stop();
      }
    },
    [prepareSamplesForPiece, previewingDrumPatternId, stop, stopDrumPatternPreview],
  );

  const stopMelodicPatternPreview = useCallback(() => {
    if (!isPreviewingMelodicPatternRef.current) {
      return;
    }

    stop();
  }, [stop]);

  const previewMelodicPattern = useCallback(
    async (
      patternId: CompositorMelodicPatternId,
      instrumentId: CompositorMelodicInstrumentId,
    ) => {
      if (isPlayingRef.current) {
        return;
      }

      if (
        isPreviewingMelodicPatternRef.current &&
        previewingMelodicPatternId === patternId
      ) {
        stopMelodicPatternPreview();
        return;
      }

      if (
        isPreviewingRef.current ||
        isPreviewingCropRef.current ||
        isPreviewingDrumPatternRef.current ||
        isPreviewingMelodicPatternRef.current
      ) {
        stop();
      }

      const pattern = getCompositorMelodicPatternById(patternId);
      if (!pattern) {
        return;
      }

      const previewPiece = buildMelodicPatternPreviewPiece(
        pattern,
        instrumentId,
        pieceRef.current.tonalidadComposicion,
        pieceRef.current.modoTonalComposicion,
      );

      try {
        await prepareSamplesForPiece(previewPiece);
        setPreviewingMelodicPatternId(patternId);
        setMelodicPatternPreviewProgress(0);
        isPreviewingMelodicPatternRef.current = true;

        engineRef.current?.playTrackCycles(
          previewPiece,
          instrumentId,
          MELODIC_PATTERN_PREVIEW_CYCLES,
          (progress) => {
            const cycleProgress =
              (progress * MELODIC_PATTERN_PREVIEW_CYCLES) % 1;
            setMelodicPatternPreviewProgress(cycleProgress);
          },
          () => {
            setPreviewingMelodicPatternId(null);
            setMelodicPatternPreviewProgress(null);
            isPreviewingMelodicPatternRef.current = false;
          },
        );
      } catch {
        stop();
      }
    },
    [
      prepareSamplesForPiece,
      previewingMelodicPatternId,
      stop,
      stopMelodicPatternPreview,
    ],
  );

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

  const setModoTonalComposicion = useCallback(
    (value: ModoTonal) => {
      updatePiece((current) =>
        setCompositorModoTonalComposicion(current, value),
      );
      restartIfPlaying();
    },
    [restartIfPlaying, updatePiece],
  );

  const placeTrackEvent = useCallback(
    (
      instrumentId: CompositorInstrumentId,
      partial: Partial<CompositorTrackEvent>,
      options?: {
        rowId?: string;
        octaveExact?: boolean;
        selectOnPlace?: boolean;
      },
    ): string | null => {
      const currentPiece = pieceRef.current;
      const gridSteps = getCompositorGridSteps(currentPiece);
      const track = getCompositorTrack(currentPiece, instrumentId);
      const startStep = partial.startStep ?? 0;

      if (track.events.length >= COMPOSITOR_MAX_EVENTS_PER_TRACK) {
        showEditorNotice(
          COMPOSITOR_NOTICE_TRACK_AT_CAPACITY(getInstrumentLabel(instrumentId)),
        );
        return null;
      }

      if (instrumentId === "bateria") {
        const drumSound = (partial.drumSound ?? "kick") as CompositorDrumSound;

        if (isDrumCellOccupied(track.events, drumSound, startStep)) {
          showEditorNotice(COMPOSITOR_NOTICE_CELL_OCCUPIED);
          return null;
        }
      } else if (isMelodicCompositorInstrument(instrumentId)) {
        const octaveExact = options?.octaveExact ?? true;
        const rowId = options?.rowId;
        const durationSteps =
          partial.durationSteps ?? currentPiece.subdivisionsPerGolpe;

        if (startStep + durationSteps > gridSteps) {
          showEditorNotice(COMPOSITOR_NOTICE_CYCLE_FULL);
          return null;
        }

        if (!rowId) {
          return null;
        }

        const resolvedEvents = track.events.map((event) => ({
          ...event,
          note: resolveEventMelodicNote(
            event,
            currentPiece.tonalidadComposicion,
            instrumentId,
          ),
        }));
        const rows = buildMelodicTimelineRows(
          resolvedEvents,
          octaveExact,
          instrumentId,
        );

        if (isMelodicCellOccupied(
          track.events,
          rowId,
          startStep,
          (event) => getMelodicEventRowId(event, rows, octaveExact),
        )) {
          showEditorNotice(COMPOSITOR_NOTICE_CELL_OCCUPIED);
          return null;
        }
      }

      let placedEventId: string | null = null;

      updatePiece((current) => {
        const next = addCompositorTrackEvent(current, instrumentId, partial);
        const newEvent = getCompositorTrack(next, instrumentId).events.at(-1);
        placedEventId = newEvent?.id ?? null;
        return next;
      });

      if (placedEventId && options?.selectOnPlace !== false) {
        setSelectedEventIdsState([placedEventId]);
      }

      restartIfPlaying();
      return placedEventId;
    },
    [restartIfPlaying, showEditorNotice, updatePiece],
  );

  const addTrackEvent = useCallback(
    (instrumentId: CompositorInstrumentId = activeTrackId) => {
      const gridSteps = getCompositorGridSteps(pieceRef.current);
      const track = getCompositorTrack(pieceRef.current, instrumentId);

      if (track.events.length >= COMPOSITOR_MAX_EVENTS_PER_TRACK) {
        showEditorNotice(
          COMPOSITOR_NOTICE_TRACK_AT_CAPACITY(getInstrumentLabel(instrumentId)),
        );
        return;
      }

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
          setSelectedEventIdsState([newEvent.id]);
        }

        return next;
      });

      restartIfPlaying();
    },
    [activeTrackId, restartIfPlaying, showEditorNotice, updatePiece],
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

  const updateTrackEvents = useCallback(
    (
      updates: { eventId: string; patch: Partial<CompositorTrackEvent> }[],
      instrumentId: CompositorInstrumentId = activeTrackId,
    ) => {
      if (updates.length === 0) {
        return;
      }

      updatePiece((current) => {
        let next = current;

        for (const { eventId, patch } of updates) {
          next = updateCompositorTrackEvent(next, instrumentId, eventId, patch);
        }

        return next;
      });
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
      setSelectedEventIdsState((current) =>
        current.filter((id) => id !== eventId),
      );
      restartIfPlaying();
    },
    [activeTrackId, restartIfPlaying, updatePiece],
  );

  const removeTrackEvents = useCallback(
    (
      eventIds: string[],
      instrumentId: CompositorInstrumentId = activeTrackId,
    ) => {
      if (eventIds.length === 0) {
        return;
      }

      const removeSet = new Set(eventIds);
      updatePiece((current) => {
        let next = current;

        for (const eventId of eventIds) {
          next = removeCompositorTrackEvent(next, instrumentId, eventId);
        }

        return next;
      });
      setSelectedEventIdsState((current) =>
        current.filter((id) => !removeSet.has(id)),
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

  const resetListenPlaybackLayers = useCallback(() => {
    setListenMutedTrackIds([]);
  }, []);

  const toggleListenTrack = useCallback(
    (instrumentId: CompositorInstrumentId, enabled: boolean) => {
      setListenMutedTrackIds((current) => {
        const next = enabled
          ? current.filter((id) => id !== instrumentId)
          : current.includes(instrumentId)
            ? current
            : [...current, instrumentId];

        return next;
      });
      restartIfPlaying();
    },
    [restartIfPlaying],
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
    setSelectedEventIdsState([]);
  }, []);

  const applyPieceFromLibrary = useCallback(
    (nextPiece: CompositorPiece) => {
      stop();
      const normalized = normalizeCompositorPiece(cloneCompositorPiece(nextPiece));
      setPieceState(normalized);
      setBaselinePiece(cloneCompositorPiece(normalized));
      setActiveDrumPatternId(null);
      setActiveMelodicPatternId(null);
      setActiveMelodicPatternInstrumentId(null);
      setActiveTrackIdState("bateria");
      setSelectedEventIdsState([]);
      notifyTrackOverflowIfNeeded(normalized);
    },
    [notifyTrackOverflowIfNeeded, stop],
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
    savedCycles,
    activeCycleId,
    activeCycle,
    cyclesLoading,
    cyclesBusy,
    cyclesError,
    cyclesNotice,
    refreshCycles,
    saveCurrentCycle,
    updateActiveCycle,
    loadCycle,
    renameCycle,
    deleteCycle,
    suggestCycleName,
    clearActiveCycle,
    setCyclePublic,
    importCommunityCycle,
  } = cycles;

  const resetPiece = useCallback(() => {
    stop();
    const next = createDefaultCompositorPiece();
    setPieceState(next);
    setBaselinePiece(cloneCompositorPiece(next));
    setActiveDrumPatternId(null);
    setActiveMelodicPatternId(null);
    setActiveMelodicPatternInstrumentId(null);
    setActiveTrackIdState("bateria");
    setSelectedEventIdsState([]);
    clearActiveCycle();
  }, [clearActiveCycle, stop]);

  const applyDrumPattern = useCallback(
    (patternId: CompositorDrumPatternId) => {
      const pattern = getCompositorDrumPatternById(patternId);

      if (!pattern) {
        return;
      }

      stop();
      const next = applyDrumPatternToPiece(pieceRef.current, pattern);
      setPieceState(next);
      setActiveDrumPatternId(patternId);
      setActiveTrackIdState("bateria");
      setSelectedEventIdsState([]);
      notifyTrackOverflowIfNeeded(next);
    },
    [notifyTrackOverflowIfNeeded, stop],
  );

  const applyMelodicPattern = useCallback(
    (
      patternId: CompositorMelodicPatternId,
      instrumentId: CompositorMelodicInstrumentId,
    ) => {
      const pattern = getCompositorMelodicPatternById(patternId);

      if (!pattern) {
        return;
      }

      stop();
      const next = applyMelodicPatternToPiece(
        pieceRef.current,
        pattern,
        instrumentId,
      );
      setPieceState(next);
      setActiveMelodicPatternId(patternId);
      setActiveMelodicPatternInstrumentId(instrumentId);
      setActiveTrackIdState(instrumentId);
      setSelectedEventIdsState([]);
      notifyTrackOverflowIfNeeded(next);
    },
    [notifyTrackOverflowIfNeeded, stop],
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

      if (editorNoticeTimerRef.current !== null) {
        clearTimeout(editorNoticeTimerRef.current);
      }
    };
  }, [stop]);

  return {
    piece,
    activeTrackId,
    activeDrumPatternId,
    activeMelodicPatternId,
    activeMelodicPatternInstrumentId,
    selectedEventIds,
    cycleGolpes: piece.cycleGolpes,
    cycleBeatDurations: piece.cycleBeatDurations,
    bpm: piece.bpm,
    isPlaying,
    isPreviewingTrack,
    isPreviewingCrop,
    previewingDrumPatternId,
    drumPatternPreviewProgress,
    previewingMelodicPatternId,
    melodicPatternPreviewProgress,
    cycleProgress,
    tapTempoTapCount,
    samplesLoading,
    setActiveTrackId,
    setSelectedEventIds: setSelectedEventIdsState,
    setBpm,
    setCycleGolpes,
    setCycleBeatDurationAtSlot,
    tonalidadComposicion: piece.tonalidadComposicion,
    setTonalidadComposicion,
    modoTonalComposicion: piece.modoTonalComposicion,
    setModoTonalComposicion,
    addTrackEvent,
    placeTrackEvent,
    updateTrackEvent,
    updateTrackEvents,
    removeTrackEvent,
    removeTrackEvents,
    toggleTrack,
    toggleListenTrack,
    resetListenPlaybackLayers,
    listenMutedTrackIds,
    tapTempo,
    start,
    previewActiveTrack,
    previewDrumPattern,
    stopDrumPatternPreview,
    previewMelodicPattern,
    stopMelodicPatternPreview,
    previewPieceOnce,
    previewPieceTrackOnce,
    stop,
    resetPiece,
    applyDrumPattern,
    applyMelodicPattern,
    isPieceModifiedFromBaseline,
    discardCycleChanges,
    editorNotice,
    savedCycles,
    activeCycleId,
    activeCycle,
    cyclesLoading,
    cyclesBusy,
    cyclesError,
    cyclesNotice,
    refreshCycles,
    saveCurrentCycle,
    updateActiveCycle,
    loadCycle,
    renameCycle,
    deleteCycle,
    suggestCycleName,
    clearActiveCycle,
    setCyclePublic,
    importCommunityCycle,
  };
}

export const COMPOSITOR_DUMMY_BEAT_PATTERN = METRONOME_PATTERN_DEFAULT;
