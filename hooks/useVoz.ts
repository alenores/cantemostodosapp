"use client";

import { useAfinador } from "@/hooks/useAfinador";
import { useVozRitmo } from "@/hooks/useVozRitmo";
import {
  computeEnTonoHoldMs,
  getVozAccuracy,
  getVozFeedbackLabel,
  playHoldCelebration,
  resolveTargetComparison,
  trimHistorySamples,
  VOZ_DEFAULT_TARGET,
  VOZ_HISTORY_SAMPLE_INTERVAL_MS,
  VOZ_HOLD_TARGET_DEFAULT,
  VOZ_INSTANT_ATTEMPTS_MAX,
  type VozAccuracy,
  type VozHistorySample,
  type VozInstantAttempt,
  type VozTarget,
} from "@/lib/voz";
import {
  getMsIntoCurrentBeat,
  getRitmoPhaseAtTime,
  getRitmoVoiceCompliance,
  type VozRitmoVoiceSample,
} from "@/lib/voz-ritmo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useVoz() {
  const afinador = useAfinador();
  const ritmo = useVozRitmo();
  const [target, setTarget] = useState<VozTarget>(VOZ_DEFAULT_TARGET);
  const [octaveExact, setOctaveExact] = useState(false);
  const [holdTargetSeconds, setHoldTargetSeconds] = useState(
    VOZ_HOLD_TARGET_DEFAULT,
  );
  const [historySamples, setHistorySamples] = useState<VozHistorySample[]>([]);
  const [instantAttempts, setInstantAttempts] = useState<VozInstantAttempt[]>(
    [],
  );
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [ritmoVoiceSamples, setRitmoVoiceSamples] = useState<
    VozRitmoVoiceSample[]
  >([]);

  const historyRef = useRef<VozHistorySample[]>([]);
  const lastSampleAtRef = useRef(0);
  const lastRitmoVoiceSampleAtRef = useRef(0);
  const detectionRef = useRef(afinador.detection);
  const beatMarkersRef = useRef(ritmo.beatMarkers);
  const ritmoBpmRef = useRef(ritmo.ritmoBpm);
  const singBeatsRef = useRef(ritmo.singBeats);
  const restBeatsRef = useRef(ritmo.restBeats);

  detectionRef.current = afinador.detection;
  beatMarkersRef.current = ritmo.beatMarkers;
  ritmoBpmRef.current = ritmo.ritmoBpm;
  singBeatsRef.current = ritmo.singBeats;
  restBeatsRef.current = ritmo.restBeats;
  const inBurstRef = useRef(false);
  const burstHadEnTonoRef = useRef(false);
  const celebratedHoldRef = useRef(false);

  const clearRitmoVoiceSamples = useCallback(() => {
    lastRitmoVoiceSampleAtRef.current = 0;
    setRitmoVoiceSamples([]);
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    lastSampleAtRef.current = 0;
    setHistorySamples([]);
    celebratedHoldRef.current = false;
  }, []);

  const clearInstantAttempts = useCallback(() => {
    inBurstRef.current = false;
    burstHadEnTonoRef.current = false;
    setInstantAttempts([]);
  }, []);

  const comparison = useMemo(() => {
    if (!afinador.detection) {
      return null;
    }

    return resolveTargetComparison(
      afinador.detection.frequency,
      target,
      octaveExact,
    );
  }, [afinador.detection, target, octaveExact]);

  const centsFromTarget = comparison?.cents ?? null;
  const targetFrequency = comparison?.referenceFrequency ?? null;
  const referenceLabel = comparison?.referenceLabel ?? null;

  const accuracy: VozAccuracy = useMemo(
    () => getVozAccuracy(centsFromTarget ?? 0, afinador.detection !== null),
    [centsFromTarget, afinador.detection],
  );

  const feedbackLabel = useMemo(
    () =>
      getVozFeedbackLabel(accuracy, centsFromTarget ?? 0, {
        octaveExact,
        targetNote: target.note,
        detectedNote: afinador.detection?.note,
      }),
    [accuracy, centsFromTarget, octaveExact, target.note, afinador.detection?.note],
  );

  useEffect(() => {
    clearHistory();
    clearInstantAttempts();
  }, [target.note, target.octave, octaveExact, clearHistory, clearInstantAttempts]);

  useEffect(() => {
    if (!afinador.micReady) {
      clearHistory();
      clearInstantAttempts();
    }
  }, [afinador.micReady, clearHistory, clearInstantAttempts]);

  useEffect(() => {
    if (!afinador.micReady) {
      return;
    }

    const now = performance.now();

    if (!afinador.detection || centsFromTarget === null) {
      return;
    }

    if (now - lastSampleAtRef.current < VOZ_HISTORY_SAMPLE_INTERVAL_MS) {
      return;
    }

    lastSampleAtRef.current = now;

    const nextSample: VozHistorySample = {
      timestamp: now,
      cents: centsFromTarget,
      accuracy,
    };

    historyRef.current = trimHistorySamples(
      [...historyRef.current, nextSample],
      now,
    );
    setHistorySamples([...historyRef.current]);
  }, [
    afinador.detection,
    afinador.micReady,
    centsFromTarget,
    accuracy,
  ]);

  useEffect(() => {
    if (!afinador.micReady) {
      return;
    }

    if (accuracy !== "silencio") {
      if (!inBurstRef.current) {
        inBurstRef.current = true;
        burstHadEnTonoRef.current = accuracy === "en-tono";
      } else if (accuracy === "en-tono") {
        burstHadEnTonoRef.current = true;
      }

      return;
    }

    if (!inBurstRef.current) {
      return;
    }

    inBurstRef.current = false;

    setInstantAttempts((previous) => {
      const next = [
        ...previous,
        { id: performance.now(), hit: burstHadEnTonoRef.current },
      ];

      return next.length > VOZ_INSTANT_ATTEMPTS_MAX
        ? next.slice(next.length - VOZ_INSTANT_ATTEMPTS_MAX)
        : next;
    });
    burstHadEnTonoRef.current = false;
  }, [accuracy, afinador.micReady]);

  useEffect(() => {
    if (historySamples.length === 0) {
      celebratedHoldRef.current = false;
      return;
    }

    const holdMs = computeEnTonoHoldMs(historySamples, performance.now());
    const targetMs = holdTargetSeconds * 1000;

    if (holdMs >= targetMs && !celebratedHoldRef.current) {
      celebratedHoldRef.current = true;
      setCelebrationKey(performance.now());
      playHoldCelebration();
    }

    if (holdMs < 400) {
      celebratedHoldRef.current = false;
    }
  }, [historySamples, holdTargetSeconds]);

  useEffect(() => {
    if (!ritmo.ritmoPlaying || !afinador.micReady) {
      return;
    }

    const sampleRitmoVoice = () => {
      const now = performance.now();
      const beatMarkers = beatMarkersRef.current;

      if (beatMarkers.length === 0) {
        return;
      }

      if (
        now - lastRitmoVoiceSampleAtRef.current <
        VOZ_HISTORY_SAMPLE_INTERVAL_MS
      ) {
        return;
      }

      lastRitmoVoiceSampleAtRef.current = now;

      const bpm = ritmoBpmRef.current;
      const singBeats = singBeatsRef.current;
      const restBeats = restBeatsRef.current;
      const msPerBeat = 60000 / bpm;
      const expectedPhase =
        getRitmoPhaseAtTime(
          now,
          beatMarkers,
          bpm,
          singBeats,
          restBeats,
        ) ?? "silencio";
      const msIntoBeat = getMsIntoCurrentBeat(now, beatMarkers, bpm);
      const hasVoice = detectionRef.current !== null;

      const sample: VozRitmoVoiceSample = {
        timestamp: now,
        hasVoice,
        expectedPhase,
        compliance: getRitmoVoiceCompliance(
          expectedPhase,
          hasVoice,
          msIntoBeat,
          msPerBeat,
        ),
      };

      setRitmoVoiceSamples((previous) => {
        const next = [...previous, sample];
        return next.length > 120 ? next.slice(next.length - 120) : next;
      });
    };

    sampleRitmoVoice();
    const intervalId = window.setInterval(
      sampleRitmoVoice,
      VOZ_HISTORY_SAMPLE_INTERVAL_MS,
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [ritmo.ritmoPlaying, afinador.micReady]);

  useEffect(() => {
    if (!ritmo.ritmoPlaying) {
      clearRitmoVoiceSamples();
    }
  }, [ritmo.ritmoPlaying, clearRitmoVoiceSamples]);

  const stop = useCallback(() => {
    ritmo.stopRitmo();
    clearHistory();
    clearInstantAttempts();
    clearRitmoVoiceSamples();
    afinador.stop();
  }, [
    afinador.stop,
    clearHistory,
    clearInstantAttempts,
    clearRitmoVoiceSamples,
    ritmo.stopRitmo,
  ]);

  return {
    ...afinador,
    ...ritmo,
    stop,
    target,
    setTarget,
    octaveExact,
    setOctaveExact,
    holdTargetSeconds,
    setHoldTargetSeconds,
    targetFrequency,
    referenceLabel,
    centsFromTarget,
    accuracy,
    feedbackLabel,
    historySamples,
    instantAttempts,
    celebrationKey,
    ritmoVoiceSamples,
  };
}
