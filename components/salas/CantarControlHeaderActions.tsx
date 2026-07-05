"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { Search } from "lucide-react";

type CantarControlHeaderActionsProps = {
  onSearch: () => void;
};

/** Acciones del encabezado en modo control — idénticas en Individual y Salas. */
export default function CantarControlHeaderActions({
  onSearch,
}: CantarControlHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <TapButton
        type="button"
        aria-label="Buscar canción"
        onClick={onSearch}
        className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-bg-dark/80 text-text-primary"
      >
        <Search className="size-4 text-accent" aria-hidden="true" />
      </TapButton>
    </div>
  );
}
