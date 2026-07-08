"use client";

import { CompositorDesktopTempoBar } from "@/components/ui/compositor/CompositorDesktopTempoBar";
import { TargetPickerBody } from "@/components/ui/entrenador-vocal/EntrenadorVocalShared";
import { ToolNumericStepper } from "@/components/ui/ToolNumericStepper";
import {
  BEATS_PER_MEASURE_MAX,
  BEATS_PER_MEASURE_MIN,
  getBeatDurationAtIndex,
  getBeatDurationLabel,
  getBeatDurationOptionIndex,
  type MetronomeBeatDuration,
} from "@/lib/metronomo";
import {
  ritmoDesktopSectionHintClass,
  ritmoDesktopSectionTitleClass,
} from "@/lib/ritmo-compas-ui";
import {
  RITMO_DESKTOP_CLICK_HINT,
  RITMO_LABEL_FIGURA_DESKTOP,
  RITMO_LABEL_GOLPES_TAB,
  RITMO_LABEL_NOTAS,
} from "@/lib/ritmo-terminologia";
import { formatTargetLabel, type VozTarget } from "@/lib/voz";
import {
  getActiveNotaSlice,
  type VozNotaPattern,
} from "@/lib/voz-nota-patron";
import { useEffect, useState } from "react";

const FIGURA_GLYPH: Record<MetronomeBeatDuration, string> = {
  redonda: "○",
  blanca: "𝅗𝅥",
  negra: "♩",
  corchea: "♪",
  semicorchea: "𝅘𝅥𝅯",
};

const DESKTOP_FIELD_LABEL_CLASS =
  "mb-1 text-[9px] font-semibold uppercase tracking-wide text-text-muted";

const BEAT_SLOT_BUTTON_CLASS =
  "flex h-6 min-w-[2rem] flex-1 items-center justify-center rounded border border-border bg-bg-dark px-1 text-[10px] font-bold text-text-secondary disabled:opacity-40 hover:border-border-strong";

export function VozMelodiaDesktopConfig({
  patternLength,
  beatDuration,
  bpm,
  isPlaying,
  tapTempoTapCount,
  notePattern,
  onSetPatternLength,
  onSetBeatDuration,
  onSetNoteAtSlot,
  onSetBpm,
  onTapTempo,
}: {
  patternLength: number;
  beatDuration: MetronomeBeatDuration;
  bpm: number;
  isPlaying: boolean;
  tapTempoTapCount: number;
  notePattern: VozNotaPattern;
  onSetPatternLength: (value: number) => void;
  onSetBeatDuration: (value: MetronomeBeatDuration) => void;
  onSetNoteAtSlot: (slotIndex: number, target: VozTarget) => void;
  onSetBpm: (value: number) => void;
  onTapTempo: () => void;
}) {
  const [selectedBeatIndex, setSelectedBeatIndex] = useState(0);
  const activeNotes = getActiveNotaSlice(notePattern, patternLength);
  const selectedNote =
    activeNotes[selectedBeatIndex] ?? activeNotes[0] ?? notePattern[0]!;

  useEffect(() => {
    setSelectedBeatIndex((previous) =>
      Math.min(previous, Math.max(0, patternLength - 1)),
    );
  }, [patternLength]);

  function cycleFigura() {
    const nextIndex =
      (getBeatDurationOptionIndex(beatDuration) + 1) % 5;
    onSetBeatDuration(getBeatDurationAtIndex(nextIndex));
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end gap-6">
        <div className="min-w-[10rem]">
          <p className={ritmoDesktopSectionTitleClass("voz")}>
            {RITMO_LABEL_GOLPES_TAB}
          </p>
          <ToolNumericStepper
            value={patternLength}
            density="compact"
            disabled={isPlaying}
            decrementDisabled={patternLength <= BEATS_PER_MEASURE_MIN}
            incrementDisabled={patternLength >= BEATS_PER_MEASURE_MAX}
            decrementAriaLabel="Reducir golpes"
            incrementAriaLabel="Aumentar golpes"
            onDecrement={() => onSetPatternLength(patternLength - 1)}
            onIncrement={() => onSetPatternLength(patternLength + 1)}
          />
        </div>

        <div className="min-w-[7.5rem]">
          <p className={ritmoDesktopSectionTitleClass("voz")}>
            {RITMO_LABEL_FIGURA_DESKTOP}
          </p>
          <p className={ritmoDesktopSectionHintClass}>{RITMO_DESKTOP_CLICK_HINT}</p>
          <button
            type="button"
            disabled={isPlaying}
            onClick={cycleFigura}
            title={getBeatDurationLabel(beatDuration)}
            className="mt-2 flex h-6 w-full min-w-[2.25rem] items-center justify-center rounded border border-border bg-bg-dark text-sm text-text-secondary disabled:opacity-40 hover:border-border-strong"
          >
            {FIGURA_GLYPH[beatDuration]}
          </button>
        </div>
      </div>

      <div>
        <p className={DESKTOP_FIELD_LABEL_CLASS}>{RITMO_LABEL_NOTAS}</p>
        <div className="flex gap-1">
          {activeNotes.map((noteTarget, index) => {
            const isSelected = selectedBeatIndex === index;

            return (
              <button
                key={`melodia-note-slot-${index}`}
                type="button"
                disabled={isPlaying}
                onClick={() => setSelectedBeatIndex(index)}
                title={`Golpe ${index + 1}: ${formatTargetLabel(noteTarget)}`}
                aria-pressed={isSelected}
                className={`${BEAT_SLOT_BUTTON_CLASS} ${
                  isSelected
                    ? "border-voz-config bg-voz-config/15 text-voz-config"
                    : ""
                }`}
              >
                {formatTargetLabel(noteTarget)}
              </button>
            );
          })}
        </div>

        <div className="mt-3 rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3">
          <TargetPickerBody
            target={selectedNote}
            disabled={isPlaying}
            onSetTarget={(nextTarget) =>
              onSetNoteAtSlot(selectedBeatIndex, nextTarget)
            }
          />
        </div>
      </div>

      <CompositorDesktopTempoBar
        bpm={bpm}
        isPlaying={isPlaying}
        tapTempoTapCount={tapTempoTapCount}
        disabled={isPlaying}
        accent="voz"
        onSetBpm={onSetBpm}
        onTapTempo={onTapTempo}
      />
    </div>
  );
}
