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

type UseAfinadorResult = {
  detection: NoteDetection | null;
  micError: string | null;
  micReady: boolean;
  start: () => Promise<void>;
  stop: () => void;
};

export function useAfinador(): UseAfinadorResult {
  const [detection, setDetection] = useState<NoteDetection | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [micReady, setMicReady] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const runningRef = useRef(false);
  const lastFrequencyRef = useRef<number | null>(null);

  const stopAudio = useCallback(() => {
    runningRef.current = false;

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
    if (runningRef.current) {
      return;
    }

    setMicError(null);
    setMicReady(false);
    setDetection(null);
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
    } catch {
      stopAudio();
      setMicError("Permiso de micrófono necesario para usar el afinador");
    }
  }, [stopAudio]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  return {
    detection,
    micError,
    micReady,
    start,
    stop: stopAudio,
  };
}
