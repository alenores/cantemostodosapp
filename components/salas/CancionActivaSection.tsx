"use client";

import LetraTexto from "@/components/salas/LetraTexto";
import LetraViewer from "@/components/salas/LetraViewer";
import {
  resolveLetraContenido,
  shouldPreferTextExtract,
} from "@/lib/letra-display";
import { COLA_BAR_HEIGHT_PX, LETRA_SECTION_BOTTOM_PADDING } from "@/lib/sala-layout";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CancionActivaSectionProps = {
  cancionNombre?: string | null;
  artista?: string | null;
  urlLetra?: string | null;
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

  const contenido = useMemo(() => {
    if (needsExtract && loadingExtract) {
      return null;
    }

    return resolveLetraContenido({
      letraTexto,
      urlLetra,
      extractedText,
    });
  }, [extractedText, letraTexto, loadingExtract, needsExtract, urlLetra]);

  const header = (
    <>
      <h2 className="text-xl font-bold text-text-primary">{cancionNombre}</h2>
      {artista && (
        <p className="mt-0.5 text-[13px] text-text-muted">{artista}</p>
      )}
    </>
  );

  const embedBottomPadding = `calc(${COLA_BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + 4px)`;

  if (!hasCancion) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center bg-bg-app px-2 py-3">
        <p className="text-center text-sm text-text-muted">
          Ninguna canción seleccionada aún
        </p>
      </section>
    );
  }

  if (contenido?.mode === "embed") {
    return (
      <section
        className="flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-app px-2 pt-3"
        style={{ paddingBottom: embedBottomPadding }}
      >
        <div className="shrink-0">{header}</div>
        <div className="mt-3 min-h-0 flex-1 overflow-hidden">
          <LetraViewer
            url={contenido.url}
            title="Letra de la canción activa"
            fill
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className="min-h-0 flex-1 overflow-y-auto bg-bg-app px-2 py-3"
      style={{ paddingBottom: LETRA_SECTION_BOTTOM_PADDING }}
    >
      {header}

      {waitingForExtract && (
        <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
          <Loader2
            className="size-4 animate-spin text-accent"
            aria-hidden="true"
          />
          <span>Cargando letra...</span>
        </div>
      )}

      {!contenido && !waitingForExtract && (
        <p className="mt-6 text-center text-sm text-text-muted">
          Esta canción no tiene letra disponible.
        </p>
      )}

      {contenido?.mode === "texto" && <LetraTexto texto={contenido.texto} />}
    </section>
  );
}
