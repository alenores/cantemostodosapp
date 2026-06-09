"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import type { CancionCancionero } from "@/types";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";

type CancioneroItemCardProps = {
  cancion: CancionCancionero;
  onAgregarSala: (cancion: CancionCancionero) => void;
  onEditar: (cancion: CancionCancionero) => void;
  onEliminar: (cancion: CancionCancionero) => void;
};

export default function CancioneroItemCard({
  cancion,
  onAgregarSala,
  onEditar,
  onEliminar,
}: CancioneroItemCardProps) {
  const tieneLetra = Boolean(cancion.letra?.trim());

  return (
    <article className="rounded-[12px] border border-border bg-bg-card px-4 py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-bold text-text-primary">
              {cancion.nombre}
            </p>
            {tieneLetra && (
              <FileText
                className="size-4 shrink-0"
                style={{ color: "var(--tuner-in-tune)" }}
                aria-label="Tiene letra guardada"
              />
            )}
          </div>
          {cancion.artista && (
            <p className="mt-0.5 truncate text-sm text-text-muted">
              {cancion.artista}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <TapButton
          aria-label={`Agregar ${cancion.nombre} a una sala`}
          onClick={() => onAgregarSala(cancion)}
          className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-bg-card px-2 text-sm font-semibold text-text-primary"
        >
          <Plus className="size-4 shrink-0" aria-hidden="true" />
          <span>Agregar a sala</span>
        </TapButton>

        <TapButton
          aria-label={`Editar ${cancion.nombre}`}
          onClick={() => onEditar(cancion)}
          className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-bg-card text-text-primary"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </TapButton>

        <TapButton
          aria-label={`Eliminar ${cancion.nombre}`}
          onClick={() => onEliminar(cancion)}
          className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-bg-card text-text-primary"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </TapButton>
      </div>
    </article>
  );
}
