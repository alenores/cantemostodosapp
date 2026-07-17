"use client";

import { CifradoTonalidadFields } from "@/components/cifrado/CifradoTonalidadFields";
import { TapButton } from "@/components/ui/TapFeedback";
import type { NotaIndex } from "@/lib/cifrado";
import { DEFAULT_MODO_TONAL } from "@/lib/cifrado-escala";
import type { NotacionAcordes } from "@/lib/notacion-acordes";
import {
  MODO_LECTURA_SUBPANEL_BACKDROP_Z_CLASS,
  MODO_LECTURA_SUBPANEL_DIALOG_Z_CLASS,
} from "@/lib/sala-layout";
import { useEffect, useState } from "react";

type LecturaTonoPanelProps = {
  open: boolean;
  tonalidadIndex: NotaIndex;
  notacion: NotacionAcordes;
  onTonalidadChange: (next: NotaIndex) => void;
  onClose: () => void;
};

export default function LecturaTonoPanel({
  open,
  tonalidadIndex,
  notacion,
  onTonalidadChange,
  onClose,
}: LecturaTonoPanelProps) {
  const [pendingTonalidadIndex, setPendingTonalidadIndex] =
    useState<NotaIndex>(tonalidadIndex);

  useEffect(() => {
    if (open) {
      setPendingTonalidadIndex(tonalidadIndex);
    }
  }, [open, tonalidadIndex]);

  const handleConfirm = () => {
    onTonalidadChange(pendingTonalidadIndex);
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        data-no-tap-feedback
        className={`fixed inset-0 cursor-default border-0 bg-black/40 outline-none lg:hidden ${MODO_LECTURA_SUBPANEL_BACKDROP_Z_CLASS}`}
        aria-label="Cerrar cambio de tono"
        onClick={onClose}
      />

      <div
        className={`pointer-events-none fixed inset-0 flex items-center justify-center p-6 lg:hidden ${MODO_LECTURA_SUBPANEL_DIALOG_Z_CLASS}`}
        role="dialog"
        aria-label="Cambiar de tono"
      >
        <div className="pointer-events-auto flex w-full max-w-[15rem] flex-col items-stretch gap-3 rounded-2xl border border-border/50 bg-bg-dark/95 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <p className="text-center text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Cambiar de tono
          </p>

          <CifradoTonalidadFields
            idPrefix="lectura-tono"
            notacion={notacion}
            tonalidadIndex={pendingTonalidadIndex}
            modoTonal={DEFAULT_MODO_TONAL}
            showModoTonal={false}
            onTonalidadChange={setPendingTonalidadIndex}
            onModoTonalChange={() => {}}
          />

          <TapButton
            type="button"
            onClick={handleConfirm}
            className="rounded-xl border border-accent/50 bg-bg-card px-4 py-2 text-sm font-semibold text-text-primary"
          >
            Confirmar
          </TapButton>
        </div>
      </div>
    </>
  );
}
