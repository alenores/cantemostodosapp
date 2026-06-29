"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import type { Sala } from "@/types";
import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";

type SalaCardProps = {
  sala: Pick<Sala, "id" | "nombre" | "descripcion">;
  onOpen: (sala: Pick<Sala, "id" | "nombre" | "descripcion">) => void;
};

export default function SalaCard({ sala, onOpen }: SalaCardProps) {
  const [pending, setPending] = useState(false);

  function handleOpen() {
    if (pending) {
      return;
    }

    setPending(true);
    onOpen(sala);
  }

  return (
    <TapButton
      aria-label={`Abrir ${sala.nombre}`}
      onClick={handleOpen}
      disabled={pending}
      className="relative flex min-h-11 w-full items-center gap-3 rounded-[12px] border border-border bg-bg-card px-4 py-3 text-left disabled:opacity-90"
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
      <ArrowRight className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
    </TapButton>
  );
}
