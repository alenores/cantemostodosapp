"use client";

import {
  CIFRADO_CONTROLS_INPUT_CLASS,
  CIFRADO_CONTROLS_SECTION_LABEL_CLASS,
} from "@/components/cifrado/cifrado-controls-ui";
import type { NotaIndex } from "@/lib/cifrado";
import { MODOS_TONALES, type ModoTonal } from "@/lib/cifrado-escala";
import { getNotaLabel, type NotacionAcordes } from "@/lib/notacion-acordes";

const NOTA_INDICES = Array.from({ length: 12 }, (_, index) => index as NotaIndex);

export type CifradoTonalidadFieldsProps = {
  idPrefix?: string;
  notacion: NotacionAcordes;
  tonalidadIndex: NotaIndex;
  modoTonal: ModoTonal;
  layout?: "stacked" | "inline";
  showModoTonal?: boolean;
  onTonalidadChange: (next: NotaIndex) => void;
  onModoTonalChange: (next: ModoTonal) => void;
};

export function CifradoTonalidadFields({
  idPrefix = "cifrado",
  notacion,
  tonalidadIndex,
  modoTonal,
  layout = "stacked",
  showModoTonal = true,
  onTonalidadChange,
  onModoTonalChange,
}: CifradoTonalidadFieldsProps) {
  const selectClassName =
    layout === "inline"
      ? `${CIFRADO_CONTROLS_INPUT_CLASS} !min-h-9 !w-auto !min-w-[5.5rem]`
      : `${CIFRADO_CONTROLS_INPUT_CLASS} !w-full`;

  const containerClassName =
    layout === "inline"
      ? "flex flex-wrap items-end gap-3"
      : "grid grid-cols-1 gap-3 sm:grid-cols-2";

  return (
    <div className={containerClassName}>
      <label htmlFor={`${idPrefix}-tonalidad`}>
        <span className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}>Tono</span>
        <select
          id={`${idPrefix}-tonalidad`}
          value={tonalidadIndex}
          onChange={(event) =>
            onTonalidadChange(Number(event.target.value) as NotaIndex)
          }
          className={selectClassName}
        >
          {NOTA_INDICES.map((index) => (
            <option key={index} value={index}>
              {getNotaLabel(index, notacion)}
            </option>
          ))}
        </select>
      </label>

      {showModoTonal ? (
        <label htmlFor={`${idPrefix}-modo-tonal`}>
          <span className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}>Modo</span>
          <select
            id={`${idPrefix}-modo-tonal`}
            value={modoTonal}
            onChange={(event) =>
              onModoTonalChange(event.target.value as ModoTonal)
            }
            className={selectClassName}
          >
            {MODOS_TONALES.map((modo) => (
              <option key={modo.id} value={modo.id}>
                {modo.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
