"use client";

import { CIFRADO_CONTROLS_INPUT_CLASS } from "@/components/cifrado/cifrado-controls-ui";
import {
  COMPOSITOR_INSTRUMENT_OPTIONS,
  type CompositorMelodicInstrumentId,
} from "@/lib/compositor";
import AppSelect from "@/components/ui/AppSelect";

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
      <AppSelect
        title="Instrumento melódico"
        value={activeTrackId}
        disabled={disabled}
        options={MELODIC_INSTRUMENT_OPTIONS.map((option) => ({
          value: option.id as CompositorMelodicInstrumentId,
          label: option.label,
        }))}
        onChange={onInstrumentChange}
        className={`${CIFRADO_CONTROLS_INPUT_CLASS} !min-h-8 !w-auto !min-w-[5.5rem] !py-1.5 text-[11px] font-bold`}
        aria-label="Instrumento melódico"
      />
    </label>
  );
}
