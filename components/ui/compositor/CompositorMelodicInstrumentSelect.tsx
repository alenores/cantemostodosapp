"use client";

import { CIFRADO_CONTROLS_INPUT_CLASS } from "@/components/cifrado/cifrado-controls-ui";
import {
  COMPOSITOR_INSTRUMENT_OPTIONS,
  type CompositorMelodicInstrumentId,
} from "@/lib/compositor";

const MELODIC_INSTRUMENT_IDS = ["piano", "guitarra", "viento"] as const;

const MELODIC_INSTRUMENT_OPTIONS = COMPOSITOR_INSTRUMENT_OPTIONS.filter(
  (option) =>
    (MELODIC_INSTRUMENT_IDS as readonly string[]).includes(option.id),
);

type CompositorMelodicInstrumentSelectProps = {
  activeTrackId: CompositorMelodicInstrumentId;
  disabled?: boolean;
  showLabel?: boolean;
  onInstrumentChange: (instrumentId: CompositorMelodicInstrumentId) => void;
};

export function CompositorMelodicInstrumentSelect({
  activeTrackId,
  disabled = false,
  showLabel = false,
  onInstrumentChange,
}: CompositorMelodicInstrumentSelectProps) {
  return (
    <label
      data-compositor-edit-surface=""
      className="flex shrink-0 items-center gap-1.5"
    >
      <span
        className={
          showLabel
            ? "text-[10px] font-bold uppercase tracking-wide text-compositor-config"
            : "sr-only"
        }
      >
        Instrumento
      </span>
      <select
        value={activeTrackId}
        disabled={disabled}
        onChange={(event) =>
          onInstrumentChange(
            event.target.value as CompositorMelodicInstrumentId,
          )
        }
        className={`${CIFRADO_CONTROLS_INPUT_CLASS} !min-h-8 !w-auto !min-w-[5.5rem] !py-1.5 text-[11px] font-bold disabled:opacity-50`}
        aria-label="Instrumento melódico"
      >
        {MELODIC_INSTRUMENT_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
