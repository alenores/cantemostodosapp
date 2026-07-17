"use client";

type CompositorCycleNameDialogProps = {
  open: boolean;
  title: string;
  confirmLabel: string;
  inputLabel?: string;
  value: string;
  busy?: boolean;
  error?: string | null;
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
  busy = false,
  error = null,
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
        className="relative z-10 w-full max-w-sm rounded-estandar border border-border bg-bg-card p-5"
      >
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <label className="mt-3 block text-sm text-text-primary">
          {inputLabel}
          <input
            type="text"
            value={value}
            maxLength={80}
            autoFocus
            disabled={busy}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !busy) {
                event.preventDefault();
                onConfirm();
              }
            }}
            className="mt-2 w-full rounded-estandar border border-border bg-bg-darker px-3 py-2 text-sm text-text-primary outline-none focus:border-compositor-config transition-colors duration-150 disabled:opacity-60"
          />
        </label>
        {error ? (
          <p className="mt-3 text-[11px] leading-snug text-[var(--tuner-lejos)]">{error}</p>
        ) : null}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-estandar border border-border bg-bg-card text-sm font-semibold text-text-primary transition-colors duration-150 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="min-h-11 flex-1 rounded-estandar bg-accent text-sm font-semibold text-white transition-colors duration-150 disabled:opacity-60"
          >
            {busy ? "Guardando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
