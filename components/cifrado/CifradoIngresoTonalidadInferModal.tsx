"use client";

import type { TonalidadInferCandidate } from "@/lib/cifrado-tonalidad-infer";
import type { TonalidadLineDetectResult } from "@/lib/cifrado-import";

type CifradoIngresoTonalidadInferModalProps = {
  open: boolean;
  candidates: TonalidadInferCandidate[];
  multipleTonalidades: boolean;
  zIndex?: number;
  onSelect: (tonalidad: TonalidadLineDetectResult) => void;
  onDismiss: () => void;
};

export function CifradoIngresoTonalidadInferModal({
  open,
  candidates,
  multipleTonalidades,
  zIndex = 70,
  onSelect,
  onDismiss,
}: CifradoIngresoTonalidadInferModalProps) {
  if (!open || candidates.length === 0) {
    return null;
  }

  return (
    <div
      data-tonalidad-infer-dialog=""
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ zIndex }}
    >
      <button
        type="button"
        aria-label="Cerrar sugerencias de tonalidad"
        className="absolute inset-0 bg-black/60"
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tonalidad-infer-title"
        className="relative z-10 w-full max-w-sm rounded-[12px] border border-border bg-bg-card p-5"
      >
        <h2
          id="tonalidad-infer-title"
          className="text-base font-semibold text-text-primary"
        >
          ¿En qué tono está?
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          Por los acordes pegados, estas son las opciones más probables. Elegí
          una o descartá y completá el tono manualmente.
        </p>

        {multipleTonalidades ? (
          <p className="mt-3 rounded-lg border border-border bg-bg-app px-3 py-2 text-xs leading-relaxed text-text-muted">
            La canción aparentemente tiene más de un tono. Te sugerimos empezar
            por la primera tonalidad detectada.
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          {candidates.map((candidate) => (
            <button
              key={`${candidate.tonalidadIndex}-${candidate.modoTonal}`}
              type="button"
              onClick={() =>
                onSelect({
                  tonalidadIndex: candidate.tonalidadIndex,
                  modoTonal: candidate.modoTonal,
                })
              }
              className="min-h-11 rounded-[10px] border border-border bg-bg-app px-4 text-left text-sm font-semibold text-text-primary transition-colors hover:border-accent/60 hover:bg-accent/10"
            >
              {candidate.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 min-h-11 w-full rounded-[10px] border border-border bg-bg-card text-sm font-semibold text-text-secondary"
        >
          Elegir manualmente
        </button>
      </div>
    </div>
  );
}
