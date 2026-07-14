"use client";

import PresenceAvatarStack from "@/components/salas/PresenceAvatarStack";
import SalaAvatar from "@/components/salas/SalaAvatar";
import { TapButton } from "@/components/ui/TapFeedback";
import type { PresenceUsuario, Sala, SalaMiembro } from "@/types";
import { Loader2, Users } from "lucide-react";
import { useMemo, useState, type CSSProperties, type MouseEvent } from "react";

type SalaRef = Pick<Sala, "id" | "nombre" | "descripcion" | "avatar_url">;

type SalaCardProps = {
  sala: SalaRef;
  disabled?: boolean;
  miembros?: SalaMiembro[];
  cascadeDelayMs?: number;
  onOpen: (sala: SalaRef) => void;
  onOpenMiembros: (sala: SalaRef) => void;
};

export default function SalaCard({
  sala,
  disabled = false,
  miembros = [],
  cascadeDelayMs = 0,
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

  const cardStyle = {
    borderColor: "color-mix(in srgb, var(--accent-salas) 45%, var(--border-card))",
    boxShadow:
      "0 0 0 1px color-mix(in srgb, var(--accent-salas) 12%, transparent), 0 6px 18px color-mix(in srgb, var(--accent-salas) 8%, transparent)",
    ["--cascade-delay" as string]: `${cascadeDelayMs}ms`,
  } satisfies CSSProperties;

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
    <div
      style={cardStyle}
      className={`home-cascade-item relative flex min-h-[4.25rem] w-full items-stretch gap-2 rounded-2xl border border-solid bg-bg-card p-1.5 transition-[border-color,background-color,box-shadow] duration-200 lg:min-h-[4.75rem] ${
        disabled ? "opacity-50" : "lg:hover:bg-bg-card-hover"
      }`}
    >
      {pending && (
        <span
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-bg-card/70"
          aria-hidden="true"
        >
          <Loader2
            className="size-5 animate-spin"
            style={{ color: "var(--accent-salas)" }}
          />
        </span>
      )}

      <TapButton
        aria-label={
          disabled
            ? `${sala.nombre} no disponible sin conexión`
            : `Abrir ${sala.nombre}`
        }
        onClick={handleOpen}
        disabled={pending || disabled}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-[14px] px-3 py-2.5 text-left lg:px-4"
      >
        <SalaAvatar
          nombre={sala.nombre}
          avatarUrl={sala.avatar_url}
          sizeClassName="size-10"
          roundedClassName="rounded-xl"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-extrabold text-text-primary">
            {sala.nombre}
          </span>
          {sala.descripcion ? (
            <span className="mt-0.5 block truncate text-sm text-text-muted">
              {sala.descripcion}
            </span>
          ) : (
            <span className="mt-0.5 block text-sm text-text-faint">
              Tocar para entrar
            </span>
          )}
        </span>
      </TapButton>

      <TapButton
        type="button"
        aria-label={
          avatares.length > 0
            ? `Ver miembros de ${sala.nombre}, ${avatares.length}`
            : `Ver miembros de ${sala.nombre}`
        }
        title="Ver miembros"
        onClick={handleOpenMiembros}
        disabled={disabled}
        className="flex w-[4.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-[14px] border border-border/80 bg-bg-app/60 px-1.5 py-2 transition-[background-color,border-color] duration-200 lg:w-[5.25rem] lg:hover:border-[color-mix(in_srgb,var(--accent-salas)_45%,var(--border-card))] lg:hover:bg-[var(--accent-salas-dim)]"
      >
        {avatares.length > 0 ? (
          <>
            <PresenceAvatarStack
              usuarios={avatares}
              maxVisible={3}
              sizeClassName="size-6"
              borderClassName="border-bg-card"
            />
            <span className="text-[10px] font-medium text-text-muted">
              {avatares.length}{" "}
              {avatares.length === 1 ? "miembro" : "miembros"}
            </span>
          </>
        ) : (
          <>
            <Users className="size-4 text-text-muted" aria-hidden="true" />
            <span className="text-[10px] font-medium text-text-muted">
              Miembros
            </span>
          </>
        )}
      </TapButton>
    </div>
  );
}
