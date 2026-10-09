"use client";

import PresenceAvatarStack from "@/components/salas/PresenceAvatarStack";
import { triggerHaptic } from "@/lib/haptic";
import type { PresenceUsuario, Sala, SalaMiembro } from "@/types";
import { ArrowRight, Loader2, MoreHorizontal, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";

type SalaRef = Pick<Sala, "id" | "nombre" | "descripcion" | "avatar_url">;

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_CANCEL_PX = 10;

type SalaCardProps = {
  sala: SalaRef;
  disabled?: boolean;
  miembros?: SalaMiembro[];
  onOpen: (sala: SalaRef) => void;
  onOpenMiembros: (sala: SalaRef) => void;
  onEdit: (sala: SalaRef) => void;
};

export default function SalaCard({
  sala,
  disabled = false,
  miembros = [],
  onOpen,
  onOpenMiembros,
  onEdit,
}: SalaCardProps) {
  const [pending, setPending] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);

  const avatares = useMemo((): PresenceUsuario[] => {
    return miembros.map((m) => ({
      user_id: m.user_id,
      nombre: m.nombre,
      avatar_url: m.avatar_url,
    }));
  }, [miembros]);

  function clearLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;
  }

  useEffect(() => () => clearLongPress(), []);

  function handleOpen() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (pending || disabled) {
      return;
    }

    setPending(true);
    onOpen(sala);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || pending || disabled) {
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest("[data-sala-editar]")) {
      return;
    }
    clearLongPress();
    longPressStartRef.current = { x: event.clientX, y: event.clientY };
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      suppressClickRef.current = true;
      triggerHaptic();
      onEdit(sala);
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = longPressStartRef.current;
    if (!start) {
      return;
    }
    if (
      Math.abs(event.clientX - start.x) >= LONG_PRESS_MOVE_CANCEL_PX ||
      Math.abs(event.clientY - start.y) >= LONG_PRESS_MOVE_CANCEL_PX
    ) {
      clearLongPress();
    }
  }

  function handleEdit(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) {
      return;
    }
    onEdit(sala);
  }

  function handleOpenMiembros(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (disabled) {
      return;
    }
    onOpenMiembros(sala);
  }

  const inicial = (sala.nombre.trim()[0] ?? "?").toUpperCase();

  return (
    <div
      className={`home-destination-card relative flex w-full flex-col overflow-hidden rounded-[28px] ${disabled ? "opacity-50" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onContextMenu={(event) => {
        event.preventDefault();
        if (!disabled) {
          onEdit(sala);
        }
      }}
    >
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
        className="relative block h-[188px] w-full overflow-hidden text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        {sala.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sala.avatar_url}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center bg-[#3a3a3d]"
            aria-hidden="true"
          >
            <span className="text-[72px] font-extrabold leading-none text-white/20">
              {inicial}
            </span>
          </span>
        )}
        <span
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.28)_46%,transparent_72%)]"
          aria-hidden="true"
        />
        <span className="absolute inset-x-0 bottom-0 flex items-end gap-3 px-4 pb-3.5">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[22px] font-extrabold leading-tight text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.65)]">
              {sala.nombre}
            </span>
            {sala.descripcion ? (
              <span className="mt-1 block truncate text-[13px] text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.55)]">
                {sala.descripcion}
              </span>
            ) : null}
          </span>
          <ArrowRight className="mb-0.5 size-5 shrink-0 text-white" aria-hidden="true" />
        </span>
      </button>

      {!disabled ? (
        <button
          type="button"
          data-sala-editar=""
          aria-label={`Editar ${sala.nombre}`}
          onClick={handleEdit}
          className="absolute right-2 top-2 z-20 flex size-10 items-center justify-center text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]"
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </button>
      ) : null}

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
        className="flex min-h-11 w-full items-center justify-between gap-2 border-t border-white/10 px-4 py-3 text-left text-[12px] text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
