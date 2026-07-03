"use client";

import {
  autoCorrelate,
  computeBufferRms,
  createDebouncedNoteState,
  ema,
  frequencyToMidi,
  frequencyToNote,
  midiToNoteName,
  updateDebouncedDisplayNote,
  TUNER_CENTS_EMA_ALPHA,
  TUNER_DISPLAY_HZ_EMA_ALPHA,
  TUNER_FREQUENCY_EMA_ALPHA,
  VOCAL_CENTS_EMA_ALPHA,
  type NoteDetection,
} from "@/lib/afinador";
import { useCallback, useEffect, useRef, useState } from "react";

const MIC_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

const MIC_GRANTED_STORAGE_KEY = "cantemos-afinador-mic-granted";

function readStoredMicGranted(): boolean {
  try {
    return localStorage.getItem(MIC_GRANTED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistMicGranted(granted: boolean): void {
  try {
    if (granted) {
      localStorage.setItem(MIC_GRANTED_STORAGE_KEY, "1");
    } else {
      localStorage.removeItem(MIC_GRANTED_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private mode, etc.)
  }
}

function getMicErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Necesitamos permiso para usar el micrófono. Tocá «Permitir micrófono» y aceptá en el cartel del navegador.";
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No encontramos un micrófono en este dispositivo.";
    }

    if (error.name === "NotReadableError") {
      return "El micrófono está en uso por otra app. Cerrala e intentá de nuevo.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No se pudo acceder al micrófono. Intentá de nuevo.";
}

type UseAfinadorOptions = {
  /** `tuner`: aguja estable. `vocal`: nota al instante para práctica. */
  profile?: "tuner" | "vocal";
};

type UseAfinadorResult = {
  detection: NoteDetection | null;
  voiceRms: number;
  micError: string | null;
  micPermissionGranted: boolean;
  micReady: boolean;
  micStarting: boolean;
  start: () => Promise<void>;
  stopListening: () => void;
  requestPermission: () => Promise<void>;
  stop: () => void;
};

export function useAfinador(
  options: UseAfinadorOptions = {},
): UseAfinadorResult {
  const profile = options.profile ?? "tuner";
  const isVocalProfile = profile === "vocal";
  const [detection, setDetection] = useState<NoteDetection | null>(null);
  const [voiceRms, setVoiceRms] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [micPermissionGranted, setMicPermissionGranted] = useState(
    readStoredMicGranted,
  );
  const [micReady, setMicReady] = useState(false);
  const [micStarting, setMicStarting] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const runningRef = useRef(false);
  const micStartingRef = useRef(false);
  const startGenerationRef = useRef(0);
  const smoothedFrequencyRef = useRef<number | null>(null);
  const displayFrequencyRef = useRef<number | null>(null);
  const smoothedCentsRef = useRef<number | null>(null);
  const displayNoteStateRef = useRef(createDebouncedNoteState());
  const lastDisplayMidiRef = useRef<number | null>(null);
  const lastNoteRef = useRef<string | null>(null);

  useEffect(() => {
    micStartingRef.current = micStarting;
  }, [micStarting]);

  const releaseMicCapture = useCallback(() => {
    startGenerationRef.current += 1;
    runningRef.current = false;
    setMicStarting(false);
    setVoiceRms(0);

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    dataBufferRef.current = null;
    smoothedFrequencyRef.current = null;
    displayFrequencyRef.current = null;
    smoothedCentsRef.current = null;
    displayNoteStateRef.current = createDebouncedNoteState();
    lastDisplayMidiRef.current = null;
    lastNoteRef.current = null;
    setDetection(null);
    setMicReady(false);
  }, []);

  const stopListening = useCallback(() => {
    releaseMicCapture();
  }, [releaseMicCapture]);

  const stopAudio = useCallback(() => {
    releaseMicCapture();
  }, [releaseMicCapture]);

  useEffect(() => {
    if (!navigator.permissions?.query) {
      return;
    }

    let disposed = false;

    void navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        if (disposed) {
          return;
        }

        const granted = status.state === "granted";
        setMicPermissionGranted(granted);
        persistMicGranted(granted);

        status.onchange = () => {
          const nextGranted = status.state === "granted";
          setMicPermissionGranted(nextGranted);
          persistMicGranted(nextGranted);
          if (!nextGranted) {
            stopAudio();
          }
        };
      })
      .catch(() => {
        // Permissions API unsupported for microphone (e.g. some iOS versions).
      });

    return () => {
      disposed = true;
    };
  }, [stopAudio]);

  const requestPermission = useCallback(async () => {
    if (micPermissionGranted || micStartingRef.current) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("Este navegador no permite acceder al micrófono.");
      return;
    }

    setMicError(null);
    setMicStarting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: MIC_AUDIO_CONSTRAINTS,
      });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermissionGranted(true);
      persistMicGranted(true);
      setMicStarting(false);
    } catch (error) {
      setMicStarting(false);

      if (
        error instanceof DOMException &&
        (error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError")
      ) {
        setMicPermissionGranted(false);
        persistMicGranted(false);
      }

      setMicError(getMicErrorMessage(error));
    }
  }, [micPermissionGranted]);

  const start = useCallback(async () => {
    if (runningRef.current || micStartingRef.current) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("Este navegador no permite acceder al micrófono.");
      return;
    }

    const generation = startGenerationRef.current;
    setMicError(null);
    setMicReady(false);
    setDetection(null);
    setMicStarting(true);
    smoothedFrequencyRef.current = null;
    displayFrequencyRef.current = null;
    smoothedCentsRef.current = null;
    displayNoteStateRef.current = createDebouncedNoteState();
    lastDisplayMidiRef.current = null;
    lastNoteRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: MIC_AUDIO_CONSTRAINTS,
      });

      if (generation !== startGenerationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        setMicStarting(false);
        return;
      }

      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioContextClass) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("AudioContext no disponible en este navegador");
      }

      const audioContext = new AudioContextClass();

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataBufferRef.current = new Float32Array(
        new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT),
      );
      runningRef.current = true;
      setMicPermissionGranted(true);
      persistMicGranted(true);
      setMicReady(true);
      setMicStarting(false);

      const updatePitch = () => {
        if (!runningRef.current) {
          return;
        }

        const currentAnalyser = analyserRef.current;
        const buffer = dataBufferRef.current;
        const context = audioContextRef.current;

        if (!currentAnalyser || !buffer || !context) {
          animationFrameRef.current = requestAnimationFrame(updatePitch);
          return;
        }

        currentAnalyser.getFloatTimeDomainData(buffer);
        const rms = computeBufferRms(buffer);
        setVoiceRms(rms);
        const frequency = autoCorrelate(buffer, context.sampleRate);

        if (frequency === null) {
          if (smoothedFrequencyRef.current !== null) {
            smoothedFrequencyRef.current = null;
            displayFrequencyRef.current = null;
            smoothedCentsRef.current = null;
            displayNoteStateRef.current = createDebouncedNoteState();
            lastDisplayMidiRef.current = null;
            lastNoteRef.current = null;
            setDetection(null);
          }
        } else {
          const rawDetection = frequencyToNote(frequency);

          if (isVocalProfile) {
            const isOnset = smoothedFrequencyRef.current === null;
            const noteChanged =
              lastNoteRef.current !== null &&
              lastNoteRef.current !== rawDetection.note;

            if (isOnset || noteChanged) {
              smoothedCentsRef.current = rawDetection.cents;
            } else if (smoothedCentsRef.current !== null) {
              smoothedCentsRef.current = ema(
                smoothedCentsRef.current,
                rawDetection.cents,
                VOCAL_CENTS_EMA_ALPHA,
              );
            } else {
              smoothedCentsRef.current = rawDetection.cents;
            }

            smoothedFrequencyRef.current = frequency;
            lastNoteRef.current = rawDetection.note;

            setDetection({
              note: rawDetection.note,
              frequency,
              cents: smoothedCentsRef.current,
            });
          } else {
            const smoothedFrequency = ema(
              smoothedFrequencyRef.current,
              frequency,
              TUNER_FREQUENCY_EMA_ALPHA,
            );
            smoothedFrequencyRef.current = smoothedFrequency;

            const displayFrequency = ema(
              displayFrequencyRef.current,
              smoothedFrequency,
              TUNER_DISPLAY_HZ_EMA_ALPHA,
            );
            displayFrequencyRef.current = displayFrequency;

            const debounced = updateDebouncedDisplayNote(
              displayNoteStateRef.current,
              smoothedFrequency,
              performance.now(),
            );
            displayNoteStateRef.current = debounced.state;
            const displayMidi = debounced.displayMidi;

            const rawCents =
              displayMidi === null
                ? 0
                : (frequencyToMidi(smoothedFrequency) - displayMidi) * 100;

            const noteChanged =
              lastDisplayMidiRef.current !== null &&
              displayMidi !== null &&
              lastDisplayMidiRef.current !== displayMidi;

            lastDisplayMidiRef.current = displayMidi;

            let displayCents: number;

            if (noteChanged || smoothedCentsRef.current === null) {
              displayCents = rawCents;
              smoothedCentsRef.current = rawCents;
            } else {
              displayCents = ema(
                smoothedCentsRef.current,
                rawCents,
                TUNER_CENTS_EMA_ALPHA,
              );
              smoothedCentsRef.current = displayCents;
            }

            setDetection({
              note:
                displayMidi === null
                  ? "—"
                  : midiToNoteName(displayMidi),
              frequency: displayFrequency,
              cents: displayCents,
            });
          }
        }

        animationFrameRef.current = requestAnimationFrame(updatePitch);
      };

      animationFrameRef.current = requestAnimationFrame(updatePitch);
    } catch (error) {
      if (generation === startGenerationRef.current) {
        stopAudio();

        if (
          error instanceof DOMException &&
          (error.name === "NotAllowedError" ||
            error.name === "PermissionDeniedError")
        ) {
          setMicPermissionGranted(false);
          persistMicGranted(false);
        }

        setMicError(getMicErrorMessage(error));
      }
    }
  }, [isVocalProfile, stopAudio]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  return {
    detection,
    voiceRms,
    micError,
    micPermissionGranted,
    micReady,
    micStarting,
    start,
    stopListening,
    requestPermission,
    stop: stopAudio,
  };
}
