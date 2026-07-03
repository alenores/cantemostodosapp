"use client";

import { HelpInfoCard } from "@/components/ui/HelpInfoCard";
import { MetronomeUnifiedDemo } from "@/components/ui/MetronomoConfigHelpDemos";
import {
  METRONOME_CONCEPTS,
  type MetronomeConceptId,
} from "@/lib/metronomo-help-content";
import { HelpCircle, Timer, Volume2, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

const HELP_ICON_CLASS = "shrink-0 text-[var(--voz-config)]";

const CONCEPT_SHIMMER_DELAY_MS: Record<MetronomeConceptId, number> = {
  golpes: 0,
  figura: 220,
  dinamica: 440,
  tempo: 660,
};
function GolpesConceptIcon() {
  return (
    <svg
      viewBox="0 0 28 10"
      className="h-2.5 w-7 shrink-0 text-[var(--voz-config)]"
      aria-hidden="true"
    >
      {[5, 11, 17, 23].map((cx) => (
        <circle key={cx} cx={cx} cy="5" r="2.5" fill="currentColor" />
      ))}
    </svg>
  );
}

function FiguraConceptIcon() {
  return (
    <svg
      viewBox="0 0 32 40"
      className="h-4 w-3 shrink-0 text-[var(--voz-config)]"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="30" rx="9" ry="6.5" fill="currentColor" />
      <line
        x1="21"
        y1="30"
        x2="21"
        y2="4"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DinamicaConceptIcon() {
  return (
    <Volume2
      className={`size-4 ${HELP_ICON_CLASS}`}
      strokeWidth={2.25}
      aria-hidden="true"
    />
  );
}

function TempoConceptIcon() {
  return (
    <Timer
      className={`size-4 ${HELP_ICON_CLASS}`}
      strokeWidth={2.25}
      aria-hidden="true"
    />
  );
}

const CONCEPT_ICONS: Record<MetronomeConceptId, () => ReactNode> = {
  golpes: GolpesConceptIcon,
  figura: FiguraConceptIcon,
  dinamica: DinamicaConceptIcon,
  tempo: TempoConceptIcon,
};

type MetronomoConfigHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

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
                {METRONOME_CONCEPTS.map((concept) => {
                  const Icon = CONCEPT_ICONS[concept.id];

                  return (
                    <HelpInfoCard
                      key={concept.id}
                      variant="card"
                      icon={<Icon />}
                      label={concept.label}
                      text={concept.text}
                      tip={concept.tip}
                      shimmerDelayMs={CONCEPT_SHIMMER_DELAY_MS[concept.id]}
                    />
                  );
                })}
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
