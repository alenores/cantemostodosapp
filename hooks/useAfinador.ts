"use client";

import {
  autoCorrelate,
  frequencyToNote,
  type NoteDetection,
} from "@/lib/afinador";
import { useCallback, useEffect, useRef, useState } from "react";

type UseAfinadorOptions = {
  active: boolean;
};

type UseAfinadorResult = {
  detection: NoteDetection | null;
  micError: string | null;
  micReady: boolean;
};

export function useAfinador({ active }: UseAfinadorOptions): UseAfinadorResult {
  const [detection, setDetection] = useState<NoteDetection | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [micReady, setMicReady] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);

  const stopAudio = useCallback(() => {
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
    setDetection(null);
    setMicReady(false);
  }, []);

  useEffect(() => {
    if (!active) {
      stopAudio();
      setMicError(null);
      return;
    }

    let cancelled = false;

    async function startAudio() {
      setMicError(null);
      setMicReady(false);
      setDetection(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        mediaStreamRef.current = stream;

        const AudioContextClass =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;

        if (!AudioContextClass) {
          throw new Error("AudioContext no disponible en este navegador");
        }

        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataBufferRef.current = new Float32Array(
          new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT),
        );
        setMicReady(true);

        const updatePitch = () => {
          const currentAnalyser = analyserRef.current;
          const buffer = dataBufferRef.current;

          if (!currentAnalyser || !buffer) {
            return;
          }

          currentAnalyser.getFloatTimeDomainData(buffer);
          const frequency = autoCorrelate(buffer, audioContext.sampleRate);

          if (frequency === null) {
            setDetection(null);
          } else {
            setDetection(frequencyToNote(frequency));
          }

          animationFrameRef.current = requestAnimationFrame(updatePitch);
        };

        animationFrameRef.current = requestAnimationFrame(updatePitch);
      } catch {
        if (!cancelled) {
          setMicError(
            "Permiso de micrófono necesario para usar el afinador",
          );
          setMicReady(false);
        }
      }
    }

    void startAudio();

    return () => {
      cancelled = true;
      stopAudio();
    };
  }, [active, stopAudio]);

  return {
    detection,
    micError,
    micReady,
  };
}
