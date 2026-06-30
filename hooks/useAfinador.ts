"use client";

import {
  autoCorrelate,
  ema,
  frequencyToNote,
  TUNER_CENTS_EMA_ALPHA,
  TUNER_FREQUENCY_EMA_ALPHA,
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

type UseAfinadorResult = {
  detection: NoteDetection | null;
  micError: string | null;
  micPermissionGranted: boolean;
  micReady: boolean;
  micStarting: boolean;
  start: () => Promise<void>;
  stop: () => void;
};

export function useAfinador(): UseAfinadorResult {
  const [detection, setDetection] = useState<NoteDetection | null>(null);
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
  const smoothedFrequencyRef = useRef<number | null>(null);
  const smoothedCentsRef = useRef<number | null>(null);
  const lastNoteRef = useRef<string | null>(null);

  const stopAudio = useCallback(() => {
    runningRef.current = false;
    setMicStarting(false);

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
    smoothedCentsRef.current = null;
    lastNoteRef.current = null;
    setDetection(null);
    setMicReady(false);
  }, []);

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

  const start = useCallback(async () => {
    if (runningRef.current || micStarting) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("Este navegador no permite acceder al micrófono.");
      return;
    }

    setMicError(null);
    setMicReady(false);
    setDetection(null);
    setMicStarting(true);
    smoothedFrequencyRef.current = null;
    smoothedCentsRef.current = null;
    lastNoteRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: MIC_AUDIO_CONSTRAINTS,
      });

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
        const frequency = autoCorrelate(buffer, context.sampleRate);

        if (frequency === null) {
          if (smoothedFrequencyRef.current !== null) {
            smoothedFrequencyRef.current = null;
            smoothedCentsRef.current = null;
            lastNoteRef.current = null;
            setDetection(null);
          }
        } else {
          const smoothedFrequency = ema(
            smoothedFrequencyRef.current,
            frequency,
            TUNER_FREQUENCY_EMA_ALPHA,
          );
          smoothedFrequencyRef.current = smoothedFrequency;

          const rawDetection = frequencyToNote(smoothedFrequency);
          const noteChanged =
            lastNoteRef.current !== null &&
            lastNoteRef.current !== rawDetection.note;

          let displayCents: number;

          if (noteChanged || smoothedCentsRef.current === null) {
            displayCents = rawDetection.cents;
            smoothedCentsRef.current = rawDetection.cents;
          } else {
            displayCents = ema(
              smoothedCentsRef.current,
              rawDetection.cents,
              TUNER_CENTS_EMA_ALPHA,
            );
            smoothedCentsRef.current = displayCents;
          }

          lastNoteRef.current = rawDetection.note;

          setDetection({
            note: rawDetection.note,
            frequency: smoothedFrequency,
            cents: displayCents,
          });
        }

        animationFrameRef.current = requestAnimationFrame(updatePitch);
      };

      animationFrameRef.current = requestAnimationFrame(updatePitch);
    } catch (error) {
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
  }, [micStarting, stopAudio]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  return {
    detection,
    micError,
    micPermissionGranted,
    micReady,
    micStarting,
    start,
    stop: stopAudio,
  };
}
