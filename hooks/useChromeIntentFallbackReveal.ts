"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openPageInChrome } from "@/lib/pwa-open-in-chrome";

type UseChromeIntentFallbackRevealResult = {
  manualRevealed: boolean;
  attempting: boolean;
  startAttempt: () => void;
};

/**
 * Tras intentar abrir Chrome, muestra los pasos a mano solo si la página
 * sigue a la vista. Si la persona se fue, no los muestra.
 */
export function useChromeIntentFallbackReveal(
  delayMs: number,
): UseChromeIntentFallbackRevealResult {
  const [manualRevealed, setManualRevealed] = useState(false);
  const [attempting, setAttempting] = useState(false);
  const attemptIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupListenersRef = useRef<(() => void) | null>(null);

  const clearActiveAttempt = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    cleanupListenersRef.current?.();
    cleanupListenersRef.current = null;
  }, []);

  const startAttempt = useCallback(() => {
    clearActiveAttempt();
    const attemptId = ++attemptIdRef.current;
    setAttempting(true);

    openPageInChrome();

    let leftPage = false;

    const onLeave = () => {
      if (attemptId !== attemptIdRef.current || leftPage) return;
      leftPage = true;
      clearActiveAttempt();
      setAttempting(false);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        onLeave();
      }
    };

    window.addEventListener("pagehide", onLeave);
    window.addEventListener("blur", onLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    cleanupListenersRef.current = () => {
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };

    timerRef.current = setTimeout(() => {
      cleanupListenersRef.current?.();
      cleanupListenersRef.current = null;
      timerRef.current = null;

      if (attemptId !== attemptIdRef.current || leftPage) return;
      if (document.visibilityState !== "visible") return;

      setAttempting(false);
      setManualRevealed(true);
    }, delayMs);
  }, [clearActiveAttempt, delayMs]);

  useEffect(() => clearActiveAttempt, [clearActiveAttempt]);

  return { manualRevealed, attempting, startAttempt };
}
