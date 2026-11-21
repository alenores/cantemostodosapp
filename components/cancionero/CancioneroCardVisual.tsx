import { Music2 } from "lucide-react";
import type { ReactNode } from "react";

type CancioneroCardVisualProps = {
  nombre: string;
  artista: string | null;
  artistaAvatarUrl?: string | null;
  iconos?: ReactNode;
  /** Deja aire para el botón de opciones, en la misma columna derecha que los iconos. */
  reservarEsquina?: boolean;
};

export default function CancioneroCardVisual({
  nombre,
  artista,
  artistaAvatarUrl,
  iconos,
  reservarEsquina = false,
}: CancioneroCardVisualProps) {
  const aireDerecha = reservarEsquina ? "pr-10" : iconos ? "pr-8" : "";

  return (
    <div className="relative min-w-0">
      <div className={aireDerecha}>
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
          <p className="min-w-0 flex-1 self-center break-words text-[18px] font-bold leading-tight text-text-primary">
            {nombre}
          </p>
        </div>
        <p className="mt-1.5 break-words text-left text-[15px] leading-tight text-text-secondary">
          {artista || "Artista sin indicar"}
        </p>
      </div>
      {iconos ? (
        <div
          className="absolute bottom-0 right-0 top-0 flex w-6 flex-col-reverse items-center justify-start gap-0.5 [&>*]:shrink-0"
        >
          {iconos}
        </div>
      ) : null}
    </div>
  );
}
