"use client";

import { triggerHaptic } from "@/lib/haptic";
import { CIFRACLUB_EMBED_MAX_VISUAL_SCROLL_PX } from "@/lib/sala-layout";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** px/s por nivel (1 = muy suave). Escalones uniformes y moderados. */
export const LETRA_AUTO_SCROLL_SPEEDS = [14, 21, 28];
export const LETRA_AUTO_SCROLL_MAX_LEVEL = LETRA_AUTO_SCROLL_SPEEDS.length;

type UseLetraAutoScrollOptions = {
  enabled?: boolean;
  /** Al cambiar, reinicia scroll y velocidad (ej. id o nombre de canción). */
  contentKey?: string | number | null;
  /** Iframe embebido (Cifra Club): auto-scroll visual vía marginTop. */
  embedIframeRef?: RefObject<HTMLIFrameElement | null>;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("button, a, [role='button'], input, textarea, select"))
  );
}

function elementHasScrollRange(el: HTMLDivElement): boolean {
  return el.scrollHeight - el.clientHeight > 1;
}

function readEmbedClipPx(
  iframe: HTMLIFrameElement,
  key: "embedTopClipPx" | "embedBottomClipPx",
): number {
  const raw = iframe.dataset[key];
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Desplaza el iframe hacia arriba (mismo truco que el recorte superior).
 * La altura debe crecer con el offset: si no, el fondo del marco (letra-bg)
 * invade la zona visible al scrollear.
 * El recorte inferior queda “colgando” debajo del overflow:hidden (tapa ads).
 */
export function applyEmbedVisualScroll(
  iframe: HTMLIFrameElement,
  extraPx: number,
  maxExtraPx: number = CIFRACLUB_EMBED_MAX_VISUAL_SCROLL_PX,
) {
  const top = readEmbedClipPx(iframe, "embedTopClipPx");
  const bottom = readEmbedClipPx(iframe, "embedBottomClipPx");
  const extra = Math.max(0, Math.min(extraPx, maxExtraPx));
  const shift = top + extra;
  const overhang = shift + bottom;

  if (overhang === 0) {
    iframe.style.height = "";
    iframe.style.marginTop = "";
    iframe.style.width = "";
    return;
  }

  iframe.style.width = "100%";
  iframe.style.height = `calc(100% + ${overhang}px)`;
  iframe.style.marginTop = shift > 0 ? `-${shift}px` : "";
}

function resolveScrollListenerTarget(
  scrollEl: HTMLDivElement | null,
  embedIframeRef?: RefObject<HTMLIFrameElement | null>,
): HTMLElement | null {
  if (scrollEl && elementHasScrollRange(scrollEl)) {
    return scrollEl;
  }

  return embedIframeRef?.current ?? null;
}

export function useLetraAutoScroll(
  scrollRef: RefObject<HTMLDivElement | null>,
  {
    enabled = true,
    contentKey = null,
    embedIframeRef,
  }: UseLetraAutoScrollOptions = {},
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

    const iframe = embedIframeRef?.current;
    if (iframe) {
      applyEmbedVisualScroll(iframe, 0);
    }

    setAutoScrollLevel(0);
  }, [embedIframeRef, scrollRef]);

  useEffect(() => {
    autoScrollLevelRef.current = autoScrollLevel;

    if (autoScrollLevel > 0) {
      const scrollEl = scrollRef.current;
      if (scrollEl && elementHasScrollRange(scrollEl)) {
        autoScrollOffsetRef.current = scrollEl.scrollTop;
      }
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

      if (level === 0 || !enabled) {
        return;
      }

      const usesElementScroll = Boolean(scrollEl && elementHasScrollRange(scrollEl));
      const iframe = embedIframeRef?.current;
      const usesEmbedVisualScroll = !usesElementScroll && Boolean(iframe);

      if (!usesElementScroll && !usesEmbedVisualScroll) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      if (manualScrollActiveRef.current) {
        lastTime = now;
        frameId = requestAnimationFrame(tick);
        return;
      }

      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const speed = LETRA_AUTO_SCROLL_SPEEDS[level - 1] ?? LETRA_AUTO_SCROLL_SPEEDS[0];
      autoScrollOffsetRef.current += speed * deltaSeconds;

      if (usesElementScroll && scrollEl) {
        const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;

        if (maxScroll <= 1) {
          setAutoScrollLevel(0);
          return;
        }

        if (autoScrollOffsetRef.current >= maxScroll) {
          autoScrollOffsetRef.current = maxScroll;
          scrollEl.scrollTop = maxScroll;
          frameId = requestAnimationFrame(tick);
          return;
        }

        scrollEl.scrollTop = autoScrollOffsetRef.current;
        frameId = requestAnimationFrame(tick);
        return;
      }

      if (iframe) {
        applyEmbedVisualScroll(iframe, autoScrollOffsetRef.current);
      }

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [autoScrollLevel, embedIframeRef, enabled, scrollRef]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cleanup: (() => void) | undefined;

    function bindListeners(listenEl: HTMLElement) {
      function endManualScroll() {
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
        const scrollEl = scrollRef.current;
        if (
          scrollEl &&
          elementHasScrollRange(scrollEl) &&
          (manualScrollActiveRef.current || autoScrollLevelRef.current > 0)
        ) {
          autoScrollOffsetRef.current = scrollEl.scrollTop;
        }
      }

      listenEl.addEventListener("pointerdown", onPointerDown);
      listenEl.addEventListener("pointerup", endManualScroll);
      listenEl.addEventListener("pointercancel", endManualScroll);
      listenEl.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        listenEl.removeEventListener("pointerdown", onPointerDown);
        listenEl.removeEventListener("pointerup", endManualScroll);
        listenEl.removeEventListener("pointercancel", endManualScroll);
        listenEl.removeEventListener("scroll", onScroll);
      };
    }

    function attachListeners() {
      cleanup?.();
      const listenEl = resolveScrollListenerTarget(
        scrollRef.current,
        embedIframeRef,
      );

      if (!listenEl) {
        return;
      }

      cleanup = bindListeners(listenEl);
    }

    attachListeners();

    const iframe = embedIframeRef?.current;
    iframe?.addEventListener("load", attachListeners);

    return () => {
      iframe?.removeEventListener("load", attachListeners);
      cleanup?.();
    };
  }, [contentKey, embedIframeRef, enabled, scrollRef]);

  return {
    autoScrollLevel,
    accelerate,
    decelerate,
    reset,
  };
}
