"use client";

import {
  autoCorrelate,
  frequencyToNote,
  type NoteDetection,
} from "@/lib/afinador";
import { useCallback, useEffect, useRef, useState } from "react";

const MIC_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

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
  micReady: boolean;
  micStarting: boolean;
  start: () => Promise<void>;
  stop: () => void;
};

export function useAfinador(): UseAfinadorResult {
  const [detection, setDetection] = useState<NoteDetection | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [micReady, setMicReady] = useState(false);
  const [micStarting, setMicStarting] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const runningRef = useRef(false);
  const lastFrequencyRef = useRef<number | null>(null);

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
    lastFrequencyRef.current = null;
    setDetection(null);
    setMicReady(false);
  }, []);

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
    lastFrequencyRef.current = null;

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
          if (lastFrequencyRef.current !== null) {
            lastFrequencyRef.current = null;
            setDetection(null);
          }
        } else if (
          lastFrequencyRef.current === null ||
          Math.abs(frequency - lastFrequencyRef.current) > 0.5
        ) {
          lastFrequencyRef.current = frequency;
          setDetection(frequencyToNote(frequency));
        }

        animationFrameRef.current = requestAnimationFrame(updatePitch);
      };

      animationFrameRef.current = requestAnimationFrame(updatePitch);
    } catch (error) {
      stopAudio();
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
    micReady,
    micStarting,
    start,
    stop: stopAudio,
  };
}
