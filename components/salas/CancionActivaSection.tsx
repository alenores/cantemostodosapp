"use client";

import LetraTexto from "@/components/salas/LetraTexto";
import LetraViewer from "@/components/salas/LetraViewer";
import { SalaLetraLinesSkeleton } from "@/components/salas/SalasSkeletons";
import {
  getEmbedBottomClipPx,
  getEmbedTopClipPx,
  resolveLetraContenido,
  shouldApplyEmbedInitialOffset,
  shouldPreferTextExtract,
} from "@/lib/letra-display";
import {
  getLetraEmbedBottomPadding,
  getLetraSectionBottomPadding,
  getLetraSectionTextBottomPadding,
  getLetraTextScrollEndPadding,
} from "@/lib/sala-layout";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

type CancionActivaSectionProps = {
  cancionNombre?: string | null;
  artista?: string | null;
  urlLetra?: string | null;
  letraTexto?: string | null;
  modoLectura?: boolean;
  letraScrollRef?: RefObject<HTMLDivElement | null>;
};

export default function CancionActivaSection({
  cancionNombre = null,
  artista = null,
  urlLetra = null,
  letraTexto = null,
  modoLectura = false,
  letraScrollRef: letraScrollRefProp,
}: CancionActivaSectionProps) {
  const letraScrollRefLocal = useRef<HTMLDivElement>(null);
  const letraScrollRef = letraScrollRefProp ?? letraScrollRefLocal;
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [embedTopRevealed, setEmbedTopRevealed] = useState(false);

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

  useEffect(() => {
    setEmbedTopRevealed(false);
  }, [urlLetra]);

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

  const showTexto = contenido?.mode === "texto";
  const showEmbed = contenido?.mode === "embed";

  const embedConRecorteInicial =
    showEmbed &&
    contenido?.mode === "embed" &&
    shouldApplyEmbedInitialOffset(contenido.url);

  const embedTopClipPx =
    embedConRecorteInicial && !embedTopRevealed
      ? getEmbedTopClipPx(contenido.url)
      : undefined;

  const embedBottomClipPx =
    showEmbed && contenido?.mode === "embed"
      ? getEmbedBottomClipPx(contenido.url)
      : undefined;

  if (showTexto && contenido?.mode === "texto") {
    return (
      <section
        className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg-sala ${
          modoLectura ? "px-0 pt-0" : "px-2 pt-0"
        }`}
        style={{
          paddingBottom: modoLectura
            ? "env(safe-area-inset-bottom, 0px)"
            : getLetraSectionTextBottomPadding(),
        }}
      >
        {!modoLectura ? (
          <header className="shrink-0 border-b border-border bg-bg-sala px-2 py-1.5">
            <h2 className="text-xl font-bold leading-tight text-text-primary">
              {cancionNombre}
            </h2>
            {artista && (
              <p className="mt-0.5 text-[13px] leading-tight text-text-muted">
                {artista}
              </p>
            )}
          </header>
        ) : null}

        <div
          ref={letraScrollRef}
          data-cancionero-letra-scroll=""
          className={`relative min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain bg-letra-bg ${
            modoLectura ? "" : "rounded-[12px]"
          }`}
        >
          <LetraTexto
            texto={contenido.texto}
            edgeToEdge
            fillViewport
            compactHorizontalPadding={modoLectura}
            scrollEndPadding={
              modoLectura
                ? "calc(16px + env(safe-area-inset-bottom, 0px))"
                : getLetraTextScrollEndPadding()
            }
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className={`flex h-full min-h-0 flex-1 flex-col bg-bg-sala ${
        modoLectura
          ? "overflow-hidden px-0 pb-0 pt-0"
          : `px-2 pt-0 ${
              showEmbed
                ? "overflow-hidden pb-0"
                : "overflow-y-auto overscroll-y-contain pb-3"
            }`
      }`}
      style={
        modoLectura
          ? undefined
          : {
              paddingBottom: showEmbed
                ? getLetraEmbedBottomPadding()
                : getLetraSectionBottomPadding(),
            }
      }
    >
      {hasCancion ? (
        <>
          {!modoLectura ? (
            <>
              <h2 className="shrink-0 text-xl font-bold text-text-primary">
                {cancionNombre}
              </h2>
              {artista && (
                <p className="mt-0.5 shrink-0 text-[13px] text-text-muted">
                  {artista}
                </p>
              )}
            </>
          ) : null}

          {waitingForExtract && (
            <div
              className={`relative min-h-0 flex-1 overflow-hidden rounded-[12px] bg-letra-bg ${
                modoLectura ? "mx-0" : "mt-2"
              }`}
              role="status"
              aria-live="polite"
              aria-label="Cargando letra"
            >
              <SalaLetraLinesSkeleton />
            </div>
          )}

          {!contenido && !waitingForExtract && (
            <p
              className={`text-center text-sm text-text-muted ${
                modoLectura ? "flex flex-1 items-center justify-center px-4" : "mt-6"
              }`}
            >
              Esta canción no tiene letra disponible.
            </p>
          )}

          {showEmbed && contenido.mode === "embed" && (
            <div
              className={
                modoLectura
                  ? "relative min-h-0 w-full flex-1"
                  : "relative mt-2 min-h-0 w-full flex-1"
              }
            >
              <LetraViewer
                url={contenido.url}
                title="Letra de la canción activa"
                fill
                initialScrollOffsetPx={embedTopClipPx}
                initialScrollBottomOffsetPx={embedBottomClipPx}
                onRevealTop={
                  embedConRecorteInicial
                    ? () => setEmbedTopRevealed(true)
                    : undefined
                }
              />
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
