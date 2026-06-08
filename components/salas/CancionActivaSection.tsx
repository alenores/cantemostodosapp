"use client";

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
  const [error, setError] = useState<string | null>(null);

  const hasCancion = Boolean(cancionNombre);

  useEffect(() => {
    if (!urlLetra) {
      setLetra(null);
      setLoading(false);
      setError(null);
      return;
    }

    const letraUrl = urlLetra;
    let cancelled = false;

    async function loadLetra() {
      setLoading(true);
      setError(null);
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

        if (!response.ok) {
          throw new Error(data.error ?? "Error al cargar la letra");
        }

        setLetra(data.letra ?? null);
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Error al cargar la letra",
        );
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
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg-app px-4 py-4">
      {hasCancion ? (
        <>
          <h2 className="text-xl font-extrabold text-text-primary">
            {cancionNombre}
          </h2>
          {artista && (
            <p className="mt-1 text-[13px] text-text-muted">{artista}</p>
          )}

          {loading && (
            <div className="mt-6 flex items-center justify-center gap-3 py-8">
              <Loader2
                className="size-7 animate-spin text-accent"
                aria-hidden="true"
              />
              <span className="sr-only">Cargando letra</span>
            </div>
          )}

          {!loading && letra && (
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

          {!loading && error && urlLetra && (
            <div className="mt-4 rounded-[12px] border border-border bg-bg-card px-[18px] py-5 text-center">
              <p className="text-sm text-text-muted">{error}</p>
              <button
                type="button"
                onClick={() =>
                  window.open(urlLetra, "_blank", "noopener,noreferrer")
                }
                className="mt-4 min-h-11 rounded-[10px] bg-accent px-4 text-sm font-semibold text-white"
              >
                Ver en el sitio
              </button>
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
