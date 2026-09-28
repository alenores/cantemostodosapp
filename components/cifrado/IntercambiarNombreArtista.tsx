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
      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent disabled:opacity-50"
    >
      <ArrowUpDown className="size-4" aria-hidden />
      Intercambiar nombre y artista
    </TapButton>
  );
}
