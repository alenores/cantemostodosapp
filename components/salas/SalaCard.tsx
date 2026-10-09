"use client";

import PresenceAvatarStack from "@/components/salas/PresenceAvatarStack";
import SalaAvatar from "@/components/salas/SalaAvatar";
import type { PresenceUsuario, Sala, SalaMiembro } from "@/types";
import { ArrowRight, Loader2, Users } from "lucide-react";
import { useMemo, useState, type MouseEvent } from "react";

type SalaRef = Pick<Sala, "id" | "nombre" | "descripcion" | "avatar_url">;

type SalaCardProps = {
  sala: SalaRef;
  disabled?: boolean;
  miembros?: SalaMiembro[];
  onOpen: (sala: SalaRef) => void;
  onOpenMiembros: (sala: SalaRef) => void;
};

export default function SalaCard({
  sala,
  disabled = false,
  miembros = [],
  onOpen,
  onOpenMiembros,
}: SalaCardProps) {
  const [pending, setPending] = useState(false);

  const avatares = useMemo((): PresenceUsuario[] => {
    return miembros.map((m) => ({
      user_id: m.user_id,
      nombre: m.nombre,
      avatar_url: m.avatar_url,
    }));
  }, [miembros]);

  function handleOpen() {
    if (pending || disabled) {
      return;
    }

    setPending(true);
    onOpen(sala);
  }

  function handleOpenMiembros(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) {
      return;
    }
    onOpenMiembros(sala);
  }

  return (
    <div className={`home-destination-card relative flex min-h-[148px] w-full flex-col rounded-[28px] px-4 py-3.5 ${disabled ? "opacity-50" : ""}`}>
      {pending && (
        <span
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-[#29292b]/75"
          aria-hidden="true"
        >
          <Loader2 className="size-5 animate-spin text-white" />
        </span>
      )}

      <button
        type="button"
        data-no-tap-feedback
        aria-label={
          disabled
            ? `${sala.nombre} no disponible sin conexión`
            : `Abrir ${sala.nombre}`
        }
        onClick={handleOpen}
        disabled={pending || disabled}
        className="flex min-h-[82px] w-full min-w-0 items-center gap-4 rounded-2xl text-left transition-transform active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <SalaAvatar
          nombre={sala.nombre}
          avatarUrl={sala.avatar_url}
          sizeClassName="size-16"
          iconClassName="size-7"
          roundedClassName="rounded-2xl"
          neutral
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[19px] font-extrabold leading-tight text-text-primary">
            {sala.nombre}
          </span>
          {sala.descripcion ? (
            <span className="mt-1 block truncate text-[13px] text-text-muted">
              {sala.descripcion}
            </span>
          ) : (
            <span className="mt-1 block text-[13px] text-text-muted">
              Entrar a la sala
            </span>
          )}
        </span>
        <ArrowRight className="size-5 shrink-0 text-text-secondary" aria-hidden="true" />
      </button>

      <button
        type="button"
        data-no-tap-feedback
        aria-label={
          avatares.length > 0
            ? `Ver miembros de ${sala.nombre}, ${avatares.length}`
            : `Ver miembros de ${sala.nombre}`
        }
        title="Ver miembros"
        onClick={handleOpenMiembros}
        disabled={disabled}
        className="mt-3 flex min-h-11 w-full items-center justify-between gap-2 border-t border-white/10 pt-3 text-left text-[12px] text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="font-medium">Participantes</span>
        {avatares.length > 0 ? (
          <span className="flex items-center gap-2">
            <PresenceAvatarStack
              usuarios={avatares}
              maxVisible={3}
              sizeClassName="size-7"
              borderClassName="border-[#2d2d2f]"
            />
            <span className="font-semibold text-text-secondary">
              {avatares.length}
            </span>
          </span>
        ) : (
          <Users className="size-5 text-text-secondary" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
