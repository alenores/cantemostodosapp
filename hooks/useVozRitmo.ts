"use client";

import {
  clampPatternBeats,
  clampRitmoBpm,
  createVozRitmoEngine,
  VOZ_RITMO_REST_BEATS_DEFAULT,
  VOZ_RITMO_SING_BEATS_DEFAULT,
  type VozRitmoBeatMarker,
  type VozRitmoEngine,
  type VozRitmoPhase,
} from "@/lib/voz-ritmo";
import { BPM_DEFAULT } from "@/lib/metronomo";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_MARKERS = 96;

type UseVozRitmoResult = {
  ritmoPlaying: boolean;
  ritmoBpm: number;
  singBeats: number;
  restBeats: number;
  currentPhase: VozRitmoPhase | null;
  beatMarkers: VozRitmoBeatMarker[];
  setRitmoBpm: (value: number) => void;
  setSingBeats: (value: number) => void;
  setRestBeats: (value: number) => void;
  startRitmo: () => void;
  stopRitmo: () => void;
  toggleRitmoPlaying: () => void;
};

export function useVozRitmo(): UseVozRitmoResult {
  const [ritmoPlaying, setRitmoPlaying] = useState(false);
  const [ritmoBpm, setRitmoBpmState] = useState(BPM_DEFAULT);
  const [singBeats, setSingBeatsState] = useState(VOZ_RITMO_SING_BEATS_DEFAULT);
  const [restBeats, setRestBeatsState] = useState(VOZ_RITMO_REST_BEATS_DEFAULT);
  const [currentPhase, setCurrentPhase] = useState<VozRitmoPhase | null>(null);
  const [beatMarkers, setBeatMarkers] = useState<VozRitmoBeatMarker[]>([]);

  const ritmoBpmRef = useRef(ritmoBpm);
  const singBeatsRef = useRef(singBeats);
  const restBeatsRef = useRef(restBeats);
  const ritmoPlayingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const engineRef = useRef<VozRitmoEngine | null>(null);

  ritmoBpmRef.current = ritmoBpm;
  singBeatsRef.current = singBeats;
  restBeatsRef.current = restBeats;
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
          singBeatsRef.current,
          restBeatsRef.current,
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

  const setSingBeats = useCallback(
    (value: number) => {
      setSingBeatsState(clampPatternBeats(value));

      if (ritmoPlayingRef.current) {
        stopRitmo();
      }
    },
    [stopRitmo],
  );

  const setRestBeats = useCallback(
    (value: number) => {
      setRestBeatsState(clampPatternBeats(value));

      if (ritmoPlayingRef.current) {
        stopRitmo();
      }
    },
    [stopRitmo],
  );

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      closeAudioContext();
    };
  }, [closeAudioContext]);

  return {
    ritmoPlaying,
    ritmoBpm,
    singBeats,
    restBeats,
    currentPhase,
    beatMarkers,
    setRitmoBpm,
    setSingBeats,
    setRestBeats,
    startRitmo,
    stopRitmo,
    toggleRitmoPlaying,
  };
}
