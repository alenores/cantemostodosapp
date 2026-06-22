"use client";

import LetraTexto from "@/components/salas/LetraTexto";
import { TapButton } from "@/components/ui/TapFeedback";
import { triggerHaptic } from "@/lib/haptic";
import type { CancionCancionero } from "@/types";
import { useDrag } from "@use-gesture/react";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const AXIS_LOCK_PX = 10;
const SWIPE_COMMIT_RATIO = 0.22;
const SWIPE_COMMIT_MIN_PX = 56;
const CAROUSEL_TRANSITION_MS = 240;

type DragMemo =
  | { kind: "undecided"; startScrollTop: number }
  | { kind: "carousel" }
  | { kind: "scroll"; startScrollTop: number };

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

function applyRubberBand(
  offset: number,
  canGo: boolean,
): number {
  if (!canGo) {
    return offset * 0.28;
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
  const panelRef = useRef<HTMLDivElement>(null);
  const letraScrollRef = useRef<HTMLDivElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const navigatingRef = useRef(false);
  const enterFromRef = useRef<"left" | "right" | null>(null);

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

  const getPanelWidth = useCallback(() => {
    return panelRef.current?.offsetWidth ?? 0;
  }, []);

  const finishNavigation = useCallback(
    (direction: -1 | 1) => {
      triggerHaptic();
      enterFromRef.current = direction < 0 ? "left" : "right";

      if (direction < 0) {
        onAnterior?.();
      } else {
        onSiguiente?.();
      }
    },
    [onAnterior, onSiguiente],
  );

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
    (mx: number) => {
      const width = getPanelWidth();
      const threshold = Math.max(width * SWIPE_COMMIT_RATIO, SWIPE_COMMIT_MIN_PX);

      if (mx < -threshold && tieneAnterior) {
        navigatingRef.current = true;
        animateTo(width, () => finishNavigation(-1));
        return;
      }

      if (mx > threshold && tieneSiguiente) {
        navigatingRef.current = true;
        animateTo(-width, () => finishNavigation(1));
        return;
      }

      animateTo(0);
    },
    [
      animateTo,
      finishNavigation,
      getPanelWidth,
      tieneAnterior,
      tieneSiguiente,
    ],
  );

  const dragHandler = useCallback(
    (state: {
      movement: [number, number];
      first: boolean;
      last: boolean;
      memo?: unknown;
      event?: Event;
    }) => {
      if (animating || navigatingRef.current) {
        return state.memo;
      }

      const [mx, my] = state.movement;
      const scrollEl = letraScrollRef.current;

      if (state.first) {
        if (isInteractiveTarget(state.event?.target ?? null)) {
          return undefined;
        }

        return {
          kind: "undecided" as const,
          startScrollTop: scrollEl?.scrollTop ?? 0,
        };
      }

      const memo = state.memo as DragMemo | undefined;

      if (!memo) {
        return memo;
      }

      if (memo.kind === "undecided") {
        if (Math.abs(mx) < AXIS_LOCK_PX && Math.abs(my) < AXIS_LOCK_PX) {
          return memo;
        }

        if (Math.abs(mx) > Math.abs(my)) {
          if (state.event?.cancelable) {
            state.event.preventDefault();
          }

          return { kind: "carousel" as const };
        }

        return {
          kind: "scroll" as const,
          startScrollTop: memo.startScrollTop,
        };
      }

      if (memo.kind === "scroll") {
        if (state.event?.cancelable) {
          state.event.preventDefault();
        }

        if (scrollEl) {
          const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
          scrollEl.scrollTop = clamp(memo.startScrollTop - my, 0, maxScroll);
        }

        return memo;
      }

      if (state.event?.cancelable) {
        state.event.preventDefault();
      }

      const displayOffset = applyRubberBand(
        -mx,
        mx < 0 ? tieneAnterior : mx > 0 ? tieneSiguiente : true,
      );
      setOffsetX(displayOffset);

      if (state.last) {
        handleRelease(mx);
        return undefined;
      }

      return memo;
    },
    [animating, handleRelease, tieneAnterior, tieneSiguiente],
  );

  const bindPanelDrag = useDrag(dragHandler, {
    axis: undefined,
    filterTaps: true,
    eventOptions: { passive: false },
  });

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancionero-ver-titulo"
        className="relative z-10 flex h-[min(85vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
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
            {...bindPanelDrag()}
            ref={panelRef}
            className="flex h-full flex-col bg-bg-cola-sheet"
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
