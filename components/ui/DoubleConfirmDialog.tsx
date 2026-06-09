"use client";

import { useEffect, useState } from "react";

type DoubleConfirmDialogProps = {
  open: boolean;
  step1Message: string;
  step2Message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DoubleConfirmDialog({
  open,
  step1Message,
  step2Message,
  onConfirm,
  onCancel,
}: DoubleConfirmDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (open) {
      setStep(1);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const message = step === 1 ? step1Message : step2Message;
  const primaryLabel = step === 1 ? "Continuar" : "Confirmar";

  function handleCancel() {
    setStep(1);
    onCancel();
  }

  function handlePrimary() {
    if (step === 1) {
      setStep(2);
      return;
    }

    setStep(1);
    onConfirm();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Cerrar diálogo"
        className="absolute inset-0 bg-black/60"
        onClick={handleCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-sm rounded-[12px] border border-border bg-bg-card p-5"
      >
        <p className="text-sm leading-6 text-text-primary">{message}</p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="min-h-11 flex-1 rounded-[10px] border border-border bg-[#323232] text-sm font-semibold text-text-primary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePrimary}
            className={`min-h-11 flex-1 rounded-[10px] text-sm font-semibold text-white ${
              step === 1 ? "bg-[#e87070]" : "bg-accent"
            }`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
