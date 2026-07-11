"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

const EMBED_LOAD_TIMEOUT_MS = 14000;

type EmbedLoadStatus = "loading" | "ready" | "error";

type LetraViewerProps = {
  url: string;
  title?: string;
  edgeToEdge?: boolean;
  /** Solo redondea arriba; abajo recto (canción activa contra la barra de cola). */
  flushBottom?: boolean;
  elevated?: boolean;
  minHeight?: string;
  fill?: boolean;
  /** Recorte visual superior: simula un scroll inicial sin tocar el DOM del iframe. */
  initialScrollOffsetPx?: number;
  /**
   * Recorte inferior (propagandas / botones flotantes): el iframe es más alto y
   * el excedente queda debajo del overflow:hidden del marco.
   */
  initialScrollBottomOffsetPx?: number;
  /** Alterna página completa / recortes (flechas superior derecha). */
  onRevealFull?: () => void;
  /** true = sin recortes; las flechas apuntan hacia adentro. */
  revealExpanded?: boolean;
  /** @deprecated Usar onRevealFull. */
  onRevealTop?: () => void;
  /** Clase extra para posicionar el control de revelar (p. ej. cuando hay badge). */
  revealControlClassName?: string;
  embedIframeRef?: RefObject<HTMLIFrameElement | null>;
  /** Escala horizontal para tapar márgenes del sitio embebido (Cifra Club). */
  fillScaleX?: number;
  /** Al incrementar, vuelve a cargar el iframe (recargar desde el padre). */
  reloadKey?: number;
  /** Oculta el botón Recargar interno (si el padre ya muestra uno). */
  hideReloadControl?: boolean;
};

function containerRadiusClass(
  edgeToEdge: boolean,
  flushBottom: boolean,
): string {
  if (edgeToEdge) {
    return "";
  }

  if (flushBottom) {
    return "rounded-t-[12px]";
  }

  return "rounded-[12px]";
}

function getIframeScrollSimulationStyle(
  topOffsetPx?: number,
  bottomOffsetPx?: number,
  fillScaleX?: number,
): CSSProperties | undefined {
  const top = topOffsetPx && topOffsetPx > 0 ? topOffsetPx : 0;
  const bottom = bottomOffsetPx && bottomOffsetPx > 0 ? bottomOffsetPx : 0;
  const scaleX =
    fillScaleX && fillScaleX > 1 && Number.isFinite(fillScaleX)
      ? fillScaleX
      : 1;
  const hasScale = scaleX > 1;
  const overhang = top + bottom;

  if (overhang === 0 && !hasScale) {
    return undefined;
  }

  const style: CSSProperties = {
    position: "absolute",
    left: 0,
    width: "100%",
    top: top > 0 ? `-${top}px` : 0,
    height: overhang > 0 ? `calc(100% + ${overhang}px)` : "100%",
  };

  if (hasScale) {
    style.transform = `scaleX(${scaleX})`;
    style.transformOrigin = "top left";
  }

  return style;
}

type LetraIframeProps = {
  url: string;
  title: string;
  className: string;
  initialScrollOffsetPx?: number;
  initialScrollBottomOffsetPx?: number;
  embedIframeRef?: RefObject<HTMLIFrameElement | null>;
  fillScaleX?: number;
  frameKey: string;
  onLoad: () => void;
  onError: () => void;
};

function LetraIframe({
  url,
  title,
  className,
  initialScrollOffsetPx,
  initialScrollBottomOffsetPx,
  embedIframeRef,
  fillScaleX,
  frameKey,
  onLoad,
  onError,
}: LetraIframeProps) {
  const offsetStyle = getIframeScrollSimulationStyle(
    initialScrollOffsetPx,
    initialScrollBottomOffsetPx,
    fillScaleX,
  );
  const topClipPx =
    initialScrollOffsetPx && initialScrollOffsetPx > 0
      ? initialScrollOffsetPx
      : undefined;
  const bottomClipPx =
    initialScrollBottomOffsetPx && initialScrollBottomOffsetPx > 0
      ? initialScrollBottomOffsetPx
      : undefined;

  return (
    <iframe
      key={frameKey}
      ref={embedIframeRef}
      src={url}
      title={title}
      data-embed-top-clip-px={topClipPx}
      data-embed-bottom-clip-px={bottomClipPx}
      className={offsetStyle ? "absolute border-0" : className}
      style={offsetStyle}
      sandbox="allow-scripts allow-same-origin"
      referrerPolicy="no-referrer-when-downgrade"
      onLoad={onLoad}
      onError={onError}
    />
  );
}

export function LetraRevealFullControl({
  onRevealFull,
  expanded = false,
  className = "top-2",
  style,
}: {
  onRevealFull: () => void;
  /** true = página completa; flechas hacia adentro (volver a recortar). */
  expanded?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <TapButton
      type="button"
      aria-label={
        expanded ? "Volver a recortar la página" : "Ver página completa"
      }
      aria-pressed={expanded}
      onClick={onRevealFull}
      style={{
        color: "var(--voz-config)",
        borderColor: "var(--voz-config-border)",
        backgroundColor:
          "color-mix(in srgb, var(--bg-card) 78%, transparent)",
        ...style,
      }}
      className={`absolute right-2 z-20 flex h-8 w-7 flex-col items-center justify-center gap-0 rounded-full border p-0 shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-[6px] ${className}`}
    >
      {expanded ? (
        <>
          <ChevronDown
            className="size-3.5"
            strokeWidth={2.75}
            aria-hidden="true"
          />
          <ChevronUp
            className="size-3.5 -mt-1"
            strokeWidth={2.75}
            aria-hidden="true"
          />
        </>
      ) : (
        <>
          <ChevronUp
            className="size-3.5"
            strokeWidth={2.75}
            aria-hidden="true"
          />
          <ChevronDown
            className="size-3.5 -mt-1"
            strokeWidth={2.75}
            aria-hidden="true"
          />
        </>
      )}
    </TapButton>
  );
}

/** @deprecated Usar LetraRevealFullControl. */
export function LetraRevealTopControl({
  onRevealTop,
  className = "top-2",
  style,
}: {
  onRevealTop: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <LetraRevealFullControl
      onRevealFull={onRevealTop}
      className={className}
      style={style}
    />
  );
}

export function LetraEmbedReloadControl({
  onReload,
  className = "",
  style,
}: {
  onReload: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <TapButton
      type="button"
      aria-label="Recargar página"
      onClick={onReload}
      style={style}
      className={`pointer-events-auto flex items-center gap-1 rounded-full border py-0.5 pl-2 pr-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-[6px] ${className}`}
    >
      <RefreshCw
        className="size-3 shrink-0 text-accent"
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <span className="select-none text-[9px] font-semibold tracking-tight text-accent sm:text-[10px]">
        Recargar
      </span>
    </TapButton>
  );
}

function EmbedLoadErrorBanner({ onReload }: { onReload: () => void }) {
  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-letra-bg/95 px-6 text-center"
      role="alert"
    >
      <p className="max-w-[16rem] text-[15px] font-bold leading-snug text-accent">
        No se pudo mostrar esta página.
      </p>
      <p className="max-w-[16rem] text-[12px] leading-snug text-text-muted">
        Probá recargar. Si sigue igual, pasá a otra canción.
      </p>
      <TapButton
        type="button"
        onClick={onReload}
        className="mt-1 flex items-center gap-2 rounded-full border border-accent/50 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent"
      >
        <RefreshCw className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
        Recargar
      </TapButton>
    </div>
  );
}

type EmbedShellProps = {
  className: string;
  style?: CSSProperties;
  onRevealFull?: () => void;
  revealExpanded?: boolean;
  revealControlClassName?: string;
  showReloadControl?: boolean;
  onReload?: () => void;
  loadStatus: EmbedLoadStatus;
  children: ReactNode;
};

/**
 * Las flechas van fuera del contenedor del iframe: en móvil el iframe puede
 * pintarse encima de hermanos directos y hacerlas desaparecer al cargar.
 */
function EmbedShell({
  className,
  style,
  onRevealFull,
  revealExpanded = false,
  revealControlClassName,
  showReloadControl,
  onReload,
  loadStatus,
  children,
}: EmbedShellProps) {
  return (
    <div
      style={style}
      className={`relative overflow-hidden bg-letra-bg ${className}`}
    >
      <div className="absolute inset-0">{children}</div>
      {loadStatus === "error" && onReload ? (
        <EmbedLoadErrorBanner onReload={onReload} />
      ) : null}
      {showReloadControl && onReload && loadStatus !== "error" ? (
        <div className="pointer-events-none absolute bottom-2 left-2 z-20">
          <LetraEmbedReloadControl onReload={onReload} />
        </div>
      ) : null}
      {onRevealFull ? (
        <LetraRevealFullControl
          onRevealFull={onRevealFull}
          expanded={revealExpanded}
          className={revealControlClassName}
        />
      ) : null}
    </div>
  );
}

export default function LetraViewer({
  url,
  title = "Previsualización de letra",
  edgeToEdge = false,
  flushBottom = false,
  elevated = false,
  minHeight,
  fill = false,
  initialScrollOffsetPx,
  initialScrollBottomOffsetPx,
  onRevealFull,
  onRevealTop,
  revealExpanded = false,
  revealControlClassName,
  embedIframeRef,
  fillScaleX,
  reloadKey = 0,
  hideReloadControl = false,
}: LetraViewerProps) {
  const [localReloadKey, setLocalReloadKey] = useState(0);
  const [loadStatus, setLoadStatus] = useState<EmbedLoadStatus>("loading");
  const frameKey = `${url}::${reloadKey}::${localReloadKey}`;
  const revealFull = onRevealFull ?? onRevealTop;

  useEffect(() => {
    setLoadStatus("loading");
    const timerId = window.setTimeout(() => {
      setLoadStatus((current) => (current === "loading" ? "error" : current));
    }, EMBED_LOAD_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [frameKey]);

  function handleReload() {
    setLocalReloadKey((value) => value + 1);
  }

  const radiusClass = containerRadiusClass(edgeToEdge, flushBottom);
  const elevatedClass = elevated
    ? "border-2 border-dashed border-accent/85 shadow-[0_10px_40px_rgba(0,0,0,0.48),0_4px_12px_rgba(0,0,0,0.28)]"
    : "";
  const showReloadControl = !hideReloadControl;

  const iframe = (
    <LetraIframe
      url={url}
      title={title}
      className={
        fill ? "h-full w-full border-0" : "size-full min-h-[320px] flex-1 border-0"
      }
      initialScrollOffsetPx={initialScrollOffsetPx}
      initialScrollBottomOffsetPx={initialScrollBottomOffsetPx}
      embedIframeRef={embedIframeRef}
      fillScaleX={fillScaleX}
      frameKey={frameKey}
      onLoad={() => setLoadStatus("ready")}
      onError={() => setLoadStatus("error")}
    />
  );

  if (fill) {
    return (
      <EmbedShell
        onRevealFull={revealFull}
        revealExpanded={revealExpanded}
        revealControlClassName={revealControlClassName}
        showReloadControl={showReloadControl}
        onReload={handleReload}
        loadStatus={loadStatus}
        className={`h-full w-full ${radiusClass} ${elevatedClass}`}
      >
        {iframe}
      </EmbedShell>
    );
  }

  const containerStyle = minHeight ? { minHeight } : undefined;

  return (
    <EmbedShell
      style={containerStyle}
      onRevealFull={revealFull}
      revealExpanded={revealExpanded}
      revealControlClassName={revealControlClassName}
      showReloadControl={showReloadControl}
      onReload={handleReload}
      loadStatus={loadStatus}
      className={`flex min-h-0 flex-col ${radiusClass} ${elevated ? "h-full min-h-0 flex-1" : "min-h-[320px]"} ${elevatedClass}`}
    >
      {iframe}
    </EmbedShell>
  );
}
