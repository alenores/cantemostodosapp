"use client";

import LetraTexto from "@/components/salas/LetraTexto";
import { TapButton } from "@/components/ui/TapFeedback";
import type { CancionCancionero } from "@/types";
import { X } from "lucide-react";

type CancioneroVerModalProps = {
  open: boolean;
  cancion: CancionCancionero | null;
  onClose: () => void;
};

export default function CancioneroVerModal({
  open,
  cancion,
  onClose,
}: CancioneroVerModalProps) {
  if (!open || !cancion) {
    return null;
  }

  const tieneLetra = Boolean(cancion.letra?.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6">
      <button
        type="button"
        aria-label="Cerrar canción"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancionero-ver-titulo"
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      >
        <header className="shrink-0 border-b border-border bg-bg-dark px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2
                id="cancionero-ver-titulo"
                className="text-lg font-extrabold text-accent"
              >
                {cancion.nombre}
              </h2>
              {cancion.artista && (
                <p className="mt-0.5 truncate text-sm text-text-muted">
                  {cancion.artista}
                </p>
              )}
            </div>
            <TapButton
              aria-label="Cerrar"
              onClick={onClose}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              <X className="size-5 text-text-primary" aria-hidden="true" />
            </TapButton>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {tieneLetra ? (
            <LetraTexto texto={cancion.letra!} />
          ) : (
            <p className="py-8 text-center text-sm text-text-muted">
              Esta canción no tiene letra guardada.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
