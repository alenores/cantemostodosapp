"use client";

import AddButton, { COLA_ADD_BUTTON_SIZE } from "@/components/ui/AddButton";
import { TapButton } from "@/components/ui/TapFeedback";
import { COLA_PANEL_TITLE } from "@/lib/cola-ui";
import { Shuffle, SkipForward, Trash2, X } from "lucide-react";

type ColaPanelHeaderProps = {
  pendientesCount: number;
  aleatorioActivo: boolean;
  onDeleteAll: () => void;
  onSiguiente: () => void;
  onAdd: () => void;
  onAleatorio: () => void;
  onClose?: () => void;
};

export default function ColaPanelHeader({
  pendientesCount,
  aleatorioActivo,
  onDeleteAll,
  onSiguiente,
  onAdd,
  onAleatorio,
  onClose,
}: ColaPanelHeaderProps) {
  return (
    <header className="relative shrink-0 border-b border-border bg-bg-cola-sheet px-4 py-3">
      <div className="relative flex items-center justify-center">
        <TapButton
          type="button"
          aria-label="Borrar toda la lista"
          onClick={onDeleteAll}
          className="absolute left-0 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-text-muted/50 active:text-text-secondary"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </TapButton>

        <h2 className="px-10 text-center text-lg font-bold text-text-primary">
          {COLA_PANEL_TITLE}
        </h2>

        {onClose ? (
          <TapButton
            type="button"
            aria-label="Cerrar fila"
            onClick={onClose}
            className="absolute right-0 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-text-muted/70 active:text-text-secondary"
          >
            <X className="size-5" aria-hidden="true" />
          </TapButton>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        <AddButton
          ariaLabel="Agregar canción"
          size={COLA_ADD_BUTTON_SIZE}
          onClick={onAdd}
        />

        <TapButton
          type="button"
          aria-label={
            aleatorioActivo ? "Desactivar aleatorio" : "Activar aleatorio"
          }
          aria-pressed={aleatorioActivo}
          onClick={onAleatorio}
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
            aleatorioActivo
              ? "bg-accent/20 text-accent"
              : "text-text-secondary active:text-text-primary"
          }`}
        >
          <Shuffle className="size-4" aria-hidden="true" />
        </TapButton>

        <TapButton
          type="button"
          aria-label="Siguiente canción"
          disabled={pendientesCount === 0}
          onClick={onSiguiente}
          className={`flex size-9 shrink-0 items-center justify-center rounded-full text-text-secondary ${
            pendientesCount === 0 ? "pointer-events-none opacity-40" : ""
          }`}
        >
          <SkipForward className="size-4" aria-hidden="true" />
        </TapButton>
      </div>
    </header>
  );
}
