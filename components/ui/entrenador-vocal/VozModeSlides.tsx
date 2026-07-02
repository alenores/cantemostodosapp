"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { RitmoConfigSection } from "@/components/ui/ToolRitmoConfig";
import {
  buildMelodiaCompasState,
  MelodiaConfigSection,
} from "@/components/ui/entrenador-vocal/VozMelodiaConfig";
import { getNotaPatternSummary } from "@/lib/voz-nota-patron";
import type { VozNotaPattern } from "@/lib/voz-nota-patron";
import type { NoteDetection } from "@/lib/afinador";
import type {
  MetronomeBeatDuration,
  MetronomeBeatDurationPattern,
  MetronomeBeatLevel,
  MetronomeBeatPattern,
} from "@/lib/metronomo";
import { getBeatDurationPatternSummary, getBeatTimelineSegmentsInWindow } from "@/lib/metronomo";
import {
  getPhaseAtBeat,
  getPhaseLabel,
  getRitmoComplianceColor,
  getRitmoNowLinePercent,
  getRitmoPhaseAtTime,
  getRitmoTimelineWindowMs,
  ritmoTimeToPercent,
  VOZ_RITMO_PRACTICE_SILENCE_COLOR,
  VOZ_RITMO_PRACTICE_SOUND_COLOR,
  VOZ_RITMO_TIMELINE_PAST_RATIO,
  type VozRitmoBeatMarker,
  type VozRitmoPhase,
  type VozRitmoVoiceSample,
} from "@/lib/voz-ritmo";
import {
  buildHistorySegmentPath,
  buildHoldRingSegments,
  centsToLadderPercent,
  computeEnTonoHoldMs,
  formatTargetLabel,
  frequencyToDisplayOctave,
  getLadderNoteSlots,
  getNoteLabelAtSemitoneOffset,
  getVozAccuracy,
  getVozAccuracyColor,
  getVozCalibreDescription,
  getVozCalibreThresholds,
  getVozFeedbackLabel,
  getVozSampleColor,
  historyCentsBandHeight,
  historyCentsToChartY,
  isHoldCountingAccuracy,
  isPerfectPitch,
  semitoneOffsetToLadderPercent,
  splitHistorySegments,
  VOZ_CALIBRE_OPTIONS,
  VOZ_CERCA_CENTS,
  VOZ_HISTORY_CHART_WIDE_MAX_CENTS,
  VOZ_HISTORY_WINDOW_MS,
  VOZ_HOLD_TARGET_MAX,
  VOZ_HOLD_TARGET_MIN,
  clampHoldTargetSeconds,
  VOZ_INSTANT_ATTEMPTS_MAX,
  VOZ_INTUNE_CENTS,
  VOZ_LADDER_SEMITONE_SPAN,
  VOZ_PERFECT_CENTS,
  type HoldRingSegment,
  type VozAccuracy,
  type VozCalibre,
  type VozHistorySample,
  type VozInstantAttempt,
  type VozTarget,
} from "@/lib/voz";
import { triggerHaptic } from "@/lib/haptic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { TargetPicker, VozConfigSection, VozPracticeSection, type TargetPickerProps } from "./EntrenadorVocalShared";

export const VOZ_MODE_SLIDES = [
  { id: "encajar", label: "Encajar" },
  { id: "sostener", label: "Sostener" },
  { id: "melodia", label: "Melodía" },
  { id: "ritmo", label: "Ritmo" },
  { id: "ritmo-nota", label: "Ritmo-Nota" },
  { id: "combo", label: "Combo" },
] as const;

export type VozModeSlideId = (typeof VOZ_MODE_SLIDES)[number]["id"];

const CHART_WIDTH = 320;
const CHART_HEIGHT_WIDE = 172;
const CHART_WIDE_PADDING_LEFT = 40;
const MODE_AXIS_LOCK_PX = 8;
const MODE_SWIPE_COMMIT_RATIO = 0.2;
const MODE_SWIPE_COMMIT_MIN_PX = 48;
const MODE_CAROUSEL_TRANSITION_MS = 260;

function isCarouselInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest("button, a, [role='button'], input, textarea, select, label"),
    )
  );
}

function applyModeCarouselRubberBand(offset: number, canGo: boolean): number {
  return canGo ? offset : offset * 0.32;
}

function useTimelineNow(active: boolean): number {
  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    if (!active) {
      return;
    }

    let animationFrame = 0;

    const tick = () => {
      setNow(performance.now());
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [active]);

  return now;
}

function ModeCarouselShell({
  activeIndex,
  onChangeIndex,
  renderSlide,
}: {
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  renderSlide: (index: number) => ReactNode;
}) {
  const slideCount = VOZ_MODE_SLIDES.length;
  const activeSlide = VOZ_MODE_SLIDES[activeIndex] ?? VOZ_MODE_SLIDES[0]!;
  const prevIndex = activeIndex - 1;
  const nextIndex = activeIndex + 1;
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < slideCount - 1;

  const viewportRef = useRef<HTMLDivElement>(null);
  const centerPanelRef = useRef<HTMLDivElement>(null);
  const lockedRef = useRef(false);
  const canGoPrevRef = useRef(canGoPrev);
  const canGoNextRef = useRef(canGoNext);
  const activeIndexRef = useRef(activeIndex);
  const onChangeIndexRef = useRef(onChangeIndex);
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    pointerId: number;
    mode: "undecided" | "carousel";
  } | null>(null);

  const [offsetX, setOffsetX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    const node = centerPanelRef.current;

    if (!node) {
      return;
    }

    const updateHeight = () => {
      setViewportHeight(node.offsetHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => observer.disconnect();
  }, [activeIndex]);

  useEffect(() => {
    canGoPrevRef.current = canGoPrev;
    canGoNextRef.current = canGoNext;
    activeIndexRef.current = activeIndex;
    onChangeIndexRef.current = onChangeIndex;
  }, [canGoPrev, canGoNext, activeIndex, onChangeIndex]);

  useEffect(() => {
    lockedRef.current = animating;
  }, [animating]);

  useEffect(() => {
    setOffsetX(0);
    setAnimating(false);
    gestureRef.current = null;
  }, [activeIndex]);

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
      }, MODE_CAROUSEL_TRANSITION_MS);
    },
    [],
  );

  const navigateByDirection = useCallback(
    (direction: -1 | 1) => {
      if (lockedRef.current) {
        return;
      }

      const width = getViewportWidth();
      const currentIndex = activeIndexRef.current;

      if (direction < 0 && canGoPrevRef.current) {
        runTransition(width, () => {
          triggerHaptic();
          onChangeIndexRef.current(currentIndex - 1);
          setOffsetX(0);
        });
        return;
      }

      if (direction > 0 && canGoNextRef.current) {
        runTransition(-width, () => {
          triggerHaptic();
          onChangeIndexRef.current(currentIndex + 1);
          setOffsetX(0);
        });
      }
    },
    [getViewportWidth, runTransition],
  );

  const handleRelease = useCallback(
    (dx: number) => {
      const width = getViewportWidth();
      const threshold = Math.max(
        width * MODE_SWIPE_COMMIT_RATIO,
        MODE_SWIPE_COMMIT_MIN_PX,
      );

      if (dx < -threshold && canGoNextRef.current) {
        navigateByDirection(1);
        return;
      }

      if (dx > threshold && canGoPrevRef.current) {
        navigateByDirection(-1);
        return;
      }

      runTransition(0);
    },
    [getViewportWidth, navigateByDirection, runTransition],
  );

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (isCarouselInteractiveTarget(event.target)) {
        return;
      }

      if (lockedRef.current) {
        return;
      }

      gestureRef.current = {
        mode: "undecided",
        startX: event.clientX,
        startY: event.clientY,
        pointerId: event.pointerId,
      };
    }

    function onPointerMove(event: PointerEvent) {
      const gesture = gestureRef.current;

      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }

      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;

      if (gesture.mode === "undecided") {
        if (
          Math.abs(dx) < MODE_AXIS_LOCK_PX &&
          Math.abs(dy) < MODE_AXIS_LOCK_PX
        ) {
          return;
        }

        if (Math.abs(dx) <= Math.abs(dy)) {
          gestureRef.current = null;
          return;
        }

        gesture.mode = "carousel";
        viewport!.setPointerCapture(event.pointerId);
      }

      if (event.cancelable) {
        event.preventDefault();
      }

      const displayOffset = applyModeCarouselRubberBand(
        dx,
        dx < 0
          ? canGoNextRef.current
          : dx > 0
            ? canGoPrevRef.current
            : true,
      );
      setOffsetX(displayOffset);
    }

    function onPointerUp(event: PointerEvent) {
      const gesture = gestureRef.current;

      if (!gesture || gesture.pointerId !== event.pointerId) {
        return;
      }

      if (gesture.mode === "carousel") {
        handleRelease(event.clientX - gesture.startX);
      }

      if (viewport!.hasPointerCapture(event.pointerId)) {
        viewport!.releasePointerCapture(event.pointerId);
      }

      gestureRef.current = null;
    }

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);

    return () => {
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
    };
  }, [handleRelease]);

  function renderPanel(index: number) {
    if (index < 0 || index >= slideCount) {
      return null;
    }

    return (
      <div className="bg-bg-cola-sheet px-3 py-4">{renderSlide(index)}</div>
    );
  }

  function renderPanelColumn(index: number, isCenter = false) {
    return (
      <div
        ref={isCenter ? centerPanelRef : undefined}
        className="w-1/3 shrink-0 self-start"
      >
        {renderPanel(index)}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          aria-label="Modo anterior"
          disabled={!canGoPrev || animating}
          onClick={() => navigateByDirection(-1)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
        >
          <ChevronLeft className="size-4 text-text-primary" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-bold uppercase tracking-wide text-text-primary">
            {activeSlide.label}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-text-muted">
            {activeIndex + 1} de {slideCount}
          </p>
        </div>

        <button
          type="button"
          aria-label="Modo siguiente"
          disabled={!canGoNext || animating}
          onClick={() => navigateByDirection(1)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
        >
          <ChevronRight className="size-4 text-text-primary" aria-hidden="true" />
        </button>
      </div>

      <div className="overflow-hidden rounded-[14px] border-2 border-border bg-bg-card shadow-[inset_0_1px_0_color-mix(in_srgb,var(--text-primary)_6%,transparent)]">
        <div
          ref={viewportRef}
          className="touch-pan-y overflow-hidden transition-[height] duration-200 ease-out"
          style={viewportHeight !== null ? { height: viewportHeight } : undefined}
          aria-label={`Modo ${activeSlide.label}. Deslizá horizontalmente para cambiar.`}
        >
          <div
            className="flex items-start will-change-transform"
            style={{
              width: "300%",
              transform: `translateX(calc(-33.333333% + ${offsetX}px))`,
              transition: animating
                ? `transform ${MODE_CAROUSEL_TRANSITION_MS}ms cubic-bezier(0.25, 0.82, 0.35, 1)`
                : "none",
            }}
          >
            {renderPanelColumn(prevIndex)}
            {renderPanelColumn(activeIndex, true)}
            {renderPanelColumn(nextIndex)}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 border-t border-border bg-bg-dark/40 px-3 py-2">
          {VOZ_MODE_SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={slide.label}
              aria-current={activeIndex === index}
              disabled={animating}
              onClick={() => onChangeIndex(index)}
              className="rounded-full p-1 disabled:opacity-60"
            >
              <span
                className={`block rounded-full transition-all ${
                  activeIndex === index
                    ? "h-1.5 w-4 bg-voz-config"
                    : "size-1.5 bg-border"
                }`}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetectedNoteDisplay({
  detection,
  objectiveLabel,
  targetFrequency,
  octaveExact,
}: {
  detection: NoteDetection | null;
  objectiveLabel: string;
  targetFrequency: number | null;
  octaveExact: boolean;
}) {
  const detectedDisplay =
    detection !== null
      ? `${detection.note}${frequencyToDisplayOctave(detection.frequency)}`
      : "—";

  return (
    <div className="text-center">
      <p className="text-xs font-semibold text-text-muted">
        Objetivo: {objectiveLabel}
        {octaveExact && targetFrequency !== null
          ? ` · ${targetFrequency.toFixed(1)} Hz`
          : octaveExact
            ? null
            : " · cualquier octava"}
      </p>
      <p
        className="mt-1.5 text-[48px] font-extrabold leading-none text-text-primary"
        aria-live="polite"
      >
        {detectedDisplay}
      </p>
      <p className="mt-1 text-sm text-text-muted">
        {detection ? `${detection.frequency.toFixed(1)} Hz` : "— Hz"}
      </p>
    </div>
  );
}

function PitchLadderBar({
  targetNote,
  cents,
  accuracy,
  detectedNote,
}: {
  targetNote: string;
  cents: number;
  accuracy: VozAccuracy;
  detectedNote: string | null;
}) {
  const slots = getLadderNoteSlots(targetNote);
  const markerLeft = centsToLadderPercent(cents);
  const markerColor = getVozAccuracyColor(accuracy, cents);
  const intuneWidth =
    (VOZ_INTUNE_CENTS / (VOZ_LADDER_SEMITONE_SPAN * 100)) * 100;

  return (
    <div className="w-full">
      <div className="relative h-14 overflow-hidden rounded-[12px] border border-border bg-bg-card px-1">
        <div
          className="pointer-events-none absolute inset-y-2 rounded-md"
          style={{
            left: "50%",
            width: `${intuneWidth}%`,
            transform: "translateX(-50%)",
            backgroundColor: "var(--tuner-in-tune)",
            opacity: 0.15,
          }}
          aria-hidden="true"
        />

        {slots.map((slot) => {
          const isTarget = slot.semitoneOffset === 0;
          const isDetected =
            detectedNote !== null &&
            slot.note === detectedNote &&
            accuracy !== "silencio";

          return (
            <span
              key={`${slot.note}-${slot.semitoneOffset}`}
              className={`pointer-events-none absolute top-2 -translate-x-1/2 text-[10px] font-bold leading-none ${
                isTarget
                  ? "text-text-primary"
                  : isDetected
                    ? "text-text-primary"
                    : "text-text-muted"
              }`}
              style={{
                left: `${semitoneOffsetToLadderPercent(slot.semitoneOffset)}%`,
                fontSize: isTarget ? "12px" : "10px",
              }}
            >
              {slot.note}
            </span>
          );
        })}

        {accuracy !== "silencio" ? (
          <span
            className="pointer-events-none absolute bottom-1.5 size-3.5 -translate-x-1/2 rounded-full ring-2 ring-bg-cola-sheet transition-none"
            style={{
              left: `${markerLeft}%`,
              backgroundColor: markerColor,
            }}
            aria-hidden="true"
          />
        ) : null}

        <div
          className="pointer-events-none absolute bottom-0 top-0 w-px -translate-x-1/2 bg-border"
          style={{ left: "50%" }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-text-muted">
        <span>Más bajo</span>
        <span>Objetivo</span>
        <span>Más alto</span>
      </div>
    </div>
  );
}

function getInstantAttemptColor(
  result: VozInstantAttempt["result"],
): string {
  switch (result) {
    case "en-tono":
      return "var(--tuner-in-tune)";
    case "cerca":
      return "var(--tuner-cerca)";
    default:
      return "var(--tuner-flat-sharp)";
  }
}

function getInstantAttemptTitle(result: VozInstantAttempt["result"]): string {
  switch (result) {
    case "en-tono":
      return "En tono";
    case "cerca":
      return "Cerca del tono";
    default:
      return "Lejos del tono";
  }
}

function InstantAttemptsStrip({
  attempts,
}: {
  attempts: VozInstantAttempt[];
}) {
  const slots = Array.from({ length: VOZ_INSTANT_ATTEMPTS_MAX }, (_, index) => {
    return attempts[index] ?? null;
  });

  return (
    <div className="w-full rounded-[10px] border border-border bg-bg-card/60 px-3 py-2.5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        Tus intentos
      </p>
      <div
        className="grid w-full gap-[clamp(4px,1.4vw,10px)]"
        style={{
          gridTemplateColumns: `repeat(${VOZ_INSTANT_ATTEMPTS_MAX}, minmax(0, 1fr))`,
        }}
        aria-label={`${attempts.length} de ${VOZ_INSTANT_ATTEMPTS_MAX} intentos`}
      >
        {slots.map((attempt, index) => (
          <span
            key={attempt?.id ?? `slot-${index}`}
            className="aspect-square w-full min-w-0 rounded-full border-2"
            style={
              attempt
                ? {
                    backgroundColor: getInstantAttemptColor(attempt.result),
                    borderColor: getInstantAttemptColor(attempt.result),
                    opacity: attempt.result === "lejos" ? 0.85 : 1,
                  }
                : {
                    backgroundColor: "transparent",
                    borderColor: "var(--border)",
                  }
            }
            title={
              attempt
                ? getInstantAttemptTitle(attempt.result)
                : `Intento ${index + 1} pendiente`
            }
          />
        ))}
      </div>
    </div>
  );
}

function VozCalibrePicker({
  calibre,
  onSetCalibre,
}: {
  calibre: VozCalibre;
  onSetCalibre: (value: VozCalibre) => void;
}) {
  return (
    <div className="rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-voz-config">
        Calibre de afinación
      </p>
      <div className="mt-2 flex gap-1">
        {VOZ_CALIBRE_OPTIONS.map((option) => {
          const selected = calibre === option.id;

          return (
            <TapButton
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSetCalibre(option.id)}
              className={`min-w-0 flex-1 rounded-[8px] border px-1 py-2 text-center text-[11px] font-bold leading-tight transition-colors ${
                selected
                  ? "border-voz-config bg-voz-config/15 text-voz-config"
                  : "border-border bg-bg-dark text-text-secondary"
              }`}
            >
              {option.label}
            </TapButton>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] leading-snug text-text-muted">
        {getVozCalibreDescription(calibre)}
      </p>
    </div>
  );
}

function getHoldTimerStatus(
  accuracy: VozAccuracy,
  cents: number,
  calibre: VozCalibre,
): {
  label: string;
  counting: boolean;
  statusColor: string;
} {
  switch (accuracy) {
    case "en-tono":
      return {
        label:
          isPerfectPitch(cents, calibre)
            ? "Tono perfecto — el tiempo suma"
            : "En tono — el tiempo suma",
        counting: true,
        statusColor: getVozSampleColor(cents, accuracy, calibre),
      };
    case "cerca":
      return isHoldCountingAccuracy(accuracy, calibre)
        ? {
            label: "Desvío sutil — el tiempo sigue sumando",
            counting: true,
            statusColor: getVozSampleColor(cents, accuracy, calibre),
          }
        : {
            label: "Desvío sutil — cronómetro pausado",
            counting: false,
            statusColor: getVozSampleColor(cents, accuracy, calibre),
          };
    case "silencio":
      return {
        label: "Sin voz — cronómetro pausado",
        counting: false,
        statusColor: getVozAccuracyColor(accuracy),
      };
    default:
      return {
        label: "Fuera de tono — cronómetro pausado",
        counting: false,
        statusColor: getVozAccuracyColor(accuracy),
      };
  }
}

function describeRingSegmentArc(
  cx: number,
  cy: number,
  radius: number,
  startFraction: number,
  endFraction: number,
): string {
  const startDeg = startFraction * 360 - 90;
  const endDeg = endFraction * 360 - 90;
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);
  const sweep = endDeg - startDeg;
  const largeArc = sweep > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function HoldClockDial({
  progress,
  holdTargetSeconds,
  ringSegments,
  counting,
  accuracy,
  cents,
  calibre,
}: {
  progress: number;
  holdTargetSeconds: number;
  ringSegments: HoldRingSegment[];
  counting: boolean;
  accuracy: VozAccuracy;
  cents: number;
  calibre: VozCalibre;
}) {
  const SIZE = 148;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = SIZE / 2 - 12;
  const needleColor = counting
    ? getVozSampleColor(cents, accuracy, calibre)
    : getVozAccuracyColor(accuracy, cents, calibre);
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const needleDeg = clampedProgress * 360 - 90;
  const needleRad = (needleDeg * Math.PI) / 180;
  const needleLen = R - 14;
  const needleX = CX + needleLen * Math.cos(needleRad);
  const needleY = CY + needleLen * Math.sin(needleRad);

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto block"
      role="img"
      aria-label={`Cronómetro en ${(clampedProgress * holdTargetSeconds).toFixed(1)} de ${holdTargetSeconds} segundos`}
    >
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="var(--bg-dark)"
        stroke="var(--border)"
        strokeWidth={2}
      />
      {ringSegments.map((segment, index) => (
        <path
          key={`ring-${index}`}
          d={describeRingSegmentArc(
            CX,
            CY,
            R,
            segment.startFraction,
            segment.endFraction,
          )}
          fill="none"
          stroke={segment.color}
          strokeWidth={7}
          strokeLinecap="butt"
        />
      ))}
      {Array.from({ length: holdTargetSeconds + 1 }, (_, second) => {
        const deg = (second / holdTargetSeconds) * 360 - 90;
        const rad = (deg * Math.PI) / 180;
        const isMajor =
          second === 0 ||
          second === holdTargetSeconds ||
          second === Math.floor(holdTargetSeconds / 2);
        const tickLen = isMajor ? 8 : 4;
        const labelR = R - 16;
        const labelX = CX + labelR * Math.cos(rad);
        const labelY = CY + labelR * Math.sin(rad);

        return (
          <g key={second}>
            <line
              x1={CX + (R - tickLen) * Math.cos(rad)}
              y1={CY + (R - tickLen) * Math.sin(rad)}
              x2={CX + R * Math.cos(rad)}
              y2={CY + R * Math.sin(rad)}
              stroke="var(--text-muted)"
              strokeWidth={isMajor ? 1.5 : 0.75}
              opacity={isMajor ? 0.85 : 0.45}
            />
            {isMajor && second !== holdTargetSeconds ? (
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-[var(--text-muted)] text-[9px] font-bold"
              >
                {second}
              </text>
            ) : null}
          </g>
        );
      })}
      <line
        x1={CX}
        y1={CY}
        x2={needleX}
        y2={needleY}
        stroke={needleColor}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <circle cx={CX} cy={CY} r={5} fill={needleColor} />
      <circle cx={CX} cy={CY} r={2.5} fill="var(--bg-card)" />
    </svg>
  );
}

function HoldTimerPanel({
  samples,
  holdTargetSeconds,
  celebrationKey,
  accuracy,
  cents,
  calibre,
}: {
  samples: VozHistorySample[];
  holdTargetSeconds: number;
  celebrationKey: number;
  accuracy: VozAccuracy;
  cents: number;
  calibre: VozCalibre;
}) {
  const now = useTimelineNow(samples.length > 0);
  const holdMs = useMemo(
    () => computeEnTonoHoldMs(samples, now, calibre),
    [samples, now, calibre],
  );
  const targetMs = holdTargetSeconds * 1000;
  const progress = Math.min(1, holdMs / targetMs);
  const ringSegments = useMemo(
    () => buildHoldRingSegments(samples, now, targetMs, calibre),
    [samples, now, targetMs, calibre],
  );
  const status = getHoldTimerStatus(accuracy, cents, calibre);
  const displaySeconds =
    holdMs >= 100 ? (holdMs / 1000).toFixed(1) : "0.0";

  return (
    <div className="w-full">
      <div className="mb-2">
        <p className="text-xs font-semibold text-text-secondary">Cronómetro</p>
      </div>

      <div className="rounded-[12px] border border-border bg-bg-card px-3 py-3">
        <div className="flex flex-col items-center">
          <p className="mb-0.5 text-lg font-extrabold tabular-nums leading-none text-voz-config">
            {holdTargetSeconds} s
          </p>
          <HoldClockDial
            progress={progress}
            holdTargetSeconds={holdTargetSeconds}
            ringSegments={ringSegments}
            counting={status.counting}
            accuracy={accuracy}
            cents={cents}
            calibre={calibre}
          />
          <div className="mt-1 flex items-baseline justify-center gap-1">
            <span className="text-xl font-extrabold leading-none tabular-nums text-text-primary">
              {displaySeconds}
            </span>
            <span className="text-sm font-semibold text-text-muted">s</span>
          </div>
        </div>


        {celebrationKey > 0 ? (
          <p
            key={celebrationKey}
            className="mt-2 text-center text-lg font-extrabold text-[var(--tuner-in-tune-perfect)] animate-[metronomo-hit-flash_450ms_ease-out]"
            aria-live="assertive"
          >
            ¡Meta cumplida!
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ChartLiveNoteRail({
  detection,
  accuracy,
  cents,
  calibre = "estandar",
}: {
  detection: NoteDetection | null;
  accuracy: VozAccuracy;
  cents: number;
  calibre?: VozCalibre;
}) {
  const noteLabel =
    detection !== null
      ? `${detection.note}${frequencyToDisplayOctave(detection.frequency)}`
      : "—";

  return (
    <div
      className="flex w-10 shrink-0 flex-col items-center justify-center rounded-[10px] border border-border/60 bg-bg-dark/35 px-0.5 py-2"
      aria-live="polite"
      aria-label={
        detection
          ? `Nota detectada ${noteLabel}`
          : "Sin nota detectada"
      }
    >
      <span className="text-[8px] font-bold uppercase tracking-wide text-text-muted">
        Vos
      </span>
      <span
        className="mt-1 text-center text-sm font-extrabold leading-none"
        style={{
          color:
            accuracy === "silencio"
              ? "var(--text-muted)"
              : getVozAccuracyColor(accuracy, cents, calibre),
        }}
      >
        {noteLabel}
      </span>
      <span className="mt-1 text-center text-[9px] font-semibold tabular-nums text-text-muted">
        {detection ? `${detection.frequency.toFixed(0)} Hz` : "—"}
      </span>
    </div>
  );
}

function PitchHistoryChart({
  samples,
  active,
  mode = "ritmo",
  targetNote,
  targetOctave,
  octaveExact = true,
  detection,
  accuracy,
  cents,
  calibre = "estandar",
}: {
  samples: VozHistorySample[];
  active: boolean;
  mode?: "sostener" | "ritmo";
  targetNote: string;
  targetOctave: number;
  octaveExact?: boolean;
  detection: NoteDetection | null;
  accuracy: VozAccuracy;
  cents: number;
  calibre?: VozCalibre;
}) {
  const isSostener = mode === "sostener";
  const chartHeight = CHART_HEIGHT_WIDE;
  const maxCents = VOZ_HISTORY_CHART_WIDE_MAX_CENTS;
  const plotLeft = CHART_WIDE_PADDING_LEFT;
  const plotWidth = CHART_WIDTH - plotLeft - 8;
  const now = useTimelineNow(active && samples.length > 0);
  const segments = useMemo(() => splitHistorySegments(samples), [samples]);
  const thresholds = getVozCalibreThresholds(calibre);
  const cercaBandHeight = historyCentsBandHeight(
    isSostener ? thresholds.cercaCents : VOZ_CERCA_CENTS,
    chartHeight,
    maxCents,
  );
  const intuneBandHeight = historyCentsBandHeight(
    isSostener ? thresholds.intuneCents : VOZ_INTUNE_CENTS,
    chartHeight,
    maxCents,
  );
  const perfectBandHeight = historyCentsBandHeight(
    isSostener ? thresholds.perfectCents : VOZ_PERFECT_CENTS,
    chartHeight,
    maxCents,
  );
  const centerY = historyCentsToChartY(0, chartHeight, maxCents);
  const semitoneGuides = [-VOZ_LADDER_SEMITONE_SPAN, -3, 0, 3, VOZ_LADDER_SEMITONE_SPAN];
  const yAxisLabels = useMemo(() => {
    const target: VozTarget = { note: targetNote, octave: targetOctave };

    return [
      {
        semitones: VOZ_LADDER_SEMITONE_SPAN,
        label: getNoteLabelAtSemitoneOffset(
          targetNote,
          targetOctave,
          VOZ_LADDER_SEMITONE_SPAN,
          octaveExact,
        ),
        emphasis: false,
      },
      {
        semitones: 0,
        label: formatTargetLabel(target, octaveExact),
        emphasis: true,
      },
      {
        semitones: -VOZ_LADDER_SEMITONE_SPAN,
        label: getNoteLabelAtSemitoneOffset(
          targetNote,
          targetOctave,
          -VOZ_LADDER_SEMITONE_SPAN,
          octaveExact,
        ),
        emphasis: false,
      },
    ];
  }, [targetNote, targetOctave, octaveExact]);
  const wideRangeLabel = `${yAxisLabels[0]!.label} – ${yAxisLabels[1]!.label} – ${yAxisLabels[2]!.label}`;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-text-secondary">
          {isSostener ? "Afinación en el tiempo" : "Nota en el tiempo"}
        </p>
        {!isSostener ? (
          <span className="max-w-[55%] truncate text-right text-[10px] font-semibold text-text-muted">
            {wideRangeLabel}
          </span>
        ) : null}
      </div>

      <div className="flex items-stretch gap-1.5">
        <div
          className="relative min-w-0 flex-1 overflow-hidden rounded-[12px] border border-border bg-bg-card"
          style={{ aspectRatio: `${CHART_WIDTH} / ${chartHeight}` }}
        >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 border-r border-border/50 bg-bg-dark/30"
          aria-hidden="true"
        >
          {yAxisLabels.map(({ semitones, label, emphasis }) => (
            <span
              key={semitones}
              className={`absolute right-1.5 -translate-y-1/2 text-[9px] font-bold leading-none ${
                emphasis ? "" : "text-text-muted"
              }`}
              style={{
                top: `${(historyCentsToChartY(semitones * 100, chartHeight, maxCents) / chartHeight) * 100}%`,
                color: emphasis ? "var(--tuner-in-tune)" : undefined,
              }}
            >
              {label}
            </span>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${chartHeight}`}
          className="absolute inset-0 block h-full w-full"
          aria-hidden="true"
        >
          {semitoneGuides.map((semitones) => {
            const y = historyCentsToChartY(
              semitones * 100,
              chartHeight,
              maxCents,
            );

            return (
              <line
                key={semitones}
                x1={plotLeft}
                y1={y}
                x2={CHART_WIDTH - 8}
                y2={y}
                stroke="var(--border)"
                strokeWidth={semitones === 0 && !isSostener ? 1 : 0.5}
                strokeDasharray={semitones === 0 && !isSostener ? "4 4" : "2 3"}
                opacity={semitones === 0 && !isSostener ? 1 : 0.55}
              />
            );
          })}
          {isSostener ? (
            <>
              <rect
                x={plotLeft}
                y={centerY - cercaBandHeight / 2}
                width={plotWidth}
                height={cercaBandHeight}
                fill="var(--tuner-cerca)"
                opacity={0.1}
                rx={4}
              />
              <rect
                x={plotLeft}
                y={centerY - intuneBandHeight / 2}
                width={plotWidth}
                height={intuneBandHeight}
                fill="var(--tuner-in-tune-sutil)"
                opacity={0.16}
                rx={3}
              />
              <rect
                x={plotLeft}
                y={centerY - perfectBandHeight / 2}
                width={plotWidth}
                height={perfectBandHeight}
                fill="var(--tuner-in-tune-perfect)"
                opacity={0.22}
                rx={2}
              />
              <line
                x1={plotLeft}
                y1={centerY}
                x2={CHART_WIDTH - 8}
                y2={centerY}
                stroke="var(--tuner-in-tune-perfect)"
                strokeWidth={2}
                opacity={0.95}
              />
            </>
          ) : (
            <rect
              x={plotLeft}
              y={centerY - intuneBandHeight / 2}
              width={plotWidth}
              height={intuneBandHeight}
              fill="var(--tuner-in-tune)"
              opacity={0.12}
              rx={4}
            />
          )}
          {segments.map((segment, index) => {
            const lastSample = segment[segment.length - 1];
            const lastCents = lastSample?.cents ?? 0;
            const lastAccuracy = getVozAccuracy(
              lastCents,
              lastSample !== undefined,
              calibre,
            );

            return (
              <path
                key={`segment-${index}`}
                d={buildHistorySegmentPath(
                  segment,
                  now,
                  CHART_WIDTH,
                  chartHeight,
                  VOZ_HISTORY_WINDOW_MS,
                  maxCents,
                  plotLeft,
                  8,
                )}
                fill="none"
                stroke={getVozSampleColor(lastCents, lastAccuracy, calibre)}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          <line
            x1={CHART_WIDTH - 8}
            y1={10}
            x2={CHART_WIDTH - 8}
            y2={chartHeight - 10}
            stroke="var(--text-secondary)"
            strokeWidth={1}
            opacity={0.7}
          />
        </svg>
        </div>
        <ChartLiveNoteRail
          detection={detection}
          accuracy={accuracy}
          cents={cents}
          calibre={calibre}
        />
      </div>

    </div>
  );
}

type RitmoBeatSegment = {
  startMs: number;
  endMs: number;
  phase: VozRitmoPhase;
};

function getRitmoBeatSegments(
  beatMarkers: VozRitmoBeatMarker[],
  now: number,
  bpm: number,
  pattern: MetronomeBeatPattern,
  patternLength: number,
  beatDurations: MetronomeBeatDurationPattern,
  totalSpanMs: number,
  pastRatio: number,
): RitmoBeatSegment[] {
  const windowStart = now - totalSpanMs * pastRatio;
  const windowEnd = windowStart + totalSpanMs;

  return getBeatTimelineSegmentsInWindow(
    beatMarkers,
    bpm,
    beatDurations,
    patternLength,
    windowStart,
    windowEnd,
  ).map((segment) => ({
    startMs: segment.startMs,
    endMs: segment.endMs,
    phase: getPhaseAtBeat(segment.beatIndex, pattern, patternLength),
  }));
}

function VozRitmoTimeline({
  beatMarkers,
  bpm,
  beatPattern,
  patternLength,
  beatDurations,
  isPlaying,
  voiceSamples,
}: {
  beatMarkers: VozRitmoBeatMarker[];
  bpm: number;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  isPlaying: boolean;
  voiceSamples: VozRitmoVoiceSample[];
}) {
  const now = useTimelineNow(isPlaying || beatMarkers.length > 0);
  const totalSpanMs = getRitmoTimelineWindowMs(bpm, patternLength, beatDurations);
  const nowLinePercent = getRitmoNowLinePercent();
  const beatSegments = useMemo(
    () =>
      getRitmoBeatSegments(
        beatMarkers,
        now,
        bpm,
        beatPattern,
        patternLength,
        beatDurations,
        totalSpanMs,
        VOZ_RITMO_TIMELINE_PAST_RATIO,
      ),
    [beatMarkers, now, bpm, beatPattern, patternLength, beatDurations, totalSpanMs],
  );

  const timeToPercent = (timeMs: number) =>
    ritmoTimeToPercent(
      timeMs,
      now,
      totalSpanMs,
      VOZ_RITMO_TIMELINE_PAST_RATIO,
    );

  const visibleVoiceSamples = voiceSamples.filter((sample) => {
    const windowStart =
      now - totalSpanMs * VOZ_RITMO_TIMELINE_PAST_RATIO;
    return (
      sample.timestamp >= windowStart &&
      sample.timestamp <= windowStart + totalSpanMs
    );
  });

  return (
    <div className="relative overflow-hidden rounded-[12px] border border-border bg-bg-card">
      <div
        className="pointer-events-none absolute inset-y-0 z-20 w-px bg-text-primary"
        style={{ left: `${nowLinePercent}%` }}
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute top-1 z-20 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wide text-text-secondary"
        style={{ left: `${nowLinePercent}%` }}
      >
        ahora
      </span>

      <div className="relative z-[1] space-y-1 px-2 pb-3 pt-6">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[9px] font-semibold uppercase tracking-wide text-text-muted">
            Ritmo
          </span>
          <div className="relative flex h-8 flex-1 items-end gap-0.5">
            {beatSegments.map((segment, index) => {
              const left = timeToPercent(segment.startMs);
              const right = timeToPercent(segment.endMs);
              const width = Math.max(right - left - 0.35, 0.6);
              const isFuture = segment.startMs > now;
              const isSing = segment.phase === "cantar";

              return (
                <span
                  key={`ritmo-seg-${segment.startMs}-${index}`}
                  className="absolute bottom-0 rounded-full"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    height: "100%",
                    backgroundColor: isSing
                      ? isFuture
                        ? "color-mix(in srgb, var(--text-primary) 28%, transparent)"
                        : VOZ_RITMO_PRACTICE_SOUND_COLOR
                      : isFuture
                        ? "color-mix(in srgb, var(--bg-cola-aviso) 55%, transparent)"
                        : VOZ_RITMO_PRACTICE_SILENCE_COLOR,
                    opacity: isFuture ? 0.7 : 1,
                  }}
                  title={getPhaseLabel(segment.phase)}
                />
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[9px] font-semibold uppercase tracking-wide text-text-muted">
            Vos
          </span>
          <div className="relative h-5 flex-1">
            {visibleVoiceSamples.map((sample, index) => (
              <span
                key={`voice-${sample.timestamp}-${index}`}
                className="absolute bottom-0 rounded-full"
                style={{
                  left: `${timeToPercent(sample.timestamp)}%`,
                  width: "4px",
                  height: sample.hasVoice ? "100%" : "45%",
                  transform: "translateX(-50%)",
                  backgroundColor: getRitmoComplianceColor(sample.compliance),
                  opacity: sample.timestamp > now ? 0.45 : 0.95,
                }}
              />
            ))}
          </div>
        </div>
        <p className="pl-[3.75rem] text-[9px] text-text-faint">
          Verde, amarillo y rojo = cómo estás cantando
        </p>
      </div>
    </div>
  );
}

function VozRitmoPractice({
  ritmoPlaying,
  onToggleRitmoPlaying,
  beatMarkers,
  ritmoBpm,
  ritmoBeatPattern,
  ritmoPatternLength,
  ritmoBeatDurations,
  voiceSamples,
  evaluateTone,
  detection,
  objectiveLabel,
  targetFrequency,
  octaveExact,
  targetNote,
  targetOctave,
  cents,
  accuracy,
  historySamples,
  holdCalibre,
}: {
  ritmoPlaying: boolean;
  onToggleRitmoPlaying: () => void;
  beatMarkers: VozRitmoBeatMarker[];
  ritmoBpm: number;
  ritmoBeatPattern: MetronomeBeatPattern;
  ritmoPatternLength: number;
  ritmoBeatDurations: MetronomeBeatDurationPattern;
  voiceSamples: VozRitmoVoiceSample[];
  evaluateTone: boolean;
  detection: NoteDetection | null;
  objectiveLabel: string;
  targetFrequency: number | null;
  octaveExact: boolean;
  targetNote: string;
  targetOctave: number;
  cents: number;
  accuracy: VozAccuracy;
  historySamples: VozHistorySample[];
  holdCalibre?: VozCalibre;
}) {
  const now = useTimelineNow(ritmoPlaying && beatMarkers.length > 0);
  const livePhase =
    ritmoPlaying && beatMarkers.length > 0
      ? getRitmoPhaseAtTime(
          now,
          beatMarkers,
          ritmoBpm,
          ritmoBeatPattern,
          ritmoPatternLength,
          ritmoBeatDurations,
        )
      : null;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        {ritmoPlaying && livePhase ? (
          <p
            className={`text-xl font-extrabold uppercase tracking-wide ${
              livePhase === "cantar" ? "text-text-primary" : "text-text-muted"
            }`}
            aria-live="assertive"
          >
            {getPhaseLabel(livePhase)}
          </p>
        ) : (
          <p className="text-sm text-text-muted">
            Cuando suena, cantá · en silencio, guardá la voz
          </p>
        )}
        <TapButton
          type="button"
          aria-label={ritmoPlaying ? "Detener ritmo" : "Iniciar ritmo"}
          onClick={onToggleRitmoPlaying}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            ritmoPlaying
              ? "border border-text-secondary bg-bg-card text-text-primary"
              : "border border-border bg-bg-card text-text-primary"
          }`}
        >
          {ritmoPlaying ? "Detener" : "Iniciar"}
        </TapButton>
      </div>

      <VozRitmoTimeline
        beatMarkers={beatMarkers}
        bpm={ritmoBpm}
        beatPattern={ritmoBeatPattern}
        patternLength={ritmoPatternLength}
        beatDurations={ritmoBeatDurations}
        isPlaying={ritmoPlaying}
        voiceSamples={voiceSamples}
      />

      {evaluateTone ? (
        <>
          <DetectedNoteDisplay
            detection={detection}
            objectiveLabel={objectiveLabel}
            targetFrequency={targetFrequency}
            octaveExact={octaveExact}
          />
          <PitchLadderBar
            targetNote={targetNote}
            cents={cents}
            accuracy={accuracy}
            detectedNote={detection?.note ?? null}
          />
          <PitchHistoryChart
            samples={historySamples}
            active={ritmoPlaying}
            mode="ritmo"
            targetNote={targetNote}
            targetOctave={targetOctave}
            octaveExact={octaveExact}
            detection={detection}
            accuracy={accuracy}
            cents={cents}
            calibre={holdCalibre}
          />
        </>
      ) : null}
    </>
  );
}

function VozMelodiaPractice({
  melodiaPlaying,
  onToggleMelodiaPlaying,
  beatMarkers,
  melodiaBpm,
  melodiaPatternLength,
  melodiaBeatDuration,
  detection,
  objectiveLabel,
  targetFrequency,
  octaveExact,
  targetNote,
  targetOctave,
  cents,
  accuracy,
  historySamples,
  holdCalibre,
}: {
  melodiaPlaying: boolean;
  onToggleMelodiaPlaying: () => void;
  beatMarkers: VozRitmoBeatMarker[];
  melodiaBpm: number;
  melodiaPatternLength: number;
  melodiaBeatDuration: MetronomeBeatDuration;
  detection: NoteDetection | null;
  objectiveLabel: string;
  targetFrequency: number | null;
  octaveExact: boolean;
  targetNote: string;
  targetOctave: number;
  cents: number;
  accuracy: VozAccuracy;
  historySamples: VozHistorySample[];
  holdCalibre: VozCalibre;
}) {
  const melodiaBeatPattern = useMemo(
    () => buildMelodiaCompasState(melodiaPatternLength, melodiaBeatDuration).beatPattern,
    [melodiaPatternLength, melodiaBeatDuration],
  );
  const melodiaBeatDurations = useMemo(
    () => buildMelodiaCompasState(melodiaPatternLength, melodiaBeatDuration).beatDurations,
    [melodiaPatternLength, melodiaBeatDuration],
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          Cantá cada nota del ciclo al ritmo marcado
        </p>
        <TapButton
          type="button"
          aria-label={melodiaPlaying ? "Detener melodía" : "Iniciar melodía"}
          onClick={onToggleMelodiaPlaying}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            melodiaPlaying
              ? "border border-text-secondary bg-bg-card text-text-primary"
              : "border border-border bg-bg-card text-text-primary"
          }`}
        >
          {melodiaPlaying ? "Detener" : "Iniciar"}
        </TapButton>
      </div>

      <VozRitmoTimeline
        beatMarkers={beatMarkers}
        bpm={melodiaBpm}
        beatPattern={melodiaBeatPattern}
        patternLength={melodiaPatternLength}
        beatDurations={melodiaBeatDurations}
        isPlaying={melodiaPlaying}
        voiceSamples={[]}
      />

      <DetectedNoteDisplay
        detection={detection}
        objectiveLabel={objectiveLabel}
        targetFrequency={targetFrequency}
        octaveExact={octaveExact}
      />
      <PitchHistoryChart
        samples={historySamples}
        active={melodiaPlaying}
        mode="sostener"
        targetNote={targetNote}
        targetOctave={targetOctave}
        octaveExact={octaveExact}
        detection={detection}
        accuracy={accuracy}
        cents={cents}
        calibre={holdCalibre}
      />
    </>
  );
}

export type VozModeSlidesProps = {
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  onSetRitmoToneEvaluation: (mode: "none" | "fixed" | "perBeat") => void;
  effectiveTarget: VozTarget;
  targetPicker: TargetPickerProps;
  detection: NoteDetection | null;
  objectiveLabel: string;
  targetFrequency: number | null;
  octaveExact: boolean;
  targetNote: string;
  centsFromTarget: number;
  accuracy: VozAccuracy;
  feedbackLabel: string;
  instantAttempts: VozInstantAttempt[];
  historySamples: VozHistorySample[];
  holdTargetSeconds: number;
  onSetHoldTargetSeconds: (value: number) => void;
  holdCalibre: VozCalibre;
  onSetHoldCalibre: (value: VozCalibre) => void;
  celebrationKey: number;
  ritmoPlaying: boolean;
  onToggleRitmoPlaying: () => void;
  ritmoBpm: number;
  onSetRitmoBpm: (value: number) => void;
  ritmoBeatPattern: MetronomeBeatPattern;
  ritmoPatternLength: number;
  ritmoBeatDurations: MetronomeBeatDurationPattern;
  onSetRitmoPatternLength: (value: number) => void;
  onSetRitmoBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  onSetRitmoBeatLevelAtSlot: (
    slotIndex: number,
    level: MetronomeBeatLevel,
  ) => void;
  ritmoTapTempoTapCount: number;
  onTapRitmoTempo: () => void;
  beatMarkers: VozRitmoBeatMarker[];
  ritmoVoiceSamples: VozRitmoVoiceSample[];
  melodiaPlaying: boolean;
  onToggleMelodiaPlaying: () => void;
  melodiaBpm: number;
  onSetMelodiaBpm: (value: number) => void;
  melodiaPatternLength: number;
  onSetMelodiaPatternLength: (value: number) => void;
  melodiaBeatDuration: MetronomeBeatDuration;
  onSetMelodiaBeatDuration: (value: MetronomeBeatDuration) => void;
  melodiaNotePattern: VozNotaPattern;
  onSetMelodiaNoteAtSlot: (slotIndex: number, target: VozTarget) => void;
  melodiaTapTempoTapCount: number;
  onTapMelodiaTempo: () => void;
  comboNotePattern: VozNotaPattern;
  onSetComboNoteAtSlot: (slotIndex: number, target: VozTarget) => void;
};

export function VozModeSlides({
  activeIndex,
  onChangeIndex,
  onSetRitmoToneEvaluation,
  effectiveTarget,
  targetPicker,
  detection,
  objectiveLabel,
  targetFrequency,
  octaveExact,
  targetNote,
  centsFromTarget,
  accuracy,
  feedbackLabel,
  instantAttempts,
  historySamples,
  holdTargetSeconds,
  onSetHoldTargetSeconds,
  holdCalibre,
  onSetHoldCalibre,
  celebrationKey,
  ritmoPlaying,
  onToggleRitmoPlaying,
  ritmoBpm,
  onSetRitmoBpm,
  ritmoBeatPattern,
  ritmoPatternLength,
  ritmoBeatDurations,
  onSetRitmoPatternLength,
  onSetRitmoBeatDurationAtSlot,
  onSetRitmoBeatLevelAtSlot,
  ritmoTapTempoTapCount,
  onTapRitmoTempo,
  beatMarkers,
  ritmoVoiceSamples,
  melodiaPlaying,
  onToggleMelodiaPlaying,
  melodiaBpm,
  onSetMelodiaBpm,
  melodiaPatternLength,
  onSetMelodiaPatternLength,
  melodiaBeatDuration,
  onSetMelodiaBeatDuration,
  melodiaNotePattern,
  onSetMelodiaNoteAtSlot,
  melodiaTapTempoTapCount,
  onTapMelodiaTempo,
  comboNotePattern,
  onSetComboNoteAtSlot,
}: VozModeSlidesProps) {
  useEffect(() => {
    const slideId = VOZ_MODE_SLIDES[activeIndex]?.id;

    if (slideId === "combo") {
      onSetRitmoToneEvaluation("perBeat");
    } else if (slideId === "ritmo-nota") {
      onSetRitmoToneEvaluation("fixed");
    } else {
      onSetRitmoToneEvaluation("none");
    }
  }, [activeIndex, onSetRitmoToneEvaluation]);

  const hasVoiceSignal = detection !== null;
  const holdAccuracy = useMemo(
    () => getVozAccuracy(centsFromTarget, hasVoiceSignal, holdCalibre),
    [centsFromTarget, hasVoiceSignal, holdCalibre],
  );
  const holdCalibreLabel =
    VOZ_CALIBRE_OPTIONS.find((option) => option.id === holdCalibre)?.label ??
    holdCalibre;
  const targetLabel = formatTargetLabel(
    targetPicker.target,
    targetPicker.octaveExact,
  );
  const sostenerConfigSummary = `${targetLabel} · ${holdCalibreLabel} · ${holdTargetSeconds} s`;
  const encajarConfigSummary = targetLabel;
  const melodiaCompas = buildMelodiaCompasState(
    melodiaPatternLength,
    melodiaBeatDuration,
  );
  const melodiaConfigSummary = `${getNotaPatternSummary(
    melodiaNotePattern,
    melodiaPatternLength,
    octaveExact,
  )} · ${melodiaPatternLength} golpes · ${melodiaBpm} BPM`;
  const ritmoConfigSummary = `Ciclo de ${ritmoPatternLength} golpes · ${getBeatDurationPatternSummary(ritmoBeatDurations, ritmoPatternLength)} · ${ritmoBpm} BPM`;
  const ritmoNotaConfigSummary = `${targetLabel} · ${ritmoConfigSummary}`;
  const comboConfigSummary = `${getNotaPatternSummary(
    comboNotePattern,
    ritmoPatternLength,
    octaveExact,
  )} · ${ritmoConfigSummary}`;
  const practiceTargetNote = effectiveTarget.note;
  const practiceTargetOctave = effectiveTarget.octave;
  const practiceObjectiveLabel = formatTargetLabel(effectiveTarget, octaveExact);

  function renderSlideContent(slideId: VozModeSlideId) {
    switch (slideId) {
      case "encajar":
        return (
          <div className="space-y-3">
            <VozConfigSection
              collapsible
              collapsedSummary={encajarConfigSummary}
            >
              <TargetPicker {...targetPicker} collapsible={false} />
            </VozConfigSection>
            <VozPracticeSection subtitle="Cantá un pinchazo corto y soltá. Buscá caer en verde al empezar, sin sostener ni medir tiempo.">
              <DetectedNoteDisplay
                detection={detection}
                objectiveLabel={objectiveLabel}
                targetFrequency={targetFrequency}
                octaveExact={octaveExact}
              />
              <PitchLadderBar
                targetNote={targetNote}
                cents={centsFromTarget}
                accuracy={accuracy}
                detectedNote={detection?.note ?? null}
              />
              <InstantAttemptsStrip attempts={instantAttempts} />
            </VozPracticeSection>
          </div>
        );
      case "sostener":
        return (
          <div className="space-y-3">
            <VozConfigSection
              collapsible
              collapsedSummary={sostenerConfigSummary}
            >
              <TargetPicker {...targetPicker} collapsible={false} />
              <VozCalibrePicker
                calibre={holdCalibre}
                onSetCalibre={onSetHoldCalibre}
              />
              <div className="rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-voz-config">
                  Meta tiempo a sostener
                </p>
                <div className="mt-2 flex items-center justify-center gap-3">
                  <TapButton
                    type="button"
                    aria-label="Reducir segundos"
                    disabled={holdTargetSeconds <= VOZ_HOLD_TARGET_MIN}
                    onClick={() =>
                      onSetHoldTargetSeconds(
                        clampHoldTargetSeconds(holdTargetSeconds - 1),
                      )
                    }
                    className="flex size-9 items-center justify-center rounded-full border border-border bg-bg-dark text-lg font-bold text-text-primary disabled:opacity-40"
                  >
                    −
                  </TapButton>
                  <div className="min-w-[5rem] text-center">
                    <p className="text-2xl font-extrabold leading-none text-text-primary">
                      {holdTargetSeconds}
                    </p>
                    <p className="mt-0.5 text-[10px] text-text-muted">segundos</p>
                  </div>
                  <TapButton
                    type="button"
                    aria-label="Aumentar segundos"
                    disabled={holdTargetSeconds >= VOZ_HOLD_TARGET_MAX}
                    onClick={() =>
                      onSetHoldTargetSeconds(
                        clampHoldTargetSeconds(holdTargetSeconds + 1),
                      )
                    }
                    className="flex size-9 items-center justify-center rounded-full border border-border bg-bg-dark text-lg font-bold text-text-primary disabled:opacity-40"
                  >
                    +
                  </TapButton>
                </div>
              </div>
            </VozConfigSection>
            <VozPracticeSection>
              <PitchHistoryChart
                samples={historySamples}
                active
                mode="sostener"
                targetNote={targetNote}
                targetOctave={targetPicker.target.octave}
                octaveExact={octaveExact}
                detection={detection}
                accuracy={holdAccuracy}
                cents={centsFromTarget}
                calibre={holdCalibre}
              />
              <HoldTimerPanel
                samples={historySamples}
                holdTargetSeconds={holdTargetSeconds}
                celebrationKey={celebrationKey}
                accuracy={holdAccuracy}
                cents={centsFromTarget}
                calibre={holdCalibre}
              />
            </VozPracticeSection>
          </div>
        );
      case "melodia":
        return (
          <div className="space-y-3">
            <MelodiaConfigSection
              autoCollapseWhen={melodiaPlaying}
              collapsedSummary={melodiaConfigSummary}
              patternLength={melodiaPatternLength}
              beatDuration={melodiaBeatDuration}
              beatPattern={melodiaCompas.beatPattern}
              bpm={melodiaBpm}
              isPlaying={melodiaPlaying}
              tapTempoTapCount={melodiaTapTempoTapCount}
              vozNotaPatron={{
                pattern: melodiaNotePattern,
                octaveExact,
                onSetOctaveExact: targetPicker.onSetOctaveExact,
                onSetAtSlot: onSetMelodiaNoteAtSlot,
              }}
              onSetPatternLength={onSetMelodiaPatternLength}
              onSetBeatDuration={onSetMelodiaBeatDuration}
              onSetBpm={onSetMelodiaBpm}
              onTapTempo={onTapMelodiaTempo}
            />
            <VozPracticeSection subtitle="Cantá la melodía del ciclo: cada golpe tiene su nota y el tiempo es uniforme.">
              <VozMelodiaPractice
                melodiaPlaying={melodiaPlaying}
                onToggleMelodiaPlaying={onToggleMelodiaPlaying}
                beatMarkers={beatMarkers}
                melodiaBpm={melodiaBpm}
                melodiaPatternLength={melodiaPatternLength}
                melodiaBeatDuration={melodiaBeatDuration}
                detection={detection}
                objectiveLabel={practiceObjectiveLabel}
                targetFrequency={targetFrequency}
                octaveExact={octaveExact}
                targetNote={practiceTargetNote}
                targetOctave={practiceTargetOctave}
                cents={centsFromTarget}
                accuracy={accuracy}
                historySamples={historySamples}
                holdCalibre={holdCalibre}
              />
            </VozPracticeSection>
          </div>
        );
      case "ritmo":
        return (
          <div className="space-y-3">
            <RitmoConfigSection
              compasLayout="flat"
              collapsedSummary={ritmoConfigSummary}
              autoCollapseWhen={ritmoPlaying}
              hideCompasHelp
              beatPattern={ritmoBeatPattern}
              patternLength={ritmoPatternLength}
              beatDurations={ritmoBeatDurations}
              bpm={ritmoBpm}
              isPlaying={ritmoPlaying}
              tapTempoTapCount={ritmoTapTempoTapCount}
              patternLengthInputId="voz-ritmo-pattern-length"
              onSetPatternLength={onSetRitmoPatternLength}
              onSetBeatDurationAtSlot={onSetRitmoBeatDurationAtSlot}
              onSetBeatLevelAtSlot={onSetRitmoBeatLevelAtSlot}
              onSetBpm={onSetRitmoBpm}
              onTapTempo={onTapRitmoTempo}
            />
            <VozPracticeSection subtitle="Seguí el ritmo: cantá en los tiempos marcados y guardá silencio en el resto. Sin evaluar tono.">
              <VozRitmoPractice
                ritmoPlaying={ritmoPlaying}
                onToggleRitmoPlaying={onToggleRitmoPlaying}
                beatMarkers={beatMarkers}
                ritmoBpm={ritmoBpm}
                ritmoBeatPattern={ritmoBeatPattern}
                ritmoPatternLength={ritmoPatternLength}
                ritmoBeatDurations={ritmoBeatDurations}
                voiceSamples={ritmoVoiceSamples}
                evaluateTone={false}
                detection={detection}
                objectiveLabel={practiceObjectiveLabel}
                targetFrequency={targetFrequency}
                octaveExact={octaveExact}
                targetNote={practiceTargetNote}
                targetOctave={practiceTargetOctave}
                cents={centsFromTarget}
                accuracy={accuracy}
                historySamples={historySamples}
              />
            </VozPracticeSection>
          </div>
        );
      case "ritmo-nota":
        return (
          <div className="space-y-3">
            <RitmoConfigSection
              compasLayout="flat"
              collapsedSummary={ritmoNotaConfigSummary}
              autoCollapseWhen={ritmoPlaying}
              hideCompasHelp
              prefix={<TargetPicker {...targetPicker} collapsible={false} />}
              beatPattern={ritmoBeatPattern}
              patternLength={ritmoPatternLength}
              beatDurations={ritmoBeatDurations}
              bpm={ritmoBpm}
              isPlaying={ritmoPlaying}
              tapTempoTapCount={ritmoTapTempoTapCount}
              patternLengthInputId="voz-ritmo-nota-pattern-length"
              onSetPatternLength={onSetRitmoPatternLength}
              onSetBeatDurationAtSlot={onSetRitmoBeatDurationAtSlot}
              onSetBeatLevelAtSlot={onSetRitmoBeatLevelAtSlot}
              onSetBpm={onSetRitmoBpm}
              onTapTempo={onTapRitmoTempo}
            />
            <VozPracticeSection subtitle="Patrón rítmico con una sola nota: seguí el ritmo y mantené el tono al cantar.">
              <VozRitmoPractice
                ritmoPlaying={ritmoPlaying}
                onToggleRitmoPlaying={onToggleRitmoPlaying}
                beatMarkers={beatMarkers}
                ritmoBpm={ritmoBpm}
                ritmoBeatPattern={ritmoBeatPattern}
                ritmoPatternLength={ritmoPatternLength}
                ritmoBeatDurations={ritmoBeatDurations}
                voiceSamples={ritmoVoiceSamples}
                evaluateTone
                detection={detection}
                objectiveLabel={objectiveLabel}
                targetFrequency={targetFrequency}
                octaveExact={octaveExact}
                targetNote={targetNote}
                targetOctave={targetPicker.target.octave}
                cents={centsFromTarget}
                accuracy={accuracy}
                historySamples={historySamples}
                holdCalibre={holdCalibre}
              />
            </VozPracticeSection>
          </div>
        );
      case "combo":
        return (
          <div className="space-y-3">
            <RitmoConfigSection
              compasLayout="flat"
              collapsedSummary={comboConfigSummary}
              autoCollapseWhen={ritmoPlaying}
              hideCompasHelp
              vozNotaPatron={{
                pattern: comboNotePattern,
                octaveExact,
                onSetOctaveExact: targetPicker.onSetOctaveExact,
                onSetAtSlot: onSetComboNoteAtSlot,
              }}
              beatPattern={ritmoBeatPattern}
              patternLength={ritmoPatternLength}
              beatDurations={ritmoBeatDurations}
              bpm={ritmoBpm}
              isPlaying={ritmoPlaying}
              tapTempoTapCount={ritmoTapTempoTapCount}
              patternLengthInputId="voz-combo-pattern-length"
              onSetPatternLength={onSetRitmoPatternLength}
              onSetBeatDurationAtSlot={onSetRitmoBeatDurationAtSlot}
              onSetBeatLevelAtSlot={onSetRitmoBeatLevelAtSlot}
              onSetBpm={onSetRitmoBpm}
              onTapTempo={onTapRitmoTempo}
            />
            <VozPracticeSection subtitle="Combiná ritmo y melodía: cada golpe tiene su nota y se evalúa el tono al cantar.">
              <VozRitmoPractice
                ritmoPlaying={ritmoPlaying}
                onToggleRitmoPlaying={onToggleRitmoPlaying}
                beatMarkers={beatMarkers}
                ritmoBpm={ritmoBpm}
                ritmoBeatPattern={ritmoBeatPattern}
                ritmoPatternLength={ritmoPatternLength}
                ritmoBeatDurations={ritmoBeatDurations}
                voiceSamples={ritmoVoiceSamples}
                evaluateTone
                detection={detection}
                objectiveLabel={practiceObjectiveLabel}
                targetFrequency={targetFrequency}
                octaveExact={octaveExact}
                targetNote={practiceTargetNote}
                targetOctave={practiceTargetOctave}
                cents={centsFromTarget}
                accuracy={accuracy}
                historySamples={historySamples}
                holdCalibre={holdCalibre}
              />
            </VozPracticeSection>
          </div>
        );
    }
  }

  return (
    <ModeCarouselShell
      activeIndex={activeIndex}
      onChangeIndex={onChangeIndex}
      renderSlide={(index) =>
        renderSlideContent(VOZ_MODE_SLIDES[index]!.id)
      }
    />
  );
}
