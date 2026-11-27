"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { Share2 } from "lucide-react";

/** El enlace va aparte, así el mensaje no lo repite. */
const TEXTO_PARA_COMPARTIR = [
  "APP CantemosTodos 🎵 🎸",
  "",
  "🗒️ Letras y acordes para cantar con amigos.",
  "📱 El cancionero queda en tu celular, también sin internet.",
].join("\n");

export default function CompartirLaApp() {
  async function compartir() {
    const enlace = window.location.origin;
    const datos = { title: "CantemosTodos", text: TEXTO_PARA_COMPARTIR, url: enlace };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(datos);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${TEXTO_PARA_COMPARTIR}\n${enlace}`);
    } catch {
      // Si el teléfono no deja copiar, no se muestra un error encima del inicio.
    }
  }

  return (
    <TapButton
      type="button"
      aria-label="Compartir la app"
      onClick={() => void compartir()}
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-bg-darker"
    >
      <Share2 className="size-5" aria-hidden="true" />
    </TapButton>
  );
}
