"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { Maximize2 } from "lucide-react";

type LetraExpandirFlotanteProps = {
  onExpand: () => void;
};

/** Botón Expandir al medio abajo, dentro del contenedor de letra (modo control). */
export default function LetraExpandirFlotante({
  onExpand,
}: LetraExpandirFlotanteProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
      <TapButton
        type="button"
        aria-label="Expandir letra a pantalla completa"
        onClick={onExpand}
        className="sala-expand-attention pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/60 bg-bg-dark/90 px-3 py-1.5 text-xs font-medium text-text-primary shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-md"
      >
        <Maximize2 className="size-3.5 text-accent" aria-hidden="true" />
        <span>Expandir</span>
      </TapButton>
    </div>
  );
}
