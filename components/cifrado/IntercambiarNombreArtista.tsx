"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { ArrowUpDown } from "lucide-react";

/**
 * Da vuelta Nombre y Artista de un toque. La búsqueda en la web a veces los
 * reconoce al revés y corregirlo a mano era copiar y pegar dos campos.
 */
export default function IntercambiarNombreArtista({
  onIntercambiar,
  disabled = false,
}: {
  onIntercambiar: () => void;
  disabled?: boolean;
}) {
  return (
    <TapButton
      type="button"
      onClick={onIntercambiar}
      disabled={disabled}
      aria-label="Intercambiar nombre y artista"
      className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-text-secondary disabled:opacity-40"
    >
      <ArrowUpDown className="size-3" aria-hidden />
      Intercambiar nombre y artista
    </TapButton>
  );
}
