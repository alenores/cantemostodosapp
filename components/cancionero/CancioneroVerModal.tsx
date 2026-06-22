"use client";

import LetraTexto from "@/components/salas/LetraTexto";
import { TapButton } from "@/components/ui/TapFeedback";
import { triggerHaptic } from "@/lib/haptic";
import type { CancionCancionero } from "@/types";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const AXIS_LOCK_PX = 8;
const SWIPE_COMMIT_RATIO = 0.2;
const SWIPE_COMMIT_MIN_PX = 48;
const CAROUSEL_TRANSITION_MS = 240;

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
    return offset * 0.3;
  }

  return offset;
}

export default function CancioneroVerModal({
  open,
  cancion,
  onClose,
  onAnterior,
  onSiguiente,
  tieneAnterior = false,
  tieneSiguiente = false,
}: CancioneroVerModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const letraScrollRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<ActiveGesture | null>(null);
  const animatingRef = useRef(false);
  const navigatingRef = useRef(false);
  const enterFromRef = useRef<"left" | "right" | null>(null);

  const tieneAnteriorRef = useRef(tieneAnterior);
  const tieneSiguienteRef = useRef(tieneSiguiente);
  const onAnteriorRef = useRef(onAnterior);
  const onSiguienteRef = useRef(onSiguiente);

  const [offsetX, setOffsetX] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    tieneAnteriorRef.current = tieneAnterior;
    tieneSiguienteRef.current = tieneSiguiente;
    onAnteriorRef.current = onAnterior;
    onSiguienteRef.current = onSiguiente;
  }, [tieneAnterior, tieneSiguiente, onAnterior, onSiguiente]);

  useEffect(() => {
    animatingRef.current = animating;
  }, [animating]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const getPanelWidth = useCallback(() => {
    return panelRef.current?.offsetWidth ?? 0;
  }, []);

  const finishNavigation = useCallback((direction: -1 | 1) => {
    triggerHaptic();
    enterFromRef.current = direction < 0 ? "left" : "right";

    if (direction < 0) {
      onAnteriorRef.current?.();
    } else {
      onSiguienteRef.current?.();
    }
  }, []);

  const animateTo = useCallback(
    (targetOffset: number, onDone?: () => void) => {
      setAnimating(true);
      setOffsetX(targetOffset);

      window.setTimeout(() => {
        onDone?.();
      }, CAROUSEL_TRANSITION_MS);
    },
    [],
  );

  const handleRelease = useCallback(
    (dx: number) => {
      const width = getPanelWidth();
      const threshold = Math.max(width * SWIPE_COMMIT_RATIO, SWIPE_COMMIT_MIN_PX);

      if (dx < -threshold && tieneAnteriorRef.current) {
        navigatingRef.current = true;
        animateTo(width, () => finishNavigation(-1));
        return;
      }

      if (dx > threshold && tieneSiguienteRef.current) {
        navigatingRef.current = true;
        animateTo(-width, () => finishNavigation(1));
        return;
      }

      animateTo(0);
    },
    [animateTo, finishNavigation, getPanelWidth],
  );

  useEffect(() => {
    if (!cancion) {
      return;
    }

    letraScrollRef.current?.scrollTo(0, 0);

    const panelWidth = panelRef.current?.offsetWidth ?? 0;
    const enterFrom = enterFromRef.current;
    enterFromRef.current = null;

    if (enterFrom && panelWidth > 0) {
      setAnimating(false);
      setOffsetX(enterFrom === "left" ? -panelWidth : panelWidth);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimating(true);
          setOffsetX(0);
          window.setTimeout(() => {
            setAnimating(false);
            navigatingRef.current = false;
          }, CAROUSEL_TRANSITION_MS);
        });
      });
      return;
    }

    setOffsetX(0);
    setAnimating(false);
    navigatingRef.current = false;
  }, [cancion?.id]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog || !open) {
      return;
    }

    function getPoint(clientX: number, clientY: number) {
      return { x: clientX, y: clientY };
    }

    function beginGesture(clientX: number, clientY: number, pointerId: number) {
      if (animatingRef.current || navigatingRef.current) {
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
          gesture.mode = "carousel";
        } else {
          gesture.mode = "scroll";
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
        -dx,
        dx < 0 ? tieneAnteriorRef.current : dx > 0 ? tieneSiguienteRef.current : true,
      );
      setOffsetX(displayOffset);
    }

    function endGesture(clientX: number) {
      const gesture = gestureRef.current;

      if (!gesture) {
        return;
      }

      const dx = clientX - gesture.startX;

      if (gesture.mode === "carousel") {
        handleRelease(dx);
      }

      gestureRef.current = null;
    }

    const dialogEl = dialog;

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

      if (dialogEl.hasPointerCapture(event.pointerId)) {
        dialogEl.releasePointerCapture(event.pointerId);
      }

      endGesture(event.clientX);
    }

    function onPointerCancel(event: PointerEvent) {
      onPointerUp(event);
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
  }, [open, handleRelease]);

  if (!open || !cancion) {
    return null;
  }

  const tieneLetra = Boolean(cancion.letra?.trim());

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-3 py-6">
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
        className="relative z-10 flex h-[min(85vh,720px)] w-full max-w-md touch-none flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      >
        <TapButton
          aria-label="Cerrar"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex size-11 items-center justify-center rounded-full bg-bg-card shadow-md"
        >
          <X className="size-5 text-text-primary" aria-hidden="true" />
        </TapButton>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div
            ref={panelRef}
            className="flex h-full flex-col bg-bg-cola-sheet will-change-transform"
            style={{
              transform: `translateX(${offsetX}px)`,
              transition: animating
                ? `transform ${CAROUSEL_TRANSITION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`
                : "none",
            }}
          >
            <header className="shrink-0 border-b border-border bg-bg-dark px-4 py-3 pr-14">
              <div className="min-w-0 select-none">
                <h2
                  id="cancionero-ver-titulo"
                  className="text-lg font-extrabold text-accent"
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
              ref={letraScrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4"
            >
              {tieneLetra ? (
                <LetraTexto texto={cancion.letra!} />
              ) : (
                <p className="py-8 text-center text-sm text-text-muted">
                  Esta canción no tiene letra guardada.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
