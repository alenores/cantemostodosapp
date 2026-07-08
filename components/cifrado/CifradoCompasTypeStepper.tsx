"use client";

import { ToolNumericStepper } from "@/components/ui/ToolNumericStepper";
import {
  cycleTipoCompas,
  getBeatCountForCompas,
  tipoCompasFromBeatCount,
  TIPO_COMPAS_ORDER,
  type TipoCompas,
} from "@/lib/cifrado";
import { RITMO_LABEL_COMPAS } from "@/lib/ritmo-terminologia";

type CifradoCompasTypeStepperProps = {
  tipoCompas: TipoCompas;
  onTipoCompasChange: (tipo: TipoCompas) => void;
  labelClass: string;
  density?: "default" | "compact";
};

export function CifradoCompasTypeStepper({
  tipoCompas,
  onTipoCompasChange,
  labelClass,
  density = "compact",
}: CifradoCompasTypeStepperProps) {
  const typeIndex = TIPO_COMPAS_ORDER.indexOf(tipoCompas);
  const beatCount = getBeatCountForCompas(tipoCompas);

  return (
    <div className="min-w-[8.5rem] shrink-0">
      <p className={labelClass}>{RITMO_LABEL_COMPAS}</p>
      <div className="mt-1.5">
        <ToolNumericStepper
          value={beatCount}
          density={density}
          decrementDisabled={typeIndex <= 0}
          incrementDisabled={typeIndex >= TIPO_COMPAS_ORDER.length - 1}
          decrementAriaLabel="Compás anterior"
          incrementAriaLabel="Compás siguiente"
          inputId="cifrado-tipo-compas"
          min={3}
          max={6}
          onDecrement={() => onTipoCompasChange(cycleTipoCompas(tipoCompas, -1))}
          onIncrement={() => onTipoCompasChange(cycleTipoCompas(tipoCompas, 1))}
          onSetValue={(value) => {
            const nextTipo = tipoCompasFromBeatCount(value);

            if (nextTipo) {
              onTipoCompasChange(nextTipo);
            }
          }}
        />
      </div>
    </div>
  );
}
