"use client";

import { useHardwareBack } from "@/hooks/useHardwareBack";
import { X } from "lucide-react";
import { useEffect, type MouseEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";

type AgregadoFichaDialogProps = {
  open: boolean;
  nombre: string;
  avatarUrl: string | null;
  fecha: string | null;
  onCerrar: () => void;
};

function formatearFecha(valor: string | null): string | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

export default function AgregadoFichaDialog({
  open,
  nombre,
  avatarUrl,
  fecha,
  onCerrar,
}: AgregadoFichaDialogProps) {
  useHardwareBack(open, onCerrar);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCerrar();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCerrar]);

  if (!open || typeof document === "undefined") return null;

  const fechaTexto = formatearFecha(fecha);
  const inicial = (nombre.trim().charAt(0) || "?").toLocaleUpperCase("es");

  function frenar(event: PointerEvent | MouseEvent) {
    event.stopPropagation();
  }

  function cerrar(event: MouseEvent) {
    event.stopPropagation();
    onCerrar();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center px-6"
      onPointerDown={frenar}
      onClick={frenar}
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/50"
        onPointerDown={frenar}
        onClick={cerrar}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quién agregó la canción"
        className="relative z-10 flex w-full max-w-[280px] flex-col items-center gap-2 rounded-[12px] border border-border bg-bg-card px-5 pb-4 pt-8 text-center"
        onPointerDown={frenar}
        onClick={frenar}
      >
        <button
          type="button"
          aria-label="Cerrar"
          className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full text-text-secondary"
          onPointerDown={frenar}
          onClick={cerrar}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="size-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#57515b] text-xl font-semibold text-text-primary">
            {inicial}
          </span>
        )}
        <p className="max-w-full truncate text-base font-semibold text-text-primary">
          {nombre}
        </p>
        {fechaTexto ? (
          <div className="text-sm leading-snug text-text-secondary">
            <p>Agregó esta canción el</p>
            <p className="font-medium text-text-primary">{fechaTexto}</p>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
