"use client";

import { useEffect, useState } from "react";

type DoubleConfirmDialogProps = {
  open: boolean;
  step1Message: string;
  step2Message: string;
  onConfirm: () => void;
  onCancel: () => void;
  zIndex?: number;
};

export default function DoubleConfirmDialog({
  open,
  step1Message,
  step2Message,
  onConfirm,
  onCancel,
  zIndex = 50,
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
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ zIndex }}
    >
      <button
        type="button"
        aria-label="Cerrar diálogo"
        className="absolute inset-0 bg-black/60"
        onClick={handleCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full rounded-[12px] border border-border bg-bg-card ${
          step === 1 ? "max-w-sm p-5" : "max-w-md p-6"
        }`}
      >
        <p
          className={`leading-6 text-text-primary ${
            step === 1 ? "text-sm" : "text-base"
          }`}
        >
          {message}
        </p>
        <div className={`flex gap-3 ${step === 1 ? "mt-5" : "mt-6"}`}>
          <button
            type="button"
            onClick={handleCancel}
            className={`flex-1 rounded-[10px] border border-border bg-[#323232] font-semibold text-text-primary ${
              step === 1 ? "min-h-11 text-sm" : "min-h-12 text-base"
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePrimary}
            className={`flex-1 rounded-[10px] font-semibold text-white ${
              step === 1
                ? "min-h-11 bg-accent text-sm"
                : "min-h-12 bg-[#d94a3d] text-base"
            }`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
