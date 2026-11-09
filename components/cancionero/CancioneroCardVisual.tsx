import { Music2 } from "lucide-react";
import type { ReactNode } from "react";

type CancioneroCardVisualProps = {
  nombre: string;
  artista: string | null;
  artistaAvatarUrl?: string | null;
  iconos?: ReactNode;
  /** Deja libre la esquina de arriba a la derecha (menú de opciones). */
  reservarEsquina?: boolean;
};

export default function CancioneroCardVisual({
  nombre,
  artista,
  artistaAvatarUrl,
  iconos,
  reservarEsquina = false,
}: CancioneroCardVisualProps) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-end gap-3">
        <div className="relative size-[76px] shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#3b3542] via-[#34343a] to-[#25272c] ring-1 ring-white/10">
          {artistaAvatarUrl ? (
            // Fotos públicas de artistas con dominios variables.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artistaAvatarUrl}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-[32px] font-semibold text-white/70">
              {artista ? artista.charAt(0).toLocaleUpperCase("es") : <Music2 className="size-8" aria-hidden="true" />}
            </div>
          )}
        </div>
        <p
          className={`min-w-0 flex-1 self-center break-words text-[18px] font-bold leading-tight text-text-primary ${
            reservarEsquina ? "pr-8" : ""
          }`}
        >
          {nombre}
        </p>
        {iconos ? (
          <div className="flex max-w-[48%] shrink-0 flex-wrap items-center justify-end gap-x-2.5 gap-y-1.5">
            {iconos}
          </div>
        ) : null}
      </div>
      <p className="mt-1.5 break-words text-left text-[15px] leading-tight text-text-secondary">
        {artista || "Artista sin indicar"}
      </p>
    </div>
  );
}
