"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { TunerListenerPanel } from "@/components/ui/TunerListenerPanel";
import type { NoteDetection } from "@/lib/afinador";
import { ToolModalHeader } from "@/components/ui/ToolModalHeader";
import { ToolPresentationRoot } from "@/components/ui/ToolPresentationRoot";
import type { ToolPresentation } from "@/lib/tool-presentation";
import { isToolPagePresentation } from "@/lib/tool-presentation";
import { Mic, Gauge } from "lucide-react";

type AfinadorModalProps = {
  open: boolean;
  onClose: () => void;
  onRequestMic: () => void;
  detection: NoteDetection | null;
  micError: string | null;
  micPermissionGranted: boolean;
  micReady: boolean;
  micStarting: boolean;
  presentation?: ToolPresentation;
};

function MicConnectingPanel() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-border bg-bg-card">
        <Mic className="size-8 text-accent" aria-hidden="true" />
      </div>
      <p className="text-sm text-text-muted">Conectando micrófono...</p>
    </div>
  );
}

function MicPermissionPanel({
  micError,
  micStarting,
  onRequestMic,
}: {
  micError: string | null;
  micStarting: boolean;
  onRequestMic: () => void;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-border bg-bg-card">
        <Mic className="size-8 text-accent" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <p className="text-base font-semibold text-text-primary">
          Acceso al micrófono
        </p>
        <p className="text-sm text-text-muted">
          Para detectar la nota, necesitamos escuchar tu instrumento. Tocá el
          botón y aceptá el permiso cuando el navegador te lo pida.
        </p>
      </div>
      {micError ? (
        <p className="text-sm text-accent" role="alert">
          {micError}
        </p>
      ) : null}
      <TapButton
        type="button"
        disabled={micStarting}
        onClick={onRequestMic}
        className="w-full rounded-[12px] bg-accent px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {micStarting
          ? "Solicitando permiso..."
          : micError
            ? "Reintentar"
            : "Permitir micrófono"}
      </TapButton>
    </div>
  );
}

export default function AfinadorModal({
  open,
  onClose,
  onRequestMic,
  detection,
  micError,
  micPermissionGranted,
  micReady,
  micStarting,
  presentation = "modal",
}: AfinadorModalProps) {
  const isPage = isToolPagePresentation(presentation);

  return (
    <ToolPresentationRoot
      presentation={presentation}
      open={open}
      onClose={onClose}
      closeAriaLabel="Cerrar afinador"
      panelClassName={
        isPage
          ? ""
          : "relative z-10 tool-modal-panel flex h-[min(92vh,780px)] flex-col overflow-hidden rounded-amplio border border-border bg-bg-cola-sheet shadow-xl"
      }
    >
      <ToolModalHeader
        titleId="afinador-titulo"
        headerContent={
          <div className="flex min-w-0 items-center gap-2">
            {!isPage ? (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card">
                <Gauge className="size-5 text-inherit" aria-hidden="true" />
              </div>
            ) : null}
            <h2
              id="afinador-titulo"
              className="min-w-0 truncate text-lg font-extrabold text-inherit"
            >
              Afinador
            </h2>
          </div>
        }
        accentVar="--accent-afinador"
        closeAriaLabel="Cerrar afinador"
        onClose={onClose}
        showClose={!isPage}
        isPage={isPage}
      />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-6">
        {!micReady ? (
          !micPermissionGranted || micError ? (
            <MicPermissionPanel
              micError={micError}
              micStarting={micStarting}
              onRequestMic={onRequestMic}
            />
          ) : (
            <MicConnectingPanel />
          )
        ) : (
          <TunerListenerPanel detection={detection} />
        )}
      </div>
    </ToolPresentationRoot>
  );
}
