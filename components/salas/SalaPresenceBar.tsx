"use client";

import type { PresenceUsuario } from "@/types";

const PRESENCE_AVATAR_COLORS = [
  "#4A90D9",
  "#7B68EE",
  "#50C878",
  "#FF6B6B",
  "#FFB347",
  "#20B2AA",
] as const;

function colorPorUsuario(userId: string) {
  const index = userId.charCodeAt(0) % PRESENCE_AVATAR_COLORS.length;
  return PRESENCE_AVATAR_COLORS[index];
}

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
        <div className="flex items-center">
          {usuarios.slice(0, 4).map((usuario, index) => (
            <div
              key={`${usuario.user_id}-${index}`}
              className={index > 0 ? "-ml-2" : undefined}
            >
              {usuario.avatar_url ? (
                <img
                  src={usuario.avatar_url}
                  alt={usuario.nombre}
                  className="size-7 rounded-full border border-bg-sala object-cover"
                />
              ) : (
                <div
                  className="flex size-7 items-center justify-center rounded-full border border-bg-sala text-xs font-bold text-white"
                  style={{
                    background: colorPorUsuario(usuario.user_id),
                  }}
                >
                  {usuario.nombre.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ))}
          {usuarios.length > 4 ? (
            <div className="-ml-2 flex size-7 items-center justify-center rounded-full border border-bg-sala bg-bg-card text-[10px] text-text-muted">
              +{usuarios.length - 4}
            </div>
          ) : null}
        </div>

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
