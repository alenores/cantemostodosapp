"use client";

import PresenceAvatarStack from "@/components/salas/PresenceAvatarStack";
import { TapButton } from "@/components/ui/TapFeedback";
import type { PresenceUsuario } from "@/types";
import { QrCode } from "lucide-react";

type SalaPresenceBarProps = {
  usuarios: PresenceUsuario[];
  onOpenInvite?: () => void;
};

export default function SalaPresenceBar({
  usuarios,
  onOpenInvite,
}: SalaPresenceBarProps) {
  if (usuarios.length === 0 && !onOpenInvite) {
    return null;
  }

  return (
    <div
      className="shrink-0 bg-bg-sala px-4 py-2"
      role="status"
      aria-label={
        usuarios.length > 0
          ? `${usuarios.length} personas conectadas en la sala`
          : "Invitar a la sala"
      }
    >
      <div className="flex items-center gap-2">
        {onOpenInvite ? (
          <TapButton
            type="button"
            aria-label="Mostrar código QR de invitación"
            onClick={onOpenInvite}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-text-muted hover:text-accent"
          >
            <QrCode className="size-3.5" strokeWidth={2} aria-hidden="true" />
          </TapButton>
        ) : null}

        {usuarios.length > 0 ? (
          <PresenceAvatarStack usuarios={usuarios} />
        ) : null}

        <div className="flex-1" aria-hidden="true" />

        {usuarios.length > 0 ? (
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
        ) : null}
      </div>
    </div>
  );
}
