"use client";

import {
  CIFRADO_CONTROLS_INPUT_CLASS,
  CIFRADO_CONTROLS_SECTION_LABEL_CLASS,
} from "@/components/cifrado/cifrado-controls-ui";
import { normalizeNotaIndex, type NotaIndex } from "@/lib/cifrado";
import { MODOS_TONALES, type ModoTonal } from "@/lib/cifrado-escala";
import { getNotaLabel, type NotacionAcordes } from "@/lib/notacion-acordes";
import { TapButton } from "@/components/ui/TapFeedback";
import { ChevronDown, ChevronUp } from "lucide-react";
import AppSelect from "@/components/ui/AppSelect";

const NOTA_INDICES = Array.from({ length: 12 }, (_, index) => index as NotaIndex);

export type CifradoTonalidadFieldsProps = {
  idPrefix?: string;
  notacion: NotacionAcordes;
  tonalidadIndex: NotaIndex | null;
  modoTonal: ModoTonal | null;
  layout?: "stacked" | "inline";
  showModoTonal?: boolean;
  showTonalidadStepButtons?: boolean;
  fieldLabelClassName?: string;
  /** Sin valor elegido, el botón muestra «Elegí…» (siempre activo con la lista propia). */
  requireSelection?: boolean;
  inputClassName?: string;
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
  showTonalidadStepButtons = false,
  fieldLabelClassName = CIFRADO_CONTROLS_SECTION_LABEL_CLASS,
  inputClassName = CIFRADO_CONTROLS_INPUT_CLASS,
  onTonalidadChange,
  onModoTonalChange,
}: CifradoTonalidadFieldsProps) {
  const selectClassName =
    layout === "inline"
      ? `${inputClassName} !min-h-9 !w-auto !min-w-[5.5rem]`
      : `${inputClassName} !w-full`;

  const containerClassName =
    layout === "inline"
      ? "flex flex-wrap items-end gap-3"
      : "grid grid-cols-1 gap-3 sm:grid-cols-2";

  return (
    <div className={containerClassName}>
      <div>
        <label htmlFor={`${idPrefix}-tonalidad`}>
          <span className={fieldLabelClassName}>Tono</span>
        </label>
        <div className={showTonalidadStepButtons ? "flex items-center gap-2" : undefined}>
          {showTonalidadStepButtons ? (
            <TapButton
              type="button"
              aria-label="Bajar un semitono"
              disabled={tonalidadIndex === null}
              onClick={() => {
                if (tonalidadIndex !== null) {
                  onTonalidadChange(normalizeNotaIndex(tonalidadIndex - 1));
                }
              }}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-card text-text-primary disabled:opacity-50"
            >
              <ChevronDown className="size-4" aria-hidden="true" />
            </TapButton>
          ) : null}
          <AppSelect
            id={`${idPrefix}-tonalidad`}
            title="Elegir tono"
            placeholder="Elegí el tono"
            value={tonalidadIndex}
            options={NOTA_INDICES.map((index) => ({
              value: index,
              label: getNotaLabel(index, notacion),
            }))}
            onChange={onTonalidadChange}
            className={selectClassName}
            style={showTonalidadStepButtons ? { width: "auto", minWidth: 0, flex: 1 } : undefined}
          />
          {showTonalidadStepButtons ? (
            <TapButton
              type="button"
              aria-label="Subir un semitono"
              disabled={tonalidadIndex === null}
              onClick={() => {
                if (tonalidadIndex !== null) {
                  onTonalidadChange(normalizeNotaIndex(tonalidadIndex + 1));
                }
              }}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-card text-text-primary disabled:opacity-50"
            >
              <ChevronUp className="size-4" aria-hidden="true" />
            </TapButton>
          ) : null}
        </div>
      </div>

      {showModoTonal ? (
        <label htmlFor={`${idPrefix}-modo-tonal`}>
          <span className={fieldLabelClassName}>Modo</span>
          <AppSelect
            id={`${idPrefix}-modo-tonal`}
            title="Elegir modo"
            placeholder="Elegí el modo"
            value={modoTonal}
            options={MODOS_TONALES.map((modo) => ({ value: modo.id, label: modo.label }))}
            onChange={onModoTonalChange}
            className={selectClassName}
          />
        </label>
      ) : null}
    </div>
  );
}
