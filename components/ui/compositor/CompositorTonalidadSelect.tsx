"use client";

import { CIFRADO_CONTROLS_INPUT_CLASS } from "@/components/cifrado/cifrado-controls-ui";
import { NOTAS_ES, type NotaIndex } from "@/lib/cifrado";
import { COMPOSITOR_TAB_TONALIDAD } from "@/lib/ritmo-terminologia";

type CompositorTonalidadSelectProps = {
  tonalidadComposicion: NotaIndex;
  disabled?: boolean;
  showLabel?: boolean;
  onTonalidadChange: (value: NotaIndex) => void;
};

export function CompositorTonalidadSelect({
  tonalidadComposicion,
  disabled = false,
  showLabel = false,
  onTonalidadChange,
}: CompositorTonalidadSelectProps) {
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
        {COMPOSITOR_TAB_TONALIDAD}
      </span>
      <select
        value={tonalidadComposicion}
        disabled={disabled}
        onChange={(event) =>
          onTonalidadChange(Number(event.target.value) as NotaIndex)
        }
        className={`${CIFRADO_CONTROLS_INPUT_CLASS} !min-h-8 !w-auto !min-w-[5.5rem] !py-1.5 text-[11px] font-bold disabled:opacity-50`}
        aria-label="Tonalidad de composición"
      >
        {NOTAS_ES.map((nota, index) => (
          <option key={nota} value={index}>
            {nota}
          </option>
        ))}
      </select>
    </label>
  );
}
