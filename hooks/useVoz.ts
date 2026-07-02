"use client";

import { useAfinador } from "@/hooks/useAfinador";
import { useVozRitmo } from "@/hooks/useVozRitmo";
import { getBeatPositionAtTime } from "@/lib/metronomo";
import { getActiveNotaSlice } from "@/lib/voz-nota-patron";
import {
  buildMelodiaSingPattern,
  buildUniformBeatDurations,
  type VozRitmoVoiceSample,
} from "@/lib/voz-ritmo";
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
  getMsPerBeatAtTime,
  getRitmoPhaseAtTime,
  getRitmoVoiceCompliance,
} from "@/lib/voz-ritmo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const VOZ_BURST_SILENCE_END_MS = 140;

export type RitmoToneEvaluation = "none" | "fixed" | "perBeat";

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
  const [ritmoToneEvaluation, setRitmoToneEvaluation] =
    useState<RitmoToneEvaluation>("none");
  const [beatSyncTick, setBeatSyncTick] = useState(0);

  const historyRef = useRef<VozHistorySample[]>([]);
  const lastSampleAtRef = useRef(0);
  const lastRitmoVoiceSampleAtRef = useRef(0);
  const detectionRef = useRef(afinador.detection);
  const beatMarkersRef = useRef(ritmo.beatMarkers);
  const ritmoBpmRef = useRef(ritmo.ritmoBpm);
  const ritmoBeatPatternRef = useRef(ritmo.ritmoBeatPattern);
  const ritmoPatternLengthRef = useRef(ritmo.ritmoPatternLength);
  const ritmoBeatDurationsRef = useRef(ritmo.ritmoBeatDurations);
  const melodiaPatternLengthRef = useRef(ritmo.melodiaPatternLength);
  const melodiaBpmRef = useRef(ritmo.melodiaBpm);
  const melodiaBeatDurationRef = useRef(ritmo.melodiaBeatDuration);
  const melodiaNotePatternRef = useRef(ritmo.melodiaNotePattern);
  const comboNotePatternRef = useRef(ritmo.comboNotePattern);
  const melodiaPlayingRef = useRef(ritmo.melodiaPlaying);
  const ritmoToneEvaluationRef = useRef(ritmoToneEvaluation);

  detectionRef.current = afinador.detection;
  beatMarkersRef.current = ritmo.beatMarkers;
  ritmoBpmRef.current = ritmo.ritmoBpm;
  ritmoBeatPatternRef.current = ritmo.ritmoBeatPattern;
  ritmoPatternLengthRef.current = ritmo.ritmoPatternLength;
  ritmoBeatDurationsRef.current = ritmo.ritmoBeatDurations;
  melodiaPatternLengthRef.current = ritmo.melodiaPatternLength;
  melodiaBpmRef.current = ritmo.melodiaBpm;
  melodiaBeatDurationRef.current = ritmo.melodiaBeatDuration;
  melodiaNotePatternRef.current = ritmo.melodiaNotePattern;
  comboNotePatternRef.current = ritmo.comboNotePattern;
  melodiaPlayingRef.current = ritmo.melodiaPlaying;
  ritmoToneEvaluationRef.current = ritmoToneEvaluation;
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

  const effectiveTarget = useMemo((): VozTarget => {
    void beatSyncTick;

    const now = performance.now();
    const markers = beatMarkersRef.current;

    if (melodiaPlayingRef.current && markers.length > 0) {
      const patternLength = melodiaPatternLengthRef.current;
      const melodiaDurations = buildUniformBeatDurations(
        melodiaBeatDurationRef.current,
      );
      const position = getBeatPositionAtTime(
        now,
        markers,
        melodiaBpmRef.current,
        melodiaDurations,
        patternLength,
      );
      const notes = getActiveNotaSlice(
        melodiaNotePatternRef.current,
        patternLength,
      );

      return notes[position?.beatIndex ?? 0] ?? target;
    }

    if (
      ritmo.ritmoPlaying &&
      ritmoToneEvaluation === "perBeat" &&
      markers.length > 0
    ) {
      const patternLength = ritmoPatternLengthRef.current;
      const position = getBeatPositionAtTime(
        now,
        markers,
        ritmoBpmRef.current,
        ritmoBeatDurationsRef.current,
        patternLength,
      );
      const notes = getActiveNotaSlice(
        comboNotePatternRef.current,
        patternLength,
      );

      return notes[position?.beatIndex ?? 0] ?? target;
    }

    return target;
  }, [
    beatSyncTick,
    ritmo.ritmoPlaying,
    ritmoToneEvaluation,
    target,
  ]);

  useEffect(() => {
    if (!ritmo.melodiaPlaying && !ritmo.ritmoPlaying) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setBeatSyncTick((previous) => previous + 1);
    }, 50);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [ritmo.melodiaPlaying, ritmo.ritmoPlaying]);

  const comparison = useMemo(() => {
    if (!afinador.detection) {
      return null;
    }

    return resolveTargetComparison(
      afinador.detection.frequency,
      effectiveTarget,
      octaveExact,
    );
  }, [afinador.detection, effectiveTarget, octaveExact]);

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
        targetNote: effectiveTarget.note,
        detectedNote: afinador.detection?.note,
      }),
    [accuracy, centsFromTarget, octaveExact, effectiveTarget.note, afinador.detection?.note],
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
    if (!ritmo.ritmoPlaying && !ritmo.melodiaPlaying) {
      clearRitmoVoiceSamples();
    }
  }, [ritmo.ritmoPlaying, ritmo.melodiaPlaying, clearRitmoVoiceSamples]);

  useEffect(() => {
    const rhythmActive = ritmo.ritmoPlaying || ritmo.melodiaPlaying;

    if (!rhythmActive || !afinador.micReady) {
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

      const isMelodia = melodiaPlayingRef.current;
      const bpm = isMelodia ? melodiaBpmRef.current : ritmoBpmRef.current;
      const patternLength = isMelodia
        ? melodiaPatternLengthRef.current
        : ritmoPatternLengthRef.current;
      const ritmoBeatPattern = ritmoBeatPatternRef.current;
      const ritmoBeatDurations = isMelodia
        ? buildUniformBeatDurations(melodiaBeatDurationRef.current)
        : ritmoBeatDurationsRef.current;
      const melodiaPattern = buildUniformBeatDurations(
        melodiaBeatDurationRef.current,
      );
      const beatPattern = isMelodia
        ? buildMelodiaSingPattern(patternLength)
        : ritmoBeatPattern;
      const beatDurations = isMelodia ? melodiaPattern : ritmoBeatDurations;
      const msPerBeat = getMsPerBeatAtTime(
        now,
        beatMarkers,
        bpm,
        beatDurations,
        patternLength,
      );
      const expectedPhase =
        getRitmoPhaseAtTime(
          now,
          beatMarkers,
          bpm,
          beatPattern,
          patternLength,
          beatDurations,
        ) ?? "silencio";
      const msIntoBeat = getMsIntoCurrentBeat(
        now,
        beatMarkers,
        bpm,
        beatDurations,
        patternLength,
      );
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
  }, [ritmo.ritmoPlaying, ritmo.melodiaPlaying, afinador.micReady]);

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
    ritmoToneEvaluation,
    setRitmoToneEvaluation,
    effectiveTarget,
  };
}
