"use client";

import AcordesEmbedPrimeraVezHint from "@/components/salas/AcordesEmbedPrimeraVezHint";
import LetraViewer from "@/components/salas/LetraViewer";
import { TapButton } from "@/components/ui/TapFeedback";
import { useAcordesEmbedPrimeraVez } from "@/hooks/useAcordesEmbedPrimeraVez";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import {
  getEmbedBottomClipPx,
  getEmbedTopClipPx,
  shouldApplyEmbedInitialOffset,
} from "@/lib/letra-display";
import { X } from "lucide-react";
import { useState } from "react";

type UrlLetraModalProps = {
  open: boolean;
  url: string | null;
  titulo: string;
  onClose: () => void;
};

export default function UrlLetraModal({
  open,
  url,
  titulo,
  onClose,
}: UrlLetraModalProps) {
  const [embedFullRevealed, setEmbedFullRevealed] = useState(false);
  const { showAcordesPrimeraVezHint, dismissAcordesPrimeraVezHint } =
    useAcordesEmbedPrimeraVez(open ? url : null);

  useHardwareBack(open, () => {
    setEmbedFullRevealed(false);
    onClose();
  });

  if (!open || !url) {
    return null;
  }

  const embedConRecorteInicial = shouldApplyEmbedInitialOffset(url);
  const embedTopClipPx =
    embedConRecorteInicial && !embedFullRevealed
      ? getEmbedTopClipPx(url)
      : undefined;
  const embedBottomClipPx =
    embedConRecorteInicial &&
    !embedFullRevealed &&
    !showAcordesPrimeraVezHint
      ? getEmbedBottomClipPx(url)
      : undefined;

  function handleRevealEmbedFull() {
    if (!embedFullRevealed && showAcordesPrimeraVezHint) {
      dismissAcordesPrimeraVezHint();
    }
    setEmbedFullRevealed((current) => !current);
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-bg-app">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-bg-darker px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate text-lg font-extrabold text-text-primary">
          {titulo}
        </h2>
        <TapButton
          aria-label="Cerrar letra"
          onClick={() => {
            setEmbedFullRevealed(false);
            onClose();
          }}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
        >
          <X className="size-5 text-text-primary" aria-hidden="true" />
        </TapButton>
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {showAcordesPrimeraVezHint ? (
          <AcordesEmbedPrimeraVezHint onDismiss={dismissAcordesPrimeraVezHint} />
        ) : null}
        <LetraViewer
          url={url}
          title={titulo}
          fill
          edgeToEdge
          initialScrollOffsetPx={embedTopClipPx}
          initialScrollBottomOffsetPx={embedBottomClipPx}
          revealExpanded={embedFullRevealed}
          onRevealFull={
            embedConRecorteInicial ? handleRevealEmbedFull : undefined
          }
        />
      </div>
    </div>
  );
}
