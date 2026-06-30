"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import type { NoteDetection } from "@/lib/afinador";
import {
  BPM_MAX,
  BPM_MIN,
  getCycleBeats,
  getPatternDescription,
  getPhaseAtBeat,
  getPhaseLabel,
  getRitmoComplianceColor,
  getRitmoNowLinePercent,
  getRitmoPhaseAtTime,
  getRitmoTimelineWindowMs,
  ritmoTimeToPercent,
  VOZ_RITMO_BEATS_MAX,
  VOZ_RITMO_BEATS_MIN,
  VOZ_RITMO_TIMELINE_PAST_RATIO,
  type VozRitmoBeatMarker,
  type VozRitmoPhase,
  type VozRitmoVoiceSample,
} from "@/lib/voz-ritmo";
import {
  buildHistorySegmentPath,
  centsToLadderPercent,
  computeEnTonoHoldMs,
  formatHoldDuration,
  formatTargetLabel,
  frequencyToDisplayOctave,
  getLadderNoteSlots,
  getNoteLabelAtSemitoneOffset,
  getVozAccuracyColor,
  historyCentsBandHeight,
  historyCentsToChartY,
  semitoneOffsetToLadderPercent,
  splitHistorySegments,
  VOZ_CERCA_CENTS,
  VOZ_HISTORY_CHART_WIDE_MAX_CENTS,
  VOZ_HISTORY_WINDOW_MS,
  VOZ_HOLD_TARGET_OPTIONS,
  VOZ_INTUNE_CENTS,
  VOZ_LADDER_SEMITONE_SPAN,
  type VozAccuracy,
  type VozHistorySample,
  type VozInstantAttempt,
  type VozTarget,
} from "@/lib/voz";
import { useDrag } from "@use-gesture/react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { TargetPicker, type TargetPickerProps } from "./EntrenadorVocalShared";

export const VOZ_MODE_SLIDES = [
  { id: "encajar", label: "Encajar" },
  { id: "sostener", label: "Sostener" },
  { id: "ritmo", label: "Ritmo" },
  { id: "combo", label: "Combo" },
] as const;

export type VozModeSlideId = (typeof VOZ_MODE_SLIDES)[number]["id"];

const CHART_WIDTH = 320;
const CHART_HEIGHT_WIDE = 172;
const CHART_WIDE_PADDING_LEFT = 40;
const MODE_DRAG_THRESHOLD_PX = 48;

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
  children,
}: {
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  children: ReactNode;
}) {
  const [dragX, setDragX] = useState(0);
  const slideCount = VOZ_MODE_SLIDES.length;

  const changeSlide = useCallback(
    (delta: number) => {
      onChangeIndex(
        Math.max(0, Math.min(slideCount - 1, activeIndex + delta)),
      );
    },
    [activeIndex, onChangeIndex, slideCount],
  );

  const bind = useDrag(
    ({ movement: [mx], last }) => {
      if (last) {
        if (mx < -MODE_DRAG_THRESHOLD_PX) {
          changeSlide(1);
        } else if (mx > MODE_DRAG_THRESHOLD_PX) {
          changeSlide(-1);
        }

        setDragX(0);
        return;
      }

      setDragX(mx);
    },
    { axis: "x", filterTaps: true },
  );

  return (
    <div className="w-full max-w-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Modo anterior"
          disabled={activeIndex === 0}
          onClick={() => changeSlide(-1)}
          className="flex size-8 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
        >
          <ChevronLeft className="size-4 text-text-primary" aria-hidden="true" />
        </button>

        <div className="flex flex-1 justify-center gap-1.5">
          {VOZ_MODE_SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={slide.label}
              aria-current={activeIndex === index}
              onClick={() => onChangeIndex(index)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                activeIndex === index
                  ? "bg-accent text-white"
                  : "border border-border bg-bg-dark text-text-muted"
              }`}
            >
              {slide.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-label="Modo siguiente"
          disabled={activeIndex === slideCount - 1}
          onClick={() => changeSlide(1)}
          className="flex size-8 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
        >
          <ChevronRight className="size-4 text-text-primary" aria-hidden="true" />
        </button>
      </div>

      <div
        {...bind()}
        className="touch-pan-y select-none"
        style={{ transform: `translateX(${dragX}px)` }}
      >
        {children}
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
  const markerColor = getVozAccuracyColor(accuracy);
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
                  ? "text-accent"
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
            className="pointer-events-none absolute bottom-1.5 size-3.5 -translate-x-1/2 rounded-full ring-2 ring-bg-cola-sheet"
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

function InstantAttemptsStrip({
  attempts,
}: {
  attempts: VozInstantAttempt[];
}) {
  if (attempts.length === 0) {
    return (
      <p className="text-center text-xs italic text-text-muted">
        Cantá un pinchazo de ~1 s y soltá. Cada intento deja una marca.
      </p>
    );
  }

  return (
    <div className="w-full">
      <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        Tus intentos
      </p>
      <div className="flex h-3 gap-1 overflow-hidden rounded-full border border-border bg-bg-card px-1 py-0.5">
        {attempts.map((attempt) => (
          <span
            key={attempt.id}
            className="min-w-0 flex-1 rounded-full"
            style={{
              backgroundColor: attempt.hit
                ? "var(--tuner-in-tune)"
                : "var(--tuner-flat-sharp)",
              opacity: attempt.hit ? 1 : 0.75,
            }}
            title={attempt.hit ? "Encajó en verde" : "Fuera de rango"}
          />
        ))}
      </div>
      <p className="mt-1 text-center text-[10px] text-text-muted">
        Verde = encajaste de una · rojo = no
      </p>
    </div>
  );
}

function PitchHistoryChart({
  samples,
  active,
  holdTargetSeconds,
  celebrationKey,
  mode = "ritmo",
  targetNote,
  targetOctave,
  octaveExact = true,
}: {
  samples: VozHistorySample[];
  active: boolean;
  holdTargetSeconds: number;
  celebrationKey: number;
  mode?: "sostener" | "ritmo";
  targetNote: string;
  targetOctave: number;
  octaveExact?: boolean;
}) {
  const isSostener = mode === "sostener";
  const chartHeight = CHART_HEIGHT_WIDE;
  const maxCents = VOZ_HISTORY_CHART_WIDE_MAX_CENTS;
  const plotLeft = CHART_WIDE_PADDING_LEFT;
  const plotWidth = CHART_WIDTH - plotLeft - 8;
  const now = useTimelineNow(active && samples.length > 0);
  const segments = useMemo(() => splitHistorySegments(samples), [samples]);
  const holdMs = useMemo(
    () => computeEnTonoHoldMs(samples, now),
    [samples, now],
  );
  const cercaBandHeight = historyCentsBandHeight(
    VOZ_CERCA_CENTS,
    chartHeight,
    maxCents,
  );
  const intuneBandHeight = historyCentsBandHeight(
    VOZ_INTUNE_CENTS,
    chartHeight,
    maxCents,
  );
  const centerY = historyCentsToChartY(0, chartHeight, maxCents);
  const targetMs = holdTargetSeconds * 1000;
  const progress = Math.min(100, (holdMs / targetMs) * 100);
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
          {isSostener ? "Sostené en verde" : "Nota en el tiempo"}
        </p>
        {isSostener ? (
          <span className="text-[10px] font-semibold text-text-muted">
            Meta: {holdTargetSeconds} s
          </span>
        ) : (
          <span className="max-w-[55%] truncate text-right text-[10px] font-semibold text-text-muted">
            {wideRangeLabel}
          </span>
        )}
      </div>

      {isSostener ? (
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-bg-card">
          <div
            className="h-full rounded-full transition-[width] duration-150"
            style={{
              width: `${progress}%`,
              backgroundColor: "var(--tuner-in-tune)",
            }}
          />
        </div>
      ) : null}

      {isSostener && celebrationKey > 0 ? (
        <p
          key={celebrationKey}
          className="mb-2 text-center text-lg font-extrabold animate-[metronomo-hit-flash_450ms_ease-out]"
          style={{ color: "var(--tuner-in-tune)" }}
          aria-live="assertive"
        >
          ¡Logrado!
        </p>
      ) : null}

      <div
        className="relative overflow-hidden rounded-[12px] border border-border bg-bg-card"
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
                fill="var(--tuner-in-tune)"
                opacity={0.18}
                rx={3}
              />
              <line
                x1={plotLeft}
                y1={centerY}
                x2={CHART_WIDTH - 8}
                y2={centerY}
                stroke="var(--tuner-in-tune)"
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
            const lastAccuracy =
              segment[segment.length - 1]?.accuracy ?? "lejos";

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
                stroke={getVozAccuracyColor(lastAccuracy)}
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

      <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-text-muted">
        <span>−{VOZ_HISTORY_WINDOW_MS / 1000} s</span>
        <span>
          {isSostener && holdMs >= 500
            ? `Llevás ${formatHoldDuration(holdMs)}`
            : "Centro = en tono"}
        </span>
        <span>ahora</span>
      </div>
    </div>
  );
}

function RitmoPatternPreview({
  singBeats,
  restBeats,
}: {
  singBeats: number;
  restBeats: number;
}) {
  const cycle = getCycleBeats(singBeats, restBeats);

  return (
    <div className="flex h-3 overflow-hidden rounded-full border border-border">
      {Array.from({ length: cycle }, (_, index) => {
        const phase = getPhaseAtBeat(index, singBeats, restBeats);

        return (
          <span
            key={index}
            className="flex-1"
            style={{
              backgroundColor:
                phase === "cantar"
                  ? "color-mix(in srgb, var(--tuner-in-tune) 70%, transparent)"
                  : "color-mix(in srgb, var(--text-muted) 35%, transparent)",
            }}
          />
        );
      })}
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
  singBeats: number,
  restBeats: number,
  totalSpanMs: number,
  pastRatio: number,
): RitmoBeatSegment[] {
  if (beatMarkers.length === 0) {
    return [];
  }

  const msPerBeat = 60000 / bpm;
  const windowStart = now - totalSpanMs * pastRatio;
  const windowEnd = windowStart + totalSpanMs;
  const anchor = beatMarkers[0]!;
  const elapsed = windowStart - anchor.timestamp;
  let beatIndex =
    anchor.beatIndex + Math.floor(elapsed / msPerBeat);

  let beatStart =
    anchor.timestamp + (beatIndex - anchor.beatIndex) * msPerBeat;

  if (beatStart > windowStart) {
    beatIndex -= 1;
    beatStart -= msPerBeat;
  }

  const segments: RitmoBeatSegment[] = [];

  while (beatStart < windowEnd) {
    segments.push({
      startMs: beatStart,
      endMs: beatStart + msPerBeat,
      phase: getPhaseAtBeat(beatIndex, singBeats, restBeats),
    });
    beatStart += msPerBeat;
    beatIndex += 1;
  }

  return segments;
}

function VozRitmoTimeline({
  beatMarkers,
  bpm,
  singBeats,
  restBeats,
  isPlaying,
  voiceSamples,
}: {
  beatMarkers: VozRitmoBeatMarker[];
  bpm: number;
  singBeats: number;
  restBeats: number;
  isPlaying: boolean;
  voiceSamples: VozRitmoVoiceSample[];
}) {
  const now = useTimelineNow(isPlaying || beatMarkers.length > 0);
  const totalSpanMs = getRitmoTimelineWindowMs(bpm, singBeats, restBeats);
  const nowLinePercent = getRitmoNowLinePercent();
  const beatSegments = useMemo(
    () =>
      getRitmoBeatSegments(
        beatMarkers,
        now,
        bpm,
        singBeats,
        restBeats,
        totalSpanMs,
        VOZ_RITMO_TIMELINE_PAST_RATIO,
      ),
    [beatMarkers, now, bpm, singBeats, restBeats, totalSpanMs],
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
          <div className="relative h-10 flex-1">
            {beatSegments.map((segment, index) => {
              const left = timeToPercent(segment.startMs);
              const right = timeToPercent(segment.endMs);
              const width = Math.max(right - left, 0.8);
              const isFuture = segment.startMs > now;
              const isSing = segment.phase === "cantar";

              return (
                <span
                  key={`ritmo-seg-${segment.startMs}-${index}`}
                  className="absolute bottom-0 rounded-sm"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    height: isSing ? "100%" : "42%",
                    backgroundColor: isSing
                      ? isFuture
                        ? "color-mix(in srgb, var(--tuner-in-tune) 40%, transparent)"
                        : "var(--tuner-in-tune)"
                      : isFuture
                        ? "color-mix(in srgb, var(--text-muted) 25%, transparent)"
                        : "color-mix(in srgb, var(--text-muted) 55%, transparent)",
                    opacity: isFuture ? 0.65 : 1,
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
                className="absolute bottom-0 rounded-sm"
                style={{
                  left: `${timeToPercent(sample.timestamp)}%`,
                  width: "3px",
                  height: sample.hasVoice ? "100%" : "38%",
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

function VozRitmoSetup({
  singBeats,
  restBeats,
  ritmoBpm,
  ritmoPlaying,
  onSetSingBeats,
  onSetRestBeats,
  onSetRitmoBpm,
}: {
  singBeats: number;
  restBeats: number;
  ritmoBpm: number;
  ritmoPlaying: boolean;
  onSetSingBeats: (value: number) => void;
  onSetRestBeats: (value: number) => void;
  onSetRitmoBpm: (value: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (ritmoPlaying) {
      setExpanded(false);
    }
  }, [ritmoPlaying]);

  return (
    <div className="rounded-[12px] border border-border bg-bg-card px-3 py-3">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Definir el ritmo
          </p>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            {getPatternDescription(singBeats, restBeats)} · {ritmoBpm} BPM
          </p>
        </div>
        <ChevronDown
          className={`size-5 shrink-0 text-text-muted transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {expanded ? (
        <>
          <div className="mt-2">
            <RitmoPatternPreview singBeats={singBeats} restBeats={restBeats} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold text-text-muted">
                Tiempos cantando
              </p>
              <div className="flex flex-wrap gap-1">
                {Array.from(
                  { length: VOZ_RITMO_BEATS_MAX - VOZ_RITMO_BEATS_MIN + 1 },
                  (_, index) => VOZ_RITMO_BEATS_MIN + index,
                ).map((value) => (
                  <button
                    key={`sing-${value}`}
                    type="button"
                    disabled={ritmoPlaying}
                    onClick={() => onSetSingBeats(value)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                      singBeats === value
                        ? "bg-accent text-white"
                        : "border border-border bg-bg-dark text-text-secondary"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold text-text-muted">
                Tiempos en silencio
              </p>
              <div className="flex flex-wrap gap-1">
                {Array.from(
                  { length: VOZ_RITMO_BEATS_MAX - VOZ_RITMO_BEATS_MIN + 1 },
                  (_, index) => VOZ_RITMO_BEATS_MIN + index,
                ).map((value) => (
                  <button
                    key={`rest-${value}`}
                    type="button"
                    disabled={ritmoPlaying}
                    onClick={() => onSetRestBeats(value)}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                      restBeats === value
                        ? "bg-accent text-white"
                        : "border border-border bg-bg-dark text-text-secondary"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-3">
            <TapButton
              type="button"
              aria-label="Reducir BPM"
              disabled={ritmoPlaying || ritmoBpm <= BPM_MIN}
              onClick={() => onSetRitmoBpm(ritmoBpm - 1)}
              className="flex size-9 items-center justify-center rounded-full border border-border bg-bg-dark text-lg font-bold text-text-primary disabled:opacity-40"
            >
              −
            </TapButton>
            <div className="min-w-[4.5rem] text-center">
              <p className="text-2xl font-extrabold leading-none text-text-primary">
                {ritmoBpm}
              </p>
              <p className="mt-0.5 text-[10px] text-text-muted">BPM</p>
            </div>
            <TapButton
              type="button"
              aria-label="Aumentar BPM"
              disabled={ritmoPlaying || ritmoBpm >= BPM_MAX}
              onClick={() => onSetRitmoBpm(ritmoBpm + 1)}
              className="flex size-9 items-center justify-center rounded-full border border-border bg-bg-dark text-lg font-bold text-text-primary disabled:opacity-40"
            >
              +
            </TapButton>
          </div>
        </>
      ) : (
        <div className="mt-2">
          <RitmoPatternPreview singBeats={singBeats} restBeats={restBeats} />
        </div>
      )}
    </div>
  );
}

function VozRitmoPractice({
  ritmoPlaying,
  onToggleRitmoPlaying,
  beatMarkers,
  ritmoBpm,
  singBeats,
  restBeats,
  voiceSamples,
  showToneToggle,
  evaluarTono,
  onSetEvaluarTono,
  detection,
  objectiveLabel,
  targetFrequency,
  octaveExact,
  targetNote,
  targetOctave,
  cents,
  accuracy,
  historySamples,
  holdTargetSeconds,
}: {
  ritmoPlaying: boolean;
  onToggleRitmoPlaying: () => void;
  beatMarkers: VozRitmoBeatMarker[];
  ritmoBpm: number;
  singBeats: number;
  restBeats: number;
  voiceSamples: VozRitmoVoiceSample[];
  showToneToggle: boolean;
  evaluarTono: boolean;
  onSetEvaluarTono?: (value: boolean) => void;
  detection: NoteDetection | null;
  objectiveLabel: string;
  targetFrequency: number | null;
  octaveExact: boolean;
  targetNote: string;
  targetOctave: number;
  cents: number;
  accuracy: VozAccuracy;
  historySamples: VozHistorySample[];
  holdTargetSeconds: number;
}) {
  const showTone = !showToneToggle || evaluarTono;
  const now = useTimelineNow(ritmoPlaying && beatMarkers.length > 0);
  const livePhase =
    ritmoPlaying && beatMarkers.length > 0
      ? getRitmoPhaseAtTime(
          now,
          beatMarkers,
          ritmoBpm,
          singBeats,
          restBeats,
        )
      : null;

  return (
    <div className="space-y-3 rounded-[12px] border border-border bg-bg-dark px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Practicá
      </p>

      {showToneToggle && onSetEvaluarTono ? (
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[10px] border border-border bg-bg-card px-3 py-2">
          <span className="text-sm font-semibold text-text-primary">
            Evaluar tono
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={evaluarTono}
            onClick={() => onSetEvaluarTono(!evaluarTono)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              evaluarTono ? "bg-accent" : "border border-border bg-bg-dark"
            }`}
          >
            <span
              className={`absolute top-0.5 size-6 rounded-full bg-white transition-transform ${
                evaluarTono ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </label>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        {ritmoPlaying && livePhase ? (
          <p
            className="text-xl font-extrabold uppercase tracking-wide"
            style={{
              color:
                livePhase === "cantar"
                  ? "var(--tuner-in-tune)"
                  : "var(--text-muted)",
            }}
            aria-live="assertive"
          >
            {getPhaseLabel(livePhase)}
          </p>
        ) : (
          <p className="text-sm text-text-muted">
            Tono agudo = cantá · grave = silencio
          </p>
        )}
        <TapButton
          type="button"
          aria-label={ritmoPlaying ? "Detener ritmo" : "Iniciar ritmo"}
          onClick={onToggleRitmoPlaying}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            ritmoPlaying
              ? "bg-accent text-white"
              : "border border-border bg-bg-card text-text-primary"
          }`}
        >
          {ritmoPlaying ? "Detener" : "Iniciar"}
        </TapButton>
      </div>

      <VozRitmoTimeline
        beatMarkers={beatMarkers}
        bpm={ritmoBpm}
        singBeats={singBeats}
        restBeats={restBeats}
        isPlaying={ritmoPlaying}
        voiceSamples={voiceSamples}
      />

      {showTone ? (
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
            holdTargetSeconds={holdTargetSeconds}
            celebrationKey={0}
            mode="ritmo"
            targetNote={targetNote}
            targetOctave={targetOctave}
            octaveExact={octaveExact}
          />
        </>
      ) : null}
    </div>
  );
}

export type VozModeSlidesProps = {
  activeIndex: number;
  onChangeIndex: (index: number) => void;
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
  celebrationKey: number;
  ritmoPlaying: boolean;
  onToggleRitmoPlaying: () => void;
  ritmoBpm: number;
  onSetRitmoBpm: (value: number) => void;
  singBeats: number;
  onSetSingBeats: (value: number) => void;
  restBeats: number;
  onSetRestBeats: (value: number) => void;
  beatMarkers: VozRitmoBeatMarker[];
  ritmoVoiceSamples: VozRitmoVoiceSample[];
  ritmoEvaluarTono: boolean;
  onSetRitmoEvaluarTono: (value: boolean) => void;
};

export function VozModeSlides({
  activeIndex,
  onChangeIndex,
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
  celebrationKey,
  ritmoPlaying,
  onToggleRitmoPlaying,
  ritmoBpm,
  onSetRitmoBpm,
  singBeats,
  onSetSingBeats,
  restBeats,
  onSetRestBeats,
  beatMarkers,
  ritmoVoiceSamples,
  ritmoEvaluarTono,
  onSetRitmoEvaluarTono,
}: VozModeSlidesProps) {
  const feedbackColor = getVozAccuracyColor(accuracy);
  const slideId = VOZ_MODE_SLIDES[activeIndex]?.id ?? "encajar";

  return (
    <ModeCarouselShell activeIndex={activeIndex} onChangeIndex={onChangeIndex}>
      <div className="rounded-[12px] border border-border bg-bg-cola-sheet px-3 py-4">
        {slideId === "encajar" ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Configuración
              </p>
              <div className="mt-2">
                <TargetPicker {...targetPicker} />
              </div>
            </div>
            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Practicá · encajar de una
              </p>
              <p className="text-[11px] text-text-secondary">
                Cantá un pinchazo corto y soltá. Buscá caer en verde al
                empezar, sin sostener ni medir tiempo.
              </p>
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
              <p
                className="text-center text-sm font-semibold"
                style={{ color: feedbackColor }}
                aria-live="polite"
              >
                {feedbackLabel}
              </p>
            </div>
          </div>
        ) : null}

        {slideId === "sostener" ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Configuración
              </p>
              <div className="mt-2">
                <TargetPicker {...targetPicker} />
              </div>
              <div className="mt-3 rounded-[10px] border border-border bg-bg-card px-3 py-2.5">
                <p className="text-[10px] font-semibold text-text-muted">
                  Segundos en verde
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {VOZ_HOLD_TARGET_OPTIONS.map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => onSetHoldTargetSeconds(seconds)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        holdTargetSeconds === seconds
                          ? "bg-accent text-white"
                          : "border border-border bg-bg-dark text-text-secondary"
                      }`}
                    >
                      {seconds} s
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Practicá · sostener
              </p>
              <DetectedNoteDisplay
                detection={detection}
                objectiveLabel={objectiveLabel}
                targetFrequency={targetFrequency}
                octaveExact={octaveExact}
              />
              <PitchHistoryChart
                samples={historySamples}
                active
                holdTargetSeconds={holdTargetSeconds}
                celebrationKey={celebrationKey}
                mode="sostener"
                targetNote={targetNote}
                targetOctave={targetPicker.target.octave}
                octaveExact={octaveExact}
              />
            </div>
          </div>
        ) : null}

        {slideId === "ritmo" ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Configuración
              </p>
              <div className="mt-2">
                <TargetPicker {...targetPicker} />
              </div>
              <div className="mt-3">
                <VozRitmoSetup
                  singBeats={singBeats}
                  restBeats={restBeats}
                  ritmoBpm={ritmoBpm}
                  ritmoPlaying={ritmoPlaying}
                  onSetSingBeats={onSetSingBeats}
                  onSetRestBeats={onSetRestBeats}
                  onSetRitmoBpm={onSetRitmoBpm}
                />
              </div>
            </div>
            <VozRitmoPractice
              ritmoPlaying={ritmoPlaying}
              onToggleRitmoPlaying={onToggleRitmoPlaying}
              beatMarkers={beatMarkers}
              ritmoBpm={ritmoBpm}
              singBeats={singBeats}
              restBeats={restBeats}
              voiceSamples={ritmoVoiceSamples}
              showToneToggle
              evaluarTono={ritmoEvaluarTono}
              onSetEvaluarTono={onSetRitmoEvaluarTono}
              detection={detection}
              objectiveLabel={objectiveLabel}
              targetFrequency={targetFrequency}
              octaveExact={octaveExact}
              targetNote={targetNote}
              targetOctave={targetPicker.target.octave}
              cents={centsFromTarget}
              accuracy={accuracy}
              historySamples={historySamples}
              holdTargetSeconds={holdTargetSeconds}
            />
          </div>
        ) : null}

        {slideId === "combo" ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Configuración
              </p>
              <div className="mt-2">
                <TargetPicker {...targetPicker} />
              </div>
              <div className="mt-3">
                <VozRitmoSetup
                  singBeats={singBeats}
                  restBeats={restBeats}
                  ritmoBpm={ritmoBpm}
                  ritmoPlaying={ritmoPlaying}
                  onSetSingBeats={onSetSingBeats}
                  onSetRestBeats={onSetRestBeats}
                  onSetRitmoBpm={onSetRitmoBpm}
                />
              </div>
            </div>
            <VozRitmoPractice
              ritmoPlaying={ritmoPlaying}
              onToggleRitmoPlaying={onToggleRitmoPlaying}
              beatMarkers={beatMarkers}
              ritmoBpm={ritmoBpm}
              singBeats={singBeats}
              restBeats={restBeats}
              voiceSamples={ritmoVoiceSamples}
              showToneToggle={false}
              evaluarTono
              detection={detection}
              objectiveLabel={objectiveLabel}
              targetFrequency={targetFrequency}
              octaveExact={octaveExact}
              targetNote={targetNote}
              targetOctave={targetPicker.target.octave}
              cents={centsFromTarget}
              accuracy={accuracy}
              historySamples={historySamples}
              holdTargetSeconds={holdTargetSeconds}
            />
          </div>
        ) : null}
      </div>
    </ModeCarouselShell>
  );
}
