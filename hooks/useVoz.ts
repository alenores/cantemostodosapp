"use client";

import { useAfinador } from "@/hooks/useAfinador";
import { useVozRitmo } from "@/hooks/useVozRitmo";
import { getBeatPositionAtTime, getActivePatternSlice } from "@/lib/metronomo";
import { getActiveNotaSlice } from "@/lib/voz-nota-patron";
import {
  getDinamicaVoiceCompliance,
  type VozDinamicaVoiceSample,
} from "@/lib/voz-dinamica";
import {
  buildMelodiaSingPattern,
  buildUniformBeatDurations,
  type VozRitmoVoiceSample,
} from "@/lib/voz-ritmo";
import { getPlaybackNow } from "@/lib/voz-ritmo-audio";
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
  VOZ_OCTAVAS_NOTE_DURATION_DEFAULT,
  VOZ_OCTAVAS_PITCH_MODE_DEFAULT,
  VOZ_OCTAVAS_SCALE_REPETITIONS_DEFAULT,
  clampHoldTargetSeconds,
  clampOctavasNoteDurationSeconds,
  clampOctavasScaleRepetitions,
  type VozOctavasPitchMode,
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
const VOZ_ATTEMPTS_ARM_DELAY_MS = 450;

export type RitmoToneEvaluation = "none" | "fixed" | "perBeat";

export function useVoz() {
  const afinador = useAfinador({ profile: "vocal" });
  const ritmo = useVozRitmo();
  const [target, setTarget] = useState<VozTarget>(VOZ_DEFAULT_TARGET);
  const [holdTargetSeconds, setHoldTargetSecondsState] = useState(
    VOZ_HOLD_TARGET_DEFAULT,
  );
  const [holdCalibre, setHoldCalibre] = useState<VozCalibre>(VOZ_CALIBRE_DEFAULT);
  const [octavasNoteDurationSeconds, setOctavasNoteDurationSecondsState] =
    useState(VOZ_OCTAVAS_NOTE_DURATION_DEFAULT);
  const setOctavasNoteDurationSeconds = useCallback((value: number) => {
    setOctavasNoteDurationSecondsState(clampOctavasNoteDurationSeconds(value));
  }, []);
  const [octavasPitchMode, setOctavasPitchModeState] =
    useState<VozOctavasPitchMode>(VOZ_OCTAVAS_PITCH_MODE_DEFAULT);
  const [octavasScaleRepetitions, setOctavasScaleRepetitionsState] =
    useState(VOZ_OCTAVAS_SCALE_REPETITIONS_DEFAULT);
  const setOctavasScaleRepetitions = useCallback((value: number) => {
    setOctavasScaleRepetitionsState(clampOctavasScaleRepetitions(value));
  }, []);
  const [dynamicsEvaluation, setDynamicsEvaluation] = useState(false);
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
  const [dinamicaVoiceSamples, setDinamicaVoiceSamples] = useState<
    VozDinamicaVoiceSample[]
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
  const dynamicsEvaluationRef = useRef(dynamicsEvaluation);
  const voiceRmsRef = useRef(afinador.voiceRms);

  detectionRef.current = afinador.detection;
  voiceRmsRef.current = afinador.voiceRms;
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
  dynamicsEvaluationRef.current = dynamicsEvaluation;
  const inBurstRef = useRef(false);
  const burstBestAccuracyRef = useRef<VozAccuracy>("lejos");
  const celebratedHoldRef = useRef(false);
  const attemptsArmedRef = useRef(false);
  const attemptsArmTimeoutRef = useRef<number | null>(null);
  const [tonePracticeActive, setTonePracticeActive] = useState(false);
  const [ritmoMicActive, setRitmoMicActive] = useState(false);
  const [melodiaMicActive, setMelodiaMicActive] = useState(false);
  const pendingTonePracticeRef = useRef(false);
  const pendingRitmoMicRef = useRef(false);
  const pendingMelodiaMicRef = useRef(false);
  const prevRitmoPlayingRef = useRef(ritmo.ritmoPlaying);
  const prevMelodiaPlayingRef = useRef(ritmo.melodiaPlaying);

  const practiceMicActive =
    tonePracticeActive || ritmoMicActive || melodiaMicActive;

  useEffect(() => {
    if (!practiceMicActive) {
      afinador.stopListening();
      return;
    }

    void afinador.start();
  }, [practiceMicActive, afinador.start, afinador.stopListening]);

  useEffect(() => {
    if (
      !practiceMicActive ||
      afinador.micReady ||
      afinador.micStarting
    ) {
      return;
    }

    void afinador.start();
  }, [
    practiceMicActive,
    afinador.micReady,
    afinador.micStarting,
    afinador.start,
  ]);

  const stopTonePractice = useCallback(() => {
    setTonePracticeActive(false);
  }, []);

  const toggleTonePractice = useCallback(() => {
    if (!tonePracticeActive && !afinador.micPermissionGranted) {
      pendingTonePracticeRef.current = true;
      void afinador.requestPermission();
      return;
    }

    setTonePracticeActive((previous) => !previous);
  }, [afinador.micPermissionGranted, afinador.requestPermission, tonePracticeActive]);

  const toggleRitmoPlaying = useCallback(() => {
    ritmo.toggleRitmoPlaying();
  }, [ritmo.toggleRitmoPlaying]);

  const toggleMelodiaPlaying = useCallback(() => {
    ritmo.toggleMelodiaPlaying();
  }, [ritmo.toggleMelodiaPlaying]);

  const toggleRitmoMic = useCallback(() => {
    if (!ritmoMicActive && !afinador.micPermissionGranted) {
      pendingRitmoMicRef.current = true;
      void afinador.requestPermission();
      return;
    }

    setRitmoMicActive((previous) => {
      const next = !previous;
      if (next && !ritmo.ritmoPlaying) {
        ritmo.startRitmo();
      }
      return next;
    });
  }, [
    ritmoMicActive,
    afinador.micPermissionGranted,
    afinador.requestPermission,
    ritmo.ritmoPlaying,
    ritmo.startRitmo,
  ]);

  const toggleMelodiaMic = useCallback(() => {
    if (!melodiaMicActive && !afinador.micPermissionGranted) {
      pendingMelodiaMicRef.current = true;
      void afinador.requestPermission();
      return;
    }

    setMelodiaMicActive((previous) => {
      const next = !previous;
      if (next && !ritmo.melodiaPlaying) {
        ritmo.startMelodia();
      }
      return next;
    });
  }, [
    melodiaMicActive,
    afinador.micPermissionGranted,
    afinador.requestPermission,
    ritmo.melodiaPlaying,
    ritmo.startMelodia,
  ]);

  useEffect(() => {
    if (!afinador.micPermissionGranted) {
      if (
        afinador.micStarting ||
        !(
          pendingTonePracticeRef.current ||
          pendingRitmoMicRef.current ||
          pendingMelodiaMicRef.current
        )
      ) {
        return;
      }

      void afinador.requestPermission();
      return;
    }

    if (pendingTonePracticeRef.current) {
      pendingTonePracticeRef.current = false;
      setTonePracticeActive(true);
    }

    if (pendingRitmoMicRef.current) {
      pendingRitmoMicRef.current = false;
      setRitmoMicActive(true);
      if (!ritmo.ritmoPlaying) {
        ritmo.startRitmo();
      }
    }

    if (pendingMelodiaMicRef.current) {
      pendingMelodiaMicRef.current = false;
      setMelodiaMicActive(true);
      if (!ritmo.melodiaPlaying) {
        ritmo.startMelodia();
      }
    }
  }, [
    afinador.micPermissionGranted,
    afinador.micStarting,
    afinador.requestPermission,
    ritmo.melodiaPlaying,
    ritmo.ritmoPlaying,
    ritmo.startMelodia,
    ritmo.startRitmo,
  ]);

  const clearRitmoVoiceSamples = useCallback(() => {
    lastRitmoVoiceSampleAtRef.current = 0;
    setRitmoVoiceSamples([]);
  }, []);

  const clearDinamicaVoiceSamples = useCallback(() => {
    setDinamicaVoiceSamples([]);
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    lastSampleAtRef.current = 0;
    setHistorySamples([]);
    celebratedHoldRef.current = false;
  }, []);

  const clearInstantAttempts = useCallback(() => {
    if (attemptsArmTimeoutRef.current !== null) {
      window.clearTimeout(attemptsArmTimeoutRef.current);
      attemptsArmTimeoutRef.current = null;
    }

    inBurstRef.current = false;
    burstBestAccuracyRef.current = "lejos";
    attemptsArmedRef.current = false;
    setInstantAttempts([]);

    attemptsArmTimeoutRef.current = window.setTimeout(() => {
      attemptsArmTimeoutRef.current = null;
      inBurstRef.current = false;
      burstBestAccuracyRef.current = "lejos";
      attemptsArmedRef.current = true;
    }, VOZ_ATTEMPTS_ARM_DELAY_MS);
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
      true,
    );
  }, [afinador.detection, effectiveTarget]);

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
        octaveExact: true,
        targetNote: effectiveTarget.note,
        detectedNote: afinador.detection?.note,
      }),
    [accuracy, centsFromTarget, effectiveTarget.note, afinador.detection?.note],
  );

  useEffect(() => {
    clearHistory();
    clearInstantAttempts();
  }, [target.note, target.octave, clearHistory, clearInstantAttempts]);

  useEffect(() => {
    if (ritmoToneEvaluation === "perBeat") {
      ritmo.setRitmoPlaybackNotes(
        getActiveNotaSlice(
          ritmo.comboNotePattern,
          ritmo.ritmoPatternLength,
        ),
      );
      ritmo.setRitmoPlaybackDynamicsOnly(true);
      return;
    }

    if (ritmoToneEvaluation === "fixed") {
      ritmo.setRitmoPlaybackNotes(
        Array.from({ length: ritmo.ritmoPatternLength }, () => target),
      );
      ritmo.setRitmoPlaybackDynamicsOnly(false);
      return;
    }

    ritmo.setRitmoPlaybackNotes(null);
    ritmo.setRitmoPlaybackDynamicsOnly(false);
  }, [
    ritmoToneEvaluation,
    ritmo.comboNotePattern,
    ritmo.ritmoPatternLength,
    ritmo.setRitmoPlaybackNotes,
    ritmo.setRitmoPlaybackDynamicsOnly,
    target,
  ]);

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

    if (!attemptsArmedRef.current) {
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
    if (prevRitmoPlayingRef.current && !ritmo.ritmoPlaying) {
      setRitmoMicActive(false);
    }

    prevRitmoPlayingRef.current = ritmo.ritmoPlaying;
  }, [ritmo.ritmoPlaying]);

  useEffect(() => {
    if (prevMelodiaPlayingRef.current && !ritmo.melodiaPlaying) {
      setMelodiaMicActive(false);
    }

    prevMelodiaPlayingRef.current = ritmo.melodiaPlaying;
  }, [ritmo.melodiaPlaying]);

  useEffect(() => {
    if (!ritmo.ritmoPlaying && !ritmo.melodiaPlaying) {
      clearRitmoVoiceSamples();
      clearDinamicaVoiceSamples();
    }
  }, [
    ritmo.ritmoPlaying,
    ritmo.melodiaPlaying,
    clearRitmoVoiceSamples,
    clearDinamicaVoiceSamples,
  ]);

  useEffect(() => {
    const rhythmMicActive = ritmoMicActive || melodiaMicActive;
    const rhythmPlaying = ritmo.ritmoPlaying || ritmo.melodiaPlaying;

    if (!rhythmPlaying || !rhythmMicActive || !afinador.micReady) {
      return;
    }

    const sampleRitmoVoice = () => {
      const now = getPlaybackNow();
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
      const isDynamics = dynamicsEvaluationRef.current && !isMelodia;
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
      const position = getBeatPositionAtTime(
        now,
        beatMarkers,
        bpm,
        beatDurations,
        patternLength,
      );
      const beatIndex = position?.beatIndex ?? 0;

      if (isDynamics) {
        const activePattern = getActivePatternSlice(
          ritmoBeatPattern,
          patternLength,
        );
        const expectedLevel = activePattern[beatIndex] ?? "silencio";
        const rms = voiceRmsRef.current;
        const sample: VozDinamicaVoiceSample = {
          timestamp: now,
          rms,
          expectedLevel,
          compliance: getDinamicaVoiceCompliance(expectedLevel, rms),
        };

        setDinamicaVoiceSamples((previous) => {
          const next = [...previous, sample];
          return next.length > 120 ? next.slice(next.length - 120) : next;
        });
        return;
      }

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
  }, [
    ritmo.ritmoPlaying,
    ritmo.melodiaPlaying,
    ritmoMicActive,
    melodiaMicActive,
    afinador.micReady,
  ]);

  const stop = useCallback(() => {
    ritmo.stopRitmo();
    setTonePracticeActive(false);
    setRitmoMicActive(false);
    setMelodiaMicActive(false);
    pendingTonePracticeRef.current = false;
    pendingRitmoMicRef.current = false;
    pendingMelodiaMicRef.current = false;
    clearHistory();
    if (attemptsArmTimeoutRef.current !== null) {
      window.clearTimeout(attemptsArmTimeoutRef.current);
      attemptsArmTimeoutRef.current = null;
    }
    inBurstRef.current = false;
    burstBestAccuracyRef.current = "lejos";
    attemptsArmedRef.current = false;
    setInstantAttempts([]);
    clearRitmoVoiceSamples();
    clearDinamicaVoiceSamples();
    afinador.stop();
  }, [
    afinador.stop,
    clearHistory,
    clearRitmoVoiceSamples,
    clearDinamicaVoiceSamples,
    ritmo.stopRitmo,
  ]);

  return {
    ...afinador,
    ...ritmo,
    stop,
    toggleRitmoPlaying,
    toggleMelodiaPlaying,
    ritmoMicActive,
    toggleRitmoMic,
    melodiaMicActive,
    toggleMelodiaMic,
    tonePracticeActive,
    toggleTonePractice,
    stopTonePractice,
    target,
    setTarget,
    holdTargetSeconds,
    setHoldTargetSeconds,
    holdCalibre,
    setHoldCalibre,
    octavasNoteDurationSeconds,
    setOctavasNoteDurationSeconds,
    octavasPitchMode,
    setOctavasPitchMode: setOctavasPitchModeState,
    octavasScaleRepetitions,
    setOctavasScaleRepetitions,
    targetFrequency,
    referenceLabel,
    centsFromTarget,
    accuracy,
    feedbackLabel,
    historySamples,
    instantAttempts,
    clearInstantAttempts,
    celebrationKey,
    ritmoVoiceSamples,
    dinamicaVoiceSamples,
    ritmoToneEvaluation,
    setRitmoToneEvaluation,
    dynamicsEvaluation,
    setDynamicsEvaluation,
    voiceRms: afinador.voiceRms,
    effectiveTarget,
  };
}
