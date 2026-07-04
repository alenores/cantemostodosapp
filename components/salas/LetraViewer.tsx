import { TapButton } from "@/components/ui/TapFeedback";
import { ChevronUp } from "lucide-react";
import type { CSSProperties, ReactNode, RefObject } from "react";

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
  /** @deprecated El recorte inferior no se aplica al iframe (rompe scroll). Reservado por compatibilidad. */
  initialScrollBottomOffsetPx?: number;
  /** Muestra flecha superior derecha para quitar el recorte (Cifra Club activa). */
  onRevealTop?: () => void;
  /** Clase extra para posicionar el control de revelar (p. ej. cuando hay badge). */
  revealControlClassName?: string;
  embedIframeRef?: RefObject<HTMLIFrameElement | null>;
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
): CSSProperties | undefined {
  const top = topOffsetPx && topOffsetPx > 0 ? topOffsetPx : 0;

  if (top === 0) {
    return undefined;
  }

  return {
    height: `calc(100% + ${top}px)`,
    marginTop: `-${top}px`,
    width: "100%",
  };
}

type LetraIframeProps = {
  url: string;
  title: string;
  className: string;
  initialScrollOffsetPx?: number;
  initialScrollBottomOffsetPx?: number;
  embedIframeRef?: RefObject<HTMLIFrameElement | null>;
};

function LetraIframe({
  url,
  title,
  className,
  initialScrollOffsetPx,
  initialScrollBottomOffsetPx,
  embedIframeRef,
}: LetraIframeProps) {
  const offsetStyle = getIframeScrollSimulationStyle(initialScrollOffsetPx);
  const topClipPx =
    initialScrollOffsetPx && initialScrollOffsetPx > 0
      ? initialScrollOffsetPx
      : undefined;

  return (
    <iframe
      ref={embedIframeRef}
      src={url}
      title={title}
      data-embed-top-clip-px={topClipPx}
      className={offsetStyle ? "w-full border-0" : className}
      style={offsetStyle}
      sandbox="allow-scripts allow-same-origin"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

function RevealTopControl({
  onRevealTop,
  className = "top-2",
}: {
  onRevealTop: () => void;
  className?: string;
}) {
  return (
    <TapButton
      type="button"
      aria-label="Ver inicio de la página"
      onClick={onRevealTop}
      className={`absolute right-2 z-10 flex size-7 items-center justify-center bg-transparent p-0 ${className}`}
    >
      <ChevronUp className="size-4 text-[#c4c4c4]" aria-hidden="true" />
    </TapButton>
  );
}

type EmbedShellProps = {
  className: string;
  style?: CSSProperties;
  onRevealTop?: () => void;
  revealControlClassName?: string;
  children: ReactNode;
};

function EmbedShell({
  className,
  style,
  onRevealTop,
  revealControlClassName,
  children,
}: EmbedShellProps) {
  return (
    <div
      style={style}
      className={`relative overflow-hidden bg-letra-bg ${className}`}
    >
      {children}
      {onRevealTop ? (
        <RevealTopControl
          onRevealTop={onRevealTop}
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
  onRevealTop,
  revealControlClassName,
  embedIframeRef,
}: LetraViewerProps) {
  const radiusClass = containerRadiusClass(edgeToEdge, flushBottom);
  const elevatedClass = elevated
    ? "border-2 border-dashed border-accent/85 shadow-[0_10px_40px_rgba(0,0,0,0.48),0_4px_12px_rgba(0,0,0,0.28)]"
    : "";

  if (fill) {
    return (
      <EmbedShell
        onRevealTop={onRevealTop}
        revealControlClassName={revealControlClassName}
        className={`h-full w-full ${radiusClass} ${elevatedClass}`}
      >
        <LetraIframe
          url={url}
          title={title}
          className="h-full w-full border-0"
          initialScrollOffsetPx={initialScrollOffsetPx}
          initialScrollBottomOffsetPx={initialScrollBottomOffsetPx}
          embedIframeRef={embedIframeRef}
        />
      </EmbedShell>
    );
  }

  const containerStyle = minHeight ? { minHeight } : undefined;

  return (
    <EmbedShell
      style={containerStyle}
      onRevealTop={onRevealTop}
      revealControlClassName={revealControlClassName}
      className={`flex min-h-0 flex-col ${radiusClass} ${elevated ? "h-full min-h-0 flex-1" : "min-h-[320px]"} ${elevatedClass}`}
    >
      <LetraIframe
        url={url}
        title={title}
        className="size-full min-h-[320px] flex-1 border-0"
        initialScrollOffsetPx={initialScrollOffsetPx}
        initialScrollBottomOffsetPx={initialScrollBottomOffsetPx}
        embedIframeRef={embedIframeRef}
      />
    </EmbedShell>
  );
}
