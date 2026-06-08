"use client";

type ConfirmDialogProps = {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Cerrar diálogo"
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
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
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-[10px] border border-border bg-bg-card text-sm font-semibold text-text-primary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 flex-1 rounded-[10px] bg-accent text-sm font-semibold text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
