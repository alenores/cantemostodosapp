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
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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

export function NoteCarousel({
  target,
  onSetTarget,
}: {
  target: VozTarget;
  onSetTarget: (target: VozTarget) => void;
}) {
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
        onClick={() => changeNote(-1)}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-dark"
      >
        <ChevronLeft className="size-4 text-text-primary" aria-hidden="true" />
      </button>

      <div className="relative min-w-0 flex-1">
        <div
          className="pointer-events-none absolute inset-y-1 left-0 z-10 w-5 rounded-l-[8px] bg-gradient-to-r from-bg-dark via-bg-dark/80 to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-1 right-0 z-10 w-5 rounded-r-[8px] bg-gradient-to-l from-bg-dark via-bg-dark/80 to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-1 left-1/2 z-[1] w-[3.75rem] -translate-x-1/2 rounded-[8px] border border-voz-config/35 bg-voz-config/10"
          aria-hidden="true"
        />

        <div
          className="relative flex h-14 items-center justify-center overflow-hidden rounded-[10px] border-2 border-border bg-bg-dark"
          aria-label={`Nota objetivo ${target.note}`}
        >
          <div className="flex items-center justify-center gap-4">
            <span className="w-8 text-center text-base font-semibold text-text-muted opacity-45">
              {prevNote}
            </span>
            <span className="min-w-[3.5rem] text-center text-[32px] font-extrabold leading-none text-voz-config">
              {target.note}
            </span>
            <span className="w-8 text-center text-base font-semibold text-text-muted opacity-45">
              {nextNote}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="Nota siguiente"
        onClick={() => changeNote(1)}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-dark"
      >
        <ChevronRight className="size-4 text-text-primary" aria-hidden="true" />
      </button>
    </div>
  );
}

export function TargetPicker({
  target,
  onSetTarget,
  octaveExact,
  onSetOctaveExact,
  autoCollapseWhen = false,
  collapsible = true,
}: TargetPickerProps) {
  const [expanded, setExpanded] = useState(true);
  const octaveIndex = VOZ_OCTAVES.indexOf(
    clampTargetOctave(target.octave),
  );
  const safeOctaveIndex = octaveIndex === -1 ? 0 : octaveIndex;
  const displayOctave = VOZ_OCTAVES[safeOctaveIndex]!;
  const collapsedLabel = formatTargetLabel(target, octaveExact);

  useEffect(() => {
    if (autoCollapseWhen) {
      setExpanded(false);
    }
  }, [autoCollapseWhen]);

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

  const pickerContent = (
    <>
      <div className={collapsible ? "mt-3" : "mt-2"}>
        <NoteCarousel target={target} onSetTarget={onSetTarget} />
      </div>

      <div className="mt-3 rounded-[10px] border border-border bg-bg-card/80 px-3 py-3">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm font-semibold text-text-primary">
            Octava exacta
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={octaveExact}
            onClick={() => onSetOctaveExact(!octaveExact)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              octaveExact
                ? "bg-voz-config"
                : "border border-border bg-bg-dark"
            }`}
          >
            <span
              className={`absolute top-0.5 size-6 rounded-full bg-white transition-transform ${
                octaveExact ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </label>

        {octaveExact ? (
          <>
            <p className="mb-2 mt-3 text-center text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Octava
            </p>
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                aria-label="Octava anterior"
                disabled={safeOctaveIndex === 0}
                onClick={() => changeOctave(-1)}
                className="flex size-8 items-center justify-center rounded-full border border-border bg-bg-dark disabled:opacity-40"
              >
                <ChevronLeft
                  className="size-4 text-text-primary"
                  aria-hidden="true"
                />
              </button>
              <span className="min-w-[3rem] text-center text-sm font-bold text-text-primary">
                {displayOctave}ª
              </span>
              <button
                type="button"
                aria-label="Octava siguiente"
                disabled={safeOctaveIndex === VOZ_OCTAVES.length - 1}
                onClick={() => changeOctave(1)}
                className="flex size-8 items-center justify-center rounded-full border border-border bg-bg-dark disabled:opacity-40"
              >
                <ChevronRight
                  className="size-4 text-text-primary"
                  aria-hidden="true"
                />
              </button>
            </div>
          </>
        ) : null}
      </div>
    </>
  );

  if (!collapsible) {
    return (
      <div className="rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-voz-config">
          Nota objetivo
        </p>
        {pickerContent}
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-voz-config">
            Nota objetivo
          </p>
          {!expanded ? (
            <p className="mt-0.5 truncate text-lg font-extrabold leading-tight text-voz-config">
              {collapsedLabel}
            </p>
          ) : null}
        </div>
        <ChevronDown
          className={`size-5 shrink-0 text-text-muted transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {expanded ? pickerContent : null}
    </div>
  );
}
