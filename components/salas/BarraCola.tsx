"use client";

import { ChevronUp } from "lucide-react";

type BarraColaProps = {
  pendientes: number;
  proximaNombre: string | null;
  open: boolean;
  onToggle: () => void;
};

export default function BarraCola({
  pendientes,
  proximaNombre,
  open,
  onToggle,
}: BarraColaProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? "Cerrar cola" : "Abrir cola"}
      className="relative z-30 flex h-[52px] shrink-0 cursor-pointer items-center gap-2 border-t border-border bg-bg-dark px-4"
    >
      <span className="shrink-0 text-sm font-semibold text-text-primary">
        Cola
      </span>
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
        {pendientes}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">
        Próxima: {proximaNombre ?? "—"}
      </span>
      <ChevronUp
        className={`size-5 shrink-0 text-text-muted transition-transform duration-350 ${
          open ? "rotate-180" : ""
        }`}
        style={{ transitionTimingFunction: "var(--transition-timing)" }}
        aria-hidden="true"
      />
    </button>
  );
}
