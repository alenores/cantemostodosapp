"use client";

type CompositorCycleNameDialogProps = {
  open: boolean;
  title: string;
  confirmLabel: string;
  inputLabel?: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CompositorCycleNameDialog({
  open,
  title,
  confirmLabel,
  inputLabel = "Nombre del ciclo",
  value,
  onChange,
  onConfirm,
  onCancel,
}: CompositorCycleNameDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
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
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <label className="mt-3 block text-sm text-text-primary">
          {inputLabel}
          <input
            type="text"
            value={value}
            maxLength={80}
            autoFocus
            onChange={(event) => onChange(event.target.value)}
            className="mt-2 w-full rounded-[10px] border border-border bg-bg-darker px-3 py-2 text-sm text-text-primary outline-none focus:border-compositor-config"
          />
        </label>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-[10px] border border-border bg-bg-card text-sm font-semibold text-text-primary"
          >
            Cancelar
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
