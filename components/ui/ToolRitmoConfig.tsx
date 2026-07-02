"use client";

import {
  CompositorSlotContenido,
  CompositorSlotTimbre,
  compositorHasContenidoTab,
  compositorHasTimbreTab,
} from "@/components/ui/compositor/CompositorSlotDetail";
import {
  CompositorCapasStrip,
  type CompositorEditCapasConfig,
} from "@/components/ui/compositor/CompositorCapasStrip";
import { TapButton } from "@/components/ui/TapFeedback";
import {
  BEATS_PER_MEASURE_MAX,
  BEATS_PER_MEASURE_MIN,
  BPM_MAX,
  BPM_MIN,
  getActiveBeatDurationSlice,
  getActivePatternSlice,
  getBeatDurationMultiplier,
  getBeatDurationRelativeToNegraLabel,
  getBeatDurationAtIndex,
  getBeatDurationOptionIndex,
  getBeatLevelAtOffset,
  getBeatLevelBarAppearance,
  getBeatLevelBarHeightPercent,
  getBeatLevelLabel,
  METRONOME_BEAT_DURATION_OPTIONS,
  type MetronomeBeatDuration,
  type MetronomeBeatDurationPattern,
  type MetronomeBeatLevel,
  type MetronomeBeatPattern,
} from "@/lib/metronomo";
import type {
  CompositorDrumSound,
  CompositorGuitarArticulation,
  CompositorInstrumentId,
  CompositorSlotNote,
} from "@/lib/compositor";
import {
  formatGolpeLabel,
  getRitmoHelpContenido,
  getRitmoHelpDinamica,
  getRitmoHelpFigura,
  getRitmoHelpTimbre,
  RITMO_COMPAS_SETUP_TITLE,
  RITMO_HELP_CICLO,
  RITMO_LABEL_GOLPES_TAB,
  RITMO_LABEL_CICLO,
  RITMO_LABEL_COMPAS,
  RITMO_LABEL_CONTENIDO,
  RITMO_LABEL_DINAMICA,
  RITMO_LABEL_FIGURA,
  RITMO_LABEL_NOTAS,
  RITMO_LABEL_TIMBRE,
  RITMO_LABEL_TEMPO,
  RITMO_LABEL_TEMPO_PULSA_TAB,
  RITMO_HELP_TEMPO_PULSA,
  RITMO_PATTERN_CONFIG_HINT,
  RITMO_PATTERN_CONFIG_TITLE,
  type RitmoUiVariant,
} from "@/lib/ritmo-terminologia";
import { TargetPickerBody } from "@/components/ui/entrenador-vocal/EntrenadorVocalShared";
import { formatTargetLabel, type VozTarget } from "@/lib/voz";
import { getActiveNotaSlice, type VozNotaPattern } from "@/lib/voz-nota-patron";
import { ToolConfigSection } from "@/components/ui/ToolModalSections";
import {
  COMPAS_SLOT_CAROUSEL_MIN_HEIGHT_CLASS,
  COMPAS_SLOT_CONTROLS_CLASS,
} from "@/lib/ritmo-compas-ui";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Volume2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type BpmInputMode = "botones" | "tap";

const VOLUME_BAR_SCALE_CYCLE = 0.36;
const VOLUME_BAR_SCALE_CAROUSEL = 0.32;
const VOLUME_BAR_SELECTED_BONUS = 3;

function getVolumeBarHeightPx(
  level: MetronomeBeatLevel,
  scale: number,
  options?: { uniform?: boolean },
): number {
  const heightPercent = options?.uniform
    ? 68
    : Math.max(getBeatLevelBarHeightPercent(level), level === "silencio" ? 0 : 8);
  const minPx = options?.uniform ? 14 : level === "silencio" ? 6 : 14;

  return Math.max(heightPercent * scale, minPx);
}

const MAX_VOLUME_BAR_CYCLE_PX =
  getVolumeBarHeightPx("fuerte", VOLUME_BAR_SCALE_CYCLE) +
  VOLUME_BAR_SELECTED_BONUS;

/** Altura fija de cada columna del preview: icono + hueco de barra + número. */
const COMPAS_CYCLE_COLUMN_HEIGHT_PX =
  10 + 18 + 8 + MAX_VOLUME_BAR_CYCLE_PX + 8 + 18 + 4;

function BeatDurationNoteIcon({
  duration,
  className = "h-11 w-11 text-text-primary",
}: {
  duration: MetronomeBeatDuration;
  className?: string;
}) {
  const shared = `${className}`;

  switch (duration) {
    case "redonda":
      return (
        <svg
          viewBox="0 0 40 24"
          className={shared}
          aria-hidden="true"
        >
          <ellipse
            cx="20"
            cy="12"
            rx="14"
            ry="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
          />
        </svg>
      );
    case "blanca":
      return (
        <svg
          viewBox="0 0 32 40"
          className={shared}
          aria-hidden="true"
        >
          <ellipse
            cx="12"
            cy="30"
            rx="9"
            ry="6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
          />
          <line
            x1="21"
            y1="30"
            x2="21"
            y2="4"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
        </svg>
      );
    case "negra":
      return (
        <svg
          viewBox="0 0 32 40"
          className={shared}
          aria-hidden="true"
        >
          <ellipse cx="12" cy="30" rx="9" ry="6.5" fill="currentColor" />
          <line
            x1="21"
            y1="30"
            x2="21"
            y2="4"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
        </svg>
      );
    case "corchea":
      return (
        <svg
          viewBox="0 0 36 40"
          className={shared}
          aria-hidden="true"
        >
          <ellipse cx="12" cy="30" rx="9" ry="6.5" fill="currentColor" />
          <path
            d="M21 30 V4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
          <path
            d="M21 4 Q30 10 21 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
        </svg>
      );
    case "semicorchea":
      return (
        <svg
          viewBox="0 0 36 40"
          className={shared}
          aria-hidden="true"
        >
          <ellipse cx="12" cy="30" rx="9" ry="6.5" fill="currentColor" />
          <path
            d="M21 30 V4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
          <path
            d="M21 4 Q30 9 21 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
          <path
            d="M21 15 Q30 20 21 26"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

function BeatDurationCarousel({
  beatDuration,
  beatIndex,
  disabled = false,
  hideBeatHeader = false,
  onSetBeatDuration,
}: {
  beatDuration: MetronomeBeatDuration;
  beatIndex: number;
  disabled?: boolean;
  hideBeatHeader?: boolean;
  onSetBeatDuration: (value: MetronomeBeatDuration) => void;
}) {
  const optionIndex = getBeatDurationOptionIndex(beatDuration);
  const option = METRONOME_BEAT_DURATION_OPTIONS[optionIndex]!;

  function changeDuration(delta: number) {
    onSetBeatDuration(getBeatDurationAtIndex(optionIndex + delta));
  }

  return (
    <div>
      {!hideBeatHeader ? (
        <p className="mb-2 text-center text-[11px] text-text-muted">
          {formatGolpeLabel(beatIndex)}
        </p>
      ) : null}
      <div
        className={`flex items-center gap-1 ${COMPAS_SLOT_CAROUSEL_MIN_HEIGHT_CLASS}`}
      >
      <TapButton
        type="button"
        aria-label="Figura más corta"
        disabled={disabled}
        onClick={() => changeDuration(1)}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
      >
        <ChevronLeft className="size-4 text-text-primary" aria-hidden="true" />
      </TapButton>

      <div
        className="min-w-0 flex-1 px-1 text-center"
        aria-live="polite"
        aria-label={`Figura ${option.label}`}
      >
        <div className="flex h-14 items-end justify-center">
          <BeatDurationNoteIcon duration={option.id} />
        </div>
        <p className="mt-2 text-base font-bold leading-tight text-text-primary">
          {option.label}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-text-muted">
          {getBeatDurationRelativeToNegraLabel(option.id)}
        </p>
      </div>

      <TapButton
        type="button"
        aria-label="Figura más larga"
        disabled={disabled}
        onClick={() => changeDuration(-1)}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
      >
        <ChevronRight className="size-4 text-text-primary" aria-hidden="true" />
      </TapButton>
      </div>
    </div>
  );
}

export function BeatVolumeCarousel({
  level,
  beatIndex,
  disabled = false,
  hideBeatHeader = false,
  onSetLevel,
}: {
  level: MetronomeBeatLevel;
  beatIndex: number;
  disabled?: boolean;
  hideBeatHeader?: boolean;
  onSetLevel: (level: MetronomeBeatLevel) => void;
}) {
  const barAppearance = getBeatLevelBarAppearance(level);
  const barHeightPx = getVolumeBarHeightPx(level, VOLUME_BAR_SCALE_CAROUSEL);

  function changeLevel(delta: number) {
    onSetLevel(getBeatLevelAtOffset(level, delta));
  }

  return (
    <div>
      {!hideBeatHeader ? (
        <p className="mb-2 text-center text-[11px] text-text-muted">
          {formatGolpeLabel(beatIndex)}
        </p>
      ) : null}
      <div
        className={`flex items-center gap-1 ${COMPAS_SLOT_CAROUSEL_MIN_HEIGHT_CLASS}`}
      >
        <TapButton
          type="button"
          aria-label="Bajar volumen"
          disabled={disabled}
          onClick={() => changeLevel(-1)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
        >
          <ChevronDown className="size-4 text-text-primary" aria-hidden="true" />
        </TapButton>

        <div
          className="min-w-0 flex-1 px-1 text-center"
          aria-live="polite"
          aria-label={`Dinámica ${getBeatLevelLabel(level)}`}
        >
          <div className="flex h-14 items-end justify-center">
            <span
              className="w-16 rounded-full transition-[height] duration-300 ease-out"
              style={{
                height: `${barHeightPx}px`,
                backgroundColor: barAppearance.backgroundColor,
                border: barAppearance.border,
              }}
            />
          </div>
          <p className="mt-2 text-base font-bold leading-tight text-text-primary">
            {getBeatLevelLabel(level)}
          </p>
        </div>

        <TapButton
          type="button"
          aria-label="Subir volumen"
          disabled={disabled}
          onClick={() => changeLevel(1)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
        >
          <ChevronUp className="size-4 text-text-primary" aria-hidden="true" />
        </TapButton>
      </div>
    </div>
  );
}

export function CompasNumericCarousel({
  value,
  disabled = false,
  decrementDisabled = false,
  incrementDisabled = false,
  decrementAriaLabel,
  incrementAriaLabel,
  valueAriaLabel,
  primaryLabel,
  secondaryLabel,
  onDecrement,
  onIncrement,
}: {
  value: number | string;
  disabled?: boolean;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  decrementAriaLabel: string;
  incrementAriaLabel: string;
  valueAriaLabel: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-1 ${COMPAS_SLOT_CAROUSEL_MIN_HEIGHT_CLASS}`}
    >
      <TapButton
        type="button"
        aria-label={decrementAriaLabel}
        disabled={disabled || decrementDisabled}
        onClick={onDecrement}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
      >
        <ChevronLeft className="size-4 text-text-primary" aria-hidden="true" />
      </TapButton>

      <div
        className="min-w-0 flex-1 px-1 text-center"
        aria-live="polite"
        aria-label={valueAriaLabel}
      >
        <div className="flex h-14 items-center justify-center">
          <span className="text-3xl font-extrabold leading-none text-text-primary">
            {value}
          </span>
        </div>
        <p className="mt-2 text-base font-bold leading-tight text-text-primary">
          {primaryLabel}
        </p>
        {secondaryLabel ? (
          <p className="mt-1 text-[11px] leading-snug text-text-muted">
            {secondaryLabel}
          </p>
        ) : null}
      </div>

      <TapButton
        type="button"
        aria-label={incrementAriaLabel}
        disabled={disabled || incrementDisabled}
        onClick={onIncrement}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
      >
        <ChevronRight className="size-4 text-text-primary" aria-hidden="true" />
      </TapButton>
    </div>
  );
}

function PatternLengthCarousel({
  patternLength,
  disabled = false,
  inputId = "tool-ritmo-pattern-length",
  onSetPatternLength,
}: {
  patternLength: number;
  disabled?: boolean;
  inputId?: string;
  onSetPatternLength: (value: number) => void;
}) {
  return (
    <div
      className={`flex items-center gap-1 ${COMPAS_SLOT_CAROUSEL_MIN_HEIGHT_CLASS}`}
    >
      <TapButton
        type="button"
        aria-label="Reducir golpes del ciclo"
        disabled={disabled || patternLength <= BEATS_PER_MEASURE_MIN}
        onClick={() => onSetPatternLength(patternLength - 1)}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
      >
        <ChevronLeft className="size-4 text-text-primary" aria-hidden="true" />
      </TapButton>

      <div
        className="min-w-0 flex-1 px-1 text-center"
        aria-live="polite"
        aria-label={`${patternLength} golpes en el ciclo`}
      >
        <div className="flex h-14 items-center justify-center">
          <label className="sr-only" htmlFor={inputId}>
            Golpes en el ciclo
          </label>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={BEATS_PER_MEASURE_MIN}
            max={BEATS_PER_MEASURE_MAX}
            disabled={disabled}
            value={patternLength}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              if (!Number.isNaN(parsed)) {
                onSetPatternLength(parsed);
              }
            }}
            onBlur={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              onSetPatternLength(
                Number.isNaN(parsed) ? BEATS_PER_MEASURE_MIN : parsed,
              );
            }}
            className="w-full max-w-[4.5rem] rounded-[10px] border border-border bg-bg-dark/40 py-1.5 text-center text-3xl font-extrabold leading-none text-text-primary disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <p className="mt-2 text-base font-bold leading-tight text-text-primary">
          {RITMO_LABEL_GOLPES_TAB}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-text-muted">
          en el ciclo
        </p>
      </div>

      <TapButton
        type="button"
        aria-label="Aumentar golpes del ciclo"
        disabled={disabled || patternLength >= BEATS_PER_MEASURE_MAX}
        onClick={() => onSetPatternLength(patternLength + 1)}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
      >
        <ChevronRight className="size-4 text-text-primary" aria-hidden="true" />
      </TapButton>
    </div>
  );
}

function CompasCyclePreview({
  pattern,
  beatDurations,
  patternLength,
  selectedBeatIndex,
  disabled = false,
  currentBeat = null,
  visualMode = "dynamic",
  variant = "default",
  selectable = true,
  slotTopLabels,
  onSelectSlot,
}: {
  pattern: MetronomeBeatPattern;
  beatDurations: MetronomeBeatDurationPattern;
  patternLength: number;
  selectedBeatIndex: number | null;
  disabled?: boolean;
  currentBeat?: number | null;
  visualMode?: "uniform" | "dynamic";
  variant?: RitmoUiVariant;
  selectable?: boolean;
  slotTopLabels?: string[];
  onSelectSlot: (slotIndex: number) => void;
}) {
  const levels = getActivePatternSlice(pattern, patternLength);
  const durations = getActiveBeatDurationSlice(beatDurations, patternLength);
  const uniformAppearance = getBeatLevelBarAppearance("medio");
  const accent = getRitmoAccentClasses(variant);

  return (
    <div className="flex items-end gap-1 overflow-visible px-0.5 pt-1">
      {levels.map((level, index) => {
        const flexWeight = getBeatDurationMultiplier(durations[index]!);
        const barAppearance =
          visualMode === "uniform"
            ? uniformAppearance
            : getBeatLevelBarAppearance(level);
        const isSelected = selectable && selectedBeatIndex === index;
        const isPlayingBeat = currentBeat === index;
        const barHeightPx = getVolumeBarHeightPx(
          level,
          VOLUME_BAR_SCALE_CYCLE,
          { uniform: visualMode === "uniform" },
        );
        const renderedBarHeightPx = isSelected
          ? barHeightPx + VOLUME_BAR_SELECTED_BONUS
          : barHeightPx;

        return (
          <TapButton
            key={`cycle-preview-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (selectable) {
                onSelectSlot(index);
              }
            }}
            style={{
              flex: `${flexWeight} 1 0`,
              height: `${COMPAS_CYCLE_COLUMN_HEIGHT_PX}px`,
              ["--ritmo-beat-accent" as string]: accent.accentVar,
            }}
            aria-label={`Golpe ${index + 1}: ${getBeatLevelLabel(level)}`}
            aria-pressed={isSelected}
            className={`group relative isolate flex min-w-0 flex-col items-center justify-end gap-2 overflow-visible px-0.5 pb-1 pt-2.5 transition-[transform,opacity] duration-300 ease-out disabled:opacity-50 ${
              isSelected
                ? "-translate-y-1"
                : selectable
                  ? "opacity-80 hover:opacity-100"
                  : "cursor-default opacity-90"
            } ${isPlayingBeat && !isSelected ? "ritmo-beat-playing-flash" : ""}`}
          >
            {isSelected ? (
              <span
                className="ritmo-beat-select-halo pointer-events-none absolute -inset-x-1 -top-1 bottom-0 -z-10 rounded-[16px] border"
                style={{
                  borderColor: `color-mix(in srgb, ${accent.accentVar} 28%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${accent.accentVar} 14%, transparent)`,
                  boxShadow: `0 8px 28px color-mix(in srgb, ${accent.accentVar} 22%, transparent)`,
                }}
                aria-hidden="true"
              />
            ) : null}

            {slotTopLabels?.[index] ? (
              <span
                className={`max-w-full truncate text-center text-[10px] font-bold leading-none ${
                  isSelected ? accent.selectedNote : "text-text-muted"
                }`}
              >
                {slotTopLabels[index]}
              </span>
            ) : (
              <BeatDurationNoteIcon
                duration={durations[index]!}
                className={`h-[18px] w-[18px] shrink-0 transition-all duration-300 ${
                  isSelected
                    ? `${accent.selectedNote} scale-110 drop-shadow-[0_0_8px_color-mix(in_srgb,var(--ritmo-beat-accent)_55%,transparent)]`
                    : "text-text-muted group-hover:text-text-secondary"
                }`}
              />
            )}

            <div
              className="flex w-[72%] shrink-0 items-end justify-center"
              style={{ height: `${MAX_VOLUME_BAR_CYCLE_PX}px` }}
            >
              <span
                className="w-full rounded-full transition-[height,box-shadow] duration-300 ease-out"
                style={{
                  height: `${renderedBarHeightPx}px`,
                  backgroundColor: barAppearance.backgroundColor,
                  border: barAppearance.border,
                  boxShadow: isSelected
                    ? `0 0 16px color-mix(in srgb, ${accent.accentVar} 38%, transparent)`
                    : isPlayingBeat
                      ? "0 0 10px color-mix(in srgb, var(--text-primary) 25%, transparent)"
                      : undefined,
                }}
              />
            </div>

            <span
              className={`flex size-[18px] items-center justify-center rounded-full text-[9px] font-bold tabular-nums transition-all duration-300 ${
                isSelected
                  ? accent.selectedBadge
                  : "text-text-muted group-hover:text-text-secondary"
              }`}
            >
              {index + 1}
            </span>
          </TapButton>
        );
      })}
    </div>
  );
}

function CompasCycleBracket() {
  return (
    <div className="relative mt-4 px-0.5" aria-hidden="true">
      <svg
        viewBox="0 0 320 14"
        className="h-3.5 w-full text-text-muted/50"
        preserveAspectRatio="none"
        role="presentation"
      >
        <path
          d="M 1 12 L 1 3 M 1 12 L 319 12 M 319 12 L 319 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 bg-bg-cola-sheet px-1.5 text-[7px] font-semibold uppercase tracking-[0.16em] text-text-muted/75">
        Ciclo
      </span>
    </div>
  );
}

const COMPAS_FOCUS_CONTAINER_CLASS =
  "rounded-[10px] border border-border/80 bg-bg-cola-sheet px-2.5 py-3";

const BPM_MODE_CONTAINER_CLASS =
  "space-y-2.5 rounded-[10px] border border-border/70 bg-bg-cola-sheet px-2.5 py-2.5";

export { COMPAS_SLOT_CAROUSEL_MIN_HEIGHT_CLASS } from "@/lib/ritmo-compas-ui";

export function BpmSetupPanel({
  bpm,
  isPlaying,
  tapTempoTapCount,
  onSetBpm,
  onTapTempo,
}: {
  bpm: number;
  isPlaying: boolean;
  tapTempoTapCount: number;
  onSetBpm: (value: number) => void;
  onTapTempo: () => void;
}) {
  const [mode, setMode] = useState<BpmInputMode>("botones");

  useEffect(() => {
    if (isPlaying) {
      setMode("botones");
    }
  }, [isPlaying]);

  return (
    <div className="space-y-2">
      <div
        className="flex items-baseline justify-center gap-2 rounded-[10px] border border-border bg-bg-card px-3 py-2.5"
        aria-live="polite"
      >
        <p className="text-5xl font-extrabold leading-none text-text-primary">
          {bpm}
        </p>
        <p className="text-sm text-text-muted">{RITMO_LABEL_TEMPO}</p>
      </div>

      <div className="flex gap-1 rounded-full border border-border bg-bg-darker p-0.5">
        {(
          [
            { id: "botones" as const, label: "Botones" },
            { id: "tap" as const, label: RITMO_LABEL_TEMPO_PULSA_TAB },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            disabled={isPlaying}
            onClick={() => setMode(tab.id)}
            className={`flex-1 rounded-full px-2 py-1.5 text-[11px] font-bold disabled:opacity-50 ${
              mode === tab.id
                ? "bg-voz-config text-white"
                : "text-text-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "botones" ? (
        <div className={BPM_MODE_CONTAINER_CLASS}>
          <div className="flex items-center justify-center gap-3">
            <TapButton
              type="button"
              aria-label="Reducir BPM"
              disabled={isPlaying || bpm <= BPM_MIN}
              onClick={() => onSetBpm(bpm - 1)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card text-xl font-bold text-text-primary disabled:opacity-40"
            >
              −
            </TapButton>
            <p className="w-16 text-center text-xs font-semibold uppercase tracking-wide text-text-muted">
              BPM
            </p>
            <TapButton
              type="button"
              aria-label="Aumentar BPM"
              disabled={isPlaying || bpm >= BPM_MAX}
              onClick={() => onSetBpm(bpm + 1)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card text-xl font-bold text-text-primary disabled:opacity-40"
            >
              +
            </TapButton>
          </div>
        </div>
      ) : (
        <div className={BPM_MODE_CONTAINER_CLASS}>
          <p className="text-[11px] leading-snug text-text-muted">
            {isPlaying
              ? "Detené el ritmo para pulsar el tempo manualmente."
              : RITMO_HELP_TEMPO_PULSA}
          </p>
          <TapButton
            type="button"
            disabled={isPlaying}
            onClick={onTapTempo}
            className={`w-full rounded-[12px] border px-4 py-3 text-sm font-bold disabled:opacity-40 ${
              tapTempoTapCount > 0 && !isPlaying
                ? "border-voz-config bg-voz-config/15 text-voz-config"
                : "border-border bg-bg-card text-text-primary"
            }`}
          >
            {RITMO_LABEL_TEMPO_PULSA_TAB}
          </TapButton>
          {tapTempoTapCount > 0 && !isPlaying ? (
            <p
              className="text-center text-xs text-voz-config"
              aria-live="polite"
            >
              {tapTempoTapCount === 1
                ? "1 golpe · tocá una vez más"
                : `${tapTempoTapCount} golpes registrados`}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

type CompasSetupTab = "golpes" | "figura" | "dinamica" | "contenido" | "timbre" | "notas";

export type VozNotaPatronConfig = {
  pattern: VozNotaPattern;
  octaveExact: boolean;
  onSetOctaveExact: (value: boolean) => void;
  onSetAtSlot: (slotIndex: number, target: VozTarget) => void;
};

export type CompositorContenidoConfig = {
  instrumentId: CompositorInstrumentId;
  octaveExact: boolean;
  notes: CompositorSlotNote[];
  drumSounds: CompositorDrumSound[];
  guitarArticulations: CompositorGuitarArticulation[];
  onSetOctaveExact: (value: boolean) => void;
  onSetNoteAtSlot: (slotIndex: number, note: CompositorSlotNote) => void;
  onSetDrumSoundAtSlot: (slotIndex: number, sound: CompositorDrumSound) => void;
  onSetGuitarArticulationAtSlot: (
    slotIndex: number,
    articulation: CompositorGuitarArticulation,
  ) => void;
};

function getRitmoAccentClasses(variant: RitmoUiVariant) {
  if (variant === "compositor") {
    return {
      section: "text-compositor-config",
      tabActive: "bg-compositor-config text-white",
      accentVar: "var(--compositor-config)",
      selectedBadge: "bg-compositor-config text-white shadow-[0_2px_10px_color-mix(in_srgb,var(--compositor-config)_45%,transparent)]",
      selectedNote: "text-compositor-config",
    };
  }

  return {
    section: "text-voz-config",
    tabActive: "bg-voz-config text-white",
    accentVar: "var(--voz-config)",
    selectedBadge: "bg-voz-config text-white shadow-[0_2px_10px_color-mix(in_srgb,var(--voz-config)_45%,transparent)]",
    selectedNote: "text-voz-config",
  };
}

export type CompasUiLayout = "nested" | "flat";

export function CompasBeatSetupPanel({
  patternLength,
  beatDurations,
  beatPattern,
  disabled = false,
  inputId = "tool-ritmo-pattern-length",
  currentBeat = null,
  variant = "default",
  scope = "full",
  layout = "nested",
  contenido,
  capas,
  vozNotaPatron,
  hideDinamicaTab = false,
  hideCompasHelp = false,
  onSetPatternLength,
  onSetBeatDurationAtSlot,
  onSetBeatLevelAtSlot,
}: {
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  beatPattern: MetronomeBeatPattern;
  disabled?: boolean;
  inputId?: string;
  currentBeat?: number | null;
  variant?: RitmoUiVariant;
  scope?: "cycle" | "full";
  layout?: CompasUiLayout;
  contenido?: CompositorContenidoConfig;
  capas?: CompositorEditCapasConfig;
  vozNotaPatron?: VozNotaPatronConfig;
  hideDinamicaTab?: boolean;
  hideCompasHelp?: boolean;
  onSetPatternLength: (value: number) => void;
  onSetBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  onSetBeatLevelAtSlot: (
    slotIndex: number,
    level: MetronomeBeatLevel,
  ) => void;
}) {
  const [tab, setTab] = useState<CompasSetupTab>("golpes");
  const [selectedBeatIndex, setSelectedBeatIndex] = useState<number | null>(null);
  const accent = getRitmoAccentClasses(variant);

  function handleTabChange(nextTab: CompasSetupTab) {
    setTab(nextTab);
    if (nextTab === "golpes") {
      setSelectedBeatIndex(null);
    } else {
      setSelectedBeatIndex((previous) => previous ?? 0);
    }
  }

  useEffect(() => {
    if (disabled) {
      setTab("golpes");
      setSelectedBeatIndex(null);
    }
  }, [disabled]);

  useEffect(() => {
    if (tab === "golpes") {
      return;
    }

    setSelectedBeatIndex((previous) =>
      Math.min(previous ?? 0, Math.max(0, patternLength - 1)),
    );
  }, [patternLength, tab]);

  const editingBeatIndex = selectedBeatIndex ?? 0;
  const activeDurations = getActiveBeatDurationSlice(
    beatDurations,
    patternLength,
  );
  const currentSlotDuration =
    activeDurations[editingBeatIndex] ?? ("negra" as MetronomeBeatDuration);
  const activeLevels = getActivePatternSlice(beatPattern, patternLength);
  const currentSlotLevel =
    activeLevels[editingBeatIndex] ?? ("medio" as MetronomeBeatLevel);

  const showContenidoTab =
    scope === "full" &&
    variant === "compositor" &&
    contenido != null &&
    compositorHasContenidoTab(contenido.instrumentId);
  const showTimbreTab =
    scope === "full" &&
    variant === "compositor" &&
    contenido != null &&
    compositorHasTimbreTab(contenido.instrumentId);
  const showCompositorTabs = showContenidoTab || showTimbreTab;
  const compasTabs: { id: CompasSetupTab; label: string }[] = [
    { id: "golpes", label: RITMO_LABEL_GOLPES_TAB },
    { id: "figura", label: RITMO_LABEL_FIGURA },
  ];
  if (scope === "full" && !hideDinamicaTab) {
    compasTabs.push({ id: "dinamica", label: RITMO_LABEL_DINAMICA });
  }
  if (vozNotaPatron) {
    compasTabs.push({ id: "notas", label: RITMO_LABEL_NOTAS });
  }
  if (showContenidoTab) {
    compasTabs.push({ id: "contenido", label: RITMO_LABEL_CONTENIDO });
  }
  if (showTimbreTab) {
    compasTabs.push({ id: "timbre", label: RITMO_LABEL_TIMBRE });
  }

  useEffect(() => {
    if (!contenido) {
      return;
    }

    const hasContenido = compositorHasContenidoTab(contenido.instrumentId);
    const hasTimbre = compositorHasTimbreTab(contenido.instrumentId);

    if (tab === "contenido" && !hasContenido) {
      setTab(hasTimbre ? "timbre" : "golpes");
    } else if (tab === "timbre" && !hasTimbre) {
      setTab(hasContenido ? "contenido" : "golpes");
    }
  }, [contenido, tab]);

  const notaSlotLabels = vozNotaPatron
    ? getActiveNotaSlice(vozNotaPatron.pattern, patternLength).map((slotTarget) =>
        formatTargetLabel(slotTarget, vozNotaPatron.octaveExact),
      )
    : undefined;
  const currentNotaTarget =
    vozNotaPatron != null
      ? (getActiveNotaSlice(vozNotaPatron.pattern, patternLength)[
          editingBeatIndex
        ] ?? vozNotaPatron.pattern[0]!)
      : null;

  const isFlatLayout = layout === "flat";
  const tabsTopMarginClass =
    capas && scope === "full" ? "mt-3" : isFlatLayout ? "mt-0" : "mt-2";

  const content = (
    <>
      {!isFlatLayout ? (
        <p className="text-sm font-semibold text-text-primary">
          {RITMO_COMPAS_SETUP_TITLE}
        </p>
      ) : null}

      {capas && scope === "full" ? (
        <CompositorCapasStrip
          {...capas}
          disabled={disabled}
        />
      ) : null}

      <div
        className={`${tabsTopMarginClass} flex gap-1 rounded-full border border-border bg-bg-darker p-0.5`}
      >
        {compasTabs.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => handleTabChange(option.id)}
            className={`min-w-0 flex-1 rounded-full px-1.5 py-1.5 font-bold disabled:opacity-50 ${
              showCompositorTabs ? "text-[10px]" : "text-[11px]"
            } ${
              tab === option.id
                ? accent.tabActive
                : "text-text-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className={`mt-3 ${COMPAS_FOCUS_CONTAINER_CLASS}`}>
        <CompasCyclePreview
          pattern={beatPattern}
          beatDurations={beatDurations}
          patternLength={patternLength}
          selectedBeatIndex={tab === "golpes" ? null : selectedBeatIndex}
          disabled={disabled}
          currentBeat={currentBeat}
          visualMode={tab === "golpes" ? "uniform" : "dynamic"}
          variant={variant}
          selectable={tab !== "golpes"}
          slotTopLabels={tab === "notas" ? notaSlotLabels : undefined}
          onSelectSlot={setSelectedBeatIndex}
        />

        <CompasCycleBracket />

        {tab === "golpes" ? (
          <div className={COMPAS_SLOT_CONTROLS_CLASS}>
            <PatternLengthCarousel
              patternLength={patternLength}
              disabled={disabled}
              inputId={inputId}
              onSetPatternLength={onSetPatternLength}
            />
          </div>
        ) : null}

        {tab === "figura" ? (
          <div className={COMPAS_SLOT_CONTROLS_CLASS}>
            <BeatDurationCarousel
              beatDuration={currentSlotDuration}
              beatIndex={editingBeatIndex}
              disabled={disabled}
              hideBeatHeader
              onSetBeatDuration={(duration) =>
                onSetBeatDurationAtSlot(editingBeatIndex, duration)
              }
            />
          </div>
        ) : null}

        {tab === "notas" && vozNotaPatron && currentNotaTarget ? (
          <div className={COMPAS_SLOT_CONTROLS_CLASS}>
            <TargetPickerBody
              target={currentNotaTarget}
              disabled={disabled}
              octaveExact={vozNotaPatron.octaveExact}
              onSetOctaveExact={vozNotaPatron.onSetOctaveExact}
              onSetTarget={(nextTarget) =>
                vozNotaPatron.onSetAtSlot(editingBeatIndex, nextTarget)
              }
            />
          </div>
        ) : null}

        {tab === "dinamica" ? (
          <div className={COMPAS_SLOT_CONTROLS_CLASS}>
            <BeatVolumeCarousel
              level={currentSlotLevel}
              beatIndex={editingBeatIndex}
              disabled={disabled}
              hideBeatHeader
              onSetLevel={(level) =>
                onSetBeatLevelAtSlot(editingBeatIndex, level)
              }
            />
          </div>
        ) : null}

        {tab === "contenido" && contenido && showContenidoTab ? (
          <div className={COMPAS_SLOT_CONTROLS_CLASS}>
            <CompositorSlotContenido
              embedded
              slotIndex={editingBeatIndex}
              note={
                contenido.notes[editingBeatIndex] ?? { note: "C", octave: 4 }
              }
              octaveExact={contenido.octaveExact}
              disabled={disabled}
              onSetOctaveExact={contenido.onSetOctaveExact}
              onSetNote={(note) =>
                contenido.onSetNoteAtSlot(editingBeatIndex, note)
              }
            />
          </div>
        ) : null}

        {tab === "timbre" && contenido && showTimbreTab ? (
          <div className={COMPAS_SLOT_CONTROLS_CLASS}>
            <CompositorSlotTimbre
              embedded
              instrumentId={
                contenido.instrumentId === "bateria" ? "bateria" : "guitarra"
              }
              slotIndex={editingBeatIndex}
              drumSound={contenido.drumSounds[editingBeatIndex] ?? "silencio"}
              guitarArticulation={
                contenido.guitarArticulations[editingBeatIndex] ?? "pua"
              }
              disabled={disabled}
              onSetDrumSound={(sound) =>
                contenido.onSetDrumSoundAtSlot(editingBeatIndex, sound)
              }
              onSetGuitarArticulation={(articulation) =>
                contenido.onSetGuitarArticulationAtSlot(
                  editingBeatIndex,
                  articulation,
                )
              }
            />
          </div>
        ) : null}
      </div>

      {scope !== "cycle" && !hideCompasHelp ? (
        <p className="mt-3 text-[11px] leading-snug text-text-muted">
          {tab === "golpes"
            ? RITMO_HELP_CICLO
            : tab === "figura"
              ? getRitmoHelpFigura(variant)
              : tab === "dinamica"
                ? getRitmoHelpDinamica(variant)
                : tab === "notas"
                  ? "Elegí la nota de cada golpe en el gráfico."
                : tab === "contenido"
                  ? getRitmoHelpContenido()
                  : tab === "timbre" && contenido
                    ? getRitmoHelpTimbre(
                        contenido.instrumentId === "bateria"
                          ? "bateria"
                          : "guitarra",
                      )
                    : null}
        </p>
      ) : null}
    </>
  );

  if (isFlatLayout) {
    return content;
  }

  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-3">
      {content}
    </div>
  );
}

export function PatternLengthControl({
  patternLength,
  disabled,
  inputId = "tool-ritmo-pattern-length",
  onSetPatternLength,
}: {
  patternLength: number;
  disabled?: boolean;
  inputId?: string;
  onSetPatternLength: (value: number) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-text-primary">
        {RITMO_LABEL_GOLPES_TAB}
      </p>
      <p className="mt-0.5 text-[11px] text-text-muted">
        Golpes por ciclo ({BEATS_PER_MEASURE_MIN}–{BEATS_PER_MEASURE_MAX})
      </p>
      <div className={`${COMPAS_SLOT_CONTROLS_CLASS} !mt-2`}>
        <PatternLengthCarousel
          patternLength={patternLength}
          disabled={disabled}
          inputId={inputId}
          onSetPatternLength={onSetPatternLength}
        />
      </div>
    </div>
  );
}

export function BeatPatternEditor({
  pattern,
  patternLength,
  disabled = false,
  variant = "config",
  currentBeat = null,
  onCycleSlot,
}: {
  pattern: MetronomeBeatPattern;
  patternLength: number;
  disabled?: boolean;
  variant?: "config" | "practice";
  currentBeat?: number | null;
  onCycleSlot?: (slotIndex: number) => void;
}) {
  const activePattern = getActivePatternSlice(pattern, patternLength);
  const interactive = variant === "config";
  const beatLevels: MetronomeBeatLevel[] = [
    "silencio",
    "suave",
    "medio",
    "fuerte",
  ];

  const bars = (
    <div className={`flex gap-1 ${variant === "config" ? "mt-3" : ""}`}>
      {activePattern.map((level, index) => {
        const heightPercent = Math.max(
          getBeatLevelBarHeightPercent(level),
          level === "silencio" ? 0 : 8,
        );
        const isActive = currentBeat === index;
        const barAppearance = getBeatLevelBarAppearance(level);

        if (!interactive) {
          return (
            <span
              key={`beat-slot-${index}`}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
              title={`Tiempo ${index + 1}: ${getBeatLevelLabel(level)}`}
            >
              <span
                className={`w-full rounded-full transition-colors ${
                  isActive
                    ? "ring-2 ring-text-primary ring-offset-1 ring-offset-bg-card"
                    : ""
                }`}
                style={{
                  height: `${Math.max(heightPercent * 0.28, level === "silencio" ? 4 : 10)}px`,
                  backgroundColor: barAppearance.backgroundColor,
                  border: barAppearance.border,
                }}
              />
            </span>
          );
        }

        return (
          <button
            key={`beat-slot-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => onCycleSlot?.(index)}
            aria-label={`Tiempo ${index + 1}: ${getBeatLevelLabel(level)}`}
            aria-pressed={level !== "silencio"}
            className="flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-end gap-1 disabled:opacity-50"
          >
            <span
              className="w-full rounded-full"
              style={{
                height: `${Math.max(heightPercent * 0.32, level === "silencio" ? 6 : 12)}px`,
                backgroundColor: barAppearance.backgroundColor,
                border: barAppearance.border,
              }}
            />
            <span className="text-[9px] font-bold text-text-muted">
              {index + 1}
            </span>
          </button>
        );
      })}
    </div>
  );

  const legend = (
    <div className="mt-3 flex items-start gap-2">
      <Volume2
        className="mt-0.5 size-3.5 shrink-0 text-text-muted"
        aria-hidden="true"
      />
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-text-muted">
        {beatLevels.map((level) => {
          const barAppearance = getBeatLevelBarAppearance(level);

          return (
            <span key={level} className="inline-flex items-center gap-1">
              <span
                className="inline-block w-3 rounded-full"
                style={{
                  height: `${Math.max(getBeatLevelBarHeightPercent(level) * 0.12, 4)}px`,
                  backgroundColor: barAppearance.backgroundColor,
                  border: barAppearance.border,
                }}
              />
              {getBeatLevelLabel(level)}
            </span>
          );
        })}
      </div>
    </div>
  );

  if (variant === "config") {
    return (
      <div className="rounded-lg border border-border bg-bg-card px-3 py-3">
        <p className="text-sm font-semibold text-text-primary">
          {RITMO_PATTERN_CONFIG_TITLE}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
          {RITMO_PATTERN_CONFIG_HINT}
        </p>
        {bars}
        {legend}
      </div>
    );
  }

  return <div>{bars}</div>;
}

export function ToolRitmoCompasPanel({
  beatPattern,
  patternLength,
  beatDurations,
  disabled = false,
  patternLengthInputId,
  variant = "default",
  scope = "full",
  layout = "nested",
  sectionLabel,
  sectionLabelNormalCase = false,
  contenido,
  capas,
  vozNotaPatron,
  hideDinamicaTab,
  hideCompasHelp,
  onSetPatternLength,
  onSetBeatDurationAtSlot,
  onSetBeatLevelAtSlot,
}: {
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  disabled?: boolean;
  patternLengthInputId?: string;
  variant?: RitmoUiVariant;
  scope?: "cycle" | "full";
  layout?: CompasUiLayout;
  sectionLabel?: string;
  sectionLabelNormalCase?: boolean;
  contenido?: CompositorContenidoConfig;
  capas?: CompositorEditCapasConfig;
  vozNotaPatron?: VozNotaPatronConfig;
  hideDinamicaTab?: boolean;
  hideCompasHelp?: boolean;
  onSetPatternLength: (value: number) => void;
  onSetBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  onSetBeatLevelAtSlot: (
    slotIndex: number,
    level: MetronomeBeatLevel,
  ) => void;
}) {
  const accent = getRitmoAccentClasses(variant);
  const isFlatLayout = layout === "flat";
  const resolvedSectionLabel =
    sectionLabel ?? (isFlatLayout ? RITMO_LABEL_CICLO : RITMO_LABEL_COMPAS);

  return (
    <div className="rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3">
      <p
        className={`text-xs font-bold tracking-wide ${sectionLabelNormalCase ? "normal-case" : "uppercase"} ${accent.section}`}
      >
        {resolvedSectionLabel}
      </p>
      <div className={isFlatLayout ? "mt-2" : "mt-3"}>
        <CompasBeatSetupPanel
          patternLength={patternLength}
          beatDurations={beatDurations}
          beatPattern={beatPattern}
          disabled={disabled}
          inputId={patternLengthInputId}
          variant={variant}
          scope={scope}
          layout={layout}
          contenido={contenido}
          capas={capas}
          vozNotaPatron={vozNotaPatron}
          hideDinamicaTab={hideDinamicaTab}
          hideCompasHelp={hideCompasHelp}
          onSetPatternLength={onSetPatternLength}
          onSetBeatDurationAtSlot={onSetBeatDurationAtSlot}
          onSetBeatLevelAtSlot={onSetBeatLevelAtSlot}
        />
      </div>
    </div>
  );
}

export function ToolRitmoTempoPanel({
  bpm,
  isPlaying,
  tapTempoTapCount,
  onSetBpm,
  onTapTempo,
}: {
  bpm: number;
  isPlaying: boolean;
  tapTempoTapCount: number;
  onSetBpm: (value: number) => void;
  onTapTempo: () => void;
}) {
  return (
    <div className="rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-voz-config">
        {RITMO_LABEL_TEMPO}
      </p>
      <div className="mt-2">
        <BpmSetupPanel
          bpm={bpm}
          isPlaying={isPlaying}
          tapTempoTapCount={tapTempoTapCount}
          onSetBpm={onSetBpm}
          onTapTempo={onTapTempo}
        />
      </div>
    </div>
  );
}

export function RitmoConfigSection({
  collapsedSummary,
  autoCollapseWhen,
  prefix,
  compasLayout = "nested",
  vozNotaPatron,
  hideDinamicaTab,
  hideCompasHelp,
  beatPattern,
  patternLength,
  beatDurations,
  bpm,
  isPlaying,
  tapTempoTapCount,
  patternLengthInputId,
  onSetPatternLength,
  onSetBeatDurationAtSlot,
  onSetBeatLevelAtSlot,
  onSetBpm,
  onTapTempo,
}: {
  collapsedSummary: string;
  autoCollapseWhen?: boolean;
  prefix?: ReactNode;
  compasLayout?: CompasUiLayout;
  vozNotaPatron?: VozNotaPatronConfig;
  hideDinamicaTab?: boolean;
  hideCompasHelp?: boolean;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  bpm: number;
  isPlaying: boolean;
  tapTempoTapCount: number;
  patternLengthInputId?: string;
  onSetPatternLength: (value: number) => void;
  onSetBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  onSetBeatLevelAtSlot: (
    slotIndex: number,
    level: MetronomeBeatLevel,
  ) => void;
  onSetBpm: (value: number) => void;
  onTapTempo: () => void;
}) {
  return (
    <ToolConfigSection
      collapsible
      collapsedSummary={collapsedSummary}
      autoCollapseWhen={autoCollapseWhen}
    >
      {prefix}
      <ToolRitmoConfigPanels
        compasLayout={compasLayout}
        vozNotaPatron={vozNotaPatron}
        hideDinamicaTab={hideDinamicaTab}
        hideCompasHelp={hideCompasHelp}
        beatPattern={beatPattern}
        patternLength={patternLength}
        beatDurations={beatDurations}
        bpm={bpm}
        isPlaying={isPlaying}
        tapTempoTapCount={tapTempoTapCount}
        patternLengthInputId={patternLengthInputId}
        onSetPatternLength={onSetPatternLength}
        onSetBeatDurationAtSlot={onSetBeatDurationAtSlot}
        onSetBeatLevelAtSlot={onSetBeatLevelAtSlot}
        onSetBpm={onSetBpm}
        onTapTempo={onTapTempo}
      />
    </ToolConfigSection>
  );
}

export function ToolRitmoConfigPanels({
  compasLayout = "nested",
  vozNotaPatron,
  hideDinamicaTab,
  hideCompasHelp,
  beatPattern,
  patternLength,
  beatDurations,
  bpm,
  isPlaying,
  tapTempoTapCount,
  patternLengthInputId,
  onSetPatternLength,
  onSetBeatDurationAtSlot,
  onSetBeatLevelAtSlot,
  onSetBpm,
  onTapTempo,
}: {
  compasLayout?: CompasUiLayout;
  vozNotaPatron?: VozNotaPatronConfig;
  hideDinamicaTab?: boolean;
  hideCompasHelp?: boolean;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  bpm: number;
  isPlaying: boolean;
  tapTempoTapCount: number;
  patternLengthInputId?: string;
  onSetPatternLength: (value: number) => void;
  onSetBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  onSetBeatLevelAtSlot: (
    slotIndex: number,
    level: MetronomeBeatLevel,
  ) => void;
  onSetBpm: (value: number) => void;
  onTapTempo: () => void;
}) {
  return (
    <>
      <ToolRitmoCompasPanel
        layout={compasLayout}
        vozNotaPatron={vozNotaPatron}
        hideDinamicaTab={hideDinamicaTab}
        hideCompasHelp={hideCompasHelp}
        beatPattern={beatPattern}
        patternLength={patternLength}
        beatDurations={beatDurations}
        disabled={isPlaying}
        patternLengthInputId={patternLengthInputId}
        onSetPatternLength={onSetPatternLength}
        onSetBeatDurationAtSlot={onSetBeatDurationAtSlot}
        onSetBeatLevelAtSlot={onSetBeatLevelAtSlot}
      />
      <ToolRitmoTempoPanel
        bpm={bpm}
        isPlaying={isPlaying}
        tapTempoTapCount={tapTempoTapCount}
        onSetBpm={onSetBpm}
        onTapTempo={onTapTempo}
      />
    </>
  );
}
