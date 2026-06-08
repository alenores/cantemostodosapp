"use client";

import { useDrag } from "@use-gesture/react";
import { ChevronUp } from "lucide-react";

const SWIPE_THRESHOLD_PX = 50;

type BarraColaProps = {
  pendientes: number;
  proximaNombre: string | null;
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onClose: () => void;
};

export default function BarraCola({
  pendientes,
  proximaNombre,
  open,
  onToggle,
  onOpen,
  onClose,
}: BarraColaProps) {
  const bind = useDrag(
    ({ movement: [, my], last }) => {
      if (!last) {
        return;
      }

      if (my < -SWIPE_THRESHOLD_PX && !open) {
        onOpen();
        return;
      }

      if (my > SWIPE_THRESHOLD_PX && open) {
        onClose();
      }
    },
    {
      axis: "y",
      filterTaps: true,
      pointer: { touch: true },
    },
  );

  return (
    <button
      type="button"
      {...bind()}
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? "Cerrar cola" : "Abrir cola"}
      className="relative z-30 flex h-[52px] shrink-0 cursor-pointer touch-none items-center gap-2 border-t border-border bg-bg-dark px-4"
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
