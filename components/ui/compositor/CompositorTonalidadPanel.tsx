"use client";

import { CIFRADO_CONTROLS_INPUT_CLASS } from "@/components/cifrado/cifrado-controls-ui";
import { NOTAS_ES, type NotaIndex } from "@/lib/cifrado";
import { COMPOSITOR_HELP_TONALIDAD_COMPOSICION } from "@/lib/ritmo-terminologia";

type CompositorTonalidadPanelProps = {
  tonalidadComposicion: NotaIndex;
  disabled?: boolean;
  onTonalidadChange: (value: NotaIndex) => void;
};

export function CompositorTonalidadPanel({
  tonalidadComposicion,
  disabled = false,
  onTonalidadChange,
}: CompositorTonalidadPanelProps) {
  return (
    <div className="rounded-[10px] border border-border bg-bg-card px-3 py-3">
      <label htmlFor="compositor-tonalidad-composicion">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-compositor-config">
          Tonalidad de composición
        </span>
        <select
          id="compositor-tonalidad-composicion"
          value={tonalidadComposicion}
          disabled={disabled}
          onChange={(event) =>
            onTonalidadChange(Number(event.target.value) as NotaIndex)
          }
          className={`${CIFRADO_CONTROLS_INPUT_CLASS} !min-h-9 !w-full !py-2 text-xs font-semibold disabled:opacity-50`}
        >
          {NOTAS_ES.map((nota, index) => (
            <option key={nota} value={index}>
              {nota}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-[11px] leading-snug text-text-muted">
        {COMPOSITOR_HELP_TONALIDAD_COMPOSICION}
      </p>
    </div>
  );
}
