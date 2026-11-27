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
/** Mientras alguien arrastra la letra, cada cuánto se avisa a la sala (casi en vivo). */
const SYNC_SEND_INTERVAL_MS = 100;
/** Tras mover la letra con el dedo, se ignoran avisos de otros durante este tiempo. */
const LOCAL_SCROLL_PRIORITY_MS = 300;
/** Diferencia máxima (px) para reconocer un scroll que hizo la propia app. */
const PROGRAMMATIC_SCROLL_TOLERANCE_PX = 1.5;
/** Fracción del camino que recorre la letra por cuadro al seguir a otro celular. */
const REMOTE_FOLLOW_EASE_PER_FRAME = 0.35;

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

/** Toque o clic sobre la letra que se ve ahora (el nodo cambia al cargar el cifrado o al entrar en lectura). */
function isLetraTarget(
  target: EventTarget | null,
  scrollEl: HTMLDivElement | null,
  iframe: HTMLIFrameElement | null,
): boolean {
  if (!(target instanceof Node)) {
    return false;
  }

  return Boolean(scrollEl?.contains(target)) || (iframe != null && target === iframe);
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
  /** Hay dedos sobre la letra; evita reactivar auto-scroll tras pointercancel en Android. */
  const manualTouchActiveRef = useRef(false);
  const syncAnchorRatioRef = useRef(0);
  const syncAnchorMsRef = useRef(Date.now());
  const skipNextLevelEmitRef = useRef(false);
  const onSyncStateChangeRef = useRef(onSyncStateChange);
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Último scrollTop que puso la app (auto-scroll o seguir a otro); null = ninguno. */
  const programmaticScrollPxRef = useRef<number | null>(null);
  const lastLocalUserScrollMsRef = useRef(0);
  const lastSyncEmitMsRef = useRef(0);
  /** Hubo scroll del usuario desde que apoyó el dedo (un toque solo no avisa). */
  const userScrolledInGestureRef = useRef(false);
  const remoteFollowActiveRef = useRef(false);
  const remoteFollowFrameRef = useRef(0);
  const remoteFollowLastMsRef = useRef(0);

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
        programmaticScrollPxRef.current = clamped;
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

  const stopRemoteFollow = useCallback(() => {
    remoteFollowActiveRef.current = false;

    if (remoteFollowFrameRef.current) {
      cancelAnimationFrame(remoteFollowFrameRef.current);
      remoteFollowFrameRef.current = 0;
    }
  }, []);

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

  /**
   * Desliza la letra hacia la posición que avisó otro celular (sin saltos).
   * Con auto-scroll activo el objetivo avanza solo; al alcanzarlo, sigue el tick normal.
   */
  const startRemoteFollow = useCallback(() => {
    remoteFollowActiveRef.current = true;

    if (remoteFollowFrameRef.current) {
      return;
    }

    remoteFollowLastMsRef.current = performance.now();

    function step(nowMs: number) {
      remoteFollowFrameRef.current = 0;

      if (!remoteFollowActiveRef.current) {
        return;
      }

      const elapsedMs = Math.max(1, nowMs - remoteFollowLastMsRef.current);
      remoteFollowLastMsRef.current = nowMs;

      const target = computeOffsetPxFromAnchor(
        autoScrollLevelRef.current,
        syncAnchorRatioRef.current,
        syncAnchorMsRef.current,
      );
      const current = autoScrollOffsetRef.current;
      const diff = target - current;

      if (Math.abs(diff) <= 0.5) {
        applyOffsetPx(target);
        remoteFollowActiveRef.current = false;
        return;
      }

      const ease =
        1 - Math.pow(1 - REMOTE_FOLLOW_EASE_PER_FRAME, elapsedMs / (1000 / 60));
      applyOffsetPx(current + diff * ease);
      remoteFollowFrameRef.current = requestAnimationFrame(step);
    }

    remoteFollowFrameRef.current = requestAnimationFrame(step);
  }, [applyOffsetPx, computeOffsetPxFromAnchor]);

  const applySyncState = useCallback(
    (state: LecturaScrollSyncState) => {
      if (manualScrollActiveRef.current) {
        return;
      }

      // Quien está moviendo la letra en este celular manda sobre los avisos de otros.
      if (Date.now() - lastLocalUserScrollMsRef.current < LOCAL_SCROLL_PRIORITY_MS) {
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

      if (autoScrollLevelRef.current !== level) {
        autoScrollLevelRef.current = level;
        skipNextLevelEmitRef.current = true;
        setAutoScrollLevel(level);
      }

      startRemoteFollow();
    },
    [startRemoteFollow],
  );

  const emitSyncNow = useCallback(() => {
    if (scrollEndTimerRef.current) {
      clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = null;
    }

    lastSyncEmitMsRef.current = Date.now();
    captureAnchorFromCurrentOffset();
    emitLocalSyncState();
  }, [captureAnchorFromCurrentOffset, emitLocalSyncState]);

  /** Avisa la posición como mucho cada SYNC_SEND_INTERVAL_MS y siempre la última. */
  const scheduleThrottledSync = useCallback(() => {
    if (!syncEnabled) {
      return;
    }

    const sinceLastMs = Date.now() - lastSyncEmitMsRef.current;

    if (sinceLastMs >= SYNC_SEND_INTERVAL_MS) {
      emitSyncNow();
      return;
    }

    if (scrollEndTimerRef.current) {
      return;
    }

    scrollEndTimerRef.current = setTimeout(() => {
      scrollEndTimerRef.current = null;
      emitSyncNow();
    }, SYNC_SEND_INTERVAL_MS - sinceLastMs);
  }, [emitSyncNow, syncEnabled]);

  const finishManualScroll = useCallback(() => {
    manualScrollActiveRef.current = false;

    const scrolled = userScrolledInGestureRef.current;
    userScrolledInGestureRef.current = false;

    if (syncEnabled && scrolled) {
      emitSyncNow();
      return;
    }

    captureAnchorFromCurrentOffset();
  }, [captureAnchorFromCurrentOffset, emitSyncNow, syncEnabled]);

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
    stopRemoteFollow();
    programmaticScrollPxRef.current = 0;
    scrollRef.current?.scrollTo(0, 0);
    autoScrollOffsetRef.current = 0;
    syncAnchorRatioRef.current = 0;
    syncAnchorMsRef.current = Date.now();

    const iframe = embedIframeRef?.current;
    if (iframe) {
      applyEmbedVisualScroll(iframe, 0);
    }

    setAutoScrollLevel(0);
  }, [embedIframeRef, scrollRef, stopRemoteFollow]);

  useEffect(() => {
    autoScrollLevelRef.current = autoScrollLevel;

    // Velocidad que llegó de otro celular: el ancla ya es la suya, no se recalcula ni se reenvía.
    if (skipNextLevelEmitRef.current) {
      skipNextLevelEmitRef.current = false;
      return;
    }

    if (autoScrollLevel > 0) {
      captureAnchorFromCurrentOffset();
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

      if (manualScrollActiveRef.current || remoteFollowActiveRef.current) {
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
          programmaticScrollPxRef.current = maxScroll;
          scrollEl.scrollTop = maxScroll;
        } else if (iframe) {
          applyEmbedVisualScroll(iframe, maxScroll);
        }

        frameId = requestAnimationFrame(tick);
        return;
      }

      if (usesElementScroll && scrollEl) {
        programmaticScrollPxRef.current = offsetPx;
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

    let wheelEndTimer: ReturnType<typeof setTimeout> | null = null;
    manualTouchActiveRef.current = false;
    manualScrollActiveRef.current = false;

    // Escucha en todo el documento y filtra por la letra actual: el nodo de scroll se
    // reemplaza (Cargando cifrado… → cifrado, control → lectura) sin que cambie contentKey.
    function isCurrentLetraTarget(target: EventTarget | null): boolean {
      return isLetraTarget(
        target,
        scrollRef.current,
        embedIframeRef?.current ?? null,
      );
    }

    function beginManualScroll() {
      if (syncEnabled || autoScrollLevelRef.current > 0) {
        manualScrollActiveRef.current = true;
        userScrolledInGestureRef.current = false;
        stopRemoteFollow();
      }
    }

    function onTouchStart(event: TouchEvent) {
      if (!isCurrentLetraTarget(event.target) || isInteractiveTarget(event.target)) {
        return;
      }

      manualTouchActiveRef.current = true;
      beginManualScroll();
    }

    function onTouchEnd(event: TouchEvent) {
      if (!manualTouchActiveRef.current || event.touches.length > 0) {
        return;
      }

      manualTouchActiveRef.current = false;
      finishManualScroll();
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "touch") {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (!isCurrentLetraTarget(event.target) || isInteractiveTarget(event.target)) {
        return;
      }

      beginManualScroll();
    }

    function onPointerUp(event: PointerEvent) {
      if (event.pointerType === "touch" || !manualScrollActiveRef.current) {
        return;
      }

      if (manualTouchActiveRef.current) {
        return;
      }

      finishManualScroll();
    }

    function onWheel(event: WheelEvent) {
      if (!isCurrentLetraTarget(event.target)) {
        return;
      }

      beginManualScroll();

      if (wheelEndTimer) {
        clearTimeout(wheelEndTimer);
      }

      wheelEndTimer = setTimeout(() => {
        wheelEndTimer = null;

        if (!manualTouchActiveRef.current) {
          finishManualScroll();
        }
      }, MANUAL_SCROLL_SYNC_DEBOUNCE_MS);
    }

    function onScroll(event: Event) {
      const scrollEl = scrollRef.current;

      if (!scrollEl || event.target !== scrollEl) {
        return;
      }

      const scrollTop = scrollEl.scrollTop;

      if (
        elementHasScrollRange(scrollEl) &&
        (manualScrollActiveRef.current ||
          autoScrollLevelRef.current > 0 ||
          syncEnabled)
      ) {
        autoScrollOffsetRef.current = scrollTop;
      }

      const programmaticPx = programmaticScrollPxRef.current;

      // Lo movió la app (auto-scroll o seguir a otro celular): nunca se reenvía.
      if (
        programmaticPx !== null &&
        Math.abs(scrollTop - programmaticPx) <= PROGRAMMATIC_SCROLL_TOLERANCE_PX
      ) {
        return;
      }

      // Lo movió la persona (dedo, inercia, rueda o teclado).
      programmaticScrollPxRef.current = null;
      lastLocalUserScrollMsRef.current = Date.now();
      userScrolledInGestureRef.current = true;
      stopRemoteFollow();

      if (syncEnabled) {
        scheduleThrottledSync();
      }
    }

    const passiveCapture = { capture: true, passive: true } as const;

    document.addEventListener("touchstart", onTouchStart, passiveCapture);
    document.addEventListener("touchend", onTouchEnd, passiveCapture);
    document.addEventListener("touchcancel", onTouchEnd, passiveCapture);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("wheel", onWheel, passiveCapture);
    // scroll no burbujea: en captura llega el de cualquier contenedor.
    document.addEventListener("scroll", onScroll, passiveCapture);

    return () => {
      document.removeEventListener("touchstart", onTouchStart, true);
      document.removeEventListener("touchend", onTouchEnd, true);
      document.removeEventListener("touchcancel", onTouchEnd, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("wheel", onWheel, true);
      document.removeEventListener("scroll", onScroll, true);

      if (wheelEndTimer) {
        clearTimeout(wheelEndTimer);
      }

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
    scheduleThrottledSync,
    scrollRef,
    stopRemoteFollow,
    syncEnabled,
  ]);

  useEffect(() => stopRemoteFollow, [stopRemoteFollow]);

  return {
    autoScrollLevel,
    accelerate,
    decelerate,
    reset,
    applySyncState,
  };
}
