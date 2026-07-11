"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import Image from "next/image";

type AcordesEmbedPrimeraVezHintProps = {
  onDismiss: () => void;
};

export default function AcordesEmbedPrimeraVezHint({
  onDismiss,
}: AcordesEmbedPrimeraVezHintProps) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-10 z-30 flex justify-center px-3"
      role="dialog"
      aria-labelledby="acordes-primera-vez-titulo"
      aria-describedby="acordes-primera-vez-desc"
    >
      <div className="pointer-events-auto w-full max-w-[17.5rem] overflow-hidden rounded-[12px] border border-accent/50 bg-bg-card/95 shadow-[0_8px_28px_rgba(0,0,0,0.4)] backdrop-blur-[8px]">
        <header className="relative flex items-center gap-2 border-b border-accent/40 bg-accent px-3 py-2 pr-9">
          <Image
            src="/logo.svg"
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0 rounded-md"
            aria-hidden="true"
          />
          <p className="min-w-0 truncate text-[13px] font-extrabold tracking-tight text-bg-darker">
            CantemosTodosApp
          </p>
          <TapButton
            type="button"
            aria-label="Cerrar"
            onClick={onDismiss}
            className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-bg-darker/15 p-0"
          >
            <X className="size-3.5 text-bg-darker" aria-hidden="true" />
          </TapButton>
        </header>

        <div className="px-3.5 pb-3 pt-3">
          <h2
            id="acordes-primera-vez-titulo"
            className="text-[13px] font-bold leading-snug text-text-primary"
          >
            Cookies y página completa
          </h2>

          <div
            id="acordes-primera-vez-desc"
            className="mt-2 space-y-2 text-[12px] leading-relaxed text-text-muted"
          >
            <p>
              La primera vez, el sitio puede pedirte{" "}
              <span className="font-semibold text-text-primary">
                aceptar o rechazar cookies
              </span>{" "}
              abajo en la página. Respondé ahí para poder seguir.
            </p>
            <p className="flex items-start gap-2">
              <span
                className="mt-0.5 flex shrink-0 flex-col items-center rounded-full border px-1 py-0.5"
                style={{
                  color: "var(--voz-config)",
                  borderColor: "var(--voz-config-border)",
                  backgroundColor: "var(--voz-config-bg)",
                }}
                aria-hidden="true"
              >
                <ChevronUp className="size-2.5" strokeWidth={2.75} />
                <ChevronDown className="size-2.5 -mt-0.5" strokeWidth={2.75} />
              </span>
              <span>
                Las flechas azules (arriba a la derecha) muestran la{" "}
                <span className="font-semibold text-text-primary">
                  página completa
                </span>{" "}
                (inicio y pie) cuando lo necesites.
              </span>
            </p>
          </div>

          <TapButton
            type="button"
            onClick={onDismiss}
            className="mt-3 w-full rounded-full border border-accent/50 bg-accent/15 py-1.5 text-[12px] font-semibold text-accent"
          >
            Entendido
          </TapButton>
        </div>
      </div>
    </div>
  );
}
