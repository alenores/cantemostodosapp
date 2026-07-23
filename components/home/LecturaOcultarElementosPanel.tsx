"use client";

import { ToolSwitch } from "@/components/ui/ToolSwitch";
import { TapButton } from "@/components/ui/TapFeedback";
import {
  ANOTACION_TIPO_LABEL,
  ANOTACION_TIPOS,
  type AnotacionTipo,
  type AnotacionVisibility,
} from "@/lib/anotaciones-practica";
import {
  MODO_LECTURA_SUBPANEL_BACKDROP_Z_CLASS,
  MODO_LECTURA_SUBPANEL_DIALOG_Z_CLASS,
} from "@/lib/sala-layout";
import { X } from "lucide-react";

type LecturaOcultarElementosPanelProps = {
  open: boolean;
  acordesOcultos: boolean;
  anotacionesVisibility: AnotacionVisibility;
  anotacionTiposPresentes: AnotacionTipo[];
  onToggleAcordesOcultos: () => void;
  onToggleAnotacionTipo: (tipo: AnotacionTipo) => void;
  onClose: () => void;
};

type OcultarItem = {
  key: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
};

export default function LecturaOcultarElementosPanel({
  open,
  acordesOcultos,
  anotacionesVisibility,
  anotacionTiposPresentes,
  onToggleAcordesOcultos,
  onToggleAnotacionTipo,
  onClose,
}: LecturaOcultarElementosPanelProps) {
  if (!open) {
    return null;
  }

  const items: OcultarItem[] = [
    {
      key: "acordes",
      label: "Acordes",
      visible: !acordesOcultos,
      onToggle: onToggleAcordesOcultos,
    },
  ];

  for (const tipo of ANOTACION_TIPOS) {
    if (!anotacionTiposPresentes.includes(tipo)) {
      continue;
    }

    items.push({
      key: tipo,
      label: ANOTACION_TIPO_LABEL[tipo],
      visible: anotacionesVisibility[tipo],
      onToggle: () => onToggleAnotacionTipo(tipo),
    });
  }

  return (
    <>
      <button
        type="button"
        data-no-tap-feedback
        className={`fixed inset-0 cursor-default border-0 bg-black/40 outline-none lg:hidden ${MODO_LECTURA_SUBPANEL_BACKDROP_Z_CLASS}`}
        aria-label="Cerrar ocultar elementos"
        onClick={onClose}
      />

      <div
        className={`pointer-events-none fixed inset-0 flex items-center justify-center p-6 lg:hidden ${MODO_LECTURA_SUBPANEL_DIALOG_Z_CLASS}`}
        role="dialog"
        aria-label="Ocultar elementos"
      >
        <div className="pointer-events-auto flex w-full max-w-[18rem] flex-col items-stretch gap-3 rounded-2xl border border-border/50 bg-bg-dark/95 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <div className="relative flex items-center justify-center">
            <p className="text-center text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Ocultar elementos
            </p>
            <TapButton
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="absolute -right-1 -top-1 flex size-7 items-center justify-center rounded-full text-text-muted"
            >
              <X className="size-4" aria-hidden="true" />
            </TapButton>
          </div>

          <div className="flex flex-col gap-2.5">
            {items.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3"
              >
                <span className="min-w-0 text-sm font-medium text-text-primary">
                  {item.label}
                </span>
                <ToolSwitch
                  checked={item.visible}
                  onChange={item.onToggle}
                  size="md"
                  accentVar="--accent-entrenador-canciones"
                  aria-label={
                    item.visible
                      ? `Ocultar ${item.label.toLowerCase()}`
                      : `Mostrar ${item.label.toLowerCase()}`
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
