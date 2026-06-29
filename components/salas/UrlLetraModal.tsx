"use client";

import LetraViewer from "@/components/salas/LetraViewer";
import { TapButton } from "@/components/ui/TapFeedback";
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
  const [embedTopRevealed, setEmbedTopRevealed] = useState(false);

  useHardwareBack(open, () => {
    setEmbedTopRevealed(false);
    onClose();
  });

  if (!open || !url) {
    return null;
  }

  const embedConRecorteInicial = shouldApplyEmbedInitialOffset(url);
  const embedTopClipPx =
    embedConRecorteInicial && !embedTopRevealed
      ? getEmbedTopClipPx(url)
      : undefined;
  const embedBottomClipPx = embedConRecorteInicial
    ? getEmbedBottomClipPx(url)
    : undefined;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-bg-app">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-bg-darker px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate text-lg font-extrabold text-text-primary">
          {titulo}
        </h2>
        <TapButton
          aria-label="Cerrar letra"
          onClick={() => {
            setEmbedTopRevealed(false);
            onClose();
          }}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
        >
          <X className="size-5 text-text-primary" aria-hidden="true" />
        </TapButton>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <LetraViewer
          url={url}
          title={titulo}
          fill
          edgeToEdge
          initialScrollOffsetPx={embedTopClipPx}
          initialScrollBottomOffsetPx={embedBottomClipPx}
          onRevealTop={
            embedConRecorteInicial && !embedTopRevealed
              ? () => setEmbedTopRevealed(true)
              : undefined
          }
        />
      </div>
    </div>
  );
}
