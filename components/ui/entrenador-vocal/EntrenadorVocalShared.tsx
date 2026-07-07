"use client";

import { NOTE_NAMES } from "@/lib/afinador";
import {
  clampTargetOctave,
  formatTargetLabel,
  shiftTargetBySemitones,
  VOZ_OCTAVES,
  type VozTarget,
} from "@/lib/voz";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { TapButton } from "@/components/ui/TapFeedback";

const TARGET_PICKER_PANEL_CLASS =
  "rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3";

const TARGET_PICKER_PANEL_TITLE_CLASS =
  "text-xs font-semibold uppercase tracking-wide";

export function TargetPickerPanel({
  title = "Nota objetivo",
  hideTitle = false,
  titleClassName = "text-voz-config",
  className = "",
  children,
}: {
  title?: string;
  hideTitle?: boolean;
  titleClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${TARGET_PICKER_PANEL_CLASS} ${className}`.trim()}>
      {!hideTitle ? (
        <p className={`${TARGET_PICKER_PANEL_TITLE_CLASS} ${titleClassName}`}>
          {title}
        </p>
      ) : null}
      <div className={hideTitle ? undefined : "mt-2"}>{children}</div>
    </div>
  );
}

export { ToolConfigSection as VozConfigSection } from "@/components/ui/ToolModalSections";

export function VozPracticeDivider() {
  const accentColor = "#0f2435";
  const lineColor = "#1a3a52";

  return (
    <div
      className="flex w-full min-w-0 items-center gap-2.5 py-0.5"
      role="separator"
      aria-label="Practicar"
    >
      <div
        className="min-w-0 flex-1 border-t-2"
        style={{ borderColor: lineColor }}
      />
      <span
        className="shrink-0 text-sm font-extrabold uppercase tracking-wider"
        style={{ color: accentColor }}
      >
        PRACTICAR
      </span>
      <div
        className="min-w-0 flex-1 border-t-2"
        style={{ borderColor: lineColor }}
      />
    </div>
  );
}

export function VozPracticeArea({ children }: { children: ReactNode }) {
  return (
    <div className="voz-mode-practice-panel -mx-3 space-y-3 px-3 pb-1 pt-3 lg:mx-0 lg:rounded-[10px] lg:border lg:border-border/50 lg:bg-bg-card/30 lg:px-3 lg:py-3">
      <VozPracticeDivider />
      {children}
    </div>
  );
}

export type TargetPickerProps = {
  target: VozTarget;
  onSetTarget: (target: VozTarget) => void;
  autoCollapseWhen?: boolean;
  collapsible?: boolean;
  disabled?: boolean;
  density?: TargetPickerDensity;
};

export type TargetPickerDensity = "default" | "compact";

export type TargetPickerBodyProps = {
  target: VozTarget;
  onSetTarget: (target: VozTarget) => void;
  disabled?: boolean;
  density?: TargetPickerDensity;
};

function wrapIndex(index: number): number {
  return ((index % 12) + 12) % 12;
}

function shiftTargetNote(target: VozTarget, delta: number): VozTarget | null {
  return shiftTargetBySemitones(target, delta);
}

function NoteCarousel({
  target,
  onSetTarget,
  disabled = false,
  density = "default",
}: {
  target: VozTarget;
  onSetTarget: (target: VozTarget) => void;
  disabled?: boolean;
  density?: TargetPickerDensity;
}) {
  const compact = density === "compact";
  const noteIndex = NOTE_NAMES.indexOf(
    target.note as (typeof NOTE_NAMES)[number],
  );
  const safeIndex = noteIndex === -1 ? 0 : noteIndex;
  const prevNote = NOTE_NAMES[wrapIndex(safeIndex - 1)];
  const nextNote = NOTE_NAMES[wrapIndex(safeIndex + 1)];
  const canGoDown = shiftTargetNote(target, -1) !== null;
  const canGoUp = shiftTargetNote(target, 1) !== null;
  const displayNote = target.note;

  const changeNote = useCallback(
    (delta: number) => {
      const next = shiftTargetNote(target, delta);

      if (next) {
        onSetTarget(next);
      }
    },
    [onSetTarget, target],
  );

  return (
    <div className="flex w-full items-center gap-1 lg:mx-auto lg:max-w-sm">
      <TapButton
        type="button"
        aria-label="Nota anterior"
        disabled={disabled || !canGoDown}
        onClick={() => changeNote(-1)}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
      >
        <ChevronLeft className="size-4 text-text-primary" aria-hidden="true" />
      </TapButton>

      <div className="relative min-w-0 flex-1 lg:w-40 lg:flex-none">
        <div
          className="pointer-events-none absolute inset-y-0.5 left-0 z-10 w-4 rounded-l-[6px] bg-gradient-to-r from-bg-dark via-bg-dark/80 to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0.5 right-0 z-10 w-4 rounded-r-[6px] bg-gradient-to-l from-bg-dark via-bg-dark/80 to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0.5 left-1/2 z-[1] w-[3rem] -translate-x-1/2 rounded-[6px] border border-voz-config/15 bg-voz-config/5"
          aria-hidden="true"
        />

        <div
          className={`relative flex items-center justify-center overflow-hidden rounded-[8px] border border-border/70 bg-bg-dark/70 ${
            compact ? "h-10" : "h-11"
          }`}
          aria-label={`Nota objetivo ${formatTargetLabel(target)}`}
        >
          <div
            className={`flex items-center justify-center ${compact ? "gap-2.5" : "gap-3"}`}
          >
            <span
              className={`text-center font-semibold text-text-muted/40 ${
                compact ? "w-6 text-sm" : "w-7 text-base"
              }`}
            >
              {prevNote}
            </span>
            <span
              className={`min-w-[2.75rem] text-center font-extrabold leading-none text-voz-config/65 ${
                compact ? "text-2xl" : "text-[28px]"
              }`}
            >
              {displayNote}
            </span>
            <span
              className={`text-center font-semibold text-text-muted/40 ${
                compact ? "w-6 text-sm" : "w-7 text-base"
              }`}
            >
              {nextNote}
            </span>
          </div>
        </div>
      </div>

      <TapButton
        type="button"
        aria-label="Nota siguiente"
        disabled={disabled || !canGoUp}
        onClick={() => changeNote(1)}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
      >
        <ChevronRight className="size-4 text-text-primary" aria-hidden="true" />
      </TapButton>
    </div>
  );
}

function OctaveControls({
  displayOctave,
  safeOctaveIndex,
  disabled,
  onChangeOctave,
  density,
}: {
  displayOctave: number;
  safeOctaveIndex: number;
  disabled: boolean;
  onChangeOctave: (delta: number) => void;
  density: TargetPickerDensity;
}) {
  const compact = density === "compact";
  const buttonClass = `flex items-center justify-center rounded-full border border-border/70 bg-bg-dark/80 text-text-muted disabled:opacity-40 ${
    compact ? "size-6" : "size-7"
  }`;
  const iconClass = compact ? "size-3.5" : "size-4";
  const valueClass = compact
    ? "min-w-[2rem] text-center text-xs font-bold text-text-secondary/80"
    : "min-w-[2.5rem] text-center text-sm font-bold text-text-secondary/85";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Octava anterior"
        disabled={disabled || safeOctaveIndex === 0}
        onClick={() => onChangeOctave(-1)}
        className={buttonClass}
      >
        <ChevronDown className={iconClass} aria-hidden="true" />
      </button>
      <span className={valueClass}>{displayOctave}ª</span>
      <button
        type="button"
        aria-label="Octava siguiente"
        disabled={disabled || safeOctaveIndex === VOZ_OCTAVES.length - 1}
        onClick={() => onChangeOctave(1)}
        className={buttonClass}
      >
        <ChevronUp className={iconClass} aria-hidden="true" />
      </button>
    </div>
  );
}

export function TargetPickerBody({
  target,
  onSetTarget,
  disabled = false,
  density = "default",
}: TargetPickerBodyProps) {
  const compact = density === "compact";
  const octaveIndex = VOZ_OCTAVES.indexOf(clampTargetOctave(target.octave));
  const safeOctaveIndex = octaveIndex === -1 ? 0 : octaveIndex;
  const displayOctave = VOZ_OCTAVES[safeOctaveIndex]!;

  useEffect(() => {
    const clamped = clampTargetOctave(target.octave);

    if (clamped !== target.octave) {
      onSetTarget({ ...target, octave: clamped });
    }
  }, [onSetTarget, target, target.octave]);

  function changeOctave(delta: number) {
    const nextIndex = Math.max(
      0,
      Math.min(VOZ_OCTAVES.length - 1, safeOctaveIndex + delta),
    );
    onSetTarget({ ...target, octave: VOZ_OCTAVES[nextIndex]! });
  }

  const octaveSectionClass = compact
    ? "mt-1.5 rounded-[8px] border border-border/50 bg-bg-card/30 px-2 py-1.5"
    : "mt-1.5 flex justify-center";

  const octaveControls = (
    <OctaveControls
      displayOctave={displayOctave}
      safeOctaveIndex={safeOctaveIndex}
      disabled={disabled}
      onChangeOctave={changeOctave}
      density={density}
    />
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <NoteCarousel
            target={target}
            onSetTarget={onSetTarget}
            disabled={disabled}
            density={density}
          />
        </div>
        {octaveControls}
      </div>
    );
  }

  return (
    <>
      <NoteCarousel
        target={target}
        onSetTarget={onSetTarget}
        disabled={disabled}
        density={density}
      />

      <div className={octaveSectionClass}>
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-[10px] italic text-text-muted/45">
            Octava
          </span>
          {octaveControls}
        </div>
      </div>
    </>
  );
}

export function TargetPicker({
  target,
  onSetTarget,
  autoCollapseWhen = false,
  collapsible = true,
  disabled = false,
}: TargetPickerProps) {
  const [expanded, setExpanded] = useState(true);
  const collapsedLabel = formatTargetLabel(target);

  useEffect(() => {
    if (autoCollapseWhen) {
      setExpanded(false);
    }
  }, [autoCollapseWhen]);

  const pickerContent = (
    <TargetPickerBody
      target={target}
      onSetTarget={onSetTarget}
      disabled={disabled}
    />
  );

  if (!collapsible) {
    return <TargetPickerPanel>{pickerContent}</TargetPickerPanel>;
  }

  return (
    <div className={TARGET_PICKER_PANEL_CLASS}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left disabled:opacity-40"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className={`${TARGET_PICKER_PANEL_TITLE_CLASS} text-voz-config`}>
            Nota objetivo
          </p>
          {!expanded ? (
            <p className="mt-0.5 truncate text-base font-bold leading-tight text-voz-config/70">
              {collapsedLabel}
            </p>
          ) : null}
        </div>
        <ChevronDown
          className={`size-4 shrink-0 text-text-muted/60 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {expanded ? <div className="mt-2">{pickerContent}</div> : null}
    </div>
  );
}
