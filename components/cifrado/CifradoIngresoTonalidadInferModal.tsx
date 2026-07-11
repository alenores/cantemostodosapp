"use client";

import { CifradoTonalidadFields } from "@/components/cifrado/CifradoTonalidadFields";
import { CIFRADO_CONTROLS_SECTION_LABEL_CLASS } from "@/components/cifrado/cifrado-controls-ui";
import type { NotaIndex } from "@/lib/cifrado";
import type {
  PasteIngresoAnalysis,
  TonalidadLineDetectResult,
} from "@/lib/cifrado-import";
import type { TonalidadInferCandidate } from "@/lib/cifrado-tonalidad-infer";
import type { ModoTonal } from "@/lib/cifrado-escala";
import type { NotacionAcordes } from "@/lib/notacion-acordes";
import { ArrowLeftRight } from "lucide-react";
import { useEffect, useState } from "react";

export type PasteIngresoConfirmResult = {
  tonalidad: TonalidadLineDetectResult | null;
  nombre: string;
  artista: string;
  eliminate: boolean;
};

type CifradoIngresoTonalidadInferModalProps = {
  open: boolean;
  analysis: PasteIngresoAnalysis | null;
  candidates: TonalidadInferCandidate[];
  multipleTonalidades: boolean;
  notacion?: NotacionAcordes;
  zIndex?: number;
  onConfirm: (result: PasteIngresoConfirmResult) => void;
  onDismiss: () => void;
};

/** Campos editables: fondo más claro que el modal, para leerse como formulario. */
const PASTE_FIELD_CLASS =
  "min-h-10 w-full rounded-[10px] border border-border bg-letra-bg px-3 text-sm text-letra-text outline-none focus:border-compositor-config-border";

function SectionDivider() {
  return (
    <div className="my-4 flex justify-center" aria-hidden="true">
      <div className="h-px w-full max-w-[calc(100%-0.5rem)] bg-border/70" />
    </div>
  );
}

export function CifradoIngresoTonalidadInferModal({
  open,
  analysis,
  candidates,
  multipleTonalidades,
  notacion = "es",
  zIndex = 70,
  onConfirm,
  onDismiss,
}: CifradoIngresoTonalidadInferModalProps) {
  const [tonalidadIndex, setTonalidadIndex] = useState<NotaIndex | null>(null);
  const [modoTonal, setModoTonal] = useState<ModoTonal | null>(null);
  const [nombre, setNombre] = useState("");
  const [artista, setArtista] = useState("");
  const [eliminate, setEliminate] = useState(true);

  useEffect(() => {
    if (!open) {
      return;
    }

    const fromLine = analysis?.tonalidadFromLine ?? null;
    const fromCandidate = candidates[0] ?? null;
    const initial = fromLine ?? fromCandidate;

    setTonalidadIndex(initial?.tonalidadIndex ?? null);
    setModoTonal(initial?.modoTonal ?? null);
    setNombre(analysis?.suggestedNombre ?? "");
    setArtista(analysis?.suggestedArtista ?? "");
    setEliminate(Boolean(analysis?.textToEliminate?.trim()));
  }, [open, analysis, candidates]);

  if (!open) {
    return null;
  }

  const textToEliminate = analysis?.textToEliminate?.trim() ?? "";
  const showEliminate = textToEliminate.length > 0;
  const showNombreArtista =
    Boolean(analysis?.suggestedNombre?.trim()) ||
    Boolean(analysis?.suggestedArtista?.trim());
  const showCandidates =
    !analysis?.tonalidadFromLine && candidates.length > 1;

  function handleConfirm() {
    const tonalidad: TonalidadLineDetectResult | null =
      tonalidadIndex !== null && modoTonal !== null
        ? { tonalidadIndex, modoTonal }
        : null;

    onConfirm({
      tonalidad,
      nombre: nombre.trim(),
      artista: artista.trim(),
      eliminate: showEliminate ? eliminate : false,
    });
  }

  return (
    <div
      data-tonalidad-infer-dialog=""
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ zIndex }}
    >
      <button
        type="button"
        aria-label="Cerrar sugerencias del pegado"
        className="absolute inset-0 bg-black/60"
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paste-ingreso-title"
        className="relative z-10 flex max-h-[min(90vh,40rem)] w-full max-w-md flex-col rounded-[12px] border border-border bg-bg-card"
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <h2
            id="paste-ingreso-title"
            className="text-base font-semibold text-text-primary"
          >
            Datos sugeridos
          </h2>

          {multipleTonalidades ? (
            <p className="mt-3 rounded-lg border border-border bg-bg-app px-3 py-2 text-xs leading-relaxed text-text-muted">
              La canción aparentemente tiene más de un tono. Te sugerimos
              empezar por la primera tonalidad detectada.
            </p>
          ) : null}

          <div className="mt-4">
            <CifradoTonalidadFields
              idPrefix="paste-ingreso"
              notacion={notacion}
              tonalidadIndex={tonalidadIndex}
              modoTonal={modoTonal}
              layout="stacked"
              requireSelection={false}
              inputClassName={PASTE_FIELD_CLASS}
              onTonalidadChange={setTonalidadIndex}
              onModoTonalChange={setModoTonal}
            />
          </div>

          {showCandidates ? (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs text-text-muted">Opciones por acordes:</p>
              {candidates.map((candidate) => {
                const selected =
                  tonalidadIndex === candidate.tonalidadIndex &&
                  modoTonal === candidate.modoTonal;

                return (
                  <button
                    key={`${candidate.tonalidadIndex}-${candidate.modoTonal}`}
                    type="button"
                    onClick={() => {
                      setTonalidadIndex(candidate.tonalidadIndex);
                      setModoTonal(candidate.modoTonal);
                    }}
                    className={`min-h-10 rounded-[10px] border px-3 text-left text-sm font-semibold transition-colors ${
                      selected
                        ? "border-accent bg-accent/10 text-text-primary"
                        : "border-border bg-letra-bg text-letra-text hover:border-accent/60"
                    }`}
                  >
                    {candidate.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {showNombreArtista ? (
            <>
              <SectionDivider />
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <label
                    className="min-w-0 flex-1"
                    htmlFor="paste-ingreso-nombre"
                  >
                    <span className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}>
                      Título
                    </span>
                    <input
                      id="paste-ingreso-nombre"
                      value={nombre}
                      onChange={(event) => setNombre(event.target.value)}
                      className={PASTE_FIELD_CLASS}
                      placeholder="Nombre de la canción"
                    />
                  </label>
                  <button
                    type="button"
                    aria-label="Intercambiar título y artista"
                    title="Intercambiar"
                    onClick={() => {
                      setNombre(artista);
                      setArtista(nombre);
                    }}
                    className="mb-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-letra-bg text-text-secondary transition-colors hover:border-accent/60 hover:text-text-primary"
                  >
                    <ArrowLeftRight className="size-3.5" aria-hidden="true" />
                  </button>
                </div>

                <label htmlFor="paste-ingreso-artista">
                  <span className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}>
                    Artista
                  </span>
                  <input
                    id="paste-ingreso-artista"
                    value={artista}
                    onChange={(event) => setArtista(event.target.value)}
                    className={PASTE_FIELD_CLASS}
                    placeholder="Artista"
                  />
                </label>
              </div>
            </>
          ) : null}

          {showEliminate ? (
            <>
              <SectionDivider />
              <label className="flex h-auto cursor-pointer items-start gap-3 rounded-[10px] border border-border bg-[#b0b6c0] px-3 py-3">
                <input
                  type="checkbox"
                  checked={eliminate}
                  onChange={(event) => setEliminate(event.target.checked)}
                  className="mt-1 size-4 shrink-0 accent-[var(--color-accent,#3b82f6)]"
                />
                <span className="min-w-0 flex-1 text-sm leading-5 text-[#1f2430]">
                  <span className="font-semibold">Se elimina:</span>
                  <span className="mt-1 block whitespace-pre-wrap break-words">
                    {textToEliminate}
                  </span>
                </span>
              </label>
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={handleConfirm}
            className="min-h-11 w-full rounded-[10px] bg-accent px-4 text-sm font-semibold text-white"
          >
            Confirmar
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 w-full rounded-[10px] border border-border bg-bg-card text-sm font-semibold text-text-secondary"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
