import { Music2 } from "lucide-react";
import type { ReactNode } from "react";

type CancioneroCardVisualProps = {
  nombre: string;
  artista: string | null;
  artistaAvatarUrl?: string | null;
  agregadoNombre?: string | null;
  agregadoAvatarUrl?: string | null;
  insignia: ReactNode;
};

export default function CancioneroCardVisual({
  nombre,
  artista,
  artistaAvatarUrl,
  agregadoNombre,
  agregadoAvatarUrl,
  insignia,
}: CancioneroCardVisualProps) {
  return (
    <div className="flex min-h-[92px] min-w-0 items-start gap-3">
      <div className="relative size-[86px] shrink-0 overflow-hidden rounded-[10px] bg-gradient-to-br from-[#3b3542] via-[#34343a] to-[#25272c]">
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
          <div className="flex size-full items-center justify-center text-[38px] font-semibold text-white/70">
            {artista ? artista.charAt(0).toLocaleUpperCase("es") : <Music2 className="size-9" aria-hidden="true" />}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 pr-5">
        <p className="break-words text-[17px] font-semibold leading-[1.2] text-text-primary">
          {nombre}
        </p>
        <p className="mt-1 break-words text-[13px] leading-tight text-text-secondary">
          {artista || "Artista sin indicar"}
        </p>
        {agregadoNombre ? (
          <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] leading-tight text-text-muted">
            {agregadoAvatarUrl ? (
              // El avatar público puede venir de distintos proveedores.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={agregadoAvatarUrl}
                alt=""
                loading="lazy"
                className="size-4 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#57515b] text-[9px] font-semibold text-text-primary">
                {agregadoNombre.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate">Agregada por {agregadoNombre}</span>
          </div>
        ) : null}
      </div>
      <span className="absolute right-3 top-3 flex size-5 items-center justify-center" title="Tipo de canción">
        {insignia}
      </span>
    </div>
  );
}
