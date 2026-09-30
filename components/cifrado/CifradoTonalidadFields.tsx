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
  requireSelection = false,
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
          <select
            id={`${idPrefix}-tonalidad`}
            value={tonalidadIndex ?? ""}
            onChange={(event) => {
              const next = event.target.value;

              if (!next) {
                return;
              }

              onTonalidadChange(Number(next) as NotaIndex);
            }}
            className={selectClassName}
            style={showTonalidadStepButtons ? { width: "auto", minWidth: 0, flex: 1 } : undefined}
          >
            {requireSelection ? (
              <option value="" disabled>
                Elegí el tono
              </option>
            ) : null}
            {NOTA_INDICES.map((index) => (
              <option key={index} value={index}>
                {getNotaLabel(index, notacion)}
              </option>
            ))}
          </select>
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
          <select
            id={`${idPrefix}-modo-tonal`}
            value={modoTonal ?? ""}
            onChange={(event) => {
              const next = event.target.value;

              if (!next) {
                return;
              }

              onModoTonalChange(next as ModoTonal);
            }}
            className={selectClassName}
          >
            {requireSelection ? (
              <option value="" disabled>
                Elegí el modo
              </option>
            ) : null}
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
