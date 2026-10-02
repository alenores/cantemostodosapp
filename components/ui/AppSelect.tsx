"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type AppSelectOption<T extends string | number> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type AppSelectProps<T extends string | number> = {
  value: T | null;
  options: readonly AppSelectOption<T>[];
  onChange: (value: T) => void;
  /** Título de la lista que sube desde abajo. */
  title: string;
  /** Texto del botón cuando no hay nada elegido. */
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
};

/** Lista propia de la app (sube desde abajo), en lugar del desplegable del sistema. */
export default function AppSelect<T extends string | number>({
  value,
  options,
  onChange,
  title,
  placeholder = "Elegí una opción",
  id,
  disabled = false,
  className = "",
  style,
  "aria-label": ariaLabel,
}: AppSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`flex items-center justify-between gap-2 text-left disabled:opacity-50 ${className}`.trim()}
        style={style}
      >
        <span className={`min-w-0 truncate ${selected ? "" : "text-text-muted"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[500] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
              onClick={() => setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(event) => event.stopPropagation()}
                className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-bg-dark shadow-2xl sm:rounded-2xl"
              >
                <div className="flex items-center gap-2 border-b border-border bg-bg-card px-4 py-3">
                  <h2 className="flex-1 text-lg font-bold text-text-primary">{title}</h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Cerrar"
                    className="rounded-full border border-border p-1.5 text-text-secondary hover:border-accent hover:text-text-primary"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <ul className="flex-1 space-y-2 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  {options.map((option) => {
                    const elegido = option.value === value;
                    return (
                      <li key={String(option.value)}>
                        <button
                          type="button"
                          disabled={option.disabled}
                          onClick={() => {
                            setOpen(false);
                            if (!elegido) onChange(option.value);
                          }}
                          className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors disabled:opacity-50 ${
                            elegido
                              ? "border-accent bg-accent-dim"
                              : "border-border-card bg-bg-card hover:border-border hover:bg-bg-card-hover"
                          }`}
                        >
                          <span
                            className={`min-w-0 flex-1 truncate font-medium ${
                              elegido ? "text-accent" : "text-text-primary"
                            }`}
                          >
                            {option.label}
                          </span>
                          {elegido ? (
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-bg-darker">
                              <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
