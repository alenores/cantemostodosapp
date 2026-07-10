"use client";

import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import LetraFuenteSitioBadge from "@/components/salas/LetraFuenteSitioBadge";
import { TapButton } from "@/components/ui/TapFeedback";
import { Globe2, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

type CifraClubEmbedHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function CifraClubEmbedHelpModal({
  open,
  onClose,
}: CifraClubEmbedHelpModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8">
      <button
        type="button"
        data-no-tap-feedback
        aria-label="Cerrar"
        className="absolute inset-0 border-0 bg-black/55 outline-none"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cifraclub-embed-help-titulo"
        className="relative z-10 w-full max-w-[19rem] overflow-hidden rounded-[14px] border border-border bg-bg-cola-sheet shadow-2xl"
      >
        <header className="relative border-b border-border/80 bg-bg-dark px-4 pb-3 pt-3.5">
          <TapButton
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-bg-card p-0"
          >
            <X className="size-3.5 text-text-muted" aria-hidden="true" />
          </TapButton>

          <div className="flex flex-col items-center gap-1.5 pr-6">
            <div
              className="flex size-9 items-center justify-center rounded-full border"
              style={{
                backgroundColor: "var(--voz-config-bg)",
                borderColor: "var(--voz-config-border)",
              }}
            >
              <Globe2
                className="size-4"
                style={{ color: "var(--voz-config)" }}
                strokeWidth={2.25}
                aria-hidden="true"
              />
            </div>
            <h2
              id="cifraclub-embed-help-titulo"
              className="text-base font-bold text-text-primary"
            >
              Página web
            </h2>
          </div>
        </header>

        <div className="space-y-3 px-4 py-3.5">
          <p className="text-[13px] leading-relaxed text-text-muted">
            Esta letra se muestra desde el sitio de{" "}
            <LetraFuenteSitioBadge variant="cifraclub" inline />. Se muestran
            menús, artículos u otros elementos propios de la web.
          </p>

          <p className="text-[13px] leading-relaxed text-text-muted">
            Para ver la letra en{" "}
            <span className="font-bold text-text-primary">hoja blanca</span>, en el
            buscador elegí canciones con estos iconos:
          </p>

          <ul className="flex flex-col gap-2 rounded-[10px] border border-border/70 bg-bg-card/60 px-3 py-2.5">
            <li className="flex items-center gap-2.5">
              <LetraFuenteIcon tipo="acordes" compact />
              <LetraFuenteSitioBadge variant="acordesdcanciones" />
            </li>
            <li className="flex items-center gap-2.5">
              <LetraFuenteIcon tipo="cancionero" compact />
              <span className="text-xs text-text-muted">Del cancionero</span>
            </li>
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}
