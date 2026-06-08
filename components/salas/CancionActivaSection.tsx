"use client";

import LetraTexto from "@/components/salas/LetraTexto";
import LetraViewer from "@/components/salas/LetraViewer";
import {
  resolveLetraContenido,
  shouldPreferTextExtract,
  type LetraContenido,
} from "@/lib/letra-display";
import { LETRA_EMBED_HEIGHT_CSS, LETRA_SECTION_BOTTOM_PADDING } from "@/lib/sala-layout";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CancionActivaSectionProps = {
  cancionNombre?: string | null;
  artista?: string | null;
  urlLetra?: string | null;
  /** Letra manual (p. ej. canciones subidas a mano). Tiene prioridad sobre scrape/iframe. */
  letraTexto?: string | null;
};

export default function CancionActivaSection({
  cancionNombre = null,
  artista = null,
  urlLetra = null,
  letraTexto = null,
}: CancionActivaSectionProps) {
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [loadingExtract, setLoadingExtract] = useState(false);

  const hasCancion = Boolean(cancionNombre);
  const hasManualText = Boolean(letraTexto?.trim());
  const hasUrl = Boolean(urlLetra?.trim());

  useEffect(() => {
    if (hasManualText || !hasUrl || !urlLetra) {
      setExtractedText(null);
      setLoadingExtract(false);
      return;
    }

    if (!shouldPreferTextExtract(urlLetra)) {
      setExtractedText(null);
      setLoadingExtract(false);
      return;
    }

    const letraUrl = urlLetra;
    let cancelled = false;

    async function loadExtractedLetra() {
      setLoadingExtract(true);
      setExtractedText(null);

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
          setExtractedText(data.letra);
        }
      } catch {
        // Fallback a iframe en resolveLetraContenido.
      } finally {
        if (!cancelled) {
          setLoadingExtract(false);
        }
      }
    }

    void loadExtractedLetra();

    return () => {
      cancelled = true;
    };
  }, [hasManualText, hasUrl, urlLetra]);

  const needsExtract =
    !hasManualText &&
    Boolean(urlLetra?.trim()) &&
    shouldPreferTextExtract(urlLetra!);

  const waitingForExtract = needsExtract && loadingExtract;

  const contenido: LetraContenido | null = useMemo(() => {
    if (needsExtract && loadingExtract) {
      return null;
    }

    return resolveLetraContenido({
      letraTexto,
      urlLetra,
      extractedText,
    });
  }, [extractedText, letraTexto, loadingExtract, needsExtract, urlLetra]);

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

  const header = (
    <>
      <h2 className="shrink-0 text-xl font-bold text-text-primary">
        {cancionNombre}
      </h2>
      {artista && (
        <p className="mt-0.5 shrink-0 text-[13px] text-text-muted">{artista}</p>
      )}
    </>
  );

  if (!contenido && !waitingForExtract) {
    return (
      <section
        className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg-app px-2 py-3"
        style={{ paddingBottom: LETRA_SECTION_BOTTOM_PADDING }}
      >
        {header}
        <p className="mt-6 text-center text-sm text-text-muted">
          Esta canción no tiene letra disponible.
        </p>
      </section>
    );
  }

  if (waitingForExtract) {
    return (
      <section
        className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg-app px-2 py-3"
        style={{ paddingBottom: LETRA_SECTION_BOTTOM_PADDING }}
      >
        {header}
        <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
          <Loader2
            className="size-4 animate-spin text-accent"
            aria-hidden="true"
          />
          <span>Cargando letra...</span>
        </div>
      </section>
    );
  }

  if (!contenido) {
    return null;
  }

  if (contenido.mode === "texto") {
    return (
      <section
        className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg-app px-2 py-3"
        style={{ paddingBottom: LETRA_SECTION_BOTTOM_PADDING }}
      >
        {header}
        <LetraTexto texto={contenido.texto} />
      </section>
    );
  }

  return (
    <section
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg-app px-2 pt-3"
      style={{ paddingBottom: LETRA_SECTION_BOTTOM_PADDING }}
    >
      {header}
      <div
        className="mt-3 w-full shrink-0"
        style={{ height: LETRA_EMBED_HEIGHT_CSS, minHeight: 320 }}
      >
        <LetraViewer
          url={contenido.url}
          title="Letra de la canción activa"
          fill
        />
      </div>
    </section>
  );
}
