"use client";

import { NOTE_NAMES } from "@/lib/afinador";
import {
  clampTargetOctave,
  formatTargetLabel,
  getNoteAtSemitoneOffset,
  getNoteIndex,
  VOZ_OCTAVES,
  type VozTarget,
} from "@/lib/voz";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export {
  ToolConfigSection as VozConfigSection,
  ToolPracticeSection as VozPracticeSection,
} from "@/components/ui/ToolModalSections";

export type TargetPickerProps = {
  target: VozTarget;
  onSetTarget: (target: VozTarget) => void;
  octaveExact: boolean;
  onSetOctaveExact: (value: boolean) => void;
  autoCollapseWhen?: boolean;
  collapsible?: boolean;
  disabled?: boolean;
};

export type TargetPickerDensity = "default" | "compact";

export type TargetPickerBodyProps = {
  target: VozTarget;
  onSetTarget: (target: VozTarget) => void;
  octaveExact: boolean;
  onSetOctaveExact: (value: boolean) => void;
  disabled?: boolean;
  /** Si es false, la octava siempre es editable (sin toggle «octava exacta»). */
  showOctaveExactToggle?: boolean;
  density?: TargetPickerDensity;
  /** Dirección de las flechas del selector de octava. */
  octaveChevrons?: "horizontal" | "vertical";
};

function wrapIndex(index: number): number {
  return ((index % 12) + 12) % 12;
}

function shiftTargetNote(target: VozTarget, delta: number): VozTarget {
  return {
    ...target,
    note: getNoteAtSemitoneOffset(target.note, delta),
  };
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
  const noteIndex = getNoteIndex(target.note);
  const safeIndex = noteIndex === -1 ? 0 : noteIndex;
  const prevNote = NOTE_NAMES[wrapIndex(safeIndex - 1)];
  const nextNote = NOTE_NAMES[wrapIndex(safeIndex + 1)];

  const changeNote = useCallback(
    (delta: number) => {
      onSetTarget(shiftTargetNote(target, delta));
    },
    [onSetTarget, target],
  );

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Nota anterior"
        disabled={disabled}
        onClick={() => changeNote(-1)}
        className={`flex shrink-0 items-center justify-center rounded-full border border-border/70 bg-bg-dark/80 text-text-muted disabled:opacity-40 ${
          compact ? "size-7" : "size-8"
        }`}
      >
        <ChevronLeft
          className={compact ? "size-3.5" : "size-4"}
          aria-hidden="true"
        />
      </button>

      <div className="relative min-w-0 flex-1">
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
          aria-label={`Nota objetivo ${target.note}`}
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
              {target.note}
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

      <button
        type="button"
        aria-label="Nota siguiente"
        disabled={disabled}
        onClick={() => changeNote(1)}
        className={`flex shrink-0 items-center justify-center rounded-full border border-border/70 bg-bg-dark/80 text-text-muted disabled:opacity-40 ${
          compact ? "size-7" : "size-8"
        }`}
      >
        <ChevronRight
          className={compact ? "size-3.5" : "size-4"}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

function OctaveControls({
  displayOctave,
  safeOctaveIndex,
  disabled,
  onChangeOctave,
  density,
  chevrons,
}: {
  displayOctave: number;
  safeOctaveIndex: number;
  disabled: boolean;
  onChangeOctave: (delta: number) => void;
  density: TargetPickerDensity;
  chevrons: "horizontal" | "vertical";
}) {
  const compact = density === "compact";
  const buttonClass = `flex items-center justify-center rounded-full border border-border/70 bg-bg-dark/80 text-text-muted disabled:opacity-40 ${
    compact ? "size-6" : "size-7"
  }`;
  const iconClass = compact ? "size-3.5" : "size-4";
  const valueClass = compact
    ? "min-w-[2rem] text-center text-xs font-bold text-text-secondary/80"
    : "min-w-[2.5rem] text-center text-sm font-bold text-text-secondary/85";

  if (chevrons === "vertical") {
    return (
      <div className="flex items-center gap-2">
        {!compact ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted/60">
            Octava
          </span>
        ) : null}
        <div className="flex flex-col items-center gap-0">
          <button
            type="button"
            aria-label="Octava siguiente"
            disabled={disabled || safeOctaveIndex === VOZ_OCTAVES.length - 1}
            onClick={() => onChangeOctave(1)}
            className={buttonClass}
          >
            <ChevronUp className={iconClass} aria-hidden="true" />
          </button>
          <span className={valueClass}>{displayOctave}ª</span>
          <button
            type="button"
            aria-label="Octava anterior"
            disabled={disabled || safeOctaveIndex === 0}
            onClick={() => onChangeOctave(-1)}
            className={buttonClass}
          >
            <ChevronDown className={iconClass} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "flex items-center justify-center gap-1"
          : "flex items-center justify-center gap-1"
      }
    >
      <button
        type="button"
        aria-label="Octava anterior"
        disabled={disabled || safeOctaveIndex === 0}
        onClick={() => onChangeOctave(-1)}
        className={buttonClass}
      >
        <ChevronLeft className={iconClass} aria-hidden="true" />
      </button>
      <span className={valueClass}>{displayOctave}ª</span>
      <button
        type="button"
        aria-label="Octava siguiente"
        disabled={disabled || safeOctaveIndex === VOZ_OCTAVES.length - 1}
        onClick={() => onChangeOctave(1)}
        className={buttonClass}
      >
        <ChevronRight className={iconClass} aria-hidden="true" />
      </button>
    </div>
  );
}

function OctaveExactToggle({
  octaveExact,
  disabled,
  onSetOctaveExact,
  compact,
}: {
  octaveExact: boolean;
  disabled: boolean;
  onSetOctaveExact: (value: boolean) => void;
  compact: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2">
      <span
        className={`font-medium text-text-muted/80 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        Octava exacta
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={octaveExact}
        disabled={disabled}
        onClick={() => onSetOctaveExact(!octaveExact)}
        className={`relative shrink-0 rounded-full transition-colors disabled:opacity-40 ${
          compact ? "h-6 w-10" : "h-6 w-11"
        } ${
          octaveExact
            ? "bg-voz-config/55"
            : "border border-border/70 bg-bg-dark/80"
        }`}
      >
        <span
          className={`absolute top-0.5 rounded-full bg-white/95 transition-transform ${
            compact ? "size-5" : "size-5"
          } ${octaveExact ? (compact ? "left-[18px]" : "left-[20px]") : "left-0.5"}`}
        />
      </button>
    </label>
  );
}

export function TargetPickerBody({
  target,
  onSetTarget,
  octaveExact,
  onSetOctaveExact,
  disabled = false,
  showOctaveExactToggle = true,
  density = "default",
  octaveChevrons = "horizontal",
}: TargetPickerBodyProps) {
  const compact = density === "compact";
  const octaveIndex = VOZ_OCTAVES.indexOf(clampTargetOctave(target.octave));
  const safeOctaveIndex = octaveIndex === -1 ? 0 : octaveIndex;
  const displayOctave = VOZ_OCTAVES[safeOctaveIndex]!;
  const showOctaveControls = showOctaveExactToggle ? octaveExact : true;

  useEffect(() => {
    if (!octaveExact) {
      return;
    }

    const clamped = clampTargetOctave(target.octave);

    if (clamped !== target.octave) {
      onSetTarget({ ...target, octave: clamped });
    }
  }, [octaveExact, onSetTarget, target, target.octave]);

  function changeOctave(delta: number) {
    const nextIndex = Math.max(
      0,
      Math.min(VOZ_OCTAVES.length - 1, safeOctaveIndex + delta),
    );
    onSetTarget({ ...target, octave: VOZ_OCTAVES[nextIndex]! });
  }

  const octaveSectionClass = compact
    ? "mt-1.5 rounded-[8px] border border-border/50 bg-bg-card/30 px-2 py-1.5"
    : "mt-2 rounded-[8px] border border-border/60 bg-bg-card/35 px-2.5 py-2";

  const octaveOnlyInline = compact && !showOctaveExactToggle && showOctaveControls;

  if (octaveOnlyInline) {
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
        <OctaveControls
          displayOctave={displayOctave}
          safeOctaveIndex={safeOctaveIndex}
          disabled={disabled}
          onChangeOctave={changeOctave}
          density={density}
          chevrons={octaveChevrons}
        />
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

      {showOctaveExactToggle ? (
        <div className={octaveSectionClass}>
          <OctaveExactToggle
            octaveExact={octaveExact}
            disabled={disabled}
            onSetOctaveExact={onSetOctaveExact}
            compact={compact}
          />

          {showOctaveControls ? (
            <div className={compact ? "mt-1 flex justify-center" : "mt-1.5"}>
              {!compact ? (
                <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-text-muted/55">
                  Octava
                </p>
              ) : null}
              <OctaveControls
                displayOctave={displayOctave}
                safeOctaveIndex={safeOctaveIndex}
                disabled={disabled}
                onChangeOctave={changeOctave}
                density={density}
                chevrons={octaveChevrons}
              />
            </div>
          ) : null}
        </div>
      ) : showOctaveControls ? (
        <div
          className={
            compact
              ? "mt-1.5 flex items-center justify-center gap-2 py-0.5"
              : octaveSectionClass
          }
        >
          {!compact ? (
            <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-text-muted/55">
              Octava
            </p>
          ) : null}
          <OctaveControls
            displayOctave={displayOctave}
            safeOctaveIndex={safeOctaveIndex}
            disabled={disabled}
            onChangeOctave={changeOctave}
            density={density}
            chevrons={octaveChevrons}
          />
        </div>
      ) : null}
    </>
  );
}

export function TargetPicker({
  target,
  onSetTarget,
  octaveExact,
  onSetOctaveExact,
  autoCollapseWhen = false,
  collapsible = true,
  disabled = false,
}: TargetPickerProps) {
  const [expanded, setExpanded] = useState(true);
  const collapsedLabel = formatTargetLabel(target, octaveExact);

  useEffect(() => {
    if (autoCollapseWhen) {
      setExpanded(false);
    }
  }, [autoCollapseWhen]);

  const pickerContent = (
    <div className={collapsible ? "mt-2" : "mt-1.5"}>
      <TargetPickerBody
        target={target}
        onSetTarget={onSetTarget}
        octaveExact={octaveExact}
        onSetOctaveExact={onSetOctaveExact}
        disabled={disabled}
      />
    </div>
  );

  if (!collapsible) {
    return (
      <div className="rounded-[10px] border border-border/60 bg-bg-dark/40 px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-voz-config/60">
          Nota objetivo
        </p>
        {pickerContent}
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-border/60 bg-bg-dark/40 px-2.5 py-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left disabled:opacity-40"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-voz-config/60">
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

      {expanded ? pickerContent : null}
    </div>
  );
}
