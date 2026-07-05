"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import type { Sala } from "@/types";
import { X } from "lucide-react";

type AgregarSalaModalProps = {
  open: boolean;
  cancionNombre: string;
  salas: Pick<Sala, "id" | "nombre" | "descripcion">[];
  onSelectSala: (salaId: number) => void;
  onClose: () => void;
};

export default function AgregarSalaModal({
  open,
  cancionNombre,
  salas,
  onSelectSala,
  onClose,
}: AgregarSalaModalProps) {
  useHardwareBack(open, onClose);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8 sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agregar-sala-titulo"
        className="relative z-10 max-h-[80vh] w-full max-w-md overflow-y-auto rounded-[16px] border border-border bg-bg-card p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">
              Agregar a sala
            </p>
            <h2
              id="agregar-sala-titulo"
              className="mt-1 truncate text-lg font-extrabold text-text-primary"
            >
              {cancionNombre}
            </h2>
          </div>
          <TapButton
            aria-label="Cerrar"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-app text-text-primary"
          >
            <X className="size-5" aria-hidden="true" />
          </TapButton>
        </div>

        {salas.length === 0 ? (
          <p className="text-sm text-text-muted">
            No hay salas visibles disponibles.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {salas.map((sala) => (
              <li key={sala.id}>
                <TapButton
                  onClick={() => onSelectSala(sala.id)}
                  className="flex w-full min-h-11 flex-col items-start rounded-[12px] border border-border bg-bg-card px-4 py-3 text-left"
                >
                  <span className="text-base font-semibold text-text-primary">
                    {sala.nombre}
                  </span>
                  {sala.descripcion && (
                    <span className="mt-0.5 text-sm text-text-muted">
                      {sala.descripcion}
                    </span>
                  )}
                </TapButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
