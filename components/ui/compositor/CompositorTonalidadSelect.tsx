"use client";

import { CIFRADO_CONTROLS_INPUT_CLASS } from "@/components/cifrado/cifrado-controls-ui";
import { NOTAS_ES, type NotaIndex } from "@/lib/cifrado";
import { MODOS_TONALES, type ModoTonal } from "@/lib/cifrado-escala";
import { COMPOSITOR_TAB_TONALIDAD } from "@/lib/ritmo-terminologia";

type CompositorTonalidadSelectProps = {
  tonalidadComposicion: NotaIndex;
  modoTonalComposicion: ModoTonal;
  disabled?: boolean;
  showLabel?: boolean;
  onTonalidadChange: (value: NotaIndex) => void;
  onModoTonalChange: (value: ModoTonal) => void;
};

export function CompositorTonalidadSelect({
  tonalidadComposicion,
  modoTonalComposicion,
  disabled = false,
  showLabel = false,
  onTonalidadChange,
  onModoTonalChange,
}: CompositorTonalidadSelectProps) {
  const selectClassName = `${CIFRADO_CONTROLS_INPUT_CLASS} !min-h-8 !w-auto !min-w-[5.5rem] !py-1.5 text-[11px] font-bold disabled:opacity-50`;

  return (
    <div
      data-compositor-edit-surface=""
      className="flex shrink-0 flex-wrap items-center gap-2"
    >
      <label className="flex items-center gap-1.5">
        <span
          className={
            showLabel
              ? "text-[10px] font-bold uppercase tracking-wide text-compositor-config"
              : "sr-only"
          }
        >
          {showLabel ? "Tono" : COMPOSITOR_TAB_TONALIDAD}
        </span>
        <select
          value={tonalidadComposicion}
          disabled={disabled}
          onChange={(event) =>
            onTonalidadChange(Number(event.target.value) as NotaIndex)
          }
          className={selectClassName}
          aria-label="Tono de composición"
        >
          {NOTAS_ES.map((nota, index) => (
            <option key={nota} value={index}>
              {nota}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5">
        <span
          className={
            showLabel
              ? "text-[10px] font-bold uppercase tracking-wide text-compositor-config"
              : "sr-only"
          }
        >
          Modo
        </span>
        <select
          value={modoTonalComposicion}
          disabled={disabled}
          onChange={(event) =>
            onModoTonalChange(event.target.value as ModoTonal)
          }
          className={selectClassName}
          aria-label="Modo tonal de composición"
        >
          {MODOS_TONALES.map((modo) => (
            <option key={modo.id} value={modo.id}>
              {modo.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
