"use client";

import { AcordeLabel } from "@/components/cifrado/AcordeLabel";
import { CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS } from "@/components/cifrado/cifrado-controls-ui";
import { TapButton } from "@/components/ui/TapFeedback";
import {
  MODIFICADORES,
  type AcordePos,
  type Modificador,
  type NotaIndex,
} from "@/lib/cifrado";
import {
  getModificadorPorDefecto,
  isNotaEnEscala,
  type ModoTonal,
} from "@/lib/cifrado-escala";
import { getNotaLabel, type NotacionAcordes } from "@/lib/notacion-acordes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const NOTA_INDICES = Array.from({ length: 12 }, (_, index) => index as NotaIndex);

type CifradoMobileChordPickerProps = {
  open: boolean;
  existing?: AcordePos;
  tonalidadIndex: NotaIndex;
  modoTonal: ModoTonal;
  notacion?: NotacionAcordes;
  onApply: (
    noteIndex: NotaIndex,
    modifier: Modificador,
    bassNoteIndex?: NotaIndex,
  ) => void;
  onRemove: () => void;
  onStartDrag?: () => void;
  onClose: () => void;
};

function cycleIndex(current: number, delta: number, length: number): number {
  return (current + delta + length) % length;
}

/**
 * Selector de acorde celular: carrusel compacto (nota + modificador + bajo opcional).
 */
export function CifradoMobileChordPicker({
  open,
  existing,
  tonalidadIndex,
  modoTonal,
  notacion = "es",
  onApply,
  onRemove,
  onStartDrag,
  onClose,
}: CifradoMobileChordPickerProps) {
  const defaultNote = existing?.noteIndex ?? tonalidadIndex;
  const defaultModifier =
    existing?.modifier ??
    getModificadorPorDefecto(defaultNote, tonalidadIndex, modoTonal) ??
    "";

  const [noteIndex, setNoteIndex] = useState<NotaIndex>(defaultNote);
  const [modifier, setModifier] = useState<Modificador>(defaultModifier);
  const [bassNoteIndex, setBassNoteIndex] = useState<NotaIndex | null>(
    existing?.bassNoteIndex ?? null,
  );
  const [bassEnabled, setBassEnabled] = useState(
    existing?.bassNoteIndex !== undefined,
  );

  const noteOrder = useMemo(() => {
    const inScale = NOTA_INDICES.filter((index) =>
      isNotaEnEscala(index, tonalidadIndex, modoTonal),
    );
    const outScale = NOTA_INDICES.filter(
      (index) => !isNotaEnEscala(index, tonalidadIndex, modoTonal),
    );
    return [...inScale, ...outScale];
  }, [modoTonal, tonalidadIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextNote = existing?.noteIndex ?? tonalidadIndex;
    setNoteIndex(nextNote);
    setModifier(
      existing?.modifier ??
        getModificadorPorDefecto(nextNote, tonalidadIndex, modoTonal) ??
        "",
    );
    setBassNoteIndex(existing?.bassNoteIndex ?? null);
    setBassEnabled(existing?.bassNoteIndex !== undefined);
  }, [existing, modoTonal, open, tonalidadIndex]);

  if (!open) {
    return null;
  }

  const notePos = Math.max(0, noteOrder.indexOf(noteIndex));
  const modifierPos = Math.max(
    0,
    MODIFICADORES.findIndex((item) => item.id === modifier),
  );
  const noteInScale = isNotaEnEscala(noteIndex, tonalidadIndex, modoTonal);
  const canApply = !bassEnabled || bassNoteIndex !== null;

  function stepNote(delta: number) {
    const next = noteOrder[cycleIndex(notePos, delta, noteOrder.length)]!;
    setNoteIndex(next);
    setModifier(
      getModificadorPorDefecto(next, tonalidadIndex, modoTonal) ?? modifier,
    );
  }

  function stepModifier(delta: number) {
    const next = MODIFICADORES[cycleIndex(modifierPos, delta, MODIFICADORES.length)]!;
    setModifier(next.id);
  }

  function stepBass(delta: number) {
    const current = bassNoteIndex ?? tonalidadIndex;
    const currentPos = Math.max(0, noteOrder.indexOf(current));
    const next = noteOrder[cycleIndex(currentPos, delta, noteOrder.length)]!;
    setBassNoteIndex(next);
  }

  function handleToggleBass() {
    setBassEnabled((current) => {
      const next = !current;

      if (!next) {
        setBassNoteIndex(null);
        return next;
      }

      setBassNoteIndex((value) => value ?? tonalidadIndex);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Cerrar selector de acorde"
        className="absolute inset-0 bg-black/45"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Selector de acorde"
        className="relative z-10 rounded-t-[16px] border border-border bg-bg-card px-4 pb-6 pt-3"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
        {existing ? (
          <h2 className="mb-3 text-center text-base font-extrabold text-text-primary">
            Edición
          </h2>
        ) : (
          <h2 className="mb-3 text-center text-base font-extrabold text-text-primary">
            Nuevo acorde
          </h2>
        )}

        <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wide text-text-muted">
          Nota
        </p>
        <div className="mb-3 flex items-center justify-center gap-3">
          <TapButton
            type="button"
            aria-label="Nota anterior"
            onClick={() => stepNote(-1)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-dark"
          >
            <ChevronLeft className="size-5 text-text-primary" aria-hidden="true" />
          </TapButton>
          <div
            className={`min-w-[5.5rem] rounded-[12px] px-3 py-2 text-center text-xl font-extrabold ${
              noteInScale
                ? "bg-accent text-white"
                : "bg-bg-dark text-text-muted"
            }`}
          >
            {getNotaLabel(noteIndex, notacion)}
          </div>
          <TapButton
            type="button"
            aria-label="Nota siguiente"
            onClick={() => stepNote(1)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-dark"
          >
            <ChevronRight className="size-5 text-text-primary" aria-hidden="true" />
          </TapButton>
        </div>

        <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wide text-text-muted">
          Modificador
        </p>
        <div className="mb-3 flex items-center justify-center gap-3">
          <TapButton
            type="button"
            aria-label="Modificador anterior"
            onClick={() => stepModifier(-1)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-dark"
          >
            <ChevronLeft className="size-5 text-text-primary" aria-hidden="true" />
          </TapButton>
          <div className="min-w-[5.5rem] rounded-[12px] bg-bg-dark px-3 py-2 text-center text-base font-bold text-text-primary">
            {MODIFICADORES[modifierPos]?.label ?? "Mayor"}
          </div>
          <TapButton
            type="button"
            aria-label="Modificador siguiente"
            onClick={() => stepModifier(1)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-dark"
          >
            <ChevronRight className="size-5 text-text-primary" aria-hidden="true" />
          </TapButton>
        </div>

        <label className="mb-3 inline-flex cursor-pointer items-center gap-1.5">
          <span className="text-xs font-medium text-text-muted">
            ¿Bajo en otra nota?
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={bassEnabled}
            onClick={handleToggleBass}
            className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
              bassEnabled
                ? "border border-text-secondary bg-bg-dark"
                : "border border-border bg-bg-darker"
            }`}
          >
            <span
              className={`absolute top-0.5 size-3 rounded-full bg-white transition-transform ${
                bassEnabled ? "left-3.5" : "left-0.5"
              }`}
            />
          </button>
        </label>

        {bassEnabled ? (
          <>
            <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Bajo
            </p>
            <div className="mb-3 flex items-center justify-center gap-3">
              <TapButton
                type="button"
                aria-label="Bajo anterior"
                onClick={() => stepBass(-1)}
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-dark"
              >
                <ChevronLeft className="size-5 text-text-primary" aria-hidden="true" />
              </TapButton>
              <div className="min-w-[5.5rem] rounded-[12px] bg-bg-dark px-3 py-2 text-center text-xl font-extrabold text-text-primary">
                {getNotaLabel(bassNoteIndex ?? tonalidadIndex, notacion)}
              </div>
              <TapButton
                type="button"
                aria-label="Bajo siguiente"
                onClick={() => stepBass(1)}
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-dark"
              >
                <ChevronRight className="size-5 text-text-primary" aria-hidden="true" />
              </TapButton>
            </div>
          </>
        ) : null}

        <p className="mb-3 text-center text-lg font-bold text-accent">
          <AcordeLabel
            noteIndex={noteIndex}
            modifier={modifier}
            bassNoteIndex={
              bassEnabled && bassNoteIndex !== null
                ? bassNoteIndex
                : undefined
            }
            notacion={notacion}
            className="text-accent"
          />
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <TapButton
              type="button"
              onClick={() =>
                onApply(
                  noteIndex,
                  modifier,
                  bassEnabled && bassNoteIndex !== null
                    ? bassNoteIndex
                    : undefined,
                )
              }
              disabled={!canApply}
              className={`flex-1 py-2.5 text-sm font-bold disabled:opacity-40 ${CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS}`}
            >
              Aplicar
            </TapButton>
            {existing ? (
              <TapButton
                type="button"
                onClick={onRemove}
                className="rounded-[10px] border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary"
              >
                Quitar
              </TapButton>
            ) : null}
          </div>
          {existing && onStartDrag ? (
            <TapButton
              type="button"
              onClick={onStartDrag}
              className="w-full rounded-[10px] border border-border bg-bg-dark py-2.5 text-sm font-semibold text-text-primary"
            >
              Arrastrar acorde
            </TapButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
