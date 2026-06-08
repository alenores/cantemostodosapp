"use client";

import LetraViewer from "@/components/salas/LetraViewer";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [letra, setLetra] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasCancion = Boolean(cancionNombre);
  const showExtractedLetra = Boolean(letra);
  const showEmbeddedLetra = Boolean(urlLetra) && !showExtractedLetra;

  useEffect(() => {
    if (!urlLetra) {
      setLetra(null);
      setLoading(false);
      return;
    }

    const letraUrl = urlLetra;
    let cancelled = false;

    async function loadLetra() {
      setLoading(true);
      setLetra(null);

      try {
        const response = await fetch(
          `/api/obtener-letra?url=${encodeURIComponent(letraUrl)}`,
        );
        const data = (await response.json()) as {
          letra?: string;
          error?: string;
        };

        if (cancelled) {
          return;
        }

        if (response.ok && data.letra) {
          setLetra(data.letra);
        }
      } catch {
        // Si falla el scrape server-side, el iframe muestra la letra en el browser.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLetra();

    return () => {
      cancelled = true;
    };
  }, [urlLetra]);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg-app px-4 py-4 pb-6">
      {hasCancion ? (
        <>
          <h2 className="shrink-0 text-xl font-extrabold text-text-primary">
            {cancionNombre}
          </h2>
          {artista && (
            <p className="mt-1 shrink-0 text-[13px] text-text-muted">
              {artista}
            </p>
          )}

          {loading && !showExtractedLetra && !showEmbeddedLetra && (
            <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
              <Loader2
                className="size-4 animate-spin text-accent"
                aria-hidden="true"
              />
              <span>Cargando letra...</span>
            </div>
          )}

          {showExtractedLetra && (
            <div
              className="mt-4 rounded-[12px] bg-letra-bg px-[18px] py-5 text-letra-text whitespace-pre-wrap"
              style={{
                fontSize: "var(--letra-size)",
                lineHeight: "var(--letra-line-height)",
                fontWeight: "var(--letra-weight)",
              }}
            >
              {letra}
            </div>
          )}

          {showEmbeddedLetra && urlLetra && (
            <div className="mt-4 flex flex-col">
              <LetraViewer url={urlLetra} title="Letra de la canción activa" />
              <a
                href={urlLetra}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 self-center text-sm text-text-muted underline-offset-2 hover:underline"
              >
                Abrir en el sitio
              </a>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-sm text-text-muted">
            Ninguna canción seleccionada aún
          </p>
        </div>
      )}
    </section>
  );
}
