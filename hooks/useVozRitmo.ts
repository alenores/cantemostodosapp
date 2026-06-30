"use client";

import {
  BPM_DEFAULT,
  clampPatternLength,
  createMetronomeEngine,
  cycleMetronomePatternSlot,
  METRONOME_BEAT_DURATION_PATTERN_DEFAULT,
  normalizeMetronomePattern,
  normalizeBeatDurationPattern,
  resizeMetronomePatternLength,
  setBeatDurationAtSlot as applyBeatDurationAtSlot,
  setBeatLevelAtSlot as applyBeatLevelAtSlot,
  type MetronomeBeatPattern,
  type MetronomeBeatDuration,
  type MetronomeBeatDurationPattern,
  type MetronomeBeatLevel,
  type MetronomeEngine,
} from "@/lib/metronomo";
import {
  clampRitmoBpm,
  createVozRitmoBeatMarker,
  VOZ_RITMO_BEAT_PATTERN_DEFAULT,
  VOZ_RITMO_PATTERN_LENGTH_DEFAULT,
  type VozRitmoBeatMarker,
  type VozRitmoPhase,
} from "@/lib/voz-ritmo";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_MARKERS = 96;
const TAP_RESET_MS = 3000;

type UseVozRitmoResult = {
  ritmoPlaying: boolean;
  ritmoBpm: number;
  ritmoBeatPattern: MetronomeBeatPattern;
  ritmoPatternLength: number;
  ritmoBeatDurations: MetronomeBeatDurationPattern;
  ritmoTapTempoTapCount: number;
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
  tapRitmoTempo: () => void;
  startRitmo: () => void;
  stopRitmo: () => void;
  toggleRitmoPlaying: () => void;
};

export function useVozRitmo(): UseVozRitmoResult {
  const [ritmoPlaying, setRitmoPlaying] = useState(false);
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
  const [currentPhase, setCurrentPhase] = useState<VozRitmoPhase | null>(null);
  const [beatMarkers, setBeatMarkers] = useState<VozRitmoBeatMarker[]>([]);

  const ritmoBpmRef = useRef(ritmoBpm);
  const ritmoBeatPatternRef = useRef(ritmoBeatPattern);
  const ritmoPatternLengthRef = useRef(ritmoPatternLength);
  const ritmoBeatDurationsRef = useRef(ritmoBeatDurations);
  const ritmoPlayingRef = useRef(false);
  const tapTimestampsRef = useRef<number[]>([]);
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const engineRef = useRef<MetronomeEngine | null>(null);

  ritmoBpmRef.current = ritmoBpm;
  ritmoBeatPatternRef.current = ritmoBeatPattern;
  ritmoPatternLengthRef.current = ritmoPatternLength;
  ritmoBeatDurationsRef.current = ritmoBeatDurations;
  ritmoPlayingRef.current = ritmoPlaying;

  const closeAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    engineRef.current = null;
  }, []);

  const stopRitmo = useCallback(() => {
    engineRef.current?.stop();
    closeAudioContext();
    setRitmoPlaying(false);
    ritmoPlayingRef.current = false;
    setCurrentPhase(null);
    setBeatMarkers([]);
  }, [closeAudioContext]);

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

  const startRitmo = useCallback(() => {
    void (async () => {
      try {
        await ensureAudioContext();

        const engine = engineRef.current;

        if (!engine) {
          return;
        }

        setBeatMarkers([]);
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
      } catch {
        stopRitmo();
      }
    })();
  }, [ensureAudioContext, stopRitmo]);

  const toggleRitmoPlaying = useCallback(() => {
    if (ritmoPlayingRef.current) {
      stopRitmo();
      return;
    }

    startRitmo();
  }, [startRitmo, stopRitmo]);

  const setRitmoBpm = useCallback(
    (value: number) => {
      const next = clampRitmoBpm(value);
      setRitmoBpmState(next);

      if (ritmoPlayingRef.current) {
        stopRitmo();
      }
    },
    [stopRitmo],
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

      if (ritmoPlayingRef.current) {
        stopRitmo();
      }
    },
    [stopRitmo],
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

      if (ritmoPlayingRef.current) {
        stopRitmo();
      }
    },
    [stopRitmo],
  );

  const setRitmoBeatLevelAtSlot = useCallback(
    (slotIndex: number, level: MetronomeBeatLevel) => {
      setRitmoBeatPatternState((previous) =>
        applyBeatLevelAtSlot(previous, slotIndex, level),
      );

      if (ritmoPlayingRef.current) {
        stopRitmo();
      }
    },
    [stopRitmo],
  );

  const cycleRitmoBeatPatternSlot = useCallback(
    (slotIndex: number) => {
      setRitmoBeatPatternState((previous) =>
        cycleMetronomePatternSlot(previous, slotIndex),
      );

      if (ritmoPlayingRef.current) {
        stopRitmo();
      }
    },
    [stopRitmo],
  );

  const tapRitmoTempo = useCallback(() => {
    if (ritmoPlayingRef.current) {
      return;
    }

    const now = performance.now();
    const recentTaps = tapTimestampsRef.current.filter(
      (timestamp) => now - timestamp < TAP_RESET_MS,
    );

    recentTaps.push(now);
    tapTimestampsRef.current = recentTaps;
    setRitmoTapTempoTapCount(recentTaps.length);

    if (tapResetTimerRef.current !== null) {
      clearTimeout(tapResetTimerRef.current);
    }

    tapResetTimerRef.current = setTimeout(() => {
      tapTimestampsRef.current = [];
      setRitmoTapTempoTapCount(0);
      tapResetTimerRef.current = null;
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

  useEffect(() => {
    ritmoBeatPatternRef.current = normalizeMetronomePattern(ritmoBeatPattern);
  }, [ritmoBeatPattern]);

  useEffect(() => {
    ritmoPatternLengthRef.current = clampPatternLength(ritmoPatternLength);
  }, [ritmoPatternLength]);

  useEffect(() => {
    ritmoBeatDurationsRef.current = normalizeBeatDurationPattern(ritmoBeatDurations);
  }, [ritmoBeatDurations]);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      closeAudioContext();

      if (tapResetTimerRef.current !== null) {
        clearTimeout(tapResetTimerRef.current);
      }
    };
  }, [closeAudioContext]);

  return {
    ritmoPlaying,
    ritmoBpm,
    ritmoBeatPattern,
    ritmoPatternLength,
    ritmoBeatDurations,
    ritmoTapTempoTapCount,
    currentPhase,
    beatMarkers,
    setRitmoBpm,
    setRitmoPatternLength,
    setRitmoBeatDurationAtSlot,
    setRitmoBeatLevelAtSlot,
    cycleRitmoBeatPatternSlot,
    tapRitmoTempo,
    startRitmo,
    stopRitmo,
    toggleRitmoPlaying,
  };
}
