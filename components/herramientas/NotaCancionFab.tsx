"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { NotebookPen, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type NotaCancionFabProps = {
  /** "view": solo consulta (modo lectura). "edit": editar y guardar (modo edición). */
  mode: "view" | "edit";
  nota: string;
  onSave?: (nota: string) => Promise<void> | void;
  saving?: boolean;
  side?: "left" | "right";
  /** Si es true, no muestra el botón flotante (abrir con open/onOpenChange). */
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Botón flotante sutil + modal adaptativo para la nota general de la canción.
 * Se monta por portal para quedar fijo por encima del editor/lectura y del footer.
 */
export default function NotaCancionFab({
  mode,
  nota,
  onSave,
  saving = false,
  side = "right",
  hideTrigger = false,
  open: openControlled,
  onOpenChange,
}: NotaCancionFabProps) {
  const [mounted, setMounted] = useState(false);
  const [openUncontrolled, setOpenUncontrolled] = useState(false);
  const [draft, setDraft] = useState(nota);

  const isControlled = openControlled !== undefined;
  const open = isControlled ? openControlled : openUncontrolled;

  function setOpen(next: boolean) {
    if (!isControlled) {
      setOpenUncontrolled(next);
    }

    onOpenChange?.(next);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setDraft(nota);
    }
  }, [open, nota]);

  useHardwareBack(open, () => setOpen(false));

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!mounted) {
    return null;
  }

  const tieneNota = nota.trim().length > 0;
  const sideClass =
    side === "left" ? "left-4 lg:left-6" : "right-4 lg:right-6";

  function handleOpen() {
    setDraft(nota);
    setOpen(true);
  }

  async function handleSave() {
    if (!onSave) {
      return;
    }

    await onSave(draft);
    setOpen(false);
  }

  return createPortal(
    <>
      {!hideTrigger ? (
        <TapButton
          type="button"
          aria-label={
            mode === "edit"
              ? "Editar nota de la canción"
              : "Ver nota de la canción"
          }
          onClick={handleOpen}
          className={`fixed bottom-20 z-[70] flex items-center gap-1.5 rounded-full border border-border bg-bg-card/95 px-3 py-2 text-xs font-semibold text-text-primary shadow-md backdrop-blur lg:bottom-6 ${sideClass}`}
        >
          <NotebookPen
            className="size-4 text-[var(--accent-entrenador-canciones)]"
            aria-hidden="true"
          />
          Nota
          {tieneNota ? (
            <span
              className="size-1.5 rounded-full bg-[var(--accent-entrenador-canciones)]"
              aria-hidden="true"
            />
          ) : null}
        </TapButton>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
          <button
            type="button"
            aria-label="Cerrar nota"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nota de la canción"
            className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-border bg-bg-card shadow-xl"
          >
            <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-4 py-3">
              <NotebookPen
                className="size-5 shrink-0 text-[var(--accent-entrenador-canciones)]"
                aria-hidden="true"
              />
              <h2 className="min-w-0 flex-1 text-base font-extrabold text-text-primary">
                Nota de la canción
              </h2>
              <TapButton
                type="button"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-full bg-bg-dark"
              >
                <X className="size-4 text-text-primary" aria-hidden="true" />
              </TapButton>
            </header>

            {mode === "edit" ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-4">
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Escribí lo que quieras sobre esta canción…"
                  className="min-h-[160px] w-full flex-1 resize-none rounded-[10px] border border-border bg-letra-bg px-4 py-3 text-sm text-letra-text placeholder:italic placeholder:text-text-muted outline-none focus:border-accent"
                />
                <TapButton
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  className="min-h-11 shrink-0 rounded-[10px] bg-[var(--accent-entrenador-canciones)] text-sm font-bold text-[var(--text-on-light)] disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Guardar nota"}
                </TapButton>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {tieneNota ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                    {nota}
                  </p>
                ) : (
                  <p className="py-6 text-center text-sm text-text-muted">
                    Esta canción todavía no tiene nota. Agregala desde el modo
                    edición.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
}
