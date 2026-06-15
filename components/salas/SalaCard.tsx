"use client";

import { TapButton, TapLink } from "@/components/ui/TapFeedback";
import type { Sala } from "@/types";
import { ArrowRight } from "lucide-react";

type SalaCardProps = {
  sala: Pick<Sala, "id" | "nombre" | "descripcion">;
  offline?: boolean;
};

export default function SalaCard({ sala, offline = false }: SalaCardProps) {
  if (offline) {
    return (
      <TapButton
        aria-label={`${sala.nombre} (requiere conexión)`}
        disabled
        className="flex min-h-11 w-full items-center gap-3 rounded-[12px] border border-border bg-bg-card px-4 py-3 opacity-50"
      >
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-base font-bold text-text-primary">
            {sala.nombre}
          </p>
          {sala.descripcion && (
            <p className="truncate text-sm text-text-muted">{sala.descripcion}</p>
          )}
        </div>
        <ArrowRight className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
      </TapButton>
    );
  }

  return (
    <TapLink
      href={`/salas/${sala.id}`}
      className="flex min-h-11 items-center gap-3 rounded-[12px] border border-border bg-bg-card px-4 py-3"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-text-primary">
          {sala.nombre}
        </p>
        {sala.descripcion && (
          <p className="truncate text-sm text-text-muted">{sala.descripcion}</p>
        )}
      </div>
      <ArrowRight className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
    </TapLink>
  );
}
