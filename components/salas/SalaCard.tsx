"use client";

import PresenceAvatarStack from "@/components/salas/PresenceAvatarStack";
import { TapButton } from "@/components/ui/TapFeedback";
import type { PresenceUsuario, Sala } from "@/types";
import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";

type SalaCardProps = {
  sala: Pick<Sala, "id" | "nombre" | "descripcion">;
  disabled?: boolean;
  usuariosActivos?: PresenceUsuario[];
  onOpen: (sala: Pick<Sala, "id" | "nombre" | "descripcion">) => void;
};

export default function SalaCard({
  sala,
  disabled = false,
  usuariosActivos = [],
  onOpen,
}: SalaCardProps) {
  const [pending, setPending] = useState(false);

  function handleOpen() {
    if (pending || disabled) {
      return;
    }

    setPending(true);
    onOpen(sala);
  }

  return (
    <TapButton
      aria-label={
        disabled
          ? `${sala.nombre} no disponible sin conexión`
          : usuariosActivos.length > 0
            ? `Abrir ${sala.nombre}, ${usuariosActivos.length} en la sala`
            : `Abrir ${sala.nombre}`
      }
      onClick={handleOpen}
      disabled={pending || disabled}
      className="relative flex min-h-11 w-full items-center gap-3 rounded-[12px] border border-border bg-bg-card px-4 py-3 text-left transition-[border-color,background-color] duration-200 disabled:opacity-50 lg:min-h-[4.5rem] lg:px-5 lg:py-4 lg:hover:border-accent/35 lg:hover:bg-bg-card-hover"
    >
      {pending && (
        <span
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-bg-card/70"
          aria-hidden="true"
        >
          <Loader2 className="size-5 animate-spin text-accent" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-text-primary">
          {sala.nombre}
        </p>
        {sala.descripcion && (
          <p className="truncate text-sm text-text-muted">{sala.descripcion}</p>
        )}
      </div>
      {usuariosActivos.length > 0 ? (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <PresenceAvatarStack
            usuarios={usuariosActivos}
            maxVisible={3}
            sizeClassName="size-6"
            borderClassName="border-bg-card"
          />
          <span className="text-[10px] text-text-muted">
            {usuariosActivos.length} en la sala
          </span>
        </div>
      ) : null}
      <ArrowRight className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
    </TapButton>
  );
}
