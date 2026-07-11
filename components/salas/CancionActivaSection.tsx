"use client";

import LetraCifradoLecturaShell, {
  type LecturaCompasPlaybackState,
  type LecturaTonalidadState,
} from "@/components/cifrado/LetraCifradoLecturaShell";
import LetraCifradoPanel from "@/components/cifrado/LetraCifradoPanel";
import LetraExpandirFlotante from "@/components/salas/LetraExpandirFlotante";
import LetraTexto from "@/components/salas/LetraTexto";
import AcordesEmbedPrimeraVezHint from "@/components/salas/AcordesEmbedPrimeraVezHint";
import LetraViewer, {
  LetraRevealFullControl,
} from "@/components/salas/LetraViewer";
import CifraClubEmbedBadge from "@/components/salas/CifraClubEmbedBadge";
import CancionOrigenEtiqueta, {
  type ControlLetraFilaActions,
} from "@/components/salas/CancionOrigenEtiqueta";
import LecturaCancionChip from "@/components/salas/LecturaCancionChip";
import { SalaLetraLinesSkeleton } from "@/components/salas/SalasSkeletons";
import { useAcordesEmbedPrimeraVez } from "@/hooks/useAcordesEmbedPrimeraVez";
import { useCifradoDetalle } from "@/hooks/useCifradoDetalle";
import { useColaSidePanel } from "@/hooks/useColaSidePanel";
import {
  getEmbedBottomClipPx,
  getEmbedTopClipPx,
  isCifraClubEmbed,
  resolveLetraContenido,
  shouldApplyEmbedInitialOffset,
  shouldPreferTextExtract,
} from "@/lib/letra-display";
import { parseCancioneroUrlId } from "@/lib/cancionero-url";
import {
  CONTROL_LETRA_SHELL_CLASS,
  CONTROL_LETRA_HORIZONTAL_INSET,
  CONTROL_LETRA_SEPARATOR_GAP_PX,
  CIFRACLUB_EMBED_FILL_SCALE_X,
  getControlCantarHorizontalPaddingStyle,
  getControlHeaderPaddingStyle,
  getControlHeaderVerticalPaddingStyle,
  getLecturaFabMenuTopCss,
  getLetraEmbedBottomPadding,
  getLetraSectionBottomPadding,
  getLetraSectionTextBottomPadding,
  getLetraTextScrollEndPadding,
} from "@/lib/sala-layout";
import { Star } from "lucide-react";
import { getLetraZoomStyle } from "@/lib/letra-zoom";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

function ControlLetraShell({
  children,
  urlLetra,
  letraTexto,
  premium = false,
  filaActions = null,
  onExpand,
  className = "",
}: {
  children: ReactNode;
  urlLetra?: string | null;
  letraTexto?: string | null;
  premium?: boolean;
  filaActions?: ControlLetraFilaActions | null;
  onExpand?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-0 min-w-0 flex-1 flex-col ${className}`}
      style={{
        marginLeft: CONTROL_LETRA_HORIZONTAL_INSET,
        marginRight: CONTROL_LETRA_HORIZONTAL_INSET,
      }}
    >
      <div
        className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${CONTROL_LETRA_SHELL_CLASS}`}
      >
        {children}
        {onExpand ? <LetraExpandirFlotante onExpand={onExpand} /> : null}
      </div>
      <CancionOrigenEtiqueta
        urlLetra={urlLetra}
        letraTexto={letraTexto}
        premium={premium}
        filaActions={filaActions}
      />
      <div
        className="shrink-0 border-t border-border/80"
        style={{
          marginTop: CONTROL_LETRA_SEPARATOR_GAP_PX,
          marginBottom: CONTROL_LETRA_SEPARATOR_GAP_PX,
        }}
        aria-hidden="true"
      />
    </div>
  );
}

function CancionActivaHeader({
  cancionNombre,
  artista,
  nombreRevealKey,
  nombreRevealClass,
  headerLeading,
  headerAction,
  tieneCifradoAvanzado = false,
  insetHorizontalInParent = false,
}: {
  cancionNombre: string | null;
  artista: string | null;
  nombreRevealKey: string;
  nombreRevealClass: string;
  headerLeading?: ReactNode;
  headerAction?: ReactNode;
  tieneCifradoAvanzado?: boolean;
  insetHorizontalInParent?: boolean;
}) {
  return (
    <header
      className="flex shrink-0 items-start gap-2 overflow-hidden border-b border-border bg-bg-sala"
      style={
        insetHorizontalInParent
          ? getControlHeaderVerticalPaddingStyle()
          : getControlHeaderPaddingStyle()
      }
    >
      {headerLeading ? <div className="shrink-0">{headerLeading}</div> : null}
      <CancionActivaTitulo
        cancionNombre={cancionNombre}
        artista={artista}
        nombreRevealKey={nombreRevealKey}
        nombreRevealClass={nombreRevealClass}
        tieneCifradoAvanzado={tieneCifradoAvanzado}
      />
      {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
    </header>
  );
}

function CancionActivaTitulo({
  cancionNombre,
  artista,
  nombreRevealKey,
  nombreRevealClass,
  tieneCifradoAvanzado = false,
}: {
  cancionNombre: string | null;
  artista: string | null;
  nombreRevealKey: string;
  nombreRevealClass: string;
  tieneCifradoAvanzado?: boolean;
}) {
  if (!cancionNombre) {
    return <div className="min-w-0 flex-1" aria-hidden="true" />;
  }

  return (
    <div className="min-w-0 flex-1">
      <h2 className="flex min-w-0 items-center gap-1.5 text-xl font-bold leading-tight text-accent">
        {tieneCifradoAvanzado ? (
          <Star
            className="size-3.5 shrink-0 fill-[var(--tuner-cerca)] text-[var(--tuner-cerca)]"
            aria-hidden="true"
          />
        ) : null}
        <span key={nombreRevealKey} className={`${nombreRevealClass} truncate`}>
          {cancionNombre}
        </span>
      </h2>
      {artista ? (
        <p className="mt-0.5 text-[13px] leading-tight text-text-muted">
          {artista}
        </p>
      ) : null}
    </div>
  );
}

type CancionActivaSectionProps = {
  cancionNombre?: string | null;
  artista?: string | null;
  urlLetra?: string | null;
  letraTexto?: string | null;
  modoLectura?: boolean;
  letraScrollRef?: RefObject<HTMLDivElement | null>;
  embedIframeRef?: RefObject<HTMLIFrameElement | null>;
  nombreRevealGeneration?: number;
  headerLeading?: ReactNode;
  headerAction?: ReactNode;
  onExpand?: () => void;
  controlFilaActions?: ControlLetraFilaActions | null;
  letraZoomFactor?: number;
  onLecturaZoomEligibleChange?: (eligible: boolean) => void;
  compasesOcultos?: boolean;
  onToggleCompasesOcultos?: () => void;
  onLecturaCompasPlaybackStateChange?: (
    state: LecturaCompasPlaybackState | null,
  ) => void;
  onLecturaTonalidadStateChange?: (
    state: LecturaTonalidadState | null,
  ) => void;
};

function LetraEmptySheet({
  modoLectura,
  filaActions = null,
  onExpand,
}: {
  modoLectura: boolean;
  filaActions?: ControlLetraFilaActions | null;
  onExpand?: () => void;
}) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col ${modoLectura ? "" : ""}`}>
      {modoLectura ? (
        <div
          className="flex min-h-0 flex-1 items-center justify-center bg-letra-bg"
          style={{ minHeight: undefined }}
        >
          <p className="max-w-[16rem] px-6 text-center text-sm leading-relaxed text-text-muted">
            Acá va la letra de la canción activa. Buscá una canción para empezar.
          </p>
        </div>
      ) : (
        <ControlLetraShell filaActions={filaActions} onExpand={onExpand}>
          <div
            className="flex min-h-0 flex-1 items-center justify-center bg-letra-bg"
            style={{ minHeight: "min(52vh, 420px)" }}
          >
            <p className="max-w-[16rem] px-6 text-center text-sm leading-relaxed text-text-muted">
              Acá va la letra de la canción activa. Buscá una canción para
              empezar.
            </p>
          </div>
        </ControlLetraShell>
      )}
    </div>
  );
}

export default function CancionActivaSection({
  cancionNombre = null,
  artista = null,
  urlLetra = null,
  letraTexto = null,
  modoLectura = false,
  letraScrollRef: letraScrollRefProp,
  embedIframeRef,
  nombreRevealGeneration = 0,
  headerLeading = null,
  headerAction = null,
  onExpand,
  controlFilaActions = null,
  letraZoomFactor = 1,
  onLecturaZoomEligibleChange,
  compasesOcultos = false,
  onToggleCompasesOcultos,
  onLecturaCompasPlaybackStateChange,
  onLecturaTonalidadStateChange,
}: CancionActivaSectionProps) {
  const letraScrollRefLocal = useRef<HTMLDivElement>(null);
  const letraScrollRef = letraScrollRefProp ?? letraScrollRefLocal;
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [embedFullRevealed, setEmbedFullRevealed] = useState(false);
  const [embedReloadKey, setEmbedReloadKey] = useState(0);

  const hasCancion = Boolean(cancionNombre);
  const hasManualText = Boolean(letraTexto?.trim());
  const hasUrl = Boolean(urlLetra?.trim());
  const cancioneroId = parseCancioneroUrlId(urlLetra);
  const { detalle: cifradoDetalle, loading: cifradoLoading, tieneCifradoAvanzado } =
    useCifradoDetalle(cancioneroId);
  const showCifradoAvanzado =
    Boolean(cifradoDetalle?.letra?.trim()) && tieneCifradoAvanzado;
  const esperandoCifrado = cancioneroId != null && cifradoLoading;

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
    setEmbedFullRevealed(false);
    setEmbedReloadKey(0);
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

  const showCifraClubBadge =
    showEmbed &&
    contenido?.mode === "embed" &&
    isCifraClubEmbed(contenido.url);

  const embedUrl =
    showEmbed && contenido?.mode === "embed" ? contenido.url : null;
  const { showAcordesPrimeraVezHint, dismissAcordesPrimeraVezHint } =
    useAcordesEmbedPrimeraVez(embedUrl);

  const embedTopClipPx =
    embedConRecorteInicial && !embedFullRevealed
      ? getEmbedTopClipPx(contenido.url)
      : undefined;

  const embedBottomClipPx =
    showEmbed &&
    contenido?.mode === "embed" &&
    !embedFullRevealed &&
    !showAcordesPrimeraVezHint
      ? getEmbedBottomClipPx(contenido.url)
      : undefined;

  function handleRevealEmbedFull() {
    if (!embedFullRevealed && showAcordesPrimeraVezHint) {
      dismissAcordesPrimeraVezHint();
    }
    setEmbedFullRevealed((current) => !current);
  }

  const nombreRevealKey =
    nombreRevealGeneration > 0
      ? `reveal-${nombreRevealGeneration}`
      : "initial";
  const nombreRevealClass =
    nombreRevealGeneration > 0 ? "cola-nombre-reveal block" : "block";

  const colaSidePanel = useColaSidePanel();
  const resolvedFilaActions = useMemo((): ControlLetraFilaActions | null => {
    if (modoLectura || !controlFilaActions) {
      return null;
    }

    return {
      ...controlFilaActions,
      showFila: !colaSidePanel && (controlFilaActions.showFila ?? true),
      showSiguiente: controlFilaActions.showSiguiente ?? hasCancion,
    };
  }, [modoLectura, controlFilaActions, colaSidePanel, hasCancion]);

  const lecturaChipProps =
    modoLectura && cancionNombre
      ? {
          nombre: cancionNombre,
          artista,
          nombreRevealKey,
          nombreRevealClass,
        }
      : null;
  const lecturaChipViewport = lecturaChipProps ? (
    <LecturaCancionChip
      {...lecturaChipProps}
      reservarColaLateral={colaSidePanel}
    />
  ) : null;

  const showLetraSheet =
    (showTexto && contenido?.mode === "texto") ||
    (cancioneroId != null &&
      hasCancion &&
      (esperandoCifrado || showCifradoAvanzado));

  const lecturaZoomEligible =
    modoLectura &&
    showLetraSheet &&
    !waitingForExtract &&
    !esperandoCifrado &&
    (showTexto || showCifradoAvanzado);

  useEffect(() => {
    onLecturaZoomEligibleChange?.(lecturaZoomEligible);
  }, [lecturaZoomEligible, onLecturaZoomEligibleChange]);

  const letraZoomStyle: CSSProperties | undefined =
    modoLectura && lecturaZoomEligible
      ? getLetraZoomStyle(letraZoomFactor)
      : undefined;

  if (showLetraSheet) {
    const scrollEndPadding = modoLectura
      ? "calc(16px + env(safe-area-inset-bottom, 0px))"
      : getLetraTextScrollEndPadding();
    const textoPlano =
      contenido?.mode === "texto" ? contenido.texto : letraTexto?.trim() ?? "";

    return (
      <section
        className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg-sala ${
          modoLectura ? "px-0 pt-0" : "pt-0"
        }`}
        style={{
          ...(modoLectura ? {} : getControlCantarHorizontalPaddingStyle()),
          paddingBottom: modoLectura
            ? "env(safe-area-inset-bottom, 0px)"
            : getLetraSectionTextBottomPadding(),
        }}
      >
        {lecturaChipViewport}
        {!modoLectura ? (
          <CancionActivaHeader
            cancionNombre={cancionNombre}
            artista={artista}
            nombreRevealKey={nombreRevealKey}
            nombreRevealClass={nombreRevealClass}
            headerLeading={headerLeading}
            headerAction={headerAction}
            tieneCifradoAvanzado={showCifradoAvanzado}
            insetHorizontalInParent
          />
        ) : null}

        <div
          className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${
            modoLectura ? "h-full w-full" : ""
          }`}
        >
          {modoLectura ? (
            <>
              {showCifradoAvanzado && cifradoDetalle ? (
                <LetraCifradoLecturaShell
                  detalle={cifradoDetalle}
                  scrollRef={letraScrollRef}
                  scrollEndPadding={scrollEndPadding}
                  letraZoomStyle={letraZoomStyle}
                  compasesOcultos={compasesOcultos}
                  onToggleCompasesOcultos={onToggleCompasesOcultos}
                  onCompasPlaybackStateChange={
                    onLecturaCompasPlaybackStateChange
                  }
                  onTonalidadStateChange={onLecturaTonalidadStateChange}
                />
              ) : (
                <div className="relative h-full min-h-0 w-full overflow-hidden rounded-[12px]">
                  <div
                    ref={letraScrollRef}
                    data-cancionero-letra-scroll=""
                    className="h-full min-h-0 w-full touch-pan-y overscroll-y-contain overflow-y-auto bg-letra-bg"
                    style={letraZoomStyle}
                  >
                    {esperandoCifrado ? (
                      <div
                        className="flex min-h-[12rem] items-center justify-center px-4"
                        role="status"
                        aria-live="polite"
                        aria-label="Cargando cifrado"
                      >
                        <p className="text-sm text-text-muted">
                          Cargando cifrado…
                        </p>
                      </div>
                    ) : showCifradoAvanzado && cifradoDetalle ? (
                      <LetraCifradoPanel
                        detalle={cifradoDetalle}
                        modoLectura={modoLectura}
                        scrollEndPadding={scrollEndPadding}
                      />
                    ) : textoPlano ? (
                      <LetraTexto
                        texto={textoPlano}
                        edgeToEdge
                        fillViewport
                        compactHorizontalPadding={modoLectura}
                        scrollEndPadding={scrollEndPadding}
                      />
                    ) : (
                      <p className="px-4 py-8 text-center text-sm text-text-muted">
                        Esta canción no tiene letra disponible.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <ControlLetraShell
              urlLetra={urlLetra}
              letraTexto={letraTexto}
              premium={showCifradoAvanzado}
              filaActions={resolvedFilaActions}
              onExpand={onExpand}
            >
              <div className="relative h-full min-h-0 w-full overflow-hidden rounded-[12px]">
                <div
                  ref={letraScrollRef}
                  data-cancionero-letra-scroll=""
                  className="h-full min-h-0 w-full touch-pan-y overscroll-y-contain overflow-y-auto bg-letra-bg"
                  style={letraZoomStyle}
                >
                  {esperandoCifrado ? (
                    <div
                      className="flex min-h-[12rem] items-center justify-center px-4"
                      role="status"
                      aria-live="polite"
                      aria-label="Cargando cifrado"
                    >
                      <p className="text-sm text-text-muted">
                        Cargando cifrado…
                      </p>
                    </div>
                  ) : showCifradoAvanzado && cifradoDetalle ? (
                    <LetraCifradoPanel
                      detalle={cifradoDetalle}
                      modoLectura={modoLectura}
                      scrollEndPadding={scrollEndPadding}
                    />
                  ) : textoPlano ? (
                    <LetraTexto
                      texto={textoPlano}
                      edgeToEdge
                      fillViewport
                      compactHorizontalPadding={modoLectura}
                      scrollEndPadding={scrollEndPadding}
                    />
                  ) : (
                    <p className="px-4 py-8 text-center text-sm text-text-muted">
                      Esta canción no tiene letra disponible.
                    </p>
                  )}
                </div>
              </div>
            </ControlLetraShell>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className={`flex h-full min-h-0 flex-1 flex-col bg-bg-sala ${
        modoLectura
          ? "overflow-hidden px-0 pb-0 pt-0"
          : showEmbed
            ? "overflow-hidden pb-0 pt-0"
            : "overflow-y-auto overscroll-y-contain pb-3 pt-0"
      }`}
      style={
        modoLectura
          ? undefined
          : {
              ...getControlCantarHorizontalPaddingStyle(),
              paddingBottom: showEmbed
                ? getLetraEmbedBottomPadding()
                : getLetraSectionBottomPadding(),
            }
      }
    >
      {lecturaChipViewport}
      {hasCancion ? (
        <>
          {!modoLectura ? (
            <CancionActivaHeader
              cancionNombre={cancionNombre}
              artista={artista}
              nombreRevealKey={nombreRevealKey}
              nombreRevealClass={nombreRevealClass}
              headerLeading={headerLeading}
              headerAction={headerAction}
              insetHorizontalInParent
            />
          ) : null}

          {waitingForExtract &&
            (modoLectura ? (
              <div
                className="relative min-h-0 flex-1 overflow-hidden rounded-[12px] bg-letra-bg"
                role="status"
                aria-live="polite"
                aria-label="Cargando letra"
              >
                <SalaLetraLinesSkeleton />
              </div>
            ) : (
              <ControlLetraShell
                urlLetra={urlLetra}
                letraTexto={letraTexto}
                filaActions={resolvedFilaActions}
                onExpand={onExpand}
              >
                <div
                  className="relative min-h-0 flex-1 bg-letra-bg"
                  role="status"
                  aria-live="polite"
                  aria-label="Cargando letra"
                >
                  <SalaLetraLinesSkeleton />
                </div>
              </ControlLetraShell>
            ))}

          {!contenido && !waitingForExtract && (
            <p
              className={`text-center text-sm text-text-muted ${
                modoLectura
                  ? "flex flex-1 items-center justify-center px-4"
                  : "mt-6"
              }`}
            >
              Esta canción no tiene letra disponible.
            </p>
          )}

          {showEmbed && contenido.mode === "embed" &&
            (modoLectura ? (
              <div className="relative min-h-0 w-full flex-1">
                {showCifraClubBadge ? (
                  <CifraClubEmbedBadge
                    placement="lectura"
                    onReload={() => setEmbedReloadKey((value) => value + 1)}
                  />
                ) : null}
                {embedConRecorteInicial ? (
                  <LetraRevealFullControl
                    onRevealFull={handleRevealEmbedFull}
                    expanded={embedFullRevealed}
                    style={{ top: getLecturaFabMenuTopCss() }}
                  />
                ) : null}
                {showAcordesPrimeraVezHint ? (
                  <AcordesEmbedPrimeraVezHint
                    onDismiss={dismissAcordesPrimeraVezHint}
                  />
                ) : null}
                <div className="absolute inset-0 min-h-0">
                  <LetraViewer
                    url={contenido.url}
                    title="Letra de la canción activa"
                    fill
                    edgeToEdge={false}
                    fillScaleX={
                      isCifraClubEmbed(contenido.url)
                        ? CIFRACLUB_EMBED_FILL_SCALE_X
                        : undefined
                    }
                    initialScrollOffsetPx={embedTopClipPx}
                    initialScrollBottomOffsetPx={embedBottomClipPx}
                    embedIframeRef={embedIframeRef}
                    reloadKey={embedReloadKey}
                    hideReloadControl={showCifraClubBadge}
                  />
                </div>
              </div>
            ) : (
              <ControlLetraShell
                urlLetra={urlLetra}
                letraTexto={letraTexto}
                filaActions={resolvedFilaActions}
                onExpand={onExpand}
              >
                {showCifraClubBadge ? (
                  <CifraClubEmbedBadge
                    placement="control"
                    onReload={() => setEmbedReloadKey((value) => value + 1)}
                  />
                ) : null}
                {embedConRecorteInicial ? (
                  <LetraRevealFullControl
                    onRevealFull={handleRevealEmbedFull}
                    expanded={embedFullRevealed}
                    className="top-2"
                  />
                ) : null}
                {showAcordesPrimeraVezHint ? (
                  <AcordesEmbedPrimeraVezHint
                    onDismiss={dismissAcordesPrimeraVezHint}
                  />
                ) : null}
                <div className="absolute inset-0 min-h-0">
                  <LetraViewer
                    url={contenido.url}
                    title="Letra de la canción activa"
                    fill
                    edgeToEdge
                    fillScaleX={
                      isCifraClubEmbed(contenido.url)
                        ? CIFRACLUB_EMBED_FILL_SCALE_X
                        : undefined
                    }
                    initialScrollOffsetPx={embedTopClipPx}
                    initialScrollBottomOffsetPx={embedBottomClipPx}
                    embedIframeRef={embedIframeRef}
                    reloadKey={embedReloadKey}
                    hideReloadControl={showCifraClubBadge}
                  />
                </div>
              </ControlLetraShell>
            ))}
        </>
      ) : (
        <>
          {!modoLectura ? (
            <CancionActivaHeader
              cancionNombre={null}
              artista={null}
              nombreRevealKey={nombreRevealKey}
              nombreRevealClass={nombreRevealClass}
              headerLeading={headerLeading}
              headerAction={headerAction}
              insetHorizontalInParent
            />
          ) : null}
          <LetraEmptySheet
            modoLectura={modoLectura}
            filaActions={resolvedFilaActions}
            onExpand={onExpand}
          />
        </>
      )}
    </section>
  );
}
