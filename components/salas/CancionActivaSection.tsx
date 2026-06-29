"use client";

import LetraAutoScrollBar from "@/components/salas/LetraAutoScrollBar";
import LetraTexto from "@/components/salas/LetraTexto";
import LetraViewer from "@/components/salas/LetraViewer";
import { useLetraAutoScroll } from "@/hooks/useLetraAutoScroll";
import {
  getLetraSourceKind,
  resolveLetraContenido,
  shouldPreferTextExtract,
} from "@/lib/letra-display";
import {
  LETRA_EMBED_INITIAL_OFFSET_PX,
  LETRA_EMBED_BOTTOM_PADDING,
  LETRA_SECTION_BOTTOM_PADDING,
  LETRA_SECTION_TEXT_BOTTOM_PADDING,
  LETRA_TEXT_SCROLL_END_PADDING,
} from "@/lib/sala-layout";
import { Loader2, Maximize2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TapButton } from "@/components/ui/TapFeedback";

type CancionActivaSectionProps = {
  cancionNombre?: string | null;
  artista?: string | null;
  urlLetra?: string | null;
  letraTexto?: string | null;
  modoLectura?: boolean;
  onExpand?: () => void;
};

export default function CancionActivaSection({
  cancionNombre = null,
  artista = null,
  urlLetra = null,
  letraTexto = null,
  modoLectura = false,
  onExpand,
}: CancionActivaSectionProps) {
  const letraScrollRef = useRef<HTMLDivElement>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [cifraTopRevealed, setCifraTopRevealed] = useState(false);

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
    setCifraTopRevealed(false);
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

  const cancionContentKey = hasCancion
    ? `${cancionNombre ?? ""}|${artista ?? ""}|${urlLetra ?? ""}|${letraTexto ?? ""}`
    : null;

  const { autoScrollLevel, accelerate, decelerate } = useLetraAutoScroll(
    letraScrollRef,
    {
      enabled: showTexto,
      contentKey: cancionContentKey,
    },
  );

  const isCifraclubEmbed =
    showEmbed &&
    contenido?.mode === "embed" &&
    getLetraSourceKind(contenido.url) === "cifraclub";

  const cifraclubEmbedOffsetPx =
    isCifraclubEmbed && !cifraTopRevealed
      ? LETRA_EMBED_INITIAL_OFFSET_PX
      : undefined;

  const expandButton =
    !modoLectura && onExpand ? (
      <TapButton
        type="button"
        aria-label="Expandir letra a pantalla completa"
        onClick={onExpand}
        className="absolute z-20 flex items-center justify-center rounded-xl border border-accent/50 bg-bg-dark p-2 shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
        style={{ top: 12, right: 12 }}
      >
        <Maximize2 className="size-5 text-accent" aria-hidden="true" />
      </TapButton>
    ) : null;

  if (showTexto && contenido?.mode === "texto") {
    return (
      <section
        className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg-app ${
          modoLectura ? "px-0 pt-0" : "px-2 pt-0"
        }`}
        style={{
          paddingBottom: modoLectura
            ? "env(safe-area-inset-bottom, 0px)"
            : LETRA_SECTION_TEXT_BOTTOM_PADDING,
        }}
      >
        {!modoLectura ? (
          <header className="shrink-0 border-b border-border bg-bg-dark px-2 py-1.5">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold leading-tight text-text-primary">
                  {cancionNombre}
                </h2>
                {artista && (
                  <p className="mt-0.5 text-[13px] leading-tight text-text-muted">
                    {artista}
                  </p>
                )}
              </div>
              <LetraAutoScrollBar
                enabled
                autoScrollLevel={autoScrollLevel}
                onAccelerate={accelerate}
                onDecelerate={decelerate}
              />
            </div>
          </header>
        ) : null}

        <div
          ref={letraScrollRef}
          data-cancionero-letra-scroll=""
          className={`relative min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain bg-letra-bg ${
            modoLectura ? "" : "rounded-[12px]"
          }`}
        >
          {expandButton}
          <LetraTexto
            texto={contenido.texto}
            edgeToEdge
            fillViewport
            scrollEndPadding={
              modoLectura
                ? "calc(16px + env(safe-area-inset-bottom, 0px))"
                : LETRA_TEXT_SCROLL_END_PADDING
            }
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className={`flex h-full min-h-0 flex-1 flex-col bg-bg-app ${
        modoLectura
          ? "overflow-hidden px-0 pb-0 pt-0"
          : `px-2 pt-3 ${
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
                ? LETRA_EMBED_BOTTOM_PADDING
                : LETRA_SECTION_BOTTOM_PADDING,
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
              className={`flex items-center gap-2 text-sm text-text-muted ${
                modoLectura ? "flex-1 justify-center px-4" : "mt-4"
              }`}
            >
              <Loader2
                className="size-4 animate-spin text-accent"
                aria-hidden="true"
              />
              <span>Cargando letra...</span>
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
              {expandButton}
              <LetraViewer
                url={contenido.url}
                title="Letra de la canción activa"
                fill
                initialScrollOffsetPx={cifraclubEmbedOffsetPx}
                onRevealTop={
                  isCifraclubEmbed
                    ? () => setCifraTopRevealed(true)
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
