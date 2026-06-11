import { TapButton } from "@/components/ui/TapFeedback";
import { ChevronUp } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

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
  /** Muestra flecha superior derecha para quitar el recorte (Cifra Club activa). */
  onRevealTop?: () => void;
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
  offsetPx?: number,
): CSSProperties | undefined {
  if (!offsetPx || offsetPx <= 0) {
    return undefined;
  }

  return {
    height: `calc(100% + ${offsetPx}px)`,
    marginTop: `-${offsetPx}px`,
    width: "100%",
  };
}

type LetraIframeProps = {
  url: string;
  title: string;
  className: string;
  initialScrollOffsetPx?: number;
};

function LetraIframe({
  url,
  title,
  className,
  initialScrollOffsetPx,
}: LetraIframeProps) {
  const offsetStyle = getIframeScrollSimulationStyle(initialScrollOffsetPx);

  return (
    <iframe
      src={url}
      title={title}
      className={offsetStyle ? "w-full border-0" : className}
      style={offsetStyle}
      sandbox="allow-scripts allow-same-origin"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

function RevealTopControl({ onRevealTop }: { onRevealTop: () => void }) {
  return (
    <TapButton
      type="button"
      aria-label="Ver inicio de la página"
      onClick={onRevealTop}
      className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center bg-transparent p-0"
    >
      <ChevronUp className="size-4 text-[#c4c4c4]" aria-hidden="true" />
    </TapButton>
  );
}

type EmbedShellProps = {
  className: string;
  style?: CSSProperties;
  onRevealTop?: () => void;
  children: ReactNode;
};

function EmbedShell({ className, style, onRevealTop, children }: EmbedShellProps) {
  return (
    <div
      style={style}
      className={`relative overflow-hidden bg-letra-bg ${className}`}
    >
      {children}
      {onRevealTop ? <RevealTopControl onRevealTop={onRevealTop} /> : null}
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
  onRevealTop,
}: LetraViewerProps) {
  const radiusClass = containerRadiusClass(edgeToEdge, flushBottom);
  const elevatedClass = elevated
    ? "border-2 border-dashed border-accent/85 shadow-[0_10px_40px_rgba(0,0,0,0.48),0_4px_12px_rgba(0,0,0,0.28)]"
    : "";

  if (fill) {
    return (
      <EmbedShell
        onRevealTop={onRevealTop}
        className={`h-full w-full ${radiusClass} ${elevatedClass}`}
      >
        <LetraIframe
          url={url}
          title={title}
          className="h-full w-full border-0"
          initialScrollOffsetPx={initialScrollOffsetPx}
        />
      </EmbedShell>
    );
  }

  const containerStyle = minHeight ? { minHeight } : undefined;

  return (
    <EmbedShell
      style={containerStyle}
      onRevealTop={onRevealTop}
      className={`flex min-h-0 flex-col ${radiusClass} ${elevated ? "h-full min-h-0 flex-1" : "min-h-[320px]"} ${elevatedClass}`}
    >
      <LetraIframe
        url={url}
        title={title}
        className="size-full min-h-[320px] flex-1 border-0"
        initialScrollOffsetPx={initialScrollOffsetPx}
      />
    </EmbedShell>
  );
}
