"use client";

import { CifradoCompasTypeStepper } from "@/components/cifrado/CifradoCompasTypeStepper";
import CifradoIntensidadPatternRow from "@/components/cifrado/CifradoIntensidadPatternRow";
import {
  CIFRADO_EDITOR_LINE_FAB_BUTTON_CLASS,
  CIFRADO_EDITOR_LINE_FAB_DELETE_PRIMARY_CLASS,
  CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS,
} from "@/components/cifrado/cifrado-controls-ui";
import { TapButton } from "@/components/ui/TapFeedback";
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import { RITMO_LABEL_INTENSIDAD } from "@/lib/ritmo-terminologia";
import { GripHorizontal, Trash2, X } from "lucide-react";

type CifradoMobileCompasPanelProps = {
  cycleGolpes: number;
  onCycleGolpesChange: (golpes: number) => void;
  intensidadPattern: MetronomeBeatLevel[];
  onCycleIntensidadSlot: (slotIndex: number) => void;
  selectedCompasNumero: number | null;
  onClearSelection: () => void;
  onStartDrag?: () => void;
  onRemove?: () => void;
};

/**
 * Controles de Compás bajo el renglón activo (celular).
 */
export function CifradoMobileCompasPanel({
  cycleGolpes,
  onCycleGolpesChange,
  intensidadPattern,
  onCycleIntensidadSlot,
  selectedCompasNumero,
  onClearSelection,
  onStartDrag,
  onRemove,
}: CifradoMobileCompasPanelProps) {
  const hasSelection = selectedCompasNumero !== null;

  return (
    <div className="space-y-3 rounded-[12px] border border-border/80 bg-surface/80 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-primary">
          {hasSelection ? `Compás ${selectedCompasNumero}` : "Nuevo compás"}
        </p>
        {hasSelection ? (
          <TapButton
            type="button"
            onClick={onClearSelection}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-text-muted"
            aria-label="Dejar de editar este compás"
          >
            <X className="size-3.5" aria-hidden="true" />
            Listo
          </TapButton>
        ) : null}
      </div>

      {!hasSelection ? (
        <p className="text-xs text-text-muted">
          Tocá el renglón para poner un compás. Con dos o más se ven los golpes
          entre medias.
        </p>
      ) : null}

      {!hasSelection ? (
        <CifradoCompasTypeStepper
          cycleGolpes={cycleGolpes}
          onCycleGolpesChange={onCycleGolpesChange}
          labelClass={CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS}
        />
      ) : null}

      <div>
        <p className={CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS}>
          {RITMO_LABEL_INTENSIDAD}
        </p>
        <div className="mt-1.5 min-w-0">
          <CifradoIntensidadPatternRow
            pattern={intensidadPattern}
            onCycleSlot={onCycleIntensidadSlot}
            showClearSelection={hasSelection}
            onClearSelection={onClearSelection}
            fluid
          />
        </div>
      </div>

      {hasSelection ? (
        <div className="flex flex-wrap items-center gap-2">
          {onStartDrag ? (
            <TapButton
              type="button"
              onClick={onStartDrag}
              className={`inline-flex items-center gap-1.5 ${CIFRADO_EDITOR_LINE_FAB_BUTTON_CLASS}`}
            >
              <GripHorizontal className="size-3.5" aria-hidden="true" />
              Arrastrar
            </TapButton>
          ) : null}
          {onRemove ? (
            <TapButton
              type="button"
              onClick={onRemove}
              className={`inline-flex items-center gap-1.5 ${CIFRADO_EDITOR_LINE_FAB_DELETE_PRIMARY_CLASS}`}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Eliminar
            </TapButton>
          ) : null}
        </div>
      ) : (
        <p className="text-center text-[11px] text-text-muted">
          La intensidad de arriba se usa al poner compases nuevos.
        </p>
      )}
    </div>
  );
}
