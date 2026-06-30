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
  VOZ_CALIBRE_DEFAULT,
  VOZ_INSTANT_ATTEMPTS_MAX,
  clampHoldTargetSeconds,
  instantAttemptResultFromAccuracy,
  mergeInstantAttemptAccuracy,
  type VozAccuracy,
  type VozCalibre,
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

const VOZ_BURST_SILENCE_END_MS = 140;

export function useVoz() {
  const afinador = useAfinador({ profile: "vocal" });
  const ritmo = useVozRitmo();
  const [target, setTarget] = useState<VozTarget>(VOZ_DEFAULT_TARGET);
  const [octaveExact, setOctaveExact] = useState(false);
  const [holdTargetSeconds, setHoldTargetSecondsState] = useState(
    VOZ_HOLD_TARGET_DEFAULT,
  );
  const [holdCalibre, setHoldCalibre] = useState<VozCalibre>(VOZ_CALIBRE_DEFAULT);
  const setHoldTargetSeconds = useCallback((value: number) => {
    setHoldTargetSecondsState(clampHoldTargetSeconds(value));
  }, []);
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
  const ritmoPatternRef = useRef(ritmo.ritmoPattern);

  detectionRef.current = afinador.detection;
  beatMarkersRef.current = ritmo.beatMarkers;
  ritmoBpmRef.current = ritmo.ritmoBpm;
  ritmoPatternRef.current = ritmo.ritmoPattern;
  const inBurstRef = useRef(false);
  const burstBestAccuracyRef = useRef<VozAccuracy>("lejos");
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
    burstBestAccuracyRef.current = "lejos";
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

  const accuracyRef = useRef<VozAccuracy>(accuracy);
  accuracyRef.current = accuracy;

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
    clearHistory();
  }, [holdCalibre, clearHistory]);

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
        burstBestAccuracyRef.current = accuracy;
      } else {
        burstBestAccuracyRef.current = mergeInstantAttemptAccuracy(
          burstBestAccuracyRef.current,
          accuracy,
        );
      }

      return;
    }

    if (!inBurstRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!inBurstRef.current || accuracyRef.current !== "silencio") {
        return;
      }

      inBurstRef.current = false;

      const result = instantAttemptResultFromAccuracy(
        burstBestAccuracyRef.current,
      );
      const attemptId = performance.now();

      setInstantAttempts((previous) => {
        const next = [...previous, { id: attemptId, result }];

        return next.length > VOZ_INSTANT_ATTEMPTS_MAX
          ? next.slice(next.length - VOZ_INSTANT_ATTEMPTS_MAX)
          : next;
      });
      burstBestAccuracyRef.current = "lejos";
    }, VOZ_BURST_SILENCE_END_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [accuracy, afinador.micReady]);

  useEffect(() => {
    if (historySamples.length === 0) {
      celebratedHoldRef.current = false;
      return;
    }

    const holdMs = computeEnTonoHoldMs(
      historySamples,
      performance.now(),
      holdCalibre,
    );
    const targetMs = holdTargetSeconds * 1000;

    if (holdMs >= targetMs && !celebratedHoldRef.current) {
      celebratedHoldRef.current = true;
      setCelebrationKey(performance.now());
      playHoldCelebration();
    }

    if (holdMs < 400) {
      celebratedHoldRef.current = false;
    }
  }, [historySamples, holdTargetSeconds, holdCalibre]);

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
      const ritmoPattern = ritmoPatternRef.current;
      const msPerBeat = 60000 / bpm;
      const expectedPhase =
        getRitmoPhaseAtTime(
          now,
          beatMarkers,
          bpm,
          ritmoPattern,
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
    holdCalibre,
    setHoldCalibre,
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
