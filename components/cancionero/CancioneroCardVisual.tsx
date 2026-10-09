import { Music2 } from "lucide-react";
import type { ReactNode } from "react";

type CancioneroCardVisualProps = {
  nombre: string;
  artista: string | null;
  artistaAvatarUrl?: string | null;
  iconos?: ReactNode;
};

export default function CancioneroCardVisual({
  nombre,
  artista,
  artistaAvatarUrl,
  iconos,
}: CancioneroCardVisualProps) {
  return (
    <div className="min-w-0">
      <p className="break-words text-[17px] font-bold leading-tight text-text-primary">
        {nombre}
      </p>
      <div className="mt-3 flex min-w-0 items-center gap-3">
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
        <div className="min-w-0 flex-1">
          <p className="break-words text-[15px] leading-tight text-text-secondary">
            {artista || "Artista sin indicar"}
          </p>
          {iconos ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              {iconos}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
