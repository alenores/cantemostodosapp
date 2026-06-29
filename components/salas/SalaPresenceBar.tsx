"use client";

import PresenceAvatarStack from "@/components/salas/PresenceAvatarStack";
import type { PresenceUsuario } from "@/types";

type SalaPresenceBarProps = {
  usuarios: PresenceUsuario[];
};

export default function SalaPresenceBar({ usuarios }: SalaPresenceBarProps) {
  if (usuarios.length === 0) {
    return null;
  }

  return (
    <div
      className="shrink-0 bg-bg-sala px-4 py-2"
      role="status"
      aria-label={`${usuarios.length} personas conectadas en la sala`}
    >
      <div className="flex items-center gap-2">
        <PresenceAvatarStack usuarios={usuarios} />

        <div className="flex-1" aria-hidden="true" />

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-text-muted">
            {usuarios.length} en la sala
          </span>
          <span className="flex items-center gap-1 text-[10px] text-green-400">
            <span
              className="size-1.5 shrink-0 rounded-full bg-green-400"
              aria-hidden="true"
            />
            en vivo
          </span>
        </div>
      </div>
    </div>
  );
}
