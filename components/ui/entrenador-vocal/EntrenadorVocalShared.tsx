"use client";

import { NOTE_NAMES } from "@/lib/afinador";
import {
  getNoteAtSemitoneOffset,
  getNoteIndex,
  VOZ_OCTAVES,
  type VozTarget,
} from "@/lib/voz";
import { useDrag } from "@use-gesture/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useState } from "react";

const NOTE_DRAG_THRESHOLD_PX = 36;

export type TargetPickerProps = {
  target: VozTarget;
  onSetTarget: (target: VozTarget) => void;
  octaveExact: boolean;
  onSetOctaveExact: (value: boolean) => void;
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
  const [dragX, setDragX] = useState(0);
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

  const bind = useDrag(
    ({ movement: [mx], last }) => {
      if (last) {
        if (mx < -NOTE_DRAG_THRESHOLD_PX) {
          changeNote(1);
        } else if (mx > NOTE_DRAG_THRESHOLD_PX) {
          changeNote(-1);
        }

        setDragX(0);
        return;
      }

      setDragX(mx);
    },
    { axis: "x", filterTaps: true },
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

      <div
        {...bind()}
        className="relative min-h-[52px] flex-1 touch-pan-y overflow-hidden select-none"
        aria-label={`Nota objetivo ${target.note}. Deslizá para cambiar.`}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={11}
        aria-valuenow={safeIndex}
      >
        <div
          className="flex h-full items-center justify-center gap-5 transition-none"
          style={{ transform: `translateX(${dragX}px)` }}
        >
          <span className="w-9 text-center text-lg font-semibold text-text-muted opacity-50">
            {prevNote}
          </span>
          <span className="min-w-[3.5rem] text-center text-[32px] font-extrabold leading-none text-accent">
            {target.note}
          </span>
          <span className="w-9 text-center text-lg font-semibold text-text-muted opacity-50">
            {nextNote}
          </span>
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
}: TargetPickerProps) {
  const octaveIndex = VOZ_OCTAVES.indexOf(
    target.octave as (typeof VOZ_OCTAVES)[number],
  );
  const safeOctaveIndex = octaveIndex === -1 ? 1 : octaveIndex;

  function changeOctave(delta: number) {
    const nextIndex = Math.max(
      0,
      Math.min(VOZ_OCTAVES.length - 1, safeOctaveIndex + delta),
    );
    onSetTarget({ ...target, octave: VOZ_OCTAVES[nextIndex] });
  }

  return (
    <div className="rounded-[12px] border border-border bg-bg-card px-3 py-3">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted">
        Nota objetivo
      </p>

      <NoteCarousel target={target} onSetTarget={onSetTarget} />

      <div className="mt-3 border-t border-border pt-3">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-sm font-semibold text-text-primary">
              Octava exacta
            </span>
            <span className="mt-0.5 block text-xs text-text-muted">
              {octaveExact ? "Nota y octava" : "Cualquier octava"}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={octaveExact}
            onClick={() => onSetOctaveExact(!octaveExact)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              octaveExact ? "bg-accent" : "border border-border bg-bg-dark"
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
          <div className="mt-3 flex items-center justify-center gap-1 border-t border-border pt-3">
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
            <span className="min-w-[5rem] text-center text-sm font-bold text-text-primary">
              {target.octave}ª octava
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
        ) : null}
      </div>
    </div>
  );
}
