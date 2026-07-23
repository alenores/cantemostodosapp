"use client";

import { triggerHaptic } from "@/lib/haptic";
import {
  clampOffsetRatio,
  type LecturaScrollSyncState,
} from "@/lib/lectura-scroll-sync";
import { CIFRACLUB_EMBED_MAX_VISUAL_SCROLL_PX } from "@/lib/sala-layout";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** px/s por nivel (1 = muy suave). Escalones uniformes y moderados. */
export const LETRA_AUTO_SCROLL_SPEEDS = [14, 21, 28];
export const LETRA_AUTO_SCROLL_MAX_LEVEL = LETRA_AUTO_SCROLL_SPEEDS.length;

const MANUAL_SCROLL_SYNC_DEBOUNCE_MS = 150;

type UseLetraAutoScrollOptions = {
  /** Activa animación y listeners (scroll compartido en sala). */
  enabled?: boolean;
  /** Botones acelerar/frenar; por defecto igual que `enabled`. */
  controlsEnabled?: boolean;
  /** Emite posición al soltar scroll manual o rueda (PC). */
  syncEnabled?: boolean;
  onSyncStateChange?: (state: LecturaScrollSyncState) => void;
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
 * Posición absoluta + height que crece con el offset: si no, el fondo del marco
 * invade la zona visible. El recorte inferior cuelga debajo del overflow:hidden.
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
    iframe.style.position = "";
    iframe.style.left = "";
    iframe.style.top = "";
    iframe.style.height = "";
    iframe.style.marginTop = "";
    iframe.style.width = "";
    return;
  }

  iframe.style.position = "absolute";
  iframe.style.left = "0";
  iframe.style.width = "100%";
  iframe.style.marginTop = "";
  iframe.style.top = shift > 0 ? `-${shift}px` : "0";
  iframe.style.height = `calc(100% + ${overhang}px)`;
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
    controlsEnabled,
    syncEnabled = false,
    onSyncStateChange,
    contentKey = null,
    embedIframeRef,
  }: UseLetraAutoScrollOptions = {},
) {
  const controlsActive = controlsEnabled ?? enabled;
  const autoScrollLevelRef = useRef(0);
  const autoScrollOffsetRef = useRef(0);
  const manualScrollActiveRef = useRef(false);
  /** Dedos activos en la letra; evita reactivar auto-scroll tras pointercancel en Android. */
  const manualTouchCountRef = useRef(0);
  const syncAnchorRatioRef = useRef(0);
  const syncAnchorMsRef = useRef(Date.now());
  const skipNextLevelEmitRef = useRef(false);
  const onSyncStateChangeRef = useRef(onSyncStateChange);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [autoScrollLevel, setAutoScrollLevel] = useState(0);

  useEffect(() => {
    onSyncStateChangeRef.current = onSyncStateChange;
  }, [onSyncStateChange]);

  const getMaxScrollPx = useCallback((): number => {
    const scrollEl = scrollRef.current;

    if (scrollEl && elementHasScrollRange(scrollEl)) {
      return scrollEl.scrollHeight - scrollEl.clientHeight;
    }

    return CIFRACLUB_EMBED_MAX_VISUAL_SCROLL_PX;
  }, [scrollRef]);

  const applyOffsetPx = useCallback(
    (offsetPx: number) => {
      const maxScroll = getMaxScrollPx();
      const clamped = Math.max(0, Math.min(offsetPx, maxScroll));
      autoScrollOffsetRef.current = clamped;

      const scrollEl = scrollRef.current;
      if (scrollEl && elementHasScrollRange(scrollEl)) {
        scrollEl.scrollTop = clamped;
        return;
      }

      const iframe = embedIframeRef?.current;
      if (iframe) {
        applyEmbedVisualScroll(iframe, clamped);
      }
    },
    [embedIframeRef, getMaxScrollPx, scrollRef],
  );

  const captureAnchorFromCurrentOffset = useCallback(() => {
    const scrollEl = scrollRef.current;

    if (scrollEl && elementHasScrollRange(scrollEl)) {
      autoScrollOffsetRef.current = scrollEl.scrollTop;
    }

    const maxScroll = getMaxScrollPx();

    if (maxScroll <= 1) {
      syncAnchorRatioRef.current = 0;
      autoScrollOffsetRef.current = 0;
    } else {
      syncAnchorRatioRef.current = clampOffsetRatio(
        autoScrollOffsetRef.current / maxScroll,
      );
    }

    syncAnchorMsRef.current = Date.now();
  }, [getMaxScrollPx, scrollRef]);

  const emitLocalSyncState = useCallback(() => {
    if (!syncEnabled) {
      return;
    }

    onSyncStateChangeRef.current?.({
      level: autoScrollLevelRef.current,
      offsetRatio: syncAnchorRatioRef.current,
      anchorMs: syncAnchorMsRef.current,
    });
  }, [syncEnabled]);

  const computeOffsetPxFromAnchor = useCallback(
    (level: number, anchorRatio: number, anchorMs: number): number => {
      const maxScroll = getMaxScrollPx();

      if (maxScroll <= 1) {
        return 0;
      }

      const basePx = anchorRatio * maxScroll;

      if (level <= 0) {
        return basePx;
      }

      const elapsedSeconds = Math.max(0, (Date.now() - anchorMs) / 1000);
      const speed =
        LETRA_AUTO_SCROLL_SPEEDS[level - 1] ?? LETRA_AUTO_SCROLL_SPEEDS[0];

      return Math.min(maxScroll, basePx + speed * elapsedSeconds);
    },
    [getMaxScrollPx],
  );

  const applySyncState = useCallback(
    (state: LecturaScrollSyncState) => {
      if (manualScrollActiveRef.current) {
        return;
      }

      const level = Math.max(
        0,
        Math.min(LETRA_AUTO_SCROLL_MAX_LEVEL, Math.round(state.level)),
      );
      const anchorRatio = clampOffsetRatio(state.offsetRatio);
      const anchorMs = state.anchorMs;

      syncAnchorRatioRef.current = anchorRatio;
      syncAnchorMsRef.current = anchorMs;
      autoScrollLevelRef.current = level;
      skipNextLevelEmitRef.current = true;
      setAutoScrollLevel(level);

      const offsetPx = computeOffsetPxFromAnchor(level, anchorRatio, anchorMs);
      applyOffsetPx(offsetPx);
    },
    [applyOffsetPx, computeOffsetPxFromAnchor],
  );

  const scheduleManualScrollSync = useCallback(() => {
    if (!syncEnabled) {
      return;
    }

    if (scrollEndTimerRef.current) {
      clearTimeout(scrollEndTimerRef.current);
    }

    scrollEndTimerRef.current = setTimeout(() => {
      scrollEndTimerRef.current = null;
      captureAnchorFromCurrentOffset();
      emitLocalSyncState();
    }, MANUAL_SCROLL_SYNC_DEBOUNCE_MS);
  }, [captureAnchorFromCurrentOffset, emitLocalSyncState, syncEnabled]);

  const finishManualScroll = useCallback(() => {
    manualScrollActiveRef.current = false;

    if (scrollEndTimerRef.current) {
      clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = null;
    }

    captureAnchorFromCurrentOffset();

    if (syncEnabled) {
      emitLocalSyncState();
    }
  }, [captureAnchorFromCurrentOffset, emitLocalSyncState, syncEnabled]);

  const accelerate = useCallback(() => {
    if (!controlsActive) {
      return;
    }

    setAutoScrollLevel((level) => {
      if (level >= LETRA_AUTO_SCROLL_MAX_LEVEL) {
        return level;
      }

      captureAnchorFromCurrentOffset();
      triggerHaptic();
      return level + 1;
    });
  }, [captureAnchorFromCurrentOffset, controlsActive]);

  const decelerate = useCallback(() => {
    if (!controlsActive) {
      return;
    }

    setAutoScrollLevel((level) => {
      if (level <= 0) {
        return 0;
      }

      const nextLevel = level - 1;
      const offsetPx = computeOffsetPxFromAnchor(
        level,
        syncAnchorRatioRef.current,
        syncAnchorMsRef.current,
      );
      autoScrollOffsetRef.current = offsetPx;
      applyOffsetPx(offsetPx);
      captureAnchorFromCurrentOffset();
      triggerHaptic();
      return nextLevel;
    });
  }, [
    applyOffsetPx,
    captureAnchorFromCurrentOffset,
    computeOffsetPxFromAnchor,
    controlsActive,
  ]);

  const reset = useCallback(() => {
    scrollRef.current?.scrollTo(0, 0);
    autoScrollOffsetRef.current = 0;
    syncAnchorRatioRef.current = 0;
    syncAnchorMsRef.current = Date.now();

    const iframe = embedIframeRef?.current;
    if (iframe) {
      applyEmbedVisualScroll(iframe, 0);
    }

    setAutoScrollLevel(0);
  }, [embedIframeRef, scrollRef]);

  useEffect(() => {
    autoScrollLevelRef.current = autoScrollLevel;

    if (autoScrollLevel > 0) {
      captureAnchorFromCurrentOffset();
    }

    if (skipNextLevelEmitRef.current) {
      skipNextLevelEmitRef.current = false;
      return;
    }

    if (syncEnabled) {
      emitLocalSyncState();
    }
  }, [
    autoScrollLevel,
    captureAnchorFromCurrentOffset,
    emitLocalSyncState,
    syncEnabled,
  ]);

  useEffect(() => {
    if (!enabled && !syncEnabled) {
      autoScrollOffsetRef.current = 0;
      syncAnchorRatioRef.current = 0;
      syncAnchorMsRef.current = Date.now();
      setAutoScrollLevel(0);

      const iframe = embedIframeRef?.current;
      if (iframe) {
        applyEmbedVisualScroll(iframe, 0);
      }
    }
  }, [embedIframeRef, enabled, syncEnabled]);

  useEffect(() => {
    reset();
  }, [contentKey, reset]);

  useEffect(() => {
    if (!enabled || autoScrollLevel === 0) {
      return;
    }

    let frameId = 0;

    function tick() {
      const level = autoScrollLevelRef.current;

      if (level === 0 || !enabled) {
        return;
      }

      const scrollEl = scrollRef.current;
      const usesElementScroll = Boolean(scrollEl && elementHasScrollRange(scrollEl));
      const iframe = embedIframeRef?.current;
      const usesEmbedVisualScroll = !usesElementScroll && Boolean(iframe);

      if (!usesElementScroll && !usesEmbedVisualScroll) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      if (manualScrollActiveRef.current) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      const maxScroll = usesElementScroll && scrollEl
        ? scrollEl.scrollHeight - scrollEl.clientHeight
        : CIFRACLUB_EMBED_MAX_VISUAL_SCROLL_PX;

      if (maxScroll <= 1) {
        setAutoScrollLevel(0);
        return;
      }

      const offsetPx = computeOffsetPxFromAnchor(
        level,
        syncAnchorRatioRef.current,
        syncAnchorMsRef.current,
      );
      autoScrollOffsetRef.current = offsetPx;

      if (offsetPx >= maxScroll) {
        autoScrollOffsetRef.current = maxScroll;
        syncAnchorRatioRef.current = 1;
        syncAnchorMsRef.current = Date.now();

        if (usesElementScroll && scrollEl) {
          scrollEl.scrollTop = maxScroll;
        } else if (iframe) {
          applyEmbedVisualScroll(iframe, maxScroll);
        }

        frameId = requestAnimationFrame(tick);
        return;
      }

      if (usesElementScroll && scrollEl) {
        scrollEl.scrollTop = offsetPx;
      } else if (iframe) {
        applyEmbedVisualScroll(iframe, offsetPx);
      }

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [autoScrollLevel, computeOffsetPxFromAnchor, embedIframeRef, enabled, scrollRef]);

  useEffect(() => {
    if (!enabled && !syncEnabled) {
      return;
    }

    let cleanup: (() => void) | undefined;

    function bindListeners(listenEl: HTMLElement) {
      function beginManualScroll() {
        if (syncEnabled || autoScrollLevelRef.current > 0) {
          manualScrollActiveRef.current = true;
        }
      }

      function endManualScrollIfIdle() {
        if (manualTouchCountRef.current > 0) {
          return;
        }

        finishManualScroll();
      }

      function onTouchStart(event: TouchEvent) {
        if (isInteractiveTarget(event.target)) {
          return;
        }

        manualTouchCountRef.current += 1;
        beginManualScroll();
      }

      function onTouchEnd() {
        manualTouchCountRef.current = Math.max(0, manualTouchCountRef.current - 1);
        endManualScrollIfIdle();
      }

      function onPointerDown(event: PointerEvent) {
        if (event.pointerType === "touch") {
          return;
        }

        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }

        if (isInteractiveTarget(event.target)) {
          return;
        }

        beginManualScroll();
      }

      function onPointerUp(event: PointerEvent) {
        if (event.pointerType === "touch") {
          return;
        }

        finishManualScroll();
      }

      function onScroll() {
        const scrollEl = scrollRef.current;
        if (
          scrollEl &&
          elementHasScrollRange(scrollEl) &&
          (manualScrollActiveRef.current ||
            autoScrollLevelRef.current > 0 ||
            syncEnabled)
        ) {
          autoScrollOffsetRef.current = scrollEl.scrollTop;
        }

        if (syncEnabled && !manualScrollActiveRef.current) {
          scheduleManualScrollSync();
        }
      }

      listenEl.addEventListener("touchstart", onTouchStart, { passive: true });
      listenEl.addEventListener("touchend", onTouchEnd, { passive: true });
      listenEl.addEventListener("touchcancel", onTouchEnd, { passive: true });
      listenEl.addEventListener("pointerdown", onPointerDown);
      listenEl.addEventListener("pointerup", onPointerUp);
      listenEl.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        listenEl.removeEventListener("touchstart", onTouchStart);
        listenEl.removeEventListener("touchend", onTouchEnd);
        listenEl.removeEventListener("touchcancel", onTouchEnd);
        listenEl.removeEventListener("pointerdown", onPointerDown);
        listenEl.removeEventListener("pointerup", onPointerUp);
        listenEl.removeEventListener("scroll", onScroll);
      };
    }

    function attachListeners() {
      cleanup?.();
      manualTouchCountRef.current = 0;
      manualScrollActiveRef.current = false;
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

      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
        scrollEndTimerRef.current = null;
      }
    };
  }, [
    contentKey,
    embedIframeRef,
    enabled,
    finishManualScroll,
    scheduleManualScrollSync,
    scrollRef,
    syncEnabled,
  ]);

  return {
    autoScrollLevel,
    accelerate,
    decelerate,
    reset,
    applySyncState,
  };
}
