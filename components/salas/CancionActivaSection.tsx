"use client";

import LetraViewer from "@/components/salas/LetraViewer";
import { COLA_BAR_HEIGHT_PX } from "@/lib/sala-layout";

type CancionActivaSectionProps = {
  cancionNombre?: string | null;
  artista?: string | null;
  urlLetra?: string | null;
};

export default function CancionActivaSection({
  cancionNombre = null,
  artista = null,
  urlLetra = null,
}: CancionActivaSectionProps) {
  const hasCancion = Boolean(cancionNombre);
  const hasLetraEmbed = Boolean(urlLetra);

  if (!hasCancion) {
    return (
      <section className="flex min-h-0 flex-1 flex-col bg-bg-app px-2 py-3">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-sm text-text-muted">
            Ninguna canción seleccionada aún
          </p>
        </div>
      </section>
    );
  }

  if (!hasLetraEmbed) {
    return (
      <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg-app px-2 py-3">
        <h2 className="shrink-0 text-xl font-bold text-text-primary">
          {cancionNombre}
        </h2>
        {artista && (
          <p className="mt-0.5 shrink-0 text-[13px] text-text-muted">
            {artista}
          </p>
        )}
        <p className="mt-6 text-center text-sm text-text-muted">
          Esta canción no tiene enlace de letra.
        </p>
      </section>
    );
  }

  return (
    <section
      className="grid h-full min-h-0 flex-1 grid-rows-[min-content_minmax(0,1fr)] gap-3 overflow-hidden bg-bg-app px-2 pt-3"
      style={{
        paddingBottom: `calc(${COLA_BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + 8px)`,
      }}
    >
      <div className="min-w-0 shrink-0">
        <h2 className="truncate text-xl font-bold text-text-primary">
          {cancionNombre}
        </h2>
        {artista && (
          <p className="mt-0.5 truncate text-[13px] text-text-muted">
            {artista}
          </p>
        )}
      </div>

      <LetraViewer
        url={urlLetra!}
        title="Letra de la canción activa"
        fill
      />
    </section>
  );
}
