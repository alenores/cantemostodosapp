"use client";

import {
  BPM_DEFAULT,
  clampPatternLength,
  createMetronomeEngine,
  cycleMetronomePatternSlot,
  METRONOME_BEAT_DURATION_DEFAULT,
  METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
  normalizeMetronomePattern,
  normalizeBeatDurationPattern,
  resizeMetronomePatternLength,
  setBeatDurationAtSlot as applyBeatDurationAtSlot,
  setBeatLevelAtSlot as applyBeatLevelAtSlot,
  type MetronomeBeatDuration,
  type MetronomeBeatDurationPattern,
  type MetronomeBeatLevel,
  type MetronomeBeatPattern,
  type MetronomeEngine,
} from "@/lib/metronomo";
import {
  normalizeNotaPattern,
  resizeNotaPatternLength,
  setNotaAtSlot,
  VOZ_NOTA_PATTERN_DEFAULT,
  type VozNotaPattern,
} from "@/lib/voz-nota-patron";
import {
  buildMelodiaSingPattern,
  buildUniformBeatDurations,
  clampRitmoBpm,
  createVozRitmoBeatMarker,
  VOZ_MELODIA_PATTERN_LENGTH_DEFAULT,
  VOZ_RITMO_BEAT_PATTERN_DEFAULT,
  VOZ_RITMO_PATTERN_LENGTH_DEFAULT,
  type VozRitmoBeatMarker,
  type VozRitmoPhase,
} from "@/lib/voz-ritmo";
import { VOZ_DEFAULT_TARGET, type VozTarget } from "@/lib/voz";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_MARKERS = 96;
const TAP_RESET_MS = 3000;

type PlaybackMode = "ritmo" | "melodia";

type UseVozRitmoResult = {
  ritmoPlaying: boolean;
  melodiaPlaying: boolean;
  ritmoBpm: number;
  ritmoBeatPattern: MetronomeBeatPattern;
  ritmoPatternLength: number;
  ritmoBeatDurations: MetronomeBeatDurationPattern;
  ritmoTapTempoTapCount: number;
  melodiaPatternLength: number;
  melodiaBpm: number;
  melodiaBeatDuration: MetronomeBeatDuration;
  melodiaNotePattern: VozNotaPattern;
  melodiaTapTempoTapCount: number;
  comboNotePattern: VozNotaPattern;
  currentPhase: VozRitmoPhase | null;
  beatMarkers: VozRitmoBeatMarker[];
  setRitmoBpm: (value: number) => void;
  setRitmoPatternLength: (value: number) => void;
  setRitmoBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  setRitmoBeatLevelAtSlot: (
    slotIndex: number,
    level: MetronomeBeatLevel,
  ) => void;
  cycleRitmoBeatPatternSlot: (slotIndex: number) => void;
  setMelodiaPatternLength: (value: number) => void;
  setMelodiaBpm: (value: number) => void;
  setMelodiaBeatDuration: (value: MetronomeBeatDuration) => void;
  setMelodiaNoteAtSlot: (slotIndex: number, target: VozTarget) => void;
  setComboNoteAtSlot: (slotIndex: number, target: VozTarget) => void;
  tapRitmoTempo: () => void;
  tapMelodiaTempo: () => void;
  startRitmo: () => void;
  stopRitmo: () => void;
  toggleRitmoPlaying: () => void;
  startMelodia: () => void;
  stopMelodia: () => void;
  toggleMelodiaPlaying: () => void;
};

export function useVozRitmo(): UseVozRitmoResult {
  const [ritmoPlaying, setRitmoPlaying] = useState(false);
  const [melodiaPlaying, setMelodiaPlaying] = useState(false);
  const [ritmoBpm, setRitmoBpmState] = useState(BPM_DEFAULT);
  const [ritmoBeatPattern, setRitmoBeatPatternState] =
    useState<MetronomeBeatPattern>([...VOZ_RITMO_BEAT_PATTERN_DEFAULT]);
  const [ritmoPatternLength, setRitmoPatternLengthState] = useState(
    VOZ_RITMO_PATTERN_LENGTH_DEFAULT,
  );
  const [ritmoBeatDurations, setRitmoBeatDurationsState] =
    useState<MetronomeBeatDurationPattern>([
      ...METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
    ]);
  const [ritmoTapTempoTapCount, setRitmoTapTempoTapCount] = useState(0);
  const [melodiaPatternLength, setMelodiaPatternLengthState] = useState(
    VOZ_MELODIA_PATTERN_LENGTH_DEFAULT,
  );
  const [melodiaBpm, setMelodiaBpmState] = useState(BPM_DEFAULT);
  const [melodiaBeatDuration, setMelodiaBeatDurationState] =
    useState<MetronomeBeatDuration>(METRONOME_BEAT_DURATION_DEFAULT);
  const [melodiaNotePattern, setMelodiaNotePatternState] =
    useState<VozNotaPattern>([...VOZ_NOTA_PATTERN_DEFAULT]);
  const [melodiaTapTempoTapCount, setMelodiaTapTempoTapCount] = useState(0);
  const [comboNotePattern, setComboNotePatternState] = useState<VozNotaPattern>(
    [...VOZ_NOTA_PATTERN_DEFAULT],
  );
  const [currentPhase, setCurrentPhase] = useState<VozRitmoPhase | null>(null);
  const [beatMarkers, setBeatMarkers] = useState<VozRitmoBeatMarker[]>([]);

  const ritmoBpmRef = useRef(ritmoBpm);
  const ritmoBeatPatternRef = useRef(ritmoBeatPattern);
  const ritmoPatternLengthRef = useRef(ritmoPatternLength);
  const ritmoBeatDurationsRef = useRef(ritmoBeatDurations);
  const melodiaPatternLengthRef = useRef(melodiaPatternLength);
  const melodiaBpmRef = useRef(melodiaBpm);
  const melodiaBeatDurationRef = useRef(melodiaBeatDuration);
  const ritmoPlayingRef = useRef(false);
  const melodiaPlayingRef = useRef(false);
  const playbackModeRef = useRef<PlaybackMode>("ritmo");
  const ritmoTapTimestampsRef = useRef<number[]>([]);
  const melodiaTapTimestampsRef = useRef<number[]>([]);
  const ritmoTapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const melodiaTapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const engineRef = useRef<MetronomeEngine | null>(null);

  ritmoBpmRef.current = ritmoBpm;
  ritmoBeatPatternRef.current = ritmoBeatPattern;
  ritmoPatternLengthRef.current = ritmoPatternLength;
  ritmoBeatDurationsRef.current = ritmoBeatDurations;
  melodiaPatternLengthRef.current = melodiaPatternLength;
  melodiaBpmRef.current = melodiaBpm;
  melodiaBeatDurationRef.current = melodiaBeatDuration;
  ritmoPlayingRef.current = ritmoPlaying;
  melodiaPlayingRef.current = melodiaPlaying;

  const closeAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    engineRef.current = null;
  }, []);

  const stopEngine = useCallback(() => {
    engineRef.current?.stop();
    setRitmoPlaying(false);
    setMelodiaPlaying(false);
    ritmoPlayingRef.current = false;
    melodiaPlayingRef.current = false;
    setCurrentPhase(null);
    setBeatMarkers([]);
  }, []);

  const stopRitmo = useCallback(() => {
    stopEngine();
    closeAudioContext();
  }, [closeAudioContext, stopEngine]);

  const stopMelodia = useCallback(() => {
    stopEngine();
    closeAudioContext();
  }, [closeAudioContext, stopEngine]);

  const ensureAudioContext = useCallback(async (): Promise<AudioContext> => {
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

  const startPlayback = useCallback(
    (mode: PlaybackMode) => {
      void (async () => {
        try {
          await ensureAudioContext();

          const engine = engineRef.current;

          if (!engine) {
            return;
          }

          stopEngine();
          playbackModeRef.current = mode;
          setBeatMarkers([]);

          if (mode === "ritmo") {
            setRitmoPlaying(true);
            ritmoPlayingRef.current = true;

            engine.start(
              ritmoBpmRef.current,
              ritmoBeatPatternRef.current,
              ritmoPatternLengthRef.current,
              ritmoBeatDurationsRef.current,
              (beatIndex, expectedTimeMs) => {
                const marker = createVozRitmoBeatMarker(
                  beatIndex,
                  expectedTimeMs,
                  ritmoBeatPatternRef.current,
                  ritmoPatternLengthRef.current,
                );

                setCurrentPhase(marker.phase);
                setBeatMarkers((previous) => {
                  const next = [...previous, marker];
                  return next.length > MAX_MARKERS
                    ? next.slice(next.length - MAX_MARKERS)
                    : next;
                });
              },
            );
            return;
          }

          setMelodiaPlaying(true);
          melodiaPlayingRef.current = true;

          const melodiaPattern = buildMelodiaSingPattern(
            melodiaPatternLengthRef.current,
          );
          const melodiaDurations = buildUniformBeatDurations(
            melodiaBeatDurationRef.current,
          );

          engine.start(
            melodiaBpmRef.current,
            melodiaPattern,
            melodiaPatternLengthRef.current,
            melodiaDurations,
            (beatIndex, expectedTimeMs) => {
              const marker = createVozRitmoBeatMarker(
                beatIndex,
                expectedTimeMs,
                melodiaPattern,
                melodiaPatternLengthRef.current,
              );

              setCurrentPhase(marker.phase);
              setBeatMarkers((previous) => {
                const next = [...previous, marker];
                return next.length > MAX_MARKERS
                  ? next.slice(next.length - MAX_MARKERS)
                  : next;
              });
            },
          );
        } catch {
          stopEngine();
          closeAudioContext();
        }
      })();
    },
    [closeAudioContext, ensureAudioContext, stopEngine],
  );

  const startRitmo = useCallback(() => {
    startPlayback("ritmo");
  }, [startPlayback]);

  const startMelodia = useCallback(() => {
    startPlayback("melodia");
  }, [startPlayback]);

  const toggleRitmoPlaying = useCallback(() => {
    if (ritmoPlayingRef.current) {
      stopRitmo();
      return;
    }

    startRitmo();
  }, [startRitmo, stopRitmo]);

  const toggleMelodiaPlaying = useCallback(() => {
    if (melodiaPlayingRef.current) {
      stopMelodia();
      return;
    }

    startMelodia();
  }, [startMelodia, stopMelodia]);

  const stopIfPlaying = useCallback(() => {
    if (ritmoPlayingRef.current || melodiaPlayingRef.current) {
      stopEngine();
    }
  }, [stopEngine]);

  const setRitmoBpm = useCallback(
    (value: number) => {
      const next = clampRitmoBpm(value);
      setRitmoBpmState(next);
      stopIfPlaying();
    },
    [stopIfPlaying],
  );

  const setMelodiaBpm = useCallback(
    (value: number) => {
      const next = clampRitmoBpm(value);
      setMelodiaBpmState(next);
      stopIfPlaying();
    },
    [stopIfPlaying],
  );

  const setRitmoPatternLength = useCallback(
    (value: number) => {
      const nextLength = clampPatternLength(value);
      setRitmoPatternLengthState(nextLength);
      setRitmoBeatPatternState((previous) =>
        resizeMetronomePatternLength(
          previous,
          ritmoPatternLengthRef.current,
          nextLength,
        ).pattern,
      );
      setComboNotePatternState((previous) =>
        resizeNotaPatternLength(
          previous,
          ritmoPatternLengthRef.current,
          nextLength,
          VOZ_DEFAULT_TARGET,
        ),
      );
      stopIfPlaying();
    },
    [stopIfPlaying],
  );

  const setMelodiaPatternLength = useCallback(
    (value: number) => {
      const nextLength = clampPatternLength(value);
      setMelodiaPatternLengthState(nextLength);
      setMelodiaNotePatternState((previous) =>
        resizeNotaPatternLength(
          previous,
          melodiaPatternLengthRef.current,
          nextLength,
          VOZ_DEFAULT_TARGET,
        ),
      );
      stopIfPlaying();
    },
    [stopIfPlaying],
  );

  const setMelodiaBeatDuration = useCallback(
    (value: MetronomeBeatDuration) => {
      setMelodiaBeatDurationState(value);
      stopIfPlaying();
    },
    [stopIfPlaying],
  );

  const setRitmoBeatDurationAtSlot = useCallback(
    (slotIndex: number, duration: MetronomeBeatDuration) => {
      const next = applyBeatDurationAtSlot(
        ritmoBeatDurationsRef.current,
        slotIndex,
        duration,
      );
      setRitmoBeatDurationsState(next);
      ritmoBeatDurationsRef.current = next;
      stopIfPlaying();
    },
    [stopIfPlaying],
  );

  const setRitmoBeatLevelAtSlot = useCallback(
    (slotIndex: number, level: MetronomeBeatLevel) => {
      setRitmoBeatPatternState((previous) =>
        applyBeatLevelAtSlot(previous, slotIndex, level),
      );
      stopIfPlaying();
    },
    [stopIfPlaying],
  );

  const cycleRitmoBeatPatternSlot = useCallback(
    (slotIndex: number) => {
      setRitmoBeatPatternState((previous) =>
        cycleMetronomePatternSlot(previous, slotIndex),
      );
      stopIfPlaying();
    },
    [stopIfPlaying],
  );

  const setMelodiaNoteAtSlot = useCallback(
    (slotIndex: number, target: VozTarget) => {
      setMelodiaNotePatternState((previous) =>
        setNotaAtSlot(previous, slotIndex, target),
      );
      stopIfPlaying();
    },
    [stopIfPlaying],
  );

  const setComboNoteAtSlot = useCallback(
    (slotIndex: number, target: VozTarget) => {
      setComboNotePatternState((previous) =>
        setNotaAtSlot(previous, slotIndex, target),
      );
      stopIfPlaying();
    },
    [stopIfPlaying],
  );

  const tapRitmoTempo = useCallback(() => {
    if (ritmoPlayingRef.current) {
      return;
    }

    const now = performance.now();
    const recentTaps = ritmoTapTimestampsRef.current.filter(
      (timestamp) => now - timestamp < TAP_RESET_MS,
    );

    recentTaps.push(now);
    ritmoTapTimestampsRef.current = recentTaps;
    setRitmoTapTempoTapCount(recentTaps.length);

    if (ritmoTapResetTimerRef.current !== null) {
      clearTimeout(ritmoTapResetTimerRef.current);
    }

    ritmoTapResetTimerRef.current = setTimeout(() => {
      ritmoTapTimestampsRef.current = [];
      setRitmoTapTempoTapCount(0);
      ritmoTapResetTimerRef.current = null;
    }, TAP_RESET_MS);

    if (recentTaps.length < 2) {
      return;
    }

    const intervals: number[] = [];

    for (let index = 1; index < recentTaps.length; index += 1) {
      intervals.push(recentTaps[index]! - recentTaps[index - 1]!);
    }

    const lastIntervals = intervals.slice(-4);
    const averageInterval =
      lastIntervals.reduce((sum, interval) => sum + interval, 0) /
      lastIntervals.length;
    const nextBpm = clampRitmoBpm(60000 / averageInterval);

    setRitmoBpmState(nextBpm);
    ritmoBpmRef.current = nextBpm;
  }, []);

  const tapMelodiaTempo = useCallback(() => {
    if (melodiaPlayingRef.current) {
      return;
    }

    const now = performance.now();
    const recentTaps = melodiaTapTimestampsRef.current.filter(
      (timestamp) => now - timestamp < TAP_RESET_MS,
    );

    recentTaps.push(now);
    melodiaTapTimestampsRef.current = recentTaps;
    setMelodiaTapTempoTapCount(recentTaps.length);

    if (melodiaTapResetTimerRef.current !== null) {
      clearTimeout(melodiaTapResetTimerRef.current);
    }

    melodiaTapResetTimerRef.current = setTimeout(() => {
      melodiaTapTimestampsRef.current = [];
      setMelodiaTapTempoTapCount(0);
      melodiaTapResetTimerRef.current = null;
    }, TAP_RESET_MS);

    if (recentTaps.length < 2) {
      return;
    }

    const intervals: number[] = [];

    for (let index = 1; index < recentTaps.length; index += 1) {
      intervals.push(recentTaps[index]! - recentTaps[index - 1]!);
    }

    const lastIntervals = intervals.slice(-4);
    const averageInterval =
      lastIntervals.reduce((sum, interval) => sum + interval, 0) /
      lastIntervals.length;
    const nextBpm = clampRitmoBpm(60000 / averageInterval);

    setMelodiaBpmState(nextBpm);
    melodiaBpmRef.current = nextBpm;
  }, []);

  useEffect(() => {
    ritmoBeatPatternRef.current = normalizeMetronomePattern(ritmoBeatPattern);
  }, [ritmoBeatPattern]);

  useEffect(() => {
    ritmoPatternLengthRef.current = clampPatternLength(ritmoPatternLength);
  }, [ritmoPatternLength]);

  useEffect(() => {
    ritmoBeatDurationsRef.current =
      normalizeBeatDurationPattern(ritmoBeatDurations);
  }, [ritmoBeatDurations]);

  useEffect(() => {
    melodiaPatternLengthRef.current = clampPatternLength(melodiaPatternLength);
  }, [melodiaPatternLength]);

  useEffect(() => {
    melodiaBpmRef.current = melodiaBpm;
  }, [melodiaBpm]);

  useEffect(() => {
    melodiaBeatDurationRef.current = melodiaBeatDuration;
  }, [melodiaBeatDuration]);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      closeAudioContext();

      if (ritmoTapResetTimerRef.current !== null) {
        clearTimeout(ritmoTapResetTimerRef.current);
      }

      if (melodiaTapResetTimerRef.current !== null) {
        clearTimeout(melodiaTapResetTimerRef.current);
      }
    };
  }, [closeAudioContext]);

  return {
    ritmoPlaying,
    melodiaPlaying,
    ritmoBpm,
    ritmoBeatPattern,
    ritmoPatternLength,
    ritmoBeatDurations,
    ritmoTapTempoTapCount,
    melodiaPatternLength,
    melodiaBpm,
    melodiaBeatDuration,
    melodiaNotePattern,
    melodiaTapTempoTapCount,
    comboNotePattern,
    currentPhase,
    beatMarkers,
    setRitmoBpm,
    setRitmoPatternLength,
    setRitmoBeatDurationAtSlot,
    setRitmoBeatLevelAtSlot,
    cycleRitmoBeatPatternSlot,
    setMelodiaPatternLength,
    setMelodiaBpm,
    setMelodiaBeatDuration,
    setMelodiaNoteAtSlot,
    setComboNoteAtSlot,
    tapRitmoTempo,
    tapMelodiaTempo,
    startRitmo,
    stopRitmo,
    toggleRitmoPlaying,
    startMelodia,
    stopMelodia,
    toggleMelodiaPlaying,
  };
}
