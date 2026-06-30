"use client";

import {
  clampRitmoBpm,
  createVozRitmoEngine,
  normalizeRitmoPattern,
  toggleRitmoPatternSlot,
  VOZ_RITMO_PATTERN_DEFAULT,
  type VozRitmoBeatMarker,
  type VozRitmoEngine,
  type VozRitmoPattern,
  type VozRitmoPhase,
} from "@/lib/voz-ritmo";
import { BPM_DEFAULT } from "@/lib/metronomo";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_MARKERS = 96;

type UseVozRitmoResult = {
  ritmoPlaying: boolean;
  ritmoBpm: number;
  ritmoPattern: VozRitmoPattern;
  currentPhase: VozRitmoPhase | null;
  beatMarkers: VozRitmoBeatMarker[];
  setRitmoBpm: (value: number) => void;
  toggleRitmoPatternSlot: (slotIndex: number) => void;
  startRitmo: () => void;
  stopRitmo: () => void;
  toggleRitmoPlaying: () => void;
};

export function useVozRitmo(): UseVozRitmoResult {
  const [ritmoPlaying, setRitmoPlaying] = useState(false);
  const [ritmoBpm, setRitmoBpmState] = useState(BPM_DEFAULT);
  const [ritmoPattern, setRitmoPatternState] = useState<VozRitmoPattern>([
    ...VOZ_RITMO_PATTERN_DEFAULT,
  ]);
  const [currentPhase, setCurrentPhase] = useState<VozRitmoPhase | null>(null);
  const [beatMarkers, setBeatMarkers] = useState<VozRitmoBeatMarker[]>([]);

  const ritmoBpmRef = useRef(ritmoBpm);
  const ritmoPatternRef = useRef(ritmoPattern);
  const ritmoPlayingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const engineRef = useRef<VozRitmoEngine | null>(null);

  ritmoBpmRef.current = ritmoBpm;
  ritmoPatternRef.current = ritmoPattern;
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
    engineRef.current = createVozRitmoEngine(audioContext);

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
          ritmoPatternRef.current,
          (marker) => {
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

  const handleTogglePatternSlot = useCallback(
    (slotIndex: number) => {
      setRitmoPatternState((previous) =>
        toggleRitmoPatternSlot(previous, slotIndex),
      );

      if (ritmoPlayingRef.current) {
        stopRitmo();
      }
    },
    [stopRitmo],
  );

  useEffect(() => {
    ritmoPatternRef.current = normalizeRitmoPattern(ritmoPattern);
  }, [ritmoPattern]);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      closeAudioContext();
    };
  }, [closeAudioContext]);

  return {
    ritmoPlaying,
    ritmoBpm,
    ritmoPattern,
    currentPhase,
    beatMarkers,
    setRitmoBpm,
    toggleRitmoPatternSlot: handleTogglePatternSlot,
    startRitmo,
    stopRitmo,
    toggleRitmoPlaying,
  };
}
