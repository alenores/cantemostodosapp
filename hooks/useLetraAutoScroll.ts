"use client";

import { triggerHaptic } from "@/lib/haptic";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** px/s por nivel (1 = muy suave). Escalones uniformes y moderados. */
export const LETRA_AUTO_SCROLL_SPEEDS = [14, 21, 28];
export const LETRA_AUTO_SCROLL_MAX_LEVEL = LETRA_AUTO_SCROLL_SPEEDS.length;

type UseLetraAutoScrollOptions = {
  enabled?: boolean;
  /** Al cambiar, reinicia scroll y velocidad (ej. id o nombre de canción). */
  contentKey?: string | number | null;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("button, a, [role='button'], input, textarea, select"))
  );
}

export function useLetraAutoScroll(
  scrollRef: RefObject<HTMLDivElement | null>,
  { enabled = true, contentKey = null }: UseLetraAutoScrollOptions = {},
) {
  const autoScrollLevelRef = useRef(0);
  const autoScrollOffsetRef = useRef(0);
  const manualScrollActiveRef = useRef(false);

  const [autoScrollLevel, setAutoScrollLevel] = useState(0);

  const accelerate = useCallback(() => {
    if (!enabled) {
      return;
    }

    setAutoScrollLevel((level) => {
      if (level >= LETRA_AUTO_SCROLL_MAX_LEVEL) {
        return level;
      }

      triggerHaptic();
      return level + 1;
    });
  }, [enabled]);

  const decelerate = useCallback(() => {
    if (!enabled) {
      return;
    }

    setAutoScrollLevel((level) => {
      if (level <= 0) {
        return 0;
      }

      triggerHaptic();
      return level - 1;
    });
  }, [enabled]);

  const reset = useCallback(() => {
    scrollRef.current?.scrollTo(0, 0);
    autoScrollOffsetRef.current = 0;
    setAutoScrollLevel(0);
  }, [scrollRef]);

  useEffect(() => {
    autoScrollLevelRef.current = autoScrollLevel;

    if (autoScrollLevel > 0) {
      autoScrollOffsetRef.current = scrollRef.current?.scrollTop ?? 0;
    }
  }, [autoScrollLevel, scrollRef]);

  useEffect(() => {
    if (!enabled) {
      setAutoScrollLevel(0);
    }
  }, [enabled]);

  useEffect(() => {
    reset();
  }, [contentKey, reset]);

  useEffect(() => {
    if (!enabled || autoScrollLevel === 0) {
      return;
    }

    let lastTime = performance.now();
    let frameId = 0;

    function tick(now: number) {
      const scrollEl = scrollRef.current;
      const level = autoScrollLevelRef.current;

      if (!scrollEl || level === 0 || !enabled) {
        return;
      }

      if (manualScrollActiveRef.current) {
        lastTime = now;
        frameId = requestAnimationFrame(tick);
        return;
      }

      const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;

      if (maxScroll <= 1) {
        setAutoScrollLevel(0);
        return;
      }

      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const speed = LETRA_AUTO_SCROLL_SPEEDS[level - 1] ?? LETRA_AUTO_SCROLL_SPEEDS[0];
      autoScrollOffsetRef.current += speed * deltaSeconds;

      if (autoScrollOffsetRef.current >= maxScroll) {
        autoScrollOffsetRef.current = maxScroll;
        scrollEl.scrollTop = maxScroll;
        frameId = requestAnimationFrame(tick);
        return;
      }

      scrollEl.scrollTop = autoScrollOffsetRef.current;
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [autoScrollLevel, enabled, scrollRef]);

  useEffect(() => {
    const scrollEl = scrollRef.current;

    if (!scrollEl || !enabled) {
      return;
    }

    function syncScrollOffset() {
      autoScrollOffsetRef.current = scrollEl!.scrollTop;
    }

    function endManualScroll() {
      syncScrollOffset();
      manualScrollActiveRef.current = false;
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (isInteractiveTarget(event.target)) {
        return;
      }

      if (autoScrollLevelRef.current > 0) {
        manualScrollActiveRef.current = true;
      }
    }

    function onScroll() {
      if (manualScrollActiveRef.current || autoScrollLevelRef.current > 0) {
        syncScrollOffset();
      }
    }

    scrollEl.addEventListener("pointerdown", onPointerDown);
    scrollEl.addEventListener("pointerup", endManualScroll);
    scrollEl.addEventListener("pointercancel", endManualScroll);
    scrollEl.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      scrollEl.removeEventListener("pointerdown", onPointerDown);
      scrollEl.removeEventListener("pointerup", endManualScroll);
      scrollEl.removeEventListener("pointercancel", endManualScroll);
      scrollEl.removeEventListener("scroll", onScroll);
    };
  }, [enabled, scrollRef, contentKey]);

  return {
    autoScrollLevel,
    accelerate,
    decelerate,
    reset,
  };
}
