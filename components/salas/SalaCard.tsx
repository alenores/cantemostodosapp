"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import type { Sala } from "@/types";
import { ArrowRight } from "lucide-react";

type SalaCardProps = {
  sala: Pick<Sala, "id" | "nombre" | "descripcion">;
  onOpen: (sala: Pick<Sala, "id" | "nombre" | "descripcion">) => void;
};

export default function SalaCard({ sala, onOpen }: SalaCardProps) {
  return (
    <TapButton
      aria-label={`Abrir ${sala.nombre}`}
      onClick={() => onOpen(sala)}
      className="flex min-h-11 w-full items-center gap-3 rounded-[12px] border border-border bg-bg-card px-4 py-3 text-left"
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
    </TapButton>
  );
}
