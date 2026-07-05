"use client";

import {
  CifradoLyricsBlock,
} from "@/components/cifrado/CifradoLyricsView";
import LetraTexto from "@/components/salas/LetraTexto";
import { TapButton } from "@/components/ui/TapFeedback";
import { triggerHaptic } from "@/lib/haptic";
import {
  getLetraModoLecturaHorizontalPadding,
  getLetraModoLecturaHorizontalPaddingRight,
} from "@/lib/sala-layout";
import { COMPAS_LABELS } from "@/lib/cifrado";
import type { CancionCancionero, CancionCifradoDetalle } from "@/types";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Star,
  X,
} from "lucide-react";
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
  cifradoDetalle?: CancionCifradoDetalle | null;
  cifradoLoading?: boolean;
  cancionAnterior?: CancionCancionero | null;
  cancionSiguiente?: CancionCancionero | null;
  onClose: () => void;
  onAnterior?: () => void;
  onSiguiente?: () => void;
  onExpand?: () => void;
  tieneAnterior?: boolean;
  tieneSiguiente?: boolean;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("button, a, [role='button'], input, textarea, select"))
  );
}

function isLetraScrollTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("[data-cancionero-letra-scroll]"))
  );
}

function isCarouselZoneTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("[data-cancionero-carousel-zone]"))
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
  puedeExpandir: boolean;
  onAnterior?: () => void;
  onSiguiente?: () => void;
  onExpand?: () => void;
};

function CancionNavBar({
  tieneAnterior,
  tieneSiguiente,
  puedeExpandir,
  onAnterior,
  onSiguiente,
  onExpand,
}: CancionNavBarProps) {
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
          aria-label="Expandir letra"
          disabled={!puedeExpandir}
          onClick={onExpand}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-bg-card px-3 py-2 text-sm font-medium text-text-primary disabled:opacity-30"
        >
          <Maximize2 className="size-4 shrink-0 text-accent" aria-hidden="true" />
          <span>Expandir</span>
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
  cifradoDetalle?: CancionCifradoDetalle | null;
  cifradoLoading?: boolean;
  scrollRef?: RefObject<HTMLDivElement | null>;
  isCurrent?: boolean;
  tieneAnterior?: boolean;
  tieneSiguiente?: boolean;
  onAnterior?: () => void;
  onSiguiente?: () => void;
  onExpand?: () => void;
};

function CancionSlide({
  cancion,
  cifradoDetalle = null,
  cifradoLoading = false,
  scrollRef,
  isCurrent = false,
  tieneAnterior = false,
  tieneSiguiente = false,
  onAnterior,
  onSiguiente,
  onExpand,
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
  const tieneCifradoAvanzado = Boolean(cancion.tiene_cifrado_avanzado);
  const cifradoDisplay =
    cifradoDetalle && cifradoDetalle.id === cancion.id
      ? cifradoDetalle.cifrado
      : null;
  const compasConfig =
    cifradoDetalle && cifradoDetalle.id === cancion.id
      ? cifradoDetalle.compas_config
      : null;
  const showCompasMarcadores = Boolean(compasConfig?.barras?.length);
  const tipoCompas = compasConfig?.tipoCompas ?? "4-4";
  const compasLabel = COMPAS_LABELS[tipoCompas];
  const navProps = isCurrent
    ? {
        tieneAnterior,
        tieneSiguiente,
        puedeExpandir: tieneLetra && Boolean(onExpand),
        onAnterior,
        onSiguiente,
        onExpand,
      }
    : {
        tieneAnterior: false,
        tieneSiguiente: false,
        puedeExpandir: false,
      };

  return (
    <div
      className="flex h-full shrink-0 flex-col bg-bg-cola-sheet"
      style={{ flex: "0 0 33.333333%" }}
    >
      <header className={`${HEADER_CLASS} touch-none`} data-cancionero-carousel-zone="">
        <div className="min-w-0">
          <h2
            id={isCurrent ? "cancionero-ver-titulo" : undefined}
            className="flex min-w-0 items-center gap-1.5 truncate text-lg font-extrabold text-accent"
          >
            {tieneCifradoAvanzado && (
              <Star
                className="size-3.5 shrink-0 fill-[var(--tuner-cerca)] text-[var(--tuner-cerca)]"
                aria-hidden="true"
              />
            )}
            <span className="truncate">{cancion.nombre}</span>
          </h2>
          {cancion.artista && (
            <p className="mt-0.5 truncate text-sm text-text-muted">
              {cancion.artista}
            </p>
          )}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={isCurrent ? scrollRef : undefined}
          data-cancionero-letra-scroll=""
          className={`h-full touch-pan-y overflow-y-auto overscroll-y-contain ${
            cifradoDisplay && cancion.letra ? "bg-letra-bg" : ""
          }`}
        >
          {cifradoLoading && isCurrent && tieneCifradoAvanzado ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted">
              Cargando cifrado…
            </p>
          ) : cifradoDisplay && cancion.letra ? (
            <div className="min-h-full bg-letra-bg py-5">
              {tieneCifradoAvanzado && (
                <p
                  className="mb-3 text-sm font-semibold text-letra-text/70"
                  style={{
                    paddingLeft: getLetraModoLecturaHorizontalPadding(),
                    paddingRight: getLetraModoLecturaHorizontalPaddingRight(),
                  }}
                >
                  Compás {compasLabel}
                </p>
              )}
              <div
                style={{
                  paddingLeft: getLetraModoLecturaHorizontalPadding(),
                  paddingRight: getLetraModoLecturaHorizontalPaddingRight(),
                }}
              >
                <CifradoLyricsBlock
                  letra={cancion.letra}
                  acordes={cifradoDisplay.acordes}
                  barras={compasConfig?.barras ?? []}
                  tipoCompas={tipoCompas}
                  showCompas={showCompasMarcadores}
                  letraSheet
                />
              </div>
            </div>
          ) : tieneLetra ? (
            <LetraTexto texto={cancion.letra!} edgeToEdge />
          ) : (
            <p className="px-4 py-8 text-center text-sm text-text-muted">
              Esta canción no tiene letra guardada.
            </p>
          )}
        </div>
      </div>

      <CancionNavBar {...navProps} />
    </div>
  );
}

export default function CancioneroVerModal({
  open,
  cancion,
  cifradoDetalle = null,
  cifradoLoading = false,
  cancionAnterior = null,
  cancionSiguiente = null,
  onClose,
  onAnterior,
  onSiguiente,
  onExpand,
  tieneAnterior = false,
  tieneSiguiente = false,
}: CancioneroVerModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const letraScrollRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<ActiveGesture | null>(null);
  const lockedRef = useRef(false);

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
    lockedRef.current = animating;
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
    if (!cancion) {
      return;
    }

    letraScrollRef.current?.scrollTo(0, 0);
    setOffsetX(0);
    setAnimating(false);
    gestureRef.current = null;
  }, [cancion?.id]);

  useEffect(() => {
    const scrollEl = letraScrollRef.current;

    if (!scrollEl || !open) {
      return;
    }

    type LetraGesture = {
      mode: "undecided" | "carousel";
      startX: number;
      startY: number;
      pointerId: number;
    };

    let letraGesture: LetraGesture | null = null;

    function onLetraPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (isInteractiveTarget(event.target)) {
        return;
      }

      letraGesture = {
        mode: "undecided",
        startX: event.clientX,
        startY: event.clientY,
        pointerId: event.pointerId,
      };
    }

    function onLetraPointerMove(event: PointerEvent) {
      if (!letraGesture || letraGesture.pointerId !== event.pointerId) {
        return;
      }

      const dx = event.clientX - letraGesture.startX;
      const dy = event.clientY - letraGesture.startY;

      if (letraGesture.mode === "undecided") {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) {
          return;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
          letraGesture.mode = "carousel";
          scrollEl!.setPointerCapture(event.pointerId);
        } else {
          letraGesture = null;
          return;
        }
      }

      if (event.cancelable) {
        event.preventDefault();
      }

      const displayOffset = applyRubberBand(
        dx,
        dx < 0 ? tieneSiguienteRef.current : dx > 0 ? tieneAnteriorRef.current : true,
      );
      setOffsetX(displayOffset);
    }

    function onLetraPointerUp(event: PointerEvent) {
      if (letraGesture && letraGesture.pointerId === event.pointerId) {
        if (letraGesture.mode === "carousel") {
          handleRelease(event.clientX - letraGesture.startX);
        }

        if (scrollEl!.hasPointerCapture(event.pointerId)) {
          scrollEl!.releasePointerCapture(event.pointerId);
        }

        letraGesture = null;
      }
    }

    scrollEl.addEventListener("pointerdown", onLetraPointerDown);
    scrollEl.addEventListener("pointermove", onLetraPointerMove);
    scrollEl.addEventListener("pointerup", onLetraPointerUp);
    scrollEl.addEventListener("pointercancel", onLetraPointerUp);

    return () => {
      scrollEl.removeEventListener("pointerdown", onLetraPointerDown);
      scrollEl.removeEventListener("pointermove", onLetraPointerMove);
      scrollEl.removeEventListener("pointerup", onLetraPointerUp);
      scrollEl.removeEventListener("pointercancel", onLetraPointerUp);
    };
  }, [open, handleRelease, cancion?.id]);

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
        mode: "carousel",
        startX: clientX,
        startY: clientY,
        startScrollTop: 0,
        pointerId,
      };
    }

    function moveGesture(clientX: number, clientY: number, prevent: () => void) {
      const gesture = gestureRef.current;

      if (!gesture) {
        return;
      }

      const dx = clientX - gesture.startX;

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

      if (
        isLetraScrollTarget(event.target) ||
        !isCarouselZoneTarget(event.target)
      ) {
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
        className="relative z-10 tool-modal-panel flex h-[min(92vh,780px)] flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
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
              cifradoDetalle={cifradoDetalle}
              cifradoLoading={cifradoLoading}
              scrollRef={letraScrollRef}
              isCurrent
              tieneAnterior={tieneAnterior}
              tieneSiguiente={tieneSiguiente}
              onAnterior={() => navigateByDirection(-1)}
              onSiguiente={() => navigateByDirection(1)}
              onExpand={onExpand}
            />
            <CancionSlide cancion={cancionSiguiente} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
