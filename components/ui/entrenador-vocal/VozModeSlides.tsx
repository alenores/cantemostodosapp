"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { ToolNumericStepper } from "@/components/ui/ToolNumericStepper";
import { MicToggleButton } from "@/components/ui/MicToggleButton";
import { PlayCircleButton } from "@/components/ui/PlayCircleButton";
import {
  BeatPatternEditor,
  RitmoConfigSection,
  ToolRitmoCompasPanel,
  ToolRitmoTempoPanel,
} from "@/components/ui/ToolRitmoConfig";
import { CompositorDesktopCicloBar } from "@/components/ui/compositor/CompositorDesktopCicloBar";
import { CompositorDesktopTempoBar } from "@/components/ui/compositor/CompositorDesktopTempoBar";
import {
  EncajarHelpButton,
  EncajarHelpModal,
} from "@/components/ui/entrenador-vocal/EncajarHelpModal";
import {
  OctavasHelpButton,
  OctavasHelpModal,
} from "@/components/ui/entrenador-vocal/OctavasHelpModal";
import {
  IntensidadHelpButton,
  IntensidadHelpModal,
} from "@/components/ui/entrenador-vocal/IntensidadHelpModal";
import {
  RitmoHelpButton,
  RitmoHelpModal,
} from "@/components/ui/entrenador-vocal/RitmoHelpModal";
import {
  MelodiaHelpButton,
  MelodiaHelpModal,
} from "@/components/ui/entrenador-vocal/MelodiaHelpModal";
import {
  SostenerHelpButton,
  SostenerHelpModal,
} from "@/components/ui/entrenador-vocal/SostenerHelpModal";
import {
  RitmoNotaHelpButton,
  RitmoNotaHelpModal,
} from "@/components/ui/entrenador-vocal/RitmoNotaHelpModal";
import {
  buildMelodiaCompasState,
  MelodiaConfigSection,
} from "@/components/ui/entrenador-vocal/VozMelodiaConfig";
import {
  getActiveNotaSlice,
  getNotaPatternSummary,
} from "@/lib/voz-nota-patron";
import type { VozNotaPattern } from "@/lib/voz-nota-patron";
import type { NoteDetection } from "@/lib/afinador";
import type {
  MetronomeBeatDuration,
  MetronomeBeatDurationPattern,
  MetronomeBeatLevel,
  MetronomeBeatPattern,
} from "@/lib/metronomo";
import {
  getActivePatternSlice,
  getBeatLevelAtOffset,
  getBeatDurationPatternSummary,
  getBeatLevelBarAppearance,
  getBeatLevelBarHeightPercent,
  getBeatPositionAtTime,
  getBeatTimelineSegmentsFromOrigin,
  getBeatTimelineSegmentsInWindow,
  getCycleMs,
  getMelodiaTargetLineColor,
  getMelodiaTargetLineOpacity,
  getMelodiaTargetLineStrokeWidth,
} from "@/lib/metronomo";
import { getPlaybackNow, getPlaybackStartMs } from "@/lib/voz-ritmo-audio";
import {
  beatLevelToPhase,
  buildMelodiaSingPattern,
  getPhaseAtBeat,
  getPhaseLabel,
  getRitmoComplianceColor,
  getRitmoNowLinePercent,
  getRitmoTimelineWindowMs,
  ritmoTimeToPercent,
  VOZ_MELODIA_BEAT_FLASH_MS,
  VOZ_MELODIA_CHART_PAST_RATIO,
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
  getCentsFromTarget,
  getCentsFromTargetWithOctaveFold,
  getLadderNoteSlots,
  getNoteLabelAtSemitoneOffset,
  getOctaveUpFrequency,
  getOctaveUpTarget,
  getVozAccuracy,
  getVozAccuracyColor,
  getVozCalibreDescription,
  getVozCalibreThresholds,
  getVozFeedbackLabel,
  getTargetCentsOffset,
  getMelodiaChartCentsRange,
  getVozSampleColor,
  historyCentsBandHeight,
  historyCentsToChartY,
  historyTimestampToChartX,
  melodiaCentsToChartY,
  type MelodiaChartCentsRange,
  isHoldCountingAccuracy,
  isPerfectPitch,
  octavasCentsToChartY,
  playOctaveReference,
  semitoneOffsetToLadderPercent,
  splitHistorySegments,
  smoothChartCents,
  trimHistorySamples,
  VOZ_HOLD_CHART_SEMITONE_SPAN,
  VOZ_HOLD_CHART_MAX_CENTS,
  targetToFrequency,
  VOZ_CALIBRE_OPTIONS,
  VOZ_CERCA_CENTS,
  VOZ_HISTORY_CHART_WIDE_MAX_CENTS,
  VOZ_HISTORY_WINDOW_MS,
  VOZ_HOLD_TARGET_MAX,
  VOZ_HOLD_TARGET_MIN,
  clampHoldTargetSeconds,
  clampOctavasNoteDurationSeconds,
  clampOctavasScaleRepetitions,
  getOctavasScaleTarget,
  VOZ_INSTANT_ATTEMPTS_MAX,
  VOZ_INTUNE_CENTS,
  VOZ_LADDER_SEMITONE_SPAN,
  VOZ_OCTAVAS_NOTE_DURATION_MAX,
  VOZ_OCTAVAS_NOTE_DURATION_MIN,
  VOZ_OCTAVAS_PAUSE_MS,
  VOZ_OCTAVAS_SAMPLE_INTERVAL_MS,
  VOZ_OCTAVAS_SCALE_REPETITIONS_MAX,
  VOZ_OCTAVAS_SCALE_REPETITIONS_MIN,
  VOZ_OCTAVAS_SILENCE_RESET_MS,
  getOctavasOverallProgress,
  VOZ_PERFECT_CENTS,
  type HoldRingSegment,
  type VozAccuracy,
  type VozCalibre,
  type VozHistorySample,
  type VozInstantAttempt,
  type VozOctavasChartSample,
  type VozOctavasPitchMode,
  type VozTarget,
} from "@/lib/voz";
import {
  getIntensidadComplianceColor,
  hasAudiblePitchVolume,
  rmsToBarHeightPercent,
  type VozIntensidadVoiceSample,
} from "@/lib/voz-intensidad";
import { triggerHaptic } from "@/lib/haptic";
import {
  getRitmoCycleVolumeBarHeightPx,
  RITMO_TIMELINE_PATTERN_ROW_PX,
  RITMO_TIMELINE_VOLUME_BAR_SCALE,
} from "@/lib/ritmo-compas-ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  TargetPicker,
  TargetPickerBody,
  VozConfigSection,
  VozPracticeArea,
  type TargetPickerProps,
} from "./EntrenadorVocalShared";
import { VolumeSegmentMeter } from "./VolumeSegmentMeter";
import {
  VOZ_MODE_SLIDES,
  type VozModeSlideId,
} from "@/components/ui/entrenador-vocal/voz-mode-slides";
import { VozMelodiaDesktopConfig } from "@/components/ui/entrenador-vocal/pc/VozMelodiaDesktopConfig";
import {
  VozPcConfigCard,
  VozPcShellLayout,
} from "@/components/ui/entrenador-vocal/pc/VozPcShellLayout";
import { VozPcModeNav } from "@/components/ui/entrenador-vocal/pc/VozPcModeNav";
import { useIsDesktop } from "@/hooks/useIsDesktop";

export { VOZ_MODE_SLIDES, type VozModeSlideId } from "@/components/ui/entrenador-vocal/voz-mode-slides";

function wrapModeSlide(
  layout: "mobile" | "desktop",
  config: ReactNode,
  practice: ReactNode,
  practiceHeaderExtra?: ReactNode,
) {
  if (layout === "desktop") {
    return (
      <VozPcShellLayout
        config={config}
        practice={practice}
        practiceHeaderExtra={practiceHeaderExtra}
      />
    );
  }

  return (
    <div className="space-y-3">
      {config}
      <VozPracticeArea>
        {practiceHeaderExtra}
        {practice}
      </VozPracticeArea>
    </div>
  );
}

function splitPracticeMic(
  layout: "mobile" | "desktop",
  micControl: ReactNode,
  practiceBody: ReactNode,
): { practice: ReactNode; practiceHeaderExtra?: ReactNode } {
  if (layout === "desktop") {
    return { practice: practiceBody, practiceHeaderExtra: micControl };
  }

  return {
    practice: (
      <>
        {micControl}
        {practiceBody}
      </>
    ),
    practiceHeaderExtra: undefined,
  };
}

function renderDesktopTargetPicker(targetPicker: TargetPickerProps) {
  return (
    <TargetPickerBody
      target={targetPicker.target}
      onSetTarget={targetPicker.onSetTarget}
      disabled={targetPicker.disabled}
    />
  );
}

type RitmoDesktopCompasPanelProps = Omit<
  ComponentProps<typeof ToolRitmoCompasPanel>,
  "embedded" | "layout"
>;

type RitmoDesktopTempoPanelProps = Omit<
  ComponentProps<typeof ToolRitmoTempoPanel>,
  "embedded"
>;

function renderRitmoDesktopCicloTempo({
  compas,
  tempo,
  notas,
}: {
  compas: RitmoDesktopCompasPanelProps;
  tempo: RitmoDesktopTempoPanelProps;
  notas?: { vozNotaPatron: ComponentProps<typeof ToolRitmoCompasPanel>["vozNotaPatron"] };
}) {
  const activePattern = getActivePatternSlice(compas.beatPattern, compas.patternLength);

  return (
    <>
      <VozPcConfigCard>
        <CompositorDesktopCicloBar
          cycleGolpes={compas.patternLength}
          cycleBeatDurations={compas.beatDurations}
          disabled={tempo.disabled ?? false}
          size="compact"
          accent="voz"
          onSetCycleGolpes={compas.onSetPatternLength}
          onSetCycleBeatDurationAtSlot={compas.onSetBeatDurationAtSlot}
        />
      </VozPcConfigCard>

      <VozPcConfigCard>
        <BeatPatternEditor
          pattern={compas.beatPattern}
          patternLength={compas.patternLength}
          variant="config"
          slotDensity="compact"
          embedded
          desktopEmbedded
          accent="voz"
          onCycleSlot={(slotIndex) => {
            const current = activePattern[slotIndex] ?? ("silencio" as const);
            compas.onSetBeatLevelAtSlot(
              slotIndex,
              getBeatLevelAtOffset(current, 1),
            );
          }}
        />
      </VozPcConfigCard>

      {notas?.vozNotaPatron ? (
        <VozPcConfigCard>
          <ToolRitmoCompasPanel
            embedded
            layout="flat"
            scope="cycle"
            hideCompasHelp
            hideIntensidadTab
            forcedTab="notas"
            vozNotaPatron={notas.vozNotaPatron}
            beatPattern={compas.beatPattern}
            patternLength={compas.patternLength}
            beatDurations={compas.beatDurations}
            disabled={tempo.disabled ?? false}
            patternLengthInputId={compas.patternLengthInputId}
            onSetPatternLength={compas.onSetPatternLength}
            onSetBeatDurationAtSlot={compas.onSetBeatDurationAtSlot}
            onSetBeatLevelAtSlot={compas.onSetBeatLevelAtSlot}
          />
        </VozPcConfigCard>
      ) : null}

      <VozPcConfigCard>
        <CompositorDesktopTempoBar
          bpm={tempo.bpm}
          isPlaying={tempo.isPlaying}
          tapTempoTapCount={tempo.tapTempoTapCount}
          accent="voz"
          onSetBpm={tempo.onSetBpm}
          onTapTempo={tempo.onTapTempo}
        />
      </VozPcConfigCard>
    </>
  );
}

function renderPracticeMicControl(
  layout: "mobile" | "desktop",
  isActive: boolean,
  onToggle: () => void,
  micStarting: boolean,
) {
  return (
    <VozPracticeMicRow
      variant={layout === "desktop" ? "header" : "center"}
      isActive={isActive}
      onToggle={onToggle}
      disabled={micStarting}
    />
  );
}

const CHART_WIDTH = 320;
const CHART_HEIGHT_WIDE = 258;
const CHART_HEIGHT_SOSTENER = 342;
const CHART_PC_HEIGHT_SOSTENER = 180;
const CHART_PC_HEIGHT_MELODIA = 180;
const CHART_PC_HEIGHT_OCTAVAS = 165;
const CHART_WIDE_PADDING_LEFT = 44;
const CHART_MELODIA_PADDING = 6;
const CHART_MELODIA_WINDOW_CYCLES = 3;
const MODE_AXIS_LOCK_PX = 8;
const MODE_SWIPE_COMMIT_RATIO = 0.2;
const MODE_SWIPE_COMMIT_MIN_PX = 48;
const MODE_CAROUSEL_TRANSITION_MS = 260;
const OCTAVAS_CHART_WIDTH = 320;
const OCTAVAS_CHART_HEIGHT = 280;
const OCTAVAS_CHART_PADDING = 10;
const OCTAVAS_CENTS_PER_PIXEL = 0.055;

type VozPracticeLayout = "mobile" | "desktop";

function getOctavasLowerTargetY(chartHeight = OCTAVAS_CHART_HEIGHT): number {
  return chartHeight * 0.72;
}

function getOctavasUpperTargetY(chartHeight = OCTAVAS_CHART_HEIGHT): number {
  return chartHeight * 0.22;
}

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

function useTimelineNow(active: boolean, playbackSynced = false): number {
  const [, setFrame] = useState(0);

  useEffect(() => {
    if (!active) {
      return;
    }

    let animationFrame = 0;

    const tick = () => {
      setFrame((frame) => frame + 1);
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [active]);

  if (!active) {
    return performance.now();
  }

  return playbackSynced ? getPlaybackNow() : performance.now();
}

function ModeCarouselShell({
  activeIndex,
  onChangeIndex,
  renderSlide,
  titleAction,
}: {
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  renderSlide: (index: number) => ReactNode;
  titleAction?: ReactNode;
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

    return <div className="px-3 pt-3 pb-1">{renderSlide(index)}</div>;
  }

  function renderPanelColumn(index: number, isCenter = false) {
    return (
      <div
        ref={isCenter ? centerPanelRef : undefined}
        className={`w-1/3 shrink-0 self-start ${
          isCenter ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isCenter}
      >
        {renderPanel(index)}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex min-w-0 flex-1 flex-col">
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
              <div className="flex items-center justify-center gap-1.5">
                <p className="truncate text-sm font-bold uppercase tracking-wide text-text-primary">
                  {activeSlide.label}
                </p>
                {titleAction}
              </div>
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

        <div className="min-h-0 flex-1">
          <div
            className="overflow-hidden rounded-[14px] border-2 border-border-card shadow-[inset_0_1px_0_color-mix(in_srgb,var(--text-primary)_5%,transparent)]"
            style={{ backgroundColor: "var(--tool-practice-section-bg)" }}
          >
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

            <div className="flex items-center justify-center gap-1.5 border-t border-border px-3 py-2">
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
      </div>
    </div>
  );
}

function DetectedNoteDisplay({
  detection,
  objectiveLabel,
  targetFrequency,
}: {
  detection: NoteDetection | null;
  objectiveLabel: string;
  targetFrequency: number | null;
}) {
  const detectedDisplay =
    detection !== null
      ? `${detection.note}${frequencyToDisplayOctave(detection.frequency)}`
      : "—";

  return (
    <div className="text-center">
      <p className="text-xs font-semibold text-text-muted">
        Objetivo: {objectiveLabel}
        {targetFrequency !== null ? ` · ${targetFrequency.toFixed(1)} Hz` : null}
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
  voiceRms = 0,
  size = "default",
  layout = "mobile",
}: {
  targetNote: string;
  cents: number;
  accuracy: VozAccuracy;
  detectedNote: string | null;
  voiceRms?: number;
  size?: "default" | "large";
  layout?: VozPracticeLayout;
}) {
  const barHeightClass =
    layout === "desktop"
      ? "h-20"
      : size === "large"
        ? "h-28"
        : "h-14";
  const slots = getLadderNoteSlots(targetNote);
  const markerLeft = centsToLadderPercent(cents);
  const markerColor = getVozAccuracyColor(accuracy, cents);
  const intuneWidth =
    (VOZ_INTUNE_CENTS / (VOZ_LADDER_SEMITONE_SPAN * 100)) * 100;
  const hasAudibleVoice =
    accuracy !== "silencio" && hasAudiblePitchVolume(voiceRms);

  return (
    <div className="w-full">
      <div
        className={`relative overflow-hidden rounded-[12px] border border-border bg-bg-card px-1 ${barHeightClass}`}
      >
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
            hasAudibleVoice;

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

        {hasAudibleVoice ? (
          <span
            className="pointer-events-none absolute bottom-1.5 size-3.5 -translate-x-1/2 rounded-full ring-2 ring-bg-card transition-none"
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
    <div className="mt-2 w-full rounded-[10px] border border-border bg-bg-card/60 px-3 py-2.5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        Tus intentos
      </p>
      <div
        className="flex w-full flex-nowrap items-center gap-[clamp(2px,0.6vw,4px)]"
        aria-label={`${attempts.length} de ${VOZ_INSTANT_ATTEMPTS_MAX} intentos`}
      >
        {slots.map((attempt, index) => (
          <span
            key={attempt?.id ?? `slot-${index}`}
            className="aspect-square min-w-0 flex-1 rounded-full border lg:size-5 lg:flex-none"
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
  embedded = false,
}: {
  calibre: VozCalibre;
  onSetCalibre: (value: VozCalibre) => void;
  embedded?: boolean;
}) {
  const controls = (
    <>
      <div
        className="tool-segmented-control tool-segmented-control--inline flex gap-1"
        role="group"
        aria-label="Calibre de afinación"
      >
        {VOZ_CALIBRE_OPTIONS.map((option) => {
          const selected = calibre === option.id;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSetCalibre(option.id)}
              className={`min-w-0 flex-1 shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold ${
                selected ? "bg-voz-config text-white" : "text-text-muted"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] leading-snug text-text-muted">
        {getVozCalibreDescription(calibre)}
      </p>
    </>
  );

  if (embedded) {
    return controls;
  }

  return (
    <div className="rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-voz-config">
        Calibre de afinación
      </p>
      <div className="mt-2">{controls}</div>
    </div>
  );
}

const OCTAVAS_PITCH_MODE_OPTIONS: Array<{
  id: VozOctavasPitchMode;
  label: string;
}> = [
  { id: "same", label: "Misma nota" },
  { id: "scale", label: "Escala" },
];

function OctavasQueDigaPicker({
  pitchMode,
  onSetPitchMode,
  scaleRepetitions,
  onSetScaleRepetitions,
  embedded = false,
}: {
  pitchMode: VozOctavasPitchMode;
  onSetPitchMode: (mode: VozOctavasPitchMode) => void;
  scaleRepetitions: number;
  onSetScaleRepetitions: (value: number) => void;
  embedded?: boolean;
}) {
  const modeControls = (
    <div
      className="tool-segmented-control tool-segmented-control--inline flex gap-1"
      role="group"
      aria-label="Qué decir en octavas"
    >
      {OCTAVAS_PITCH_MODE_OPTIONS.map((option) => {
        const selected = pitchMode === option.id;

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSetPitchMode(option.id)}
            className={`min-w-0 flex-1 shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold ${
              selected ? "bg-voz-config text-white" : "text-text-muted"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  const scaleControls =
    pitchMode === "scale" ? (
      <div className={embedded ? "mt-3" : "mt-3 border-t border-border/60 pt-3"}>
        <p
          className={
            embedded
              ? "mb-2 text-[10px] font-bold uppercase tracking-wide text-voz-config"
              : "text-xs font-semibold uppercase tracking-wide text-voz-config"
          }
        >
          Repetición de la nota por escala
        </p>
        <ToolNumericStepper
          value={scaleRepetitions}
          density={embedded ? "compact" : "default"}
          decrementAriaLabel="Reducir repeticiones"
          incrementAriaLabel="Aumentar repeticiones"
          decrementDisabled={
            scaleRepetitions <= VOZ_OCTAVAS_SCALE_REPETITIONS_MIN
          }
          incrementDisabled={
            scaleRepetitions >= VOZ_OCTAVAS_SCALE_REPETITIONS_MAX
          }
          onDecrement={() =>
            onSetScaleRepetitions(
              clampOctavasScaleRepetitions(scaleRepetitions - 1),
            )
          }
          onIncrement={() =>
            onSetScaleRepetitions(
              clampOctavasScaleRepetitions(scaleRepetitions + 1),
            )
          }
        />
      </div>
    ) : null;

  if (embedded) {
    return (
      <>
        {modeControls}
        {scaleControls}
      </>
    );
  }

  return (
    <div className="rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-voz-config">
        Ciclo
      </p>
      <div className="mt-2">{modeControls}</div>
      {scaleControls}
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
  compact = false,
}: {
  progress: number;
  holdTargetSeconds: number;
  ringSegments: HoldRingSegment[];
  counting: boolean;
  accuracy: VozAccuracy;
  cents: number;
  calibre: VozCalibre;
  compact?: boolean;
}) {
  const SIZE = compact ? 88 : 112;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = SIZE / 2 - 10;
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
          strokeWidth={5.5}
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
  layout = "mobile",
}: {
  samples: VozHistorySample[];
  holdTargetSeconds: number;
  celebrationKey: number;
  accuracy: VozAccuracy;
  cents: number;
  calibre: VozCalibre;
  layout?: VozPracticeLayout;
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
      <div className="mb-1.5">
        <p className="text-xs font-semibold text-text-secondary">Cronómetro</p>
      </div>

      <div className="rounded-[12px] border border-border bg-bg-card px-2.5 py-2">
        <div className="flex flex-col items-center">
          <p className="mb-0.5 text-sm font-extrabold tabular-nums leading-none text-voz-config">
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
            compact={layout === "desktop"}
          />
          <div className="mt-0.5 flex items-baseline justify-center gap-1">
            <span className="text-base font-extrabold leading-none tabular-nums text-text-primary">
              {displaySeconds}
            </span>
            <span className="text-xs font-semibold text-text-muted">s</span>
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
  voiceRms = 0,
}: {
  detection: NoteDetection | null;
  accuracy: VozAccuracy;
  cents: number;
  calibre?: VozCalibre;
  voiceRms?: number;
}) {
  const hasAudibleVoice =
    accuracy !== "silencio" && hasAudiblePitchVolume(voiceRms);
  const noteLabel =
    hasAudibleVoice && detection !== null
      ? `${detection.note}${frequencyToDisplayOctave(detection.frequency)}`
      : "—";
  const displayAccuracy: VozAccuracy = hasAudibleVoice ? accuracy : "silencio";

  return (
    <div
      className="flex w-12 shrink-0 flex-col items-center justify-center rounded-[10px] border border-border/60 bg-bg-dark/35 px-0.5 py-2"
      aria-live="polite"
      aria-label={
        hasAudibleVoice && detection
          ? `Nota detectada ${noteLabel}`
          : "Sin nota detectada"
      }
    >
      <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
        Vos
      </span>
      <span
        className="mt-1 text-center text-lg font-extrabold leading-none"
        style={{
          color:
            displayAccuracy === "silencio"
              ? "var(--text-muted)"
              : getVozAccuracyColor(displayAccuracy, cents, calibre),
        }}
      >
        {noteLabel}
      </span>
      <span className="mt-1 text-center text-xs font-semibold tabular-nums text-text-muted">
        {hasAudibleVoice && detection
          ? `${detection.frequency.toFixed(0)} Hz`
          : "—"}
      </span>
    </div>
  );
}

function transformMelodiaHistorySamples(
  samples: VozHistorySample[],
  reference: VozTarget,
  notes: VozTarget[],
  beatMarkers: VozRitmoBeatMarker[],
  bpm: number,
  beatDurations: MetronomeBeatDurationPattern,
  patternLength: number,
): VozHistorySample[] {
  if (beatMarkers.length === 0) {
    return samples;
  }

  return samples.map((sample) => {
    const position = getBeatPositionAtTime(
      sample.timestamp,
      beatMarkers,
      bpm,
      beatDurations,
      patternLength,
    );
    const expectedNote = notes[position?.beatIndex ?? 0] ?? reference;

    return {
      ...sample,
      cents:
        sample.cents +
        getTargetCentsOffset(reference, expectedNote, true),
    };
  });
}

type MelodiaTargetSegment = {
  x1: number;
  x2: number;
  y: number;
  label: string;
  beatIndex: number;
  containsNow: boolean;
  level: MetronomeBeatLevel;
};

function buildMelodiaTargetSegments(
  now: number,
  beatMarkers: VozRitmoBeatMarker[],
  bpm: number,
  beatDurations: MetronomeBeatDurationPattern,
  patternLength: number,
  notes: VozTarget[],
  reference: VozTarget,
  chartHeight: number,
  centsRange: MelodiaChartCentsRange,
  plotLeft: number,
  plotRight: number,
  windowMs: number,
  pastRatio: number,
  beatPattern: MetronomeBeatPattern,
): MelodiaTargetSegment[] {
  if (beatMarkers.length === 0 || notes.length === 0) {
    return [];
  }

  const pastSpan = windowMs * pastRatio;
  const futureSpan = windowMs * (1 - pastRatio);
  const windowStart = now - pastSpan;
  const windowEnd = now + futureSpan;
  const beatSegments = getBeatTimelineSegmentsInWindow(
    beatMarkers,
    bpm,
    beatDurations,
    patternLength,
    windowStart,
    windowEnd,
  );
  const activePattern = getActivePatternSlice(beatPattern, patternLength);

  return beatSegments.map((segment) => {
    const note = notes[segment.beatIndex] ?? reference;
    const cents = getTargetCentsOffset(reference, note, true);
    const level = activePattern[segment.beatIndex] ?? "silencio";

    return {
      x1: historyTimestampToChartX(
        segment.startMs,
        now,
        CHART_WIDTH,
        windowMs,
        plotLeft,
        plotRight,
        pastRatio,
      ),
      x2: historyTimestampToChartX(
        segment.endMs,
        now,
        CHART_WIDTH,
        windowMs,
        plotLeft,
        plotRight,
        pastRatio,
      ),
      y: melodiaCentsToChartY(cents, chartHeight, centsRange),
      label: formatTargetLabel(note),
      beatIndex: segment.beatIndex,
      containsNow: now >= segment.startMs && now < segment.endMs,
      level,
    };
  });
}

export function PitchHistoryChart({
  samples,
  active,
  mode = "ritmo",
  targetNote,
  targetOctave,
  detection,
  accuracy,
  cents,
  calibre = "estandar",
  beatMarkers = [],
  bpm = 120,
  beatDurations,
  patternLength = 4,
  notePattern,
  beatPattern,
  playbackSynced = false,
  showLiveNoteRail = false,
  voiceRms = 0,
  liveChartCents,
  layout = "mobile",
}: {
  samples: VozHistorySample[];
  active: boolean;
  mode?: "sostener" | "ritmo" | "melodia";
  targetNote: string;
  targetOctave: number;
  detection: NoteDetection | null;
  accuracy: VozAccuracy;
  cents: number;
  calibre?: VozCalibre;
  beatMarkers?: VozRitmoBeatMarker[];
  bpm?: number;
  beatDurations?: MetronomeBeatDurationPattern;
  patternLength?: number;
  notePattern?: VozNotaPattern;
  beatPattern?: MetronomeBeatPattern;
  playbackSynced?: boolean;
  showLiveNoteRail?: boolean;
  voiceRms?: number;
  /** Sostener: posición de bolita (= promedio móvil); null = oculta. */
  liveChartCents?: number | null;
  layout?: VozPracticeLayout;
}) {
  const isMelodia = mode === "melodia";
  const isSostener = mode === "sostener";
  const isHoldChart = isSostener && !isMelodia;
  const isSostenerLayout = isSostener || isMelodia;
  const chartHeight =
    layout === "desktop"
      ? isMelodia
        ? CHART_PC_HEIGHT_MELODIA
        : isSostener
          ? CHART_PC_HEIGHT_SOSTENER
          : CHART_HEIGHT_WIDE
      : isSostenerLayout
        ? CHART_HEIGHT_SOSTENER
        : CHART_HEIGHT_WIDE;
  const maxCents = isHoldChart
    ? VOZ_HOLD_CHART_MAX_CENTS
    : VOZ_HISTORY_CHART_WIDE_MAX_CENTS;
  const chartSemitoneSpan = isHoldChart
    ? VOZ_HOLD_CHART_SEMITONE_SPAN
    : VOZ_LADDER_SEMITONE_SPAN;
  const chartPlotLeft = isMelodia ? CHART_MELODIA_PADDING : CHART_WIDE_PADDING_LEFT;
  const chartPlotRight = isMelodia ? CHART_MELODIA_PADDING : 8;
  const plotLeft = chartPlotLeft;
  const plotWidth = CHART_WIDTH - chartPlotLeft - chartPlotRight;
  const melodiaWindowMs = useMemo(() => {
    if (!isMelodia || beatDurations === undefined) {
      return VOZ_HISTORY_WINDOW_MS;
    }

    return (
      getCycleMs(bpm, beatDurations, patternLength) * CHART_MELODIA_WINDOW_CYCLES
    );
  }, [isMelodia, bpm, beatDurations, patternLength]);
  const melodiaNotes = useMemo(
    () =>
      isMelodia && notePattern
        ? getActiveNotaSlice(notePattern, patternLength)
        : [],
    [isMelodia, notePattern, patternLength],
  );
  const melodiaReference = useMemo(
    (): VozTarget =>
      melodiaNotes[0] ?? { note: targetNote, octave: targetOctave },
    [melodiaNotes, targetNote, targetOctave],
  );
  const melodiaCentsRange = useMemo(
    () =>
      isMelodia
        ? getMelodiaChartCentsRange(
            melodiaNotes,
            melodiaReference,
            true,
          )
        : null,
    [isMelodia, melodiaNotes, melodiaReference],
  );
  const axisNote = isMelodia ? melodiaReference.note : targetNote;
  const axisOctave = isMelodia ? melodiaReference.octave : targetOctave;
  const timelineActive =
    active &&
    (samples.length > 0 || (isMelodia && beatMarkers.length > 0));
  const now = useTimelineNow(timelineActive, playbackSynced);
  const displaySamples = useMemo(() => {
    if (!isMelodia || beatDurations === undefined) {
      return samples;
    }

    return transformMelodiaHistorySamples(
      samples,
      melodiaReference,
      melodiaNotes,
      beatMarkers,
      bpm,
      beatDurations,
      patternLength,
    );
  }, [
    isMelodia,
    samples,
    melodiaReference,
    melodiaNotes,
    beatMarkers,
    bpm,
    beatDurations,
    patternLength,
  ]);
  const segments = useMemo(
    () => splitHistorySegments(displaySamples),
    [displaySamples],
  );
  const melodiaPastRatio = VOZ_MELODIA_CHART_PAST_RATIO;
  const chartWindowMs = isMelodia ? melodiaWindowMs : VOZ_HISTORY_WINDOW_MS;
  const melodiaBeatPattern = useMemo(
    () =>
      isMelodia
        ? (beatPattern ?? buildMelodiaSingPattern(patternLength))
        : null,
    [isMelodia, beatPattern, patternLength],
  );
  const melodiaTargetSegments = useMemo(
    () =>
      isMelodia &&
      beatDurations !== undefined &&
      melodiaCentsRange !== null &&
      melodiaBeatPattern !== null
        ? buildMelodiaTargetSegments(
            now,
            beatMarkers,
            bpm,
            beatDurations,
            patternLength,
            melodiaNotes,
            melodiaReference,
            chartHeight,
            melodiaCentsRange,
            chartPlotLeft,
            chartPlotRight,
            melodiaWindowMs,
            melodiaPastRatio,
            melodiaBeatPattern,
          )
        : [],
    [
      isMelodia,
      now,
      beatMarkers,
      bpm,
      beatDurations,
      patternLength,
      melodiaNotes,
      melodiaReference,
      chartHeight,
      melodiaCentsRange,
      chartPlotLeft,
      chartPlotRight,
      melodiaWindowMs,
      melodiaPastRatio,
      melodiaBeatPattern,
    ],
  );
  const melodiaBeatFlash = useMemo(() => {
    if (!isMelodia || beatDurations === undefined || beatMarkers.length === 0) {
      return false;
    }

    const position = getBeatPositionAtTime(
      now,
      beatMarkers,
      bpm,
      beatDurations,
      patternLength,
    );

    return (
      position !== null && position.msIntoBeat <= VOZ_MELODIA_BEAT_FLASH_MS
    );
  }, [
    isMelodia,
    now,
    beatMarkers,
    bpm,
    beatDurations,
    patternLength,
  ]);
  const melodiaNowLineX = isMelodia
    ? historyTimestampToChartX(
        now,
        now,
        CHART_WIDTH,
        melodiaWindowMs,
        chartPlotLeft,
        chartPlotRight,
        melodiaPastRatio,
      )
    : CHART_WIDTH - chartPlotRight;
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
  const hasAudibleVoice =
    accuracy !== "silencio" && hasAudiblePitchVolume(voiceRms);
  const markerCents = liveChartCents !== undefined ? liveChartCents : cents;
  const markerAccuracy = getVozAccuracy(
    markerCents ?? 0,
    markerCents !== null,
    calibre,
  );
  const liveNoteMarkerY =
    !isMelodia && hasAudibleVoice && markerCents !== null
      ? historyCentsToChartY(markerCents, chartHeight, maxCents)
      : null;
  const semitoneGuides = isHoldChart
    ? [
        -chartSemitoneSpan,
        -Math.round(chartSemitoneSpan / 2),
        0,
        Math.round(chartSemitoneSpan / 2),
        chartSemitoneSpan,
      ]
    : [-VOZ_LADDER_SEMITONE_SPAN, -3, 0, 3, VOZ_LADDER_SEMITONE_SPAN];
  const yAxisLabels = useMemo(() => {
    const target: VozTarget = { note: axisNote, octave: axisOctave };

    return [
      {
        semitones: chartSemitoneSpan,
        label: getNoteLabelAtSemitoneOffset(
          axisNote,
          axisOctave,
          chartSemitoneSpan,
        ),
        emphasis: false,
      },
      {
        semitones: 0,
        label: formatTargetLabel(target),
        emphasis: true,
      },
      {
        semitones: -chartSemitoneSpan,
        label: getNoteLabelAtSemitoneOffset(
          axisNote,
          axisOctave,
          -chartSemitoneSpan,
        ),
        emphasis: false,
      },
    ];
  }, [axisNote, axisOctave, chartSemitoneSpan]);
  const wideRangeLabel = `${yAxisLabels[0]!.label} – ${yAxisLabels[1]!.label} – ${yAxisLabels[2]!.label}`;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-text-secondary">
          {isSostenerLayout ? "Afinación en el tiempo" : "Nota en el tiempo"}
        </p>
        {!isSostenerLayout ? (
          <span className="max-w-[55%] truncate text-right text-[13px] font-semibold text-text-muted">
            {wideRangeLabel}
          </span>
        ) : null}
      </div>

      <div
        className={
          isMelodia && !showLiveNoteRail
            ? "w-full"
            : "flex items-stretch gap-1.5"
        }
      >
        <div
          className={`relative min-w-0 overflow-hidden rounded-[12px] border border-border bg-bg-card ${
            layout === "desktop" ? "w-full" : "flex-1"
          }`}
          style={
            layout === "desktop"
              ? { height: `${chartHeight}px` }
              : { aspectRatio: `${CHART_WIDTH} / ${chartHeight}` }
          }
        >
        {!isMelodia ? (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-11 border-r border-border/50 bg-bg-dark/30"
          aria-hidden="true"
        >
          {yAxisLabels.map(({ semitones, label, emphasis }) => (
            <span
              key={semitones}
              className={`absolute right-1.5 -translate-y-1/2 text-[13px] font-bold leading-none ${
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
        ) : null}
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${chartHeight}`}
          className="absolute inset-0 block h-full w-full"
          aria-hidden="true"
        >
          {!isMelodia
            ? semitoneGuides.map((semitones) => {
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
                x2={CHART_WIDTH - chartPlotRight}
                y2={y}
                stroke="var(--border)"
                strokeWidth={semitones === 0 && !isSostenerLayout ? 1 : 0.5}
                strokeDasharray={semitones === 0 && !isSostenerLayout ? "4 4" : "2 3"}
                opacity={semitones === 0 && !isSostenerLayout ? 1 : 0.55}
              />
            );
          })
            : null}
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
                x2={CHART_WIDTH - chartPlotRight}
                y2={centerY}
                stroke="var(--tuner-in-tune-perfect)"
                strokeWidth={2}
                opacity={0.95}
              />
            </>
          ) : isMelodia ? (
            melodiaTargetSegments.map((segment, index) => {
              const isCurrentBeat = segment.containsNow;
              const isFlashBeat = isCurrentBeat && melodiaBeatFlash;
              const lineColor = getMelodiaTargetLineColor(segment.level);
              const lineOpacity = getMelodiaTargetLineOpacity(
                segment.level,
                isCurrentBeat,
              );
              const strokeWidth = getMelodiaTargetLineStrokeWidth(
                segment.level,
                isCurrentBeat,
              );
              const segmentWidth = segment.x2 - segment.x1;
              const labelX = segment.x1 + segmentWidth / 2;
              const labelFontSize =
                segmentWidth < 16 ? 11 : segmentWidth < 26 ? 12 : 15;

              return (
                <g key={`melodia-target-${index}`}>
                  {isFlashBeat ? (
                    <line
                      x1={segment.x1}
                      y1={segment.y}
                      x2={segment.x2}
                      y2={segment.y}
                      stroke={lineColor}
                      strokeWidth={strokeWidth + 8}
                      opacity={0.3}
                      strokeLinecap="round"
                    />
                  ) : null}
                  <line
                    x1={segment.x1}
                    y1={segment.y}
                    x2={segment.x2}
                    y2={segment.y}
                    stroke={lineColor}
                    strokeWidth={strokeWidth}
                    opacity={lineOpacity}
                    strokeLinecap="round"
                  />
                  <text
                    x={labelX}
                    y={segment.y - 8}
                    textAnchor="middle"
                    fill={lineColor}
                    fontSize={labelFontSize}
                    fontWeight={700}
                    opacity={lineOpacity}
                  >
                    {segment.label}
                  </text>
                </g>
              );
            })
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
                  chartWindowMs,
                  maxCents,
                  chartPlotLeft,
                  chartPlotRight,
                  isMelodia ? melodiaPastRatio : undefined,
                  melodiaCentsRange ?? undefined,
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
            x1={melodiaNowLineX}
            y1={10}
            x2={melodiaNowLineX}
            y2={chartHeight - 10}
            stroke="var(--text-secondary)"
            strokeWidth={isMelodia && melodiaBeatFlash ? 1.5 : 1}
            opacity={isMelodia && melodiaBeatFlash ? 1 : 0.7}
          />
          {liveNoteMarkerY !== null ? (
            <circle
              cx={melodiaNowLineX}
              cy={liveNoteMarkerY}
              r={5}
              fill={getVozSampleColor(markerCents ?? 0, markerAccuracy, calibre)}
              stroke="var(--bg-card)"
              strokeWidth={2}
            />
          ) : null}
        </svg>
        </div>
        {!isMelodia || showLiveNoteRail ? (
          <ChartLiveNoteRail
            detection={detection}
            accuracy={accuracy}
            cents={cents}
            calibre={calibre}
            voiceRms={voiceRms}
          />
        ) : null}
      </div>

    </div>
  );
}

type RitmoBeatSegment = {
  startMs: number;
  endMs: number;
  phase: VozRitmoPhase;
  level: MetronomeBeatLevel;
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
  playbackOriginMs: number | null = null,
): RitmoBeatSegment[] {
  const windowStart = now - totalSpanMs * pastRatio;
  const windowEnd = windowStart + totalSpanMs;
  const activePattern = getActivePatternSlice(pattern, patternLength);

  const rawSegments =
    playbackOriginMs !== null
      ? getBeatTimelineSegmentsFromOrigin(
          playbackOriginMs,
          0,
          bpm,
          beatDurations,
          patternLength,
          windowStart,
          windowEnd,
        )
      : getBeatTimelineSegmentsInWindow(
          beatMarkers,
          bpm,
          beatDurations,
          patternLength,
          windowStart,
          windowEnd,
        );

  return rawSegments.map((segment) => {
    const cycle = activePattern.length || 1;
    const position = ((segment.beatIndex % cycle) + cycle) % cycle;
    const level = activePattern[position] ?? "silencio";

    return {
      startMs: segment.startMs,
      endMs: segment.endMs,
      phase: beatLevelToPhase(level),
      level,
    };
  });
}

function VozRitmoTimeline({
  beatMarkers,
  bpm,
  beatPattern,
  patternLength,
  beatDurations,
  isPlaying,
  voiceSamples,
  layout = "mobile",
}: {
  beatMarkers: VozRitmoBeatMarker[];
  bpm: number;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  isPlaying: boolean;
  voiceSamples: VozRitmoVoiceSample[];
  layout?: VozPracticeLayout;
}) {
  const now = useTimelineNow(
    isPlaying || beatMarkers.length > 0,
    isPlaying,
  );
  const totalSpanMs = getRitmoTimelineWindowMs(bpm, patternLength, beatDurations);
  const nowLinePercent = getRitmoNowLinePercent();
  const playbackOriginMs = isPlaying ? getPlaybackStartMs() : null;
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
        playbackOriginMs,
      ),
    [
      beatMarkers,
      now,
      bpm,
      beatPattern,
      patternLength,
      beatDurations,
      totalSpanMs,
      playbackOriginMs,
    ],
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
    <div className="overflow-hidden rounded-[12px] border border-border bg-bg-card">
      <div
        className={
          layout === "desktop"
            ? "flex gap-2 px-2 py-2"
            : "flex gap-2 px-2 pb-3 pt-4"
        }
      >
        <div className="flex w-14 shrink-0 flex-col justify-end gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
            Ritmo
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
            Vos
          </span>
        </div>

        <div className="relative min-w-0 flex-1">
          <div
            className="pointer-events-none absolute inset-y-0 z-20 w-px bg-text-primary"
            style={{ left: `${nowLinePercent}%` }}
            aria-hidden="true"
          />

          <div
            className="relative"
            style={{
              height: `${
                layout === "desktop"
                  ? Math.round(RITMO_TIMELINE_PATTERN_ROW_PX * 0.8)
                  : RITMO_TIMELINE_PATTERN_ROW_PX
              }px`,
            }}
          >
            {beatSegments.map((segment, index) => {
              if (segment.level === "silencio") {
                return null;
              }

              const left = timeToPercent(segment.startMs);
              const right = timeToPercent(segment.endMs);
              const width = Math.max(right - left - 0.35, 0.6);
              const isActive =
                segment.startMs <= now && now < segment.endMs;
              const barAppearance = getBeatLevelBarAppearance(segment.level);
              const barHeightPx = getRitmoCycleVolumeBarHeightPx(
                segment.level,
                RITMO_TIMELINE_VOLUME_BAR_SCALE,
              );

              return (
                <span
                  key={`ritmo-seg-${segment.startMs}-${index}`}
                  className="absolute bottom-0 rounded-full"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    height: `${barHeightPx}px`,
                    backgroundColor: barAppearance.backgroundColor,
                    border: barAppearance.border,
                    opacity: isActive ? 1 : 0.55,
                  }}
                  title={getPhaseLabel(segment.phase)}
                />
              );
            })}
          </div>

          <div className="relative mt-1 h-5">
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
      </div>
    </div>
  );
}

function VozComboPractice({
  ritmoPlaying,
  onToggleRitmoPlaying,
  ritmoMicActive,
  onToggleRitmoMic,
  micStarting,
  beatMarkers,
  ritmoBpm,
  ritmoBeatPattern,
  ritmoPatternLength,
  ritmoBeatDurations,
  comboNotePattern,
  historySamples,
  detection,
  targetNote,
  targetOctave,
  cents,
  accuracy,
  holdCalibre,
  voiceRms = 0,
  hideMic = false,
  layout = "mobile",
}: {
  ritmoPlaying: boolean;
  onToggleRitmoPlaying: () => void;
  ritmoMicActive: boolean;
  onToggleRitmoMic: () => void;
  micStarting: boolean;
  beatMarkers: VozRitmoBeatMarker[];
  ritmoBpm: number;
  ritmoBeatPattern: MetronomeBeatPattern;
  ritmoPatternLength: number;
  ritmoBeatDurations: MetronomeBeatDurationPattern;
  comboNotePattern: VozNotaPattern;
  historySamples: VozHistorySample[];
  detection: NoteDetection | null;
  targetNote: string;
  targetOctave: number;
  cents: number;
  accuracy: VozAccuracy;
  holdCalibre?: VozCalibre;
  voiceRms?: number;
  hideMic?: boolean;
  layout?: VozPracticeLayout;
}) {
  return (
    <>
      {hideMic ? null : (
        <VozPracticeMicRow
          isActive={ritmoMicActive}
          onToggle={onToggleRitmoMic}
          disabled={micStarting}
        />
      )}

      <PitchHistoryChart
        samples={historySamples}
        active={ritmoPlaying}
        mode="melodia"
        targetNote={targetNote}
        targetOctave={targetOctave}
        detection={detection}
        accuracy={accuracy}
        cents={cents}
        calibre={holdCalibre}
        beatMarkers={beatMarkers}
        bpm={ritmoBpm}
        beatDurations={ritmoBeatDurations}
        patternLength={ritmoPatternLength}
        notePattern={comboNotePattern}
        beatPattern={ritmoBeatPattern}
        playbackSynced={ritmoPlaying}
        showLiveNoteRail
        voiceRms={voiceRms}
        layout={layout}
      />

      <VozRitmoPlayControl
        isPlaying={ritmoPlaying}
        onToggle={onToggleRitmoPlaying}
      />
    </>
  );
}

function VozPracticeMicRow({
  isActive,
  onToggle,
  disabled = false,
  variant = "center",
}: {
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
  variant?: "center" | "header";
}) {
  return (
    <div
      className={
        variant === "header"
          ? "relative z-20 flex shrink-0 items-center justify-end overflow-visible"
          : "relative z-20 flex items-center justify-center overflow-visible py-1"
      }
    >
      <MicToggleButton
        size="sm"
        isActive={isActive}
        onClick={onToggle}
        disabled={disabled}
        inactiveAriaLabel="Activar micrófono"
        activeAriaLabel="Desactivar micrófono"
      />
    </div>
  );
}

function VozChartPlayControl({
  onClick,
  isPlaying = false,
  playOnly = false,
  playAriaLabel = "Escuchar la referencia",
  stopAriaLabel = "Detener",
}: {
  onClick: () => void;
  isPlaying?: boolean;
  playOnly?: boolean;
  playAriaLabel?: string;
  stopAriaLabel?: string;
}) {
  return (
    <div className="mt-1.5 flex items-center justify-end gap-1.5">
      <span className="text-[10px] font-semibold text-text-secondary">
        Escuchar la referencia
      </span>
      <PlayCircleButton
        size="xs"
        playOnly={playOnly}
        isPlaying={isPlaying}
        onClick={onClick}
        playAriaLabel={playAriaLabel}
        stopAriaLabel={stopAriaLabel}
      />
    </div>
  );
}

function VozRitmoPlayControl({
  isPlaying,
  onToggle,
}: {
  isPlaying: boolean;
  onToggle: () => void;
}) {
  return (
    <VozChartPlayControl
      isPlaying={isPlaying}
      onClick={onToggle}
      playAriaLabel="Iniciar ritmo"
      stopAriaLabel="Detener ritmo"
    />
  );
}

function VozMelodiaPlayControl({
  isPlaying,
  onToggle,
}: {
  isPlaying: boolean;
  onToggle: () => void;
}) {
  return (
    <VozChartPlayControl
      isPlaying={isPlaying}
      onClick={onToggle}
      playAriaLabel="Iniciar melodía"
      stopAriaLabel="Detener melodía"
    />
  );
}

function VozTonePracticePlayControl({
  practiceActive,
  onTogglePractice,
  micStarting,
  variant = "center",
}: {
  practiceActive: boolean;
  onTogglePractice: () => void;
  micStarting: boolean;
  variant?: "center" | "header";
}) {
  return (
    <VozPracticeMicRow
      variant={variant}
      isActive={practiceActive}
      onToggle={onTogglePractice}
      disabled={micStarting}
    />
  );
}

function VozRitmoPractice({
  ritmoPlaying,
  onToggleRitmoPlaying,
  ritmoMicActive,
  onToggleRitmoMic,
  micStarting,
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
  targetNote,
  targetOctave,
  cents,
  accuracy,
  historySamples,
  holdCalibre,
  voiceRms = 0,
  hideMic = false,
  layout = "mobile",
}: {
  ritmoPlaying: boolean;
  onToggleRitmoPlaying: () => void;
  ritmoMicActive: boolean;
  onToggleRitmoMic: () => void;
  micStarting: boolean;
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
  targetNote: string;
  targetOctave: number;
  cents: number;
  accuracy: VozAccuracy;
  historySamples: VozHistorySample[];
  holdCalibre?: VozCalibre;
  voiceRms?: number;
  hideMic?: boolean;
  layout?: VozPracticeLayout;
}) {
  return (
    <>
      {hideMic ? null : (
        <VozPracticeMicRow
          isActive={ritmoMicActive}
          onToggle={onToggleRitmoMic}
          disabled={micStarting}
        />
      )}

      <VozRitmoTimeline
        beatMarkers={beatMarkers}
        bpm={ritmoBpm}
        beatPattern={ritmoBeatPattern}
        patternLength={ritmoPatternLength}
        beatDurations={ritmoBeatDurations}
        isPlaying={ritmoPlaying}
        voiceSamples={voiceSamples}
        layout={layout}
      />

      <VozRitmoPlayControl
        isPlaying={ritmoPlaying}
        onToggle={onToggleRitmoPlaying}
      />

      {evaluateTone ? (
        <>
          <DetectedNoteDisplay
            detection={detection}
            objectiveLabel={objectiveLabel}
            targetFrequency={targetFrequency}
          />
          <PitchLadderBar
            targetNote={targetNote}
            cents={cents}
            accuracy={accuracy}
            detectedNote={detection?.note ?? null}
            voiceRms={voiceRms}
            layout={layout}
          />
          <PitchHistoryChart
            samples={historySamples}
            active={ritmoPlaying}
            mode="sostener"
            targetNote={targetNote}
            targetOctave={targetOctave}
            detection={detection}
            accuracy={accuracy}
            cents={cents}
            liveChartCents={
              accuracy !== "silencio" && hasAudiblePitchVolume(voiceRms)
                ? cents
                : null
            }
            calibre={holdCalibre}
            voiceRms={voiceRms}
            showLiveNoteRail
            layout={layout}
          />
        </>
      ) : null}
    </>
  );
}

function VozMelodiaPractice({
  melodiaPlaying,
  onToggleMelodiaPlaying,
  melodiaMicActive,
  onToggleMelodiaMic,
  micStarting,
  beatMarkers,
  melodiaBpm,
  melodiaPatternLength,
  melodiaBeatDuration,
  melodiaNotePattern,
  targetNote,
  targetOctave,
  historySamples,
  holdCalibre,
  hideMic = false,
  layout = "mobile",
}: {
  melodiaPlaying: boolean;
  onToggleMelodiaPlaying: () => void;
  melodiaMicActive: boolean;
  onToggleMelodiaMic: () => void;
  micStarting: boolean;
  beatMarkers: VozRitmoBeatMarker[];
  melodiaBpm: number;
  melodiaPatternLength: number;
  melodiaBeatDuration: MetronomeBeatDuration;
  melodiaNotePattern: VozNotaPattern;
  targetNote: string;
  targetOctave: number;
  historySamples: VozHistorySample[];
  holdCalibre: VozCalibre;
  hideMic?: boolean;
  layout?: VozPracticeLayout;
}) {
  const melodiaBeatDurations = useMemo(
    () => buildMelodiaCompasState(melodiaPatternLength, melodiaBeatDuration).beatDurations,
    [melodiaPatternLength, melodiaBeatDuration],
  );

  function handleToggleMelodiaPlaying() {
    triggerHaptic();
    onToggleMelodiaPlaying();
  }

  return (
    <>
      {hideMic ? null : (
        <VozPracticeMicRow
          isActive={melodiaMicActive}
          onToggle={onToggleMelodiaMic}
          disabled={micStarting}
        />
      )}

      <PitchHistoryChart
        samples={historySamples}
        active={melodiaPlaying}
        mode="melodia"
        targetNote={targetNote}
        targetOctave={targetOctave}
        detection={null}
        accuracy="silencio"
        cents={0}
        calibre={holdCalibre}
        beatMarkers={beatMarkers}
        bpm={melodiaBpm}
        beatDurations={melodiaBeatDurations}
        patternLength={melodiaPatternLength}
        notePattern={melodiaNotePattern}
        layout={layout}
      />

      <VozMelodiaPlayControl
        isPlaying={melodiaPlaying}
        onToggle={handleToggleMelodiaPlaying}
      />
    </>
  );
}

type OctavasRunPhase = "idle" | "first" | "pause" | "second" | "done";

function octavasProgressToX(
  overallProgress: number,
  chartWidth = OCTAVAS_CHART_WIDTH,
): number {
  const plotWidth = chartWidth - OCTAVAS_CHART_PADDING * 2;
  const clamped = Math.max(0, Math.min(1, overallProgress));

  return OCTAVAS_CHART_PADDING + clamped * plotWidth;
}

function flushOctavasPathSegment(
  current: VozOctavasChartSample[],
  segments: Array<{ path: string; color: string }>,
  sampleToPoint: (sample: VozOctavasChartSample) => { x: number; y: number },
): void {
  if (current.length < 2) {
    return;
  }

  segments.push({
    path: current
      .map((point, index) => {
        const { x, y } = sampleToPoint(point);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" "),
    color: getVozAccuracyColor(
      current[current.length - 1]!.accuracy,
      current[current.length - 1]!.cents,
    ),
  });
}

function buildOctavasSegmentPaths(
  samples: VozOctavasChartSample[],
  noteDurationMs: number,
  pauseMs: number,
): Array<{ path: string; color: string }> {
  const segments: Array<{ path: string; color: string }> = [];
  let current: VozOctavasChartSample[] = [];

  const sampleToPoint = (sample: VozOctavasChartSample) => {
    const overallProgress = getOctavasOverallProgress(
      sample.phase,
      sample.progress * noteDurationMs,
      noteDurationMs,
      pauseMs,
    );
    const targetY =
      sample.phase === "first"
        ? getOctavasLowerTargetY()
        : getOctavasUpperTargetY();
    const x = octavasProgressToX(overallProgress);
    const y = octavasCentsToChartY(
      sample.cents,
      targetY,
      OCTAVAS_CENTS_PER_PIXEL,
    );

    return { x, y };
  };

  for (const sample of samples) {
    if (sample.accuracy === "silencio") {
      flushOctavasPathSegment(current, segments, sampleToPoint);
      current = [];
      continue;
    }

    const previous = current[current.length - 1];

    if (
      previous &&
      (previous.phase !== sample.phase ||
        sample.progress + 0.04 < previous.progress)
    ) {
      flushOctavasPathSegment(current, segments, sampleToPoint);
      current = [];
    }

    current.push(sample);
  }

  flushOctavasPathSegment(current, segments, sampleToPoint);

  return segments;
}

function OctavasPitchChart({
  target,
  noteDurationSeconds,
  samples,
  runPhase,
  sequenceProgress,
  layout = "mobile",
}: {
  target: VozTarget;
  noteDurationSeconds: number;
  samples: VozOctavasChartSample[];
  runPhase: OctavasRunPhase;
  sequenceProgress: number;
  layout?: VozPracticeLayout;
}) {
  const noteDurationMs = noteDurationSeconds * 1000;
  const pauseMs = VOZ_OCTAVAS_PAUSE_MS;
  const totalMs = noteDurationMs * 2 + pauseMs;
  const plotWidth = OCTAVAS_CHART_WIDTH - OCTAVAS_CHART_PADDING * 2;
  const plotRight = OCTAVAS_CHART_PADDING + plotWidth;
  const lowerTargetY = getOctavasLowerTargetY();
  const upperTargetY = getOctavasUpperTargetY();
  const note1EndX =
    OCTAVAS_CHART_PADDING + (noteDurationMs / totalMs) * plotWidth;
  const pauseEndX =
    OCTAVAS_CHART_PADDING +
    ((noteDurationMs + pauseMs) / totalMs) * plotWidth;
  const secondTarget = getOctaveUpTarget(target);
  const firstLabel = formatTargetLabel(target);
  const secondLabel = secondTarget
    ? formatTargetLabel(secondTarget)
    : "—";
  const segments = buildOctavasSegmentPaths(samples, noteDurationMs, pauseMs);
  const active = runPhase !== "idle" && runPhase !== "done";
  const progressPercent = active
    ? Math.max(0, Math.min(100, sequenceProgress * 100))
    : runPhase === "done"
      ? 100
      : 0;
  const note1Percent = (noteDurationMs / totalMs) * 100;
  const pausePercent = (pauseMs / totalMs) * 100;
  const note2Percent = 100 - note1Percent - pausePercent;

  return (
    <div className="w-full overflow-hidden rounded-[12px] border border-border bg-bg-card">
      <div className="flex border-b border-border/60 bg-bg-dark/45">
        <div
          className="flex min-w-0 items-center justify-center border-r border-border/40 px-1 py-2"
          style={{ width: `${note1Percent}%` }}
        >
          <span className="truncate text-base font-extrabold leading-none text-voz-config">
            {firstLabel}
          </span>
        </div>
        <div
          className="flex min-w-0 items-center justify-center border-r border-border/40 px-0.5 py-2"
          style={{ width: `${pausePercent}%` }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wide text-text-muted">
            Pausa
          </span>
        </div>
        <div
          className="flex min-w-0 items-center justify-center px-1 py-2"
          style={{ width: `${note2Percent}%` }}
        >
          <span className="truncate text-base font-extrabold leading-none text-voz-config">
            {secondLabel}
          </span>
        </div>
      </div>

      <div
        className="relative w-full"
        style={
          layout === "desktop"
            ? { height: `${CHART_PC_HEIGHT_OCTAVAS}px` }
            : { aspectRatio: `${OCTAVAS_CHART_WIDTH} / ${OCTAVAS_CHART_HEIGHT}` }
        }
      >
        <svg
          viewBox={`0 0 ${OCTAVAS_CHART_WIDTH} ${OCTAVAS_CHART_HEIGHT}`}
          className="block h-full w-full"
          role="img"
          aria-label="Gráfico de afinación en octavas"
        >
          <rect
            x={OCTAVAS_CHART_PADDING}
            y={OCTAVAS_CHART_PADDING}
            width={note1EndX - OCTAVAS_CHART_PADDING - 2}
            height={OCTAVAS_CHART_HEIGHT - OCTAVAS_CHART_PADDING * 2}
            fill="color-mix(in srgb, var(--voz-config) 6%, transparent)"
            rx={6}
          />
          <rect
            x={note1EndX + 2}
            y={OCTAVAS_CHART_PADDING}
            width={pauseEndX - note1EndX - 4}
            height={OCTAVAS_CHART_HEIGHT - OCTAVAS_CHART_PADDING * 2}
            fill="color-mix(in srgb, var(--bg-cola-aviso) 12%, transparent)"
            rx={4}
          />
          <rect
            x={pauseEndX + 2}
            y={OCTAVAS_CHART_PADDING}
            width={plotRight - pauseEndX - 2}
            height={OCTAVAS_CHART_HEIGHT - OCTAVAS_CHART_PADDING * 2}
            fill="color-mix(in srgb, var(--voz-config) 10%, transparent)"
            rx={6}
          />

          <line
            x1={OCTAVAS_CHART_PADDING}
            y1={lowerTargetY}
            x2={note1EndX - 2}
            y2={lowerTargetY}
            stroke="var(--tuner-in-tune)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            opacity={0.85}
          />
          <line
            x1={pauseEndX + 2}
            y1={upperTargetY}
            x2={plotRight}
            y2={upperTargetY}
            stroke="var(--tuner-in-tune)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            opacity={0.85}
          />

          <line
            x1={note1EndX}
            y1={OCTAVAS_CHART_PADDING}
            x2={note1EndX}
            y2={OCTAVAS_CHART_HEIGHT - OCTAVAS_CHART_PADDING}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.7}
          />
          <line
            x1={pauseEndX}
            y1={OCTAVAS_CHART_PADDING}
            x2={pauseEndX}
            y2={OCTAVAS_CHART_HEIGHT - OCTAVAS_CHART_PADDING}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.7}
          />

          {segments.map((segment, index) => (
            <path
              key={`seg-${index}`}
              d={segment.path}
              fill="none"
              stroke={segment.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </div>

      <div className="px-2.5 pb-2.5 pt-1">
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-bg-dark"
          role="progressbar"
          aria-valuenow={Math.round(progressPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avance de la secuencia"
        >
          <div
            className="h-full rounded-full bg-voz-config"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function VozOctavasPractice({
  baseTarget,
  pitchMode,
  scaleRepetitions,
  noteDurationSeconds,
  detection,
  practiceActive,
  voiceRms = 0,
  layout = "mobile",
}: {
  baseTarget: VozTarget;
  pitchMode: VozOctavasPitchMode;
  scaleRepetitions: number;
  noteDurationSeconds: number;
  detection: NoteDetection | null;
  practiceActive: boolean;
  voiceRms?: number;
  layout?: VozPracticeLayout;
}) {
  const [runPhase, setRunPhase] = useState<OctavasRunPhase>("idle");
  const [samples, setSamples] = useState<VozOctavasChartSample[]>([]);
  const [sequenceProgress, setSequenceProgress] = useState(0);
  const [scaleStepIndex, setScaleStepIndex] = useState(0);
  const runPhaseRef = useRef(runPhase);
  const phaseStartedAtRef = useRef(0);
  const lastSampleAtRef = useRef(0);
  const smoothedChartCentsRef = useRef<number | null>(null);
  const detectionRef = useRef(detection);

  runPhaseRef.current = runPhase;
  detectionRef.current = detection;

  const practiceTarget = useMemo(() => {
    if (pitchMode === "same") {
      return baseTarget;
    }

    return getOctavasScaleTarget(baseTarget, scaleStepIndex) ?? baseTarget;
  }, [baseTarget, pitchMode, scaleStepIndex]);

  const noteDurationMs = noteDurationSeconds * 1000;
  const pauseMs = VOZ_OCTAVAS_PAUSE_MS;

  const resetAttempt = useCallback(() => {
    runPhaseRef.current = "idle";
    setRunPhase("idle");
    setSamples([]);
    setSequenceProgress(0);
    phaseStartedAtRef.current = 0;
    lastSampleAtRef.current = 0;
    smoothedChartCentsRef.current = null;
  }, []);

  const resetScaleProgress = useCallback(() => {
    setScaleStepIndex(0);
  }, []);

  const repetitionsAtStepRef = useRef(0);

  const handleCycleComplete = useCallback(() => {
    if (pitchMode === "scale") {
      repetitionsAtStepRef.current += 1;

      if (repetitionsAtStepRef.current >= scaleRepetitions) {
        repetitionsAtStepRef.current = 0;
        setScaleStepIndex((currentStep) => {
          const nextStep = currentStep + 1;
          return getOctavasScaleTarget(baseTarget, nextStep) ? nextStep : currentStep;
        });
      }
    }

    resetAttempt();
    runPhaseRef.current = "first";
    setRunPhase("first");
    phaseStartedAtRef.current = performance.now();
  }, [baseTarget, pitchMode, resetAttempt, scaleRepetitions]);

  useEffect(() => {
    repetitionsAtStepRef.current = 0;
    resetScaleProgress();
    resetAttempt();
  }, [
    baseTarget.note,
    baseTarget.octave,
    pitchMode,
    scaleRepetitions,
    noteDurationSeconds,
    resetAttempt,
    resetScaleProgress,
  ]);

  useEffect(() => {
    if (!practiceActive) {
      resetAttempt();
    }
  }, [practiceActive, resetAttempt]);

  useEffect(() => {
    if (!practiceActive) {
      return;
    }

    if (runPhase === "idle" && detection) {
      runPhaseRef.current = "first";
      setRunPhase("first");
      phaseStartedAtRef.current = performance.now();
    }

    if (runPhase === "done" && detection) {
      handleCycleComplete();
    }
  }, [practiceActive, detection, runPhase, handleCycleComplete]);

  useEffect(() => {
    if (!practiceActive) {
      return;
    }

    const phase = runPhaseRef.current;

    if (phase !== "first" && phase !== "second") {
      return;
    }

    if (detection) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const currentPhase = runPhaseRef.current;

      if (
        (currentPhase === "first" || currentPhase === "second") &&
        detectionRef.current === null
      ) {
        resetAttempt();
      }
    }, VOZ_OCTAVAS_SILENCE_RESET_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [practiceActive, detection, runPhase, resetAttempt]);

  useEffect(() => {
    if (!practiceActive || runPhase === "idle" || runPhase === "done") {
      return;
    }

    let animationFrame = 0;

    const tick = () => {
      const phase = runPhaseRef.current;
      const now = performance.now();
      const elapsed = now - phaseStartedAtRef.current;

      setSequenceProgress(
        getOctavasOverallProgress(phase, elapsed, noteDurationMs, pauseMs),
      );

      if (phase === "first" && elapsed >= noteDurationMs) {
        runPhaseRef.current = "pause";
        setRunPhase("pause");
        phaseStartedAtRef.current = now;
      } else if (phase === "pause" && elapsed >= pauseMs) {
        runPhaseRef.current = "second";
        setRunPhase("second");
        phaseStartedAtRef.current = now;
      } else if (phase === "second" && elapsed >= noteDurationMs) {
        runPhaseRef.current = "done";
        setRunPhase("done");
        setSequenceProgress(1);
      }

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [practiceActive, runPhase, noteDurationMs, pauseMs]);

  useEffect(() => {
    smoothedChartCentsRef.current = null;
  }, [runPhase]);

  useEffect(() => {
    if (!practiceActive || (runPhase !== "first" && runPhase !== "second")) {
      return;
    }

    const now = performance.now();
    const elapsed = now - phaseStartedAtRef.current;
    const progress = Math.min(1, elapsed / noteDurationMs);
    const referenceFrequency =
      runPhase === "first"
        ? targetToFrequency(practiceTarget)
        : getOctaveUpFrequency(practiceTarget);

    if (now - lastSampleAtRef.current < VOZ_OCTAVAS_SAMPLE_INTERVAL_MS) {
      return;
    }

    lastSampleAtRef.current = now;

    const hasAudibleVoice =
      detection !== null && hasAudiblePitchVolume(voiceRms);

    if (!hasAudibleVoice) {
      smoothedChartCentsRef.current = null;
      setSamples((previous) => {
        const last = previous[previous.length - 1];

        if (
          last &&
          last.phase === runPhase &&
          last.accuracy === "silencio" &&
          progress + 0.04 < last.progress
        ) {
          return previous;
        }

        return [
          ...previous,
          {
            phase: runPhase,
            progress,
            cents: 0,
            accuracy: "silencio",
          },
        ];
      });
      return;
    }

    const rawCents = getCentsFromTargetWithOctaveFold(
      detection.frequency,
      referenceFrequency,
    );
    const cents = smoothChartCents(smoothedChartCentsRef.current, rawCents);
    smoothedChartCentsRef.current = cents;
    const accuracy = getVozAccuracy(cents, true);

    setSamples((previous) => {
      const last = previous[previous.length - 1];

      if (
        last &&
        last.phase === runPhase &&
        progress + 0.04 < last.progress
      ) {
        return previous;
      }

      return [
        ...previous,
        {
          phase: runPhase,
          progress,
          cents,
          accuracy,
        },
      ];
    });
  }, [practiceActive, detection, noteDurationMs, practiceTarget, runPhase, voiceRms]);

  function handlePlayReference() {
    triggerHaptic();
    playOctaveReference(practiceTarget, noteDurationSeconds);
    resetAttempt();
  }

  return (
    <>
      <OctavasPitchChart
        target={practiceTarget}
        noteDurationSeconds={noteDurationSeconds}
        samples={samples}
        runPhase={runPhase}
        sequenceProgress={sequenceProgress}
        layout={layout}
      />

      <VozChartPlayControl
        playOnly
        onClick={handlePlayReference}
        playAriaLabel="Escuchar nota y octava"
      />
    </>
  );
}

function getIntensidadBeatSegments(
  beatMarkers: VozRitmoBeatMarker[],
  now: number,
  bpm: number,
  pattern: MetronomeBeatPattern,
  patternLength: number,
  beatDurations: MetronomeBeatDurationPattern,
  totalSpanMs: number,
  pastRatio: number,
  playbackOriginMs: number | null = null,
): Array<{ startMs: number; endMs: number; level: MetronomeBeatLevel }> {
  const windowStart = now - totalSpanMs * pastRatio;
  const windowEnd = windowStart + totalSpanMs;
  const activePattern = getActivePatternSlice(pattern, patternLength);

  const rawSegments =
    playbackOriginMs !== null
      ? getBeatTimelineSegmentsFromOrigin(
          playbackOriginMs,
          0,
          bpm,
          beatDurations,
          patternLength,
          windowStart,
          windowEnd,
        )
      : getBeatTimelineSegmentsInWindow(
          beatMarkers,
          bpm,
          beatDurations,
          patternLength,
          windowStart,
          windowEnd,
        );

  return rawSegments.map((segment) => {
    const cycle = activePattern.length || 1;
    const position = ((segment.beatIndex % cycle) + cycle) % cycle;

    return {
      startMs: segment.startMs,
      endMs: segment.endMs,
      level: activePattern[position] ?? "silencio",
    };
  });
}

function VozIntensidadTimeline({
  beatMarkers,
  bpm,
  ritmoBeatPattern,
  patternLength,
  ritmoBeatDurations,
  isPlaying,
  voiceSamples,
  layout = "mobile",
}: {
  beatMarkers: VozRitmoBeatMarker[];
  bpm: number;
  ritmoBeatPattern: MetronomeBeatPattern;
  patternLength: number;
  ritmoBeatDurations: MetronomeBeatDurationPattern;
  isPlaying: boolean;
  voiceSamples: VozIntensidadVoiceSample[];
  layout?: VozPracticeLayout;
}) {
  const now = useTimelineNow(
    isPlaying || beatMarkers.length > 0,
    isPlaying,
  );
  const totalSpanMs = getRitmoTimelineWindowMs(
    bpm,
    patternLength,
    ritmoBeatDurations,
  );
  const nowLinePercent = getRitmoNowLinePercent();
  const playbackOriginMs = isPlaying ? getPlaybackStartMs() : null;
  const beatSegments = useMemo(
    () =>
      getIntensidadBeatSegments(
        beatMarkers,
        now,
        bpm,
        ritmoBeatPattern,
        patternLength,
        ritmoBeatDurations,
        totalSpanMs,
        VOZ_RITMO_TIMELINE_PAST_RATIO,
        playbackOriginMs,
      ),
    [
      beatMarkers,
      now,
      bpm,
      ritmoBeatPattern,
      patternLength,
      ritmoBeatDurations,
      totalSpanMs,
      playbackOriginMs,
    ],
  );

  const timeToPercent = (timeMs: number) =>
    ritmoTimeToPercent(
      timeMs,
      now,
      totalSpanMs,
      VOZ_RITMO_TIMELINE_PAST_RATIO,
    );

  const visibleVoiceSamples = voiceSamples.filter((sample) => {
    const windowStart = now - totalSpanMs * VOZ_RITMO_TIMELINE_PAST_RATIO;
    return (
      sample.timestamp >= windowStart &&
      sample.timestamp <= windowStart + totalSpanMs
    );
  });

  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-bg-card">
      <div
        className={
          layout === "desktop"
            ? "flex gap-2 px-2 py-2"
            : "flex gap-2 px-2 pb-3 pt-4"
        }
      >
        <div className="flex w-14 shrink-0 flex-col justify-end gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
            Patrón
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
            Vos
          </span>
        </div>

        <div className="relative min-w-0 flex-1">
          <div
            className="pointer-events-none absolute inset-y-0 z-20 w-px bg-text-primary"
            style={{ left: `${nowLinePercent}%` }}
            aria-hidden="true"
          />

          <div
            className={`relative flex items-end gap-0.5 ${
              layout === "desktop" ? "h-8" : "h-10"
            }`}
          >
            {beatSegments.map((segment, index) => {
              const left = timeToPercent(segment.startMs);
              const right = timeToPercent(segment.endMs);
              const width = Math.max(right - left - 0.35, 0.6);
              const level = segment.level;
              const heightPercent = getBeatLevelBarHeightPercent(level);
              const isActive =
                segment.startMs <= now && now < segment.endMs;

              return (
                <span
                  key={`intensidad-pattern-${segment.startMs}-${index}`}
                  className="absolute bottom-0 rounded-full"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    height: `${Math.max(heightPercent * 0.35, level === "silencio" ? 8 : 14)}%`,
                    backgroundColor:
                      level === "silencio"
                        ? VOZ_RITMO_PRACTICE_SILENCE_COLOR
                        : VOZ_RITMO_PRACTICE_SOUND_COLOR,
                    opacity: isActive ? 0.95 : 0.55,
                  }}
                />
              );
            })}
          </div>

          <div className="relative mt-1 h-8">
            {visibleVoiceSamples.map((sample, index) => (
              <div
                key={`intensidad-voice-${sample.timestamp}-${index}`}
                className="absolute bottom-0 -translate-x-1/2"
                style={{
                  left: `${timeToPercent(sample.timestamp)}%`,
                  opacity: sample.timestamp > now ? 0.45 : 0.95,
                }}
              >
                <VolumeSegmentMeter
                  levelPercent={rmsToBarHeightPercent(sample.rms)}
                  segmentCount={4}
                  filledColor={getIntensidadComplianceColor(sample.compliance)}
                  emptyClassName="bg-border/35"
                  segmentClassName="h-[2px] w-[5px] rounded-full"
                  gapClassName="gap-[2px]"
                  ariaHidden
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VozIntensidadPractice({
  ritmoPlaying,
  onToggleRitmoPlaying,
  ritmoMicActive,
  onToggleRitmoMic,
  micStarting,
  beatMarkers,
  ritmoBpm,
  ritmoBeatPattern,
  ritmoPatternLength,
  ritmoBeatDurations,
  voiceSamples,
  voiceRms,
  hideMic = false,
  layout = "mobile",
}: {
  ritmoPlaying: boolean;
  onToggleRitmoPlaying: () => void;
  ritmoMicActive: boolean;
  onToggleRitmoMic: () => void;
  micStarting: boolean;
  beatMarkers: VozRitmoBeatMarker[];
  ritmoBpm: number;
  ritmoBeatPattern: MetronomeBeatPattern;
  ritmoPatternLength: number;
  ritmoBeatDurations: MetronomeBeatDurationPattern;
  voiceSamples: VozIntensidadVoiceSample[];
  voiceRms: number;
  hideMic?: boolean;
  layout?: VozPracticeLayout;
}) {
  const liveLevelPercent = rmsToBarHeightPercent(voiceRms);

  return (
    <>
      {hideMic ? null : (
        <VozPracticeMicRow
          isActive={ritmoMicActive}
          onToggle={onToggleRitmoMic}
          disabled={micStarting}
        />
      )}

      {ritmoMicActive ? (
        <div className="mb-1 flex items-end justify-center gap-2">
          <VolumeSegmentMeter levelPercent={liveLevelPercent} />
        </div>
      ) : null}

      <VozIntensidadTimeline
        beatMarkers={beatMarkers}
        bpm={ritmoBpm}
        ritmoBeatPattern={ritmoBeatPattern}
        patternLength={ritmoPatternLength}
        ritmoBeatDurations={ritmoBeatDurations}
        isPlaying={ritmoPlaying}
        voiceSamples={voiceSamples}
        layout={layout}
      />

      <VozRitmoPlayControl
        isPlaying={ritmoPlaying}
        onToggle={onToggleRitmoPlaying}
      />
    </>
  );
}

export type VozModeSlidesProps = {
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  onSetRitmoToneEvaluation: (mode: "none" | "fixed" | "perBeat") => void;
  onSetIntensidadEvaluation: (value: boolean) => void;
  effectiveTarget: VozTarget;
  targetPicker: TargetPickerProps;
  detection: NoteDetection | null;
  objectiveLabel: string;
  targetFrequency: number | null;
  targetNote: string;
  centsFromTarget: number;
  accuracy: VozAccuracy;
  feedbackLabel: string;
  instantAttempts: VozInstantAttempt[];
  historySamples: VozHistorySample[];
  holdHistorySamples: VozHistorySample[];
  holdTargetSeconds: number;
  onSetHoldTargetSeconds: (value: number) => void;
  holdCalibre: VozCalibre;
  onSetHoldCalibre: (value: VozCalibre) => void;
  octavasNoteDurationSeconds: number;
  onSetOctavasNoteDurationSeconds: (value: number) => void;
  octavasPitchMode: VozOctavasPitchMode;
  onSetOctavasPitchMode: (mode: VozOctavasPitchMode) => void;
  octavasScaleRepetitions: number;
  onSetOctavasScaleRepetitions: (value: number) => void;
  celebrationKey: number;
  tonePracticeActive: boolean;
  onToggleTonePractice: () => void;
  micStarting: boolean;
  ritmoPlaying: boolean;
  onToggleRitmoPlaying: () => void;
  ritmoMicActive: boolean;
  onToggleRitmoMic: () => void;
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
  intensidadVoiceSamples: VozIntensidadVoiceSample[];
  voiceRms: number;
  melodiaPlaying: boolean;
  onToggleMelodiaPlaying: () => void;
  melodiaMicActive: boolean;
  onToggleMelodiaMic: () => void;
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
  onDesktopHelpActionChange?: (action: ReactNode | null) => void;
};

export function VozModeSlides({
  activeIndex,
  onChangeIndex,
  onSetRitmoToneEvaluation,
  onSetIntensidadEvaluation,
  effectiveTarget,
  targetPicker,
  detection,
  objectiveLabel,
  targetFrequency,
  targetNote,
  centsFromTarget,
  accuracy,
  feedbackLabel,
  instantAttempts,
  historySamples,
  holdHistorySamples,
  holdTargetSeconds,
  onSetHoldTargetSeconds,
  holdCalibre,
  onSetHoldCalibre,
  octavasNoteDurationSeconds,
  onSetOctavasNoteDurationSeconds,
  octavasPitchMode,
  onSetOctavasPitchMode,
  octavasScaleRepetitions,
  onSetOctavasScaleRepetitions,
  celebrationKey,
  tonePracticeActive,
  onToggleTonePractice,
  micStarting,
  ritmoPlaying,
  onToggleRitmoPlaying,
  ritmoMicActive,
  onToggleRitmoMic,
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
  intensidadVoiceSamples,
  voiceRms,
  melodiaPlaying,
  onToggleMelodiaPlaying,
  melodiaMicActive,
  onToggleMelodiaMic,
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
  onDesktopHelpActionChange,
}: VozModeSlidesProps) {
  const isDesktop = useIsDesktop();
  const [encajarHelpOpen, setEncajarHelpOpen] = useState(false);
  const [sostenerHelpOpen, setSostenerHelpOpen] = useState(false);
  const [octavasHelpOpen, setOctavasHelpOpen] = useState(false);
  const [ritmoHelpOpen, setRitmoHelpOpen] = useState(false);
  const [intensidadHelpOpen, setIntensidadHelpOpen] = useState(false);
  const [melodiaHelpOpen, setMelodiaHelpOpen] = useState(false);
  const [ritmoNotaHelpOpen, setRitmoNotaHelpOpen] = useState(false);

  useEffect(() => {
    const slideId = VOZ_MODE_SLIDES[activeIndex]?.id;

    if (slideId === "combo") {
      onSetRitmoToneEvaluation("perBeat");
      onSetIntensidadEvaluation(false);
    } else if (slideId === "ritmo-nota") {
      onSetRitmoToneEvaluation("fixed");
      onSetIntensidadEvaluation(false);
    } else if (slideId === "ritmo-intensidad") {
      onSetRitmoToneEvaluation("none");
      onSetIntensidadEvaluation(true);
    } else {
      onSetRitmoToneEvaluation("none");
      onSetIntensidadEvaluation(false);
    }
  }, [activeIndex, onSetIntensidadEvaluation, onSetRitmoToneEvaluation]);

  const hasVoiceSignal =
    detection !== null && hasAudiblePitchVolume(voiceRms);
  const rawLiveCents = hasVoiceSignal ? centsFromTarget : null;
  const holdAccuracy = useMemo(
    () => getVozAccuracy(centsFromTarget, hasVoiceSignal, holdCalibre),
    [centsFromTarget, hasVoiceSignal, holdCalibre],
  );
  const holdCalibreLabel =
    VOZ_CALIBRE_OPTIONS.find((option) => option.id === holdCalibre)?.label ??
    holdCalibre;
  const targetLabel = formatTargetLabel(targetPicker.target);
  const sostenerConfigSummary = `${targetLabel} · ${holdCalibreLabel} · ${holdTargetSeconds} s`;
  const encajarConfigSummary = targetLabel;
  const octavasConfigSummary =
    octavasPitchMode === "scale"
      ? `${targetLabel} · Escala · ${octavasScaleRepetitions}× · ${octavasNoteDurationSeconds} s`
      : `${targetLabel} · ${octavasNoteDurationSeconds} s por nota`;
  const melodiaCompas = buildMelodiaCompasState(
    melodiaPatternLength,
    melodiaBeatDuration,
  );
  const melodiaConfigSummary = `${getNotaPatternSummary(
    melodiaNotePattern,
    melodiaPatternLength,
  )} · ${melodiaPatternLength} golpes · ${melodiaBpm} BPM`;
  const ritmoConfigSummary = `Ciclo de ${ritmoPatternLength} golpes · ${getBeatDurationPatternSummary(ritmoBeatDurations, ritmoPatternLength)} · ${ritmoBpm} BPM`;
  const ritmoNotaConfigSummary = `${targetLabel} · ${ritmoConfigSummary}`;
  const comboConfigSummary = `${getNotaPatternSummary(
    comboNotePattern,
    ritmoPatternLength,
  )} · ${ritmoConfigSummary}`;
  const practiceTargetNote = effectiveTarget.note;
  const practiceTargetOctave = effectiveTarget.octave;
  const practiceObjectiveLabel = formatTargetLabel(effectiveTarget);

  function renderActiveSlideHelpButton(slideId: VozModeSlideId) {
    switch (slideId) {
      case "encajar":
        return (
          <EncajarHelpButton onClick={() => setEncajarHelpOpen(true)} />
        );
      case "sostener":
        return (
          <SostenerHelpButton onClick={() => setSostenerHelpOpen(true)} />
        );
      case "octavas":
        return (
          <OctavasHelpButton onClick={() => setOctavasHelpOpen(true)} />
        );
      case "melodia":
        return (
          <MelodiaHelpButton onClick={() => setMelodiaHelpOpen(true)} />
        );
      case "ritmo":
        return <RitmoHelpButton onClick={() => setRitmoHelpOpen(true)} />;
      case "ritmo-intensidad":
        return (
          <IntensidadHelpButton onClick={() => setIntensidadHelpOpen(true)} />
        );
      case "ritmo-nota":
        return (
          <RitmoNotaHelpButton onClick={() => setRitmoNotaHelpOpen(true)} />
        );
      default:
        return null;
    }
  }

  const activeSlideId = VOZ_MODE_SLIDES[activeIndex]?.id ?? "encajar";

  useEffect(() => {
    if (!isDesktop || !onDesktopHelpActionChange) {
      onDesktopHelpActionChange?.(null);
      return;
    }

    onDesktopHelpActionChange(renderActiveSlideHelpButton(activeSlideId));
  }, [activeSlideId, isDesktop, onDesktopHelpActionChange]);

  function renderSlideContent(
    slideId: VozModeSlideId,
    layout: "mobile" | "desktop" = "mobile",
  ) {
    switch (slideId) {
      case "encajar": {
        const encajarPractice = splitPracticeMic(
          layout,
          <VozTonePracticePlayControl
            variant={layout === "desktop" ? "header" : "center"}
            practiceActive={tonePracticeActive}
            onTogglePractice={onToggleTonePractice}
            micStarting={micStarting}
          />,
          <>
            <PitchLadderBar
              targetNote={targetNote}
              cents={centsFromTarget}
              accuracy={accuracy}
              detectedNote={detection?.note ?? null}
              voiceRms={voiceRms}
              layout={layout}
            />
            <InstantAttemptsStrip attempts={instantAttempts} />
          </>,
        );

        return wrapModeSlide(
          layout,
          layout === "desktop" ? (
            <VozPcConfigCard title="Nota objetivo">
              {renderDesktopTargetPicker(targetPicker)}
            </VozPcConfigCard>
          ) : (
            <VozConfigSection
              collapsible
              collapsedSummary={encajarConfigSummary}
            >
              <TargetPicker {...targetPicker} collapsible={false} />
            </VozConfigSection>
          ),
          encajarPractice.practice,
          encajarPractice.practiceHeaderExtra,
        );
      }
      case "sostener": {
        const holdSecondsControl = (
          <ToolNumericStepper
            value={holdTargetSeconds}
            suffix="segundos"
            density={layout === "desktop" ? "compact" : "default"}
            decrementAriaLabel="Reducir segundos"
            incrementAriaLabel="Aumentar segundos"
            decrementDisabled={holdTargetSeconds <= VOZ_HOLD_TARGET_MIN}
            incrementDisabled={holdTargetSeconds >= VOZ_HOLD_TARGET_MAX}
            onDecrement={() =>
              onSetHoldTargetSeconds(
                clampHoldTargetSeconds(holdTargetSeconds - 1),
              )
            }
            onIncrement={() =>
              onSetHoldTargetSeconds(
                clampHoldTargetSeconds(holdTargetSeconds + 1),
              )
            }
          />
        );

        const sostenerPractice = splitPracticeMic(
          layout,
          <VozTonePracticePlayControl
            variant={layout === "desktop" ? "header" : "center"}
            practiceActive={tonePracticeActive}
            onTogglePractice={onToggleTonePractice}
            micStarting={micStarting}
          />,
          <>
            <PitchHistoryChart
              samples={holdHistorySamples}
              active
              mode="sostener"
              targetNote={targetNote}
              targetOctave={targetPicker.target.octave}
              detection={detection}
              accuracy={holdAccuracy}
              cents={rawLiveCents ?? 0}
              liveChartCents={rawLiveCents}
              calibre={holdCalibre}
              voiceRms={voiceRms}
              showLiveNoteRail
              layout={layout}
            />
            <HoldTimerPanel
              samples={holdHistorySamples}
              holdTargetSeconds={holdTargetSeconds}
              celebrationKey={celebrationKey}
              accuracy={holdAccuracy}
              cents={rawLiveCents ?? 0}
              calibre={holdCalibre}
              layout={layout}
            />
            <InstantAttemptsStrip attempts={instantAttempts} />
          </>,
        );

        return wrapModeSlide(
          layout,
          layout === "desktop" ? (
            <>
              <VozPcConfigCard title="Nota objetivo">
                {renderDesktopTargetPicker(targetPicker)}
              </VozPcConfigCard>
              <VozPcConfigCard title="Calibre">
                <VozCalibrePicker
                  embedded
                  calibre={holdCalibre}
                  onSetCalibre={onSetHoldCalibre}
                />
              </VozPcConfigCard>
              <VozPcConfigCard title="Meta tiempo a sostener">
                {holdSecondsControl}
              </VozPcConfigCard>
            </>
          ) : (
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
                <div className="mt-2">{holdSecondsControl}</div>
              </div>
            </VozConfigSection>
          ),
          sostenerPractice.practice,
          sostenerPractice.practiceHeaderExtra,
        );
      }
      case "octavas": {
        const octavasDurationControl = (
          <ToolNumericStepper
            value={octavasNoteDurationSeconds}
            suffix="segundos"
            density={layout === "desktop" ? "compact" : "default"}
            decrementAriaLabel="Reducir duración"
            incrementAriaLabel="Aumentar duración"
            decrementDisabled={
              octavasNoteDurationSeconds <= VOZ_OCTAVAS_NOTE_DURATION_MIN
            }
            incrementDisabled={
              octavasNoteDurationSeconds >= VOZ_OCTAVAS_NOTE_DURATION_MAX
            }
            onDecrement={() =>
              onSetOctavasNoteDurationSeconds(
                clampOctavasNoteDurationSeconds(octavasNoteDurationSeconds - 1),
              )
            }
            onIncrement={() =>
              onSetOctavasNoteDurationSeconds(
                clampOctavasNoteDurationSeconds(octavasNoteDurationSeconds + 1),
              )
            }
          />
        );

        const octavasPractice = splitPracticeMic(
          layout,
          <VozTonePracticePlayControl
            variant={layout === "desktop" ? "header" : "center"}
            practiceActive={tonePracticeActive}
            onTogglePractice={onToggleTonePractice}
            micStarting={micStarting}
          />,
          <>
            <VozOctavasPractice
              baseTarget={targetPicker.target}
              pitchMode={octavasPitchMode}
              scaleRepetitions={octavasScaleRepetitions}
              noteDurationSeconds={octavasNoteDurationSeconds}
              detection={detection}
              practiceActive={tonePracticeActive}
              voiceRms={voiceRms}
              layout={layout}
            />
            <InstantAttemptsStrip attempts={instantAttempts} />
          </>,
        );

        return wrapModeSlide(
          layout,
          layout === "desktop" ? (
            <>
              <VozPcConfigCard title="Nota objetivo">
                {renderDesktopTargetPicker(targetPicker)}
              </VozPcConfigCard>
              <VozPcConfigCard title="Qué decir">
                <OctavasQueDigaPicker
                  embedded
                  pitchMode={octavasPitchMode}
                  onSetPitchMode={onSetOctavasPitchMode}
                  scaleRepetitions={octavasScaleRepetitions}
                  onSetScaleRepetitions={onSetOctavasScaleRepetitions}
                />
              </VozPcConfigCard>
              <VozPcConfigCard title="Duración de cada nota">
                {octavasDurationControl}
              </VozPcConfigCard>
            </>
          ) : (
            <VozConfigSection
              collapsible
              collapsedSummary={octavasConfigSummary}
            >
              <TargetPicker {...targetPicker} collapsible={false} />
              <OctavasQueDigaPicker
                pitchMode={octavasPitchMode}
                onSetPitchMode={onSetOctavasPitchMode}
                scaleRepetitions={octavasScaleRepetitions}
                onSetScaleRepetitions={onSetOctavasScaleRepetitions}
              />
              <div className="rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-voz-config">
                  Duración de cada nota
                </p>
                <div className="mt-2">{octavasDurationControl}</div>
              </div>
            </VozConfigSection>
          ),
          octavasPractice.practice,
          octavasPractice.practiceHeaderExtra,
        );
      }
      case "melodia": {
        const melodiaPractice = splitPracticeMic(
          layout,
          renderPracticeMicControl(
            layout,
            melodiaMicActive,
            onToggleMelodiaMic,
            micStarting,
          ),
          <>
            <VozMelodiaPractice
              melodiaPlaying={melodiaPlaying}
              onToggleMelodiaPlaying={onToggleMelodiaPlaying}
              melodiaMicActive={melodiaMicActive}
              onToggleMelodiaMic={onToggleMelodiaMic}
              micStarting={micStarting}
              beatMarkers={beatMarkers}
              melodiaBpm={melodiaBpm}
              melodiaPatternLength={melodiaPatternLength}
              melodiaBeatDuration={melodiaBeatDuration}
              melodiaNotePattern={melodiaNotePattern}
              targetNote={practiceTargetNote}
              targetOctave={practiceTargetOctave}
              historySamples={historySamples}
              holdCalibre={holdCalibre}
              hideMic={layout === "desktop"}
              layout={layout}
            />
            <InstantAttemptsStrip attempts={instantAttempts} />
          </>,
        );

        return wrapModeSlide(
          layout,
          layout === "desktop" ? (
            <VozPcConfigCard>
              <VozMelodiaDesktopConfig
                patternLength={melodiaPatternLength}
                beatDuration={melodiaBeatDuration}
                bpm={melodiaBpm}
                isPlaying={melodiaPlaying}
                tapTempoTapCount={melodiaTapTempoTapCount}
                notePattern={melodiaNotePattern}
                onSetPatternLength={onSetMelodiaPatternLength}
                onSetBeatDuration={onSetMelodiaBeatDuration}
                onSetNoteAtSlot={onSetMelodiaNoteAtSlot}
                onSetBpm={onSetMelodiaBpm}
                onTapTempo={onTapMelodiaTempo}
              />
            </VozPcConfigCard>
          ) : (
            <MelodiaConfigSection
              collapsedSummary={melodiaConfigSummary}
              patternLength={melodiaPatternLength}
              beatDuration={melodiaBeatDuration}
              beatPattern={melodiaCompas.beatPattern}
              bpm={melodiaBpm}
              isPlaying={melodiaPlaying}
              tapTempoTapCount={melodiaTapTempoTapCount}
              vozNotaPatron={{
                pattern: melodiaNotePattern,
                onSetAtSlot: onSetMelodiaNoteAtSlot,
              }}
              onSetPatternLength={onSetMelodiaPatternLength}
              onSetBeatDuration={onSetMelodiaBeatDuration}
              onSetBpm={onSetMelodiaBpm}
              onTapTempo={onTapMelodiaTempo}
            />
          ),
          melodiaPractice.practice,
          melodiaPractice.practiceHeaderExtra,
        );
      }
      case "ritmo": {
        const ritmoPractice = splitPracticeMic(
          layout,
          renderPracticeMicControl(
            layout,
            ritmoMicActive,
            onToggleRitmoMic,
            micStarting,
          ),
          <>
            <VozRitmoPractice
              ritmoPlaying={ritmoPlaying}
              onToggleRitmoPlaying={onToggleRitmoPlaying}
              ritmoMicActive={ritmoMicActive}
              onToggleRitmoMic={onToggleRitmoMic}
              micStarting={micStarting}
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
              targetNote={practiceTargetNote}
              targetOctave={practiceTargetOctave}
              cents={centsFromTarget}
              accuracy={accuracy}
              historySamples={historySamples}
              voiceRms={voiceRms}
              hideMic={layout === "desktop"}
              layout={layout}
            />
            <InstantAttemptsStrip attempts={instantAttempts} />
          </>,
        );

        const ritmoDesktopTempo = {
          bpm: ritmoBpm,
          isPlaying: ritmoPlaying,
          tapTempoTapCount: ritmoTapTempoTapCount,
          disabled: ritmoPlaying,
          onSetBpm: onSetRitmoBpm,
          onTapTempo: onTapRitmoTempo,
        };

        return wrapModeSlide(
          layout,
          layout === "desktop" ? (
            renderRitmoDesktopCicloTempo({
              compas: {
                beatPattern: ritmoBeatPattern,
                patternLength: ritmoPatternLength,
                beatDurations: ritmoBeatDurations,
                hideCompasHelp: true,
                hideIntensidadTab: true,
                vozBeatSoundTab: true,
                patternLengthInputId: "voz-ritmo-pattern-length",
                onSetPatternLength: onSetRitmoPatternLength,
                onSetBeatDurationAtSlot: onSetRitmoBeatDurationAtSlot,
                onSetBeatLevelAtSlot: onSetRitmoBeatLevelAtSlot,
              },
              tempo: ritmoDesktopTempo,
            })
          ) : (
            <RitmoConfigSection
              compasLayout="flat"
              collapsedSummary={ritmoConfigSummary}
              hideCompasHelp
              hideIntensidadTab
              vozBeatSoundTab
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
          ),
          ritmoPractice.practice,
          ritmoPractice.practiceHeaderExtra,
        );
      }
      case "ritmo-intensidad": {
        const intensidadPractice = splitPracticeMic(
          layout,
          renderPracticeMicControl(
            layout,
            ritmoMicActive,
            onToggleRitmoMic,
            micStarting,
          ),
          <>
            <VozIntensidadPractice
              ritmoPlaying={ritmoPlaying}
              onToggleRitmoPlaying={onToggleRitmoPlaying}
              ritmoMicActive={ritmoMicActive}
              onToggleRitmoMic={onToggleRitmoMic}
              micStarting={micStarting}
              beatMarkers={beatMarkers}
              ritmoBpm={ritmoBpm}
              ritmoBeatPattern={ritmoBeatPattern}
              ritmoPatternLength={ritmoPatternLength}
              ritmoBeatDurations={ritmoBeatDurations}
              voiceSamples={intensidadVoiceSamples}
              voiceRms={voiceRms}
              hideMic={layout === "desktop"}
              layout={layout}
            />
            <InstantAttemptsStrip attempts={instantAttempts} />
          </>,
        );

        return wrapModeSlide(
          layout,
          layout === "desktop" ? (
            renderRitmoDesktopCicloTempo({
              compas: {
                beatPattern: ritmoBeatPattern,
                patternLength: ritmoPatternLength,
                beatDurations: ritmoBeatDurations,
                hideCompasHelp: true,
                patternLengthInputId: "voz-ritmo-intensidad-pattern-length",
                onSetPatternLength: onSetRitmoPatternLength,
                onSetBeatDurationAtSlot: onSetRitmoBeatDurationAtSlot,
                onSetBeatLevelAtSlot: onSetRitmoBeatLevelAtSlot,
              },
              tempo: {
                bpm: ritmoBpm,
                isPlaying: ritmoPlaying,
                tapTempoTapCount: ritmoTapTempoTapCount,
                disabled: ritmoPlaying,
                onSetBpm: onSetRitmoBpm,
                onTapTempo: onTapRitmoTempo,
              },
            })
          ) : (
            <RitmoConfigSection
              compasLayout="flat"
              collapsedSummary={ritmoConfigSummary}
              hideCompasHelp
              beatPattern={ritmoBeatPattern}
              patternLength={ritmoPatternLength}
              beatDurations={ritmoBeatDurations}
              bpm={ritmoBpm}
              isPlaying={ritmoPlaying}
              tapTempoTapCount={ritmoTapTempoTapCount}
              patternLengthInputId="voz-ritmo-intensidad-pattern-length"
              onSetPatternLength={onSetRitmoPatternLength}
              onSetBeatDurationAtSlot={onSetRitmoBeatDurationAtSlot}
              onSetBeatLevelAtSlot={onSetRitmoBeatLevelAtSlot}
              onSetBpm={onSetRitmoBpm}
              onTapTempo={onTapRitmoTempo}
            />
          ),
          intensidadPractice.practice,
          intensidadPractice.practiceHeaderExtra,
        );
      }
      case "ritmo-nota": {
        const ritmoNotaPractice = splitPracticeMic(
          layout,
          renderPracticeMicControl(
            layout,
            ritmoMicActive,
            onToggleRitmoMic,
            micStarting,
          ),
          <>
            <VozRitmoPractice
              ritmoPlaying={ritmoPlaying}
              onToggleRitmoPlaying={onToggleRitmoPlaying}
              ritmoMicActive={ritmoMicActive}
              onToggleRitmoMic={onToggleRitmoMic}
              micStarting={micStarting}
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
              targetNote={targetNote}
              targetOctave={targetPicker.target.octave}
              cents={centsFromTarget}
              accuracy={accuracy}
              historySamples={historySamples}
              holdCalibre={holdCalibre}
              voiceRms={voiceRms}
              hideMic={layout === "desktop"}
              layout={layout}
            />
            <InstantAttemptsStrip attempts={instantAttempts} />
          </>,
        );

        return wrapModeSlide(
          layout,
          layout === "desktop" ? (
            <>
              <VozPcConfigCard title="Nota objetivo">
                {renderDesktopTargetPicker(targetPicker)}
              </VozPcConfigCard>
              {renderRitmoDesktopCicloTempo({
                compas: {
                  beatPattern: ritmoBeatPattern,
                  patternLength: ritmoPatternLength,
                  beatDurations: ritmoBeatDurations,
                  hideCompasHelp: true,
                  patternLengthInputId: "voz-ritmo-nota-pattern-length",
                  onSetPatternLength: onSetRitmoPatternLength,
                  onSetBeatDurationAtSlot: onSetRitmoBeatDurationAtSlot,
                  onSetBeatLevelAtSlot: onSetRitmoBeatLevelAtSlot,
                },
                tempo: {
                  bpm: ritmoBpm,
                  isPlaying: ritmoPlaying,
                  tapTempoTapCount: ritmoTapTempoTapCount,
                  disabled: ritmoPlaying,
                  onSetBpm: onSetRitmoBpm,
                  onTapTempo: onTapRitmoTempo,
                },
              })}
            </>
          ) : (
            <RitmoConfigSection
              compasLayout="flat"
              collapsedSummary={ritmoNotaConfigSummary}
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
          ),
          ritmoNotaPractice.practice,
          ritmoNotaPractice.practiceHeaderExtra,
        );
      }
      case "combo": {
        const comboPractice = splitPracticeMic(
          layout,
          renderPracticeMicControl(
            layout,
            ritmoMicActive,
            onToggleRitmoMic,
            micStarting,
          ),
          <>
            <VozComboPractice
              ritmoPlaying={ritmoPlaying}
              onToggleRitmoPlaying={onToggleRitmoPlaying}
              ritmoMicActive={ritmoMicActive}
              onToggleRitmoMic={onToggleRitmoMic}
              micStarting={micStarting}
              beatMarkers={beatMarkers}
              ritmoBpm={ritmoBpm}
              ritmoBeatPattern={ritmoBeatPattern}
              ritmoPatternLength={ritmoPatternLength}
              ritmoBeatDurations={ritmoBeatDurations}
              comboNotePattern={comboNotePattern}
              historySamples={historySamples}
              detection={detection}
              targetNote={practiceTargetNote}
              targetOctave={practiceTargetOctave}
              cents={centsFromTarget}
              accuracy={accuracy}
              holdCalibre={holdCalibre}
              voiceRms={voiceRms}
              hideMic={layout === "desktop"}
              layout={layout}
            />
            <InstantAttemptsStrip attempts={instantAttempts} />
          </>,
        );

        return wrapModeSlide(
          layout,
          layout === "desktop" ? (
            renderRitmoDesktopCicloTempo({
              compas: {
                beatPattern: ritmoBeatPattern,
                patternLength: ritmoPatternLength,
                beatDurations: ritmoBeatDurations,
                hideCompasHelp: true,
                patternLengthInputId: "voz-combo-pattern-length",
                onSetPatternLength: onSetRitmoPatternLength,
                onSetBeatDurationAtSlot: onSetRitmoBeatDurationAtSlot,
                onSetBeatLevelAtSlot: onSetRitmoBeatLevelAtSlot,
              },
              notas: {
                vozNotaPatron: {
                  pattern: comboNotePattern,
                  onSetAtSlot: onSetComboNoteAtSlot,
                },
              },
              tempo: {
                bpm: ritmoBpm,
                isPlaying: ritmoPlaying,
                tapTempoTapCount: ritmoTapTempoTapCount,
                disabled: ritmoPlaying,
                onSetBpm: onSetRitmoBpm,
                onTapTempo: onTapRitmoTempo,
              },
            })
          ) : (
            <RitmoConfigSection
              compasLayout="flat"
              collapsedSummary={comboConfigSummary}
              hideCompasHelp
              vozNotaPatron={{
                pattern: comboNotePattern,
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
          ),
          comboPractice.practice,
          comboPractice.practiceHeaderExtra,
        );
      }
    }
  }

  return (
    <>
      {isDesktop ? (
        <div className="flex h-full min-h-0 flex-1 overflow-hidden rounded-[12px] border border-border bg-bg-card">
          <VozPcModeNav
            activeIndex={activeIndex}
            onChangeIndex={onChangeIndex}
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {renderSlideContent(activeSlideId, "desktop")}
          </div>
        </div>
      ) : (
        <ModeCarouselShell
          activeIndex={activeIndex}
          onChangeIndex={onChangeIndex}
          titleAction={renderActiveSlideHelpButton(activeSlideId)}
          renderSlide={(index) =>
            renderSlideContent(VOZ_MODE_SLIDES[index]!.id, "mobile")
          }
        />
      )}
      <EncajarHelpModal
        open={encajarHelpOpen}
        onClose={() => setEncajarHelpOpen(false)}
      />
      <SostenerHelpModal
        open={sostenerHelpOpen}
        onClose={() => setSostenerHelpOpen(false)}
      />
      <OctavasHelpModal
        open={octavasHelpOpen}
        onClose={() => setOctavasHelpOpen(false)}
      />
      <RitmoHelpModal
        open={ritmoHelpOpen}
        onClose={() => setRitmoHelpOpen(false)}
      />
      <IntensidadHelpModal
        open={intensidadHelpOpen}
        onClose={() => setIntensidadHelpOpen(false)}
      />
      <MelodiaHelpModal
        open={melodiaHelpOpen}
        onClose={() => setMelodiaHelpOpen(false)}
      />
      <RitmoNotaHelpModal
        open={ritmoNotaHelpOpen}
        onClose={() => setRitmoNotaHelpOpen(false)}
      />
    </>
  );
}
