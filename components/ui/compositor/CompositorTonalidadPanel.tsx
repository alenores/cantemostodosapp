"use client";

import { CIFRADO_CONTROLS_INPUT_CLASS } from "@/components/cifrado/cifrado-controls-ui";
import { NOTAS_ES, type NotaIndex } from "@/lib/cifrado";
import { MODOS_TONALES, type ModoTonal } from "@/lib/cifrado-escala";
import { COMPOSITOR_HELP_TONALIDAD_COMPOSICION } from "@/lib/ritmo-terminologia";
import AppSelect from "@/components/ui/AppSelect";

type CompositorTonalidadPanelProps = {
  tonalidadComposicion: NotaIndex;
  modoTonalComposicion: ModoTonal;
  disabled?: boolean;
  onTonalidadChange: (value: NotaIndex) => void;
  onModoTonalChange: (value: ModoTonal) => void;
};

export function CompositorTonalidadPanel({
  tonalidadComposicion,
  modoTonalComposicion,
  disabled = false,
  onTonalidadChange,
  onModoTonalChange,
}: CompositorTonalidadPanelProps) {
  const selectClassName = `${CIFRADO_CONTROLS_INPUT_CLASS} !min-h-9 !w-full !py-2 text-xs font-semibold disabled:opacity-50`;

  return (
    <div className="rounded-[10px] border border-border bg-bg-card px-3 py-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-compositor-config">
        Tonalidad de composición
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label htmlFor="compositor-tonalidad-composicion">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-compositor-config">
            Tono
          </span>
          <AppSelect
            id="compositor-tonalidad-composicion"
            title="Tono de composición"
            value={tonalidadComposicion}
            disabled={disabled}
            options={NOTAS_ES.map((nota, index) => ({ value: index as NotaIndex, label: nota }))}
            onChange={onTonalidadChange}
            className={selectClassName}
          />
        </label>

        <label htmlFor="compositor-modo-tonal-composicion">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-compositor-config">
            Modo
          </span>
          <AppSelect
            id="compositor-modo-tonal-composicion"
            title="Modo tonal de composición"
            value={modoTonalComposicion}
            disabled={disabled}
            options={MODOS_TONALES.map((modo) => ({ value: modo.id, label: modo.label }))}
            onChange={onModoTonalChange}
            className={selectClassName}
          />
        </label>
      </div>

      <p className="mt-2 text-[11px] leading-snug text-text-muted">
        {COMPOSITOR_HELP_TONALIDAD_COMPOSICION}
      </p>
    </div>
  );
}
