"use client";

import LetraTexto from "@/components/salas/LetraTexto";
import { TapButton } from "@/components/ui/TapFeedback";
import { triggerHaptic } from "@/lib/haptic";
import type { CancionCancionero } from "@/types";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

const AXIS_LOCK_PX = 8;
const SWIPE_COMMIT_RATIO = 0.2;
const SWIPE_COMMIT_MIN_PX = 48;
const CAROUSEL_TRANSITION_MS = 260;
const HEADER_CLASS =
  "shrink-0 border-b border-border bg-bg-dark px-4 py-3 pr-14 select-none";
const BOTTOM_NAV_CLASS =
  "shrink-0 border-t border-border bg-bg-dark px-3 py-1.5 select-none";
/** px/s por nivel (1 = muy suave). */
const AUTO_SCROLL_SPEEDS = [16, 28, 44, 64, 92];
const AUTO_SCROLL_MAX_LEVEL = AUTO_SCROLL_SPEEDS.length;
const PLAY_LONG_PRESS_MS = 500;

type GestureMode = "undecided" | "carousel" | "scroll";

type ActiveGesture = {
  mode: GestureMode;
  startX: number;
  startY: number;
  startScrollTop: number;
  pointerId: number;
};

type CancioneroVerModalProps = {
  open: boolean;
  cancion: CancionCancionero | null;
  cancionAnterior?: CancionCancionero | null;
  cancionSiguiente?: CancionCancionero | null;
  onClose: () => void;
  onAnterior?: () => void;
  onSiguiente?: () => void;
  tieneAnterior?: boolean;
  tieneSiguiente?: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("button, a, [role='button'], input, textarea, select"))
  );
}

function applyRubberBand(offset: number, canGo: boolean): number {
  if (!canGo) {
    return offset * 0.32;
  }

  return offset;
}

type CancionNavBarProps = {
  tieneAnterior: boolean;
  tieneSiguiente: boolean;
  tieneLetra: boolean;
  autoScrollLevel: number;
  onAnterior?: () => void;
  onSiguiente?: () => void;
  onAutoScrollTap?: () => void;
  onAutoScrollPause?: () => void;
};

function CancionNavBar({
  tieneAnterior,
  tieneSiguiente,
  tieneLetra,
  autoScrollLevel,
  onAnterior,
  onSiguiente,
  onAutoScrollTap,
  onAutoScrollPause,
}: CancionNavBarProps) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handlePlayPointerDown() {
    if (!tieneLetra || autoScrollLevel === 0) {
      return;
    }

    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onAutoScrollPause?.();
    }, PLAY_LONG_PRESS_MS);
  }

  function handlePlayPointerUp() {
    clearLongPressTimer();
  }

  function handlePlayClick() {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    onAutoScrollTap?.();
  }

  const isScrolling = autoScrollLevel > 0;

  return (
    <div className={BOTTOM_NAV_CLASS}>
      <div className="flex items-center justify-between gap-2">
        <TapButton
          type="button"
          aria-label="Canción anterior"
          disabled={!tieneAnterior}
          onClick={onAnterior}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-card disabled:opacity-30"
        >
          <ChevronLeft className="size-4 text-text-primary" aria-hidden="true" />
        </TapButton>

        <TapButton
          type="button"
          aria-label={
            !tieneLetra
              ? "Sin letra para desplazar"
              : isScrolling
                ? `Velocidad ${autoScrollLevel}. Tocá para acelerar. Mantené para pausar.`
                : "Iniciar desplazamiento automático de la letra"
          }
          disabled={!tieneLetra}
          onClick={handlePlayClick}
          onPointerDown={handlePlayPointerDown}
          onPointerUp={handlePlayPointerUp}
          onPointerLeave={handlePlayPointerUp}
          onPointerCancel={handlePlayPointerUp}
          className={`relative flex size-8 shrink-0 items-center justify-center rounded-full disabled:opacity-30 ${
            isScrolling ? "bg-accent text-white" : "bg-bg-card text-text-primary"
          }`}
        >
          {isScrolling ? (
            <Pause className="size-3.5" aria-hidden="true" />
          ) : (
            <Play className="size-3.5" aria-hidden="true" />
          )}
          {isScrolling && (
            <span className="absolute -bottom-0.5 text-[9px] font-bold leading-none">
              {autoScrollLevel}
            </span>
          )}
        </TapButton>

        <TapButton
          type="button"
          aria-label="Canción siguiente"
          disabled={!tieneSiguiente}
          onClick={onSiguiente}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-card disabled:opacity-30"
        >
          <ChevronRight className="size-4 text-text-primary" aria-hidden="true" />
        </TapButton>
      </div>
    </div>
  );
}

type CancionSlideProps = {
  cancion: CancionCancionero | null;
  scrollRef?: RefObject<HTMLDivElement | null>;
  isCurrent?: boolean;
  tieneAnterior?: boolean;
  tieneSiguiente?: boolean;
  autoScrollLevel?: number;
  onAnterior?: () => void;
  onSiguiente?: () => void;
  onAutoScrollTap?: () => void;
  onAutoScrollPause?: () => void;
};

function CancionSlide({
  cancion,
  scrollRef,
  isCurrent = false,
  tieneAnterior = false,
  tieneSiguiente = false,
  autoScrollLevel = 0,
  onAnterior,
  onSiguiente,
  onAutoScrollTap,
  onAutoScrollPause,
}: CancionSlideProps) {
  if (!cancion) {
    return (
      <div
        className="h-full shrink-0 basis-1/3"
        style={{ flex: "0 0 33.333333%" }}
        aria-hidden="true"
      />
    );
  }

  const tieneLetra = Boolean(cancion.letra?.trim());
  const navProps = isCurrent
    ? {
        tieneAnterior,
        tieneSiguiente,
        tieneLetra,
        autoScrollLevel,
        onAnterior,
        onSiguiente,
        onAutoScrollTap,
        onAutoScrollPause,
      }
    : {
        tieneAnterior: false,
        tieneSiguiente: false,
        tieneLetra: false,
        autoScrollLevel: 0,
      };

  return (
    <div
      className="flex h-full shrink-0 flex-col bg-bg-cola-sheet"
      style={{ flex: "0 0 33.333333%" }}
    >
      <header className={HEADER_CLASS}>
        <div className="min-w-0">
          <h2
            id={isCurrent ? "cancionero-ver-titulo" : undefined}
            className="truncate text-lg font-extrabold text-accent"
          >
            {cancion.nombre}
          </h2>
          {cancion.artista && (
            <p className="mt-0.5 truncate text-sm text-text-muted">
              {cancion.artista}
            </p>
          )}
        </div>
      </header>

      <div
        ref={isCurrent ? scrollRef : undefined}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
      >
        {tieneLetra ? (
          <LetraTexto texto={cancion.letra!} edgeToEdge />
        ) : (
          <p className="px-4 py-8 text-center text-sm text-text-muted">
            Esta canción no tiene letra guardada.
          </p>
        )}
      </div>

      <CancionNavBar {...navProps} />
    </div>
  );
}

export default function CancioneroVerModal({
  open,
  cancion,
  cancionAnterior = null,
  cancionSiguiente = null,
  onClose,
  onAnterior,
  onSiguiente,
  tieneAnterior = false,
  tieneSiguiente = false,
}: CancioneroVerModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const letraScrollRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<ActiveGesture | null>(null);
  const lockedRef = useRef(false);
  const autoScrollLevelRef = useRef(0);
  const pauseAutoScrollRef = useRef<(() => void) | null>(null);

  const tieneAnteriorRef = useRef(tieneAnterior);
  const tieneSiguienteRef = useRef(tieneSiguiente);
  const onAnteriorRef = useRef(onAnterior);
  const onSiguienteRef = useRef(onSiguiente);

  const [offsetX, setOffsetX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [autoScrollLevel, setAutoScrollLevel] = useState(0);

  const pauseAutoScroll = useCallback(() => {
    setAutoScrollLevel(0);
  }, []);

  const handleAutoScrollTap = useCallback(() => {
    setAutoScrollLevel((level) => {
      if (level === 0) {
        triggerHaptic();
        return 1;
      }

      if (level < AUTO_SCROLL_MAX_LEVEL) {
        triggerHaptic();
        return level + 1;
      }

      return level;
    });
  }, []);

  useEffect(() => {
    autoScrollLevelRef.current = autoScrollLevel;
  }, [autoScrollLevel]);

  useEffect(() => {
    pauseAutoScrollRef.current = pauseAutoScroll;
  }, [pauseAutoScroll]);

  useEffect(() => {
    tieneAnteriorRef.current = tieneAnterior;
    tieneSiguienteRef.current = tieneSiguiente;
    onAnteriorRef.current = onAnterior;
    onSiguienteRef.current = onSiguiente;
  }, [tieneAnterior, tieneSiguiente, onAnterior, onSiguiente]);

  useEffect(() => {
    lockedRef.current = animating;
  }, [animating]);

  useEffect(() => {
    if (!open) {
      setAutoScrollLevel(0);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const getViewportWidth = useCallback(() => {
    return viewportRef.current?.offsetWidth ?? 0;
  }, []);

  const runTransition = useCallback(
    (targetOffset: number, onDone?: () => void) => {
      setAnimating(true);
      setOffsetX(targetOffset);

      window.setTimeout(() => {
        setAnimating(false);
        onDone?.();
      }, CAROUSEL_TRANSITION_MS);
    },
    [],
  );

  const navigateByDirection = useCallback(
    (direction: -1 | 1) => {
      if (lockedRef.current) {
        return;
      }

      pauseAutoScrollRef.current?.();

      const width = getViewportWidth();

      if (direction < 0 && tieneAnteriorRef.current) {
        runTransition(width, () => {
          triggerHaptic();
          onAnteriorRef.current?.();
          setOffsetX(0);
        });
        return;
      }

      if (direction > 0 && tieneSiguienteRef.current) {
        runTransition(-width, () => {
          triggerHaptic();
          onSiguienteRef.current?.();
          setOffsetX(0);
        });
      }
    },
    [getViewportWidth, runTransition],
  );

  const handleRelease = useCallback(
    (dx: number) => {
      const width = getViewportWidth();
      const threshold = Math.max(width * SWIPE_COMMIT_RATIO, SWIPE_COMMIT_MIN_PX);

      if (dx < -threshold && tieneSiguienteRef.current) {
        navigateByDirection(1);
        return;
      }

      if (dx > threshold && tieneAnteriorRef.current) {
        navigateByDirection(-1);
        return;
      }

      runTransition(0);
    },
    [getViewportWidth, navigateByDirection, runTransition],
  );

  useEffect(() => {
    if (autoScrollLevel === 0) {
      return;
    }

    let lastTime = performance.now();
    let frameId = 0;

    function tick(now: number) {
      const scrollEl = letraScrollRef.current;
      const level = autoScrollLevelRef.current;

      if (!scrollEl || level === 0) {
        return;
      }

      const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;

      if (maxScroll <= 1) {
        setAutoScrollLevel(0);
        return;
      }

      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const speed = AUTO_SCROLL_SPEEDS[level - 1] ?? AUTO_SCROLL_SPEEDS[0];
      const nextScrollTop = scrollEl.scrollTop + speed * deltaSeconds;

      if (nextScrollTop >= maxScroll) {
        scrollEl.scrollTop = maxScroll;
        triggerHaptic();
        setAutoScrollLevel(0);
        return;
      }

      scrollEl.scrollTop = nextScrollTop;
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [autoScrollLevel]);

  useEffect(() => {
    if (!cancion) {
      return;
    }

    letraScrollRef.current?.scrollTo(0, 0);
    setOffsetX(0);
    setAnimating(false);
    setAutoScrollLevel(0);
    gestureRef.current = null;
  }, [cancion?.id]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog || !open) {
      return;
    }

    const dialogEl = dialog;

    function beginGesture(clientX: number, clientY: number, pointerId: number) {
      if (lockedRef.current) {
        return;
      }

      gestureRef.current = {
        mode: "undecided",
        startX: clientX,
        startY: clientY,
        startScrollTop: letraScrollRef.current?.scrollTop ?? 0,
        pointerId,
      };
    }

    function moveGesture(clientX: number, clientY: number, prevent: () => void) {
      const gesture = gestureRef.current;

      if (!gesture) {
        return;
      }

      const dx = clientX - gesture.startX;
      const dy = clientY - gesture.startY;
      const scrollEl = letraScrollRef.current;

      if (gesture.mode === "undecided") {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) {
          return;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
          pauseAutoScrollRef.current?.();
          gesture.mode = "carousel";
        } else {
          gesture.mode = "scroll";
          pauseAutoScrollRef.current?.();
        }
      }

      if (gesture.mode === "scroll") {
        prevent();

        if (scrollEl) {
          const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
          scrollEl.scrollTop = clamp(
            gesture.startScrollTop - dy,
            0,
            maxScroll,
          );
        }

        return;
      }

      prevent();

      const displayOffset = applyRubberBand(
        dx,
        dx < 0 ? tieneSiguienteRef.current : dx > 0 ? tieneAnteriorRef.current : true,
      );
      setOffsetX(displayOffset);
    }

    function endGesture(clientX: number, pointerId: number) {
      const gesture = gestureRef.current;

      if (!gesture || gesture.pointerId !== pointerId) {
        return;
      }

      if (gesture.mode === "carousel") {
        handleRelease(clientX - gesture.startX);
      }

      gestureRef.current = null;
    }

    function releaseCapture(pointerId: number) {
      if (dialogEl.hasPointerCapture(pointerId)) {
        dialogEl.releasePointerCapture(pointerId);
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (isInteractiveTarget(event.target)) {
        return;
      }

      beginGesture(event.clientX, event.clientY, event.pointerId);

      if (gestureRef.current) {
        dialogEl.setPointerCapture(event.pointerId);
      }
    }

    function onPointerMove(event: PointerEvent) {
      const gesture = gestureRef.current;

      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }

      moveGesture(event.clientX, event.clientY, () => {
        if (event.cancelable) {
          event.preventDefault();
        }
      });
    }

    function onPointerUp(event: PointerEvent) {
      const gesture = gestureRef.current;

      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }

      releaseCapture(event.pointerId);
      endGesture(event.clientX, event.pointerId);
    }

    function onPointerCancel(event: PointerEvent) {
      const gesture = gestureRef.current;

      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }

      releaseCapture(event.pointerId);
      gestureRef.current = null;

      if (gesture.mode === "carousel") {
        runTransition(0);
      }
    }

    dialogEl.addEventListener("pointerdown", onPointerDown);
    dialogEl.addEventListener("pointermove", onPointerMove);
    dialogEl.addEventListener("pointerup", onPointerUp);
    dialogEl.addEventListener("pointercancel", onPointerCancel);

    return () => {
      dialogEl.removeEventListener("pointerdown", onPointerDown);
      dialogEl.removeEventListener("pointermove", onPointerMove);
      dialogEl.removeEventListener("pointerup", onPointerUp);
      dialogEl.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [open, handleRelease, runTransition]);

  if (!open || !cancion) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-3 py-4">
      <button
        type="button"
        aria-label="Cerrar canción"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancionero-ver-titulo"
        className="relative z-10 flex h-[min(92vh,780px)] w-full max-w-md touch-none flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      >
        <TapButton
          aria-label="Cerrar"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex size-11 items-center justify-center rounded-full bg-bg-card shadow-md"
        >
          <X className="size-5 text-text-primary" aria-hidden="true" />
        </TapButton>

        <div
          ref={viewportRef}
          className="relative min-h-0 flex-1 overflow-hidden"
        >
          <div
            className="flex h-full will-change-transform"
            style={{
              width: "300%",
              transform: `translateX(calc(-33.333333% + ${offsetX}px))`,
              transition: animating
                ? `transform ${CAROUSEL_TRANSITION_MS}ms cubic-bezier(0.25, 0.82, 0.35, 1)`
                : "none",
            }}
          >
            <CancionSlide cancion={cancionAnterior} />
            <CancionSlide
              cancion={cancion}
              scrollRef={letraScrollRef}
              isCurrent
              tieneAnterior={tieneAnterior}
              tieneSiguiente={tieneSiguiente}
              autoScrollLevel={autoScrollLevel}
              onAnterior={() => navigateByDirection(-1)}
              onSiguiente={() => navigateByDirection(1)}
              onAutoScrollTap={handleAutoScrollTap}
              onAutoScrollPause={pauseAutoScroll}
            />
            <CancionSlide cancion={cancionSiguiente} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
