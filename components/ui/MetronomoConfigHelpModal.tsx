"use client";

import { MetronomeUnifiedDemo } from "@/components/ui/MetronomoConfigHelpDemos";
import { METRONOME_CONCEPTS } from "@/lib/metronomo-help-content";
import { HelpCircle, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

type MetronomoConfigHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

function ConceptCard({
  label,
  text,
  tip,
}: {
  label: string;
  text: string;
  tip: string;
}) {
  return (
    <article className="overflow-hidden rounded-[12px] border border-border bg-bg-card">
      <div className="space-y-2 p-3">
        <p className="font-bold text-[var(--voz-config)]">{label}</p>
        <p className="text-[12px] leading-relaxed text-text-secondary">{text}</p>
        <p
          className="border-t pt-2 text-[11px] text-text-muted"
          style={{ borderColor: "var(--border)" }}
        >
          {tip}
        </p>
      </div>
    </article>
  );
}

export function MetronomoConfigHelpModal({
  open,
  onClose,
}: MetronomoConfigHelpModalProps) {
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-3 py-6">
      <button
        type="button"
        aria-label="Cerrar ayuda de configuración"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="metronomo-help-titulo"
        className="relative z-10 flex h-[min(88vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-2xl"
      >
        <header
          className="shrink-0 border-b bg-bg-dark px-4 pb-3 pt-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2
                id="metronomo-help-titulo"
                className="text-xl font-extrabold text-text-primary"
              >
                ¿Para qué sirve?
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Metrónomo · guía de configuración
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar ayuda"
              onClick={onClose}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              <X className="size-5 text-text-primary" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
          <div className="space-y-5">
            <MetronomeUnifiedDemo />

            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                Qué controla cada cosa
              </h3>
              <div className="mt-2 space-y-2">
                {METRONOME_CONCEPTS.map((concept) => (
                  <ConceptCard
                    key={concept.id}
                    label={concept.label}
                    text={concept.text}
                    tip={concept.tip}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function MetronomoConfigHelpButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label="Ayuda para configurar el metrónomo"
      className="flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-bg-card"
      style={{
        borderColor: "color-mix(in srgb, var(--voz-config) 35%, var(--border))",
        color: "var(--voz-config)",
        backgroundColor:
          "color-mix(in srgb, var(--voz-config) 10%, transparent)",
      }}
    >
      <HelpCircle className="size-4" strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
