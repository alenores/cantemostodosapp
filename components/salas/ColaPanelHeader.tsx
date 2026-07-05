"use client";

import AddButton, { COLA_ADD_BUTTON_SIZE } from "@/components/ui/AddButton";
import { TapButton } from "@/components/ui/TapFeedback";
import { COLA_PANEL_TITLE } from "@/lib/cola-ui";
import { SkipForward, Trash2, X } from "lucide-react";

type ColaPanelHeaderProps = {
  pendientesCount: number;
  onDeleteAll: () => void;
  onSiguiente: () => void;
  onAdd: () => void;
  onClose?: () => void;
};

export default function ColaPanelHeader({
  pendientesCount,
  onDeleteAll,
  onSiguiente,
  onAdd,
  onClose,
}: ColaPanelHeaderProps) {
  return (
    <header className="relative shrink-0 border-b border-border bg-bg-cola-sheet px-4 py-3">
      <div className="flex items-center gap-2">
        <TapButton
          type="button"
          aria-label="Borrar toda la lista"
          onClick={onDeleteAll}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted/50 active:text-text-secondary"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </TapButton>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <h2 className="text-lg font-bold text-text-primary">{COLA_PANEL_TITLE}</h2>
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

        <AddButton
          ariaLabel="Agregar canción"
          size={COLA_ADD_BUTTON_SIZE}
          onClick={onAdd}
        />

        {onClose ? (
          <TapButton
            type="button"
            aria-label="Cerrar cola"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted/70 active:text-text-secondary"
          >
            <X className="size-5" aria-hidden="true" />
          </TapButton>
        ) : null}
      </div>
    </header>
  );
}
