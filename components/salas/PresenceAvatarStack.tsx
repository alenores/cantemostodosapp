"use client";

import { colorPorUsuario } from "@/lib/presence";
import type { PresenceUsuario } from "@/types";

type PresenceAvatarStackProps = {
  usuarios: PresenceUsuario[];
  maxVisible?: number;
  sizeClassName?: string;
  borderClassName?: string;
  overflowClassName?: string;
};

export default function PresenceAvatarStack({
  usuarios,
  maxVisible = 4,
  sizeClassName = "size-7",
  borderClassName = "border-bg-sala",
  overflowClassName = "bg-bg-card text-text-muted",
}: PresenceAvatarStackProps) {
  if (usuarios.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center" aria-hidden="true">
      {usuarios.slice(0, maxVisible).map((usuario, index) => (
        <div
          key={usuario.user_id}
          className={index > 0 ? "-ml-2" : undefined}
        >
          {usuario.avatar_url ? (
            <img
              src={usuario.avatar_url}
              alt=""
              className={`${sizeClassName} rounded-full border object-cover ${borderClassName}`}
            />
          ) : (
            <div
              className={`flex ${sizeClassName} items-center justify-center rounded-full border text-xs font-bold text-white ${borderClassName}`}
              style={{
                background: colorPorUsuario(usuario.user_id),
              }}
            >
              {usuario.nombre.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}
      {usuarios.length > maxVisible ? (
        <div
          className={`-ml-2 flex ${sizeClassName} items-center justify-center rounded-full border text-[10px] ${borderClassName} ${overflowClassName}`}
        >
          +{usuarios.length - maxVisible}
        </div>
      ) : null}
    </div>
  );
}
