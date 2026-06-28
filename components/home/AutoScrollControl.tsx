"use client";

import { Minus, Pause, Play, Plus } from "lucide-react";

type AutoScrollControlProps = {
  activo: boolean;
  velocidad: number;
  onToggle: () => void;
  onVelocidadChange: (v: number) => void;
};

export default function AutoScrollControl({
  activo,
  velocidad,
  onToggle,
  onVelocidadChange,
}: AutoScrollControlProps) {
  return (
    <div
      className="fixed z-[45] flex flex-row items-center gap-2 rounded-2xl border border-border bg-bg-dark/90 px-3 py-2"
      style={{
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        right: 16,
      }}
    >
      <button
        type="button"
        aria-label={activo ? "Pausar auto-scroll" : "Iniciar auto-scroll"}
        onClick={onToggle}
        className={`flex items-center justify-center rounded-lg p-1 ${
          activo ? "bg-accent/20 text-accent" : "text-text-muted"
        }`}
      >
        {activo ? (
          <Pause className="size-4" aria-hidden="true" />
        ) : (
          <Play className="size-4" aria-hidden="true" />
        )}
      </button>

      <span className="h-4 w-px bg-border" aria-hidden="true" />

      <button
        type="button"
        aria-label="Reducir velocidad"
        onClick={() => onVelocidadChange(Math.max(0.5, velocidad - 0.5))}
        className="flex items-center justify-center text-text-muted"
      >
        <Minus className="size-3" aria-hidden="true" />
      </button>

      <span className="min-w-[28px] text-center text-xs text-text-secondary">
        {velocidad}x
      </span>

      <button
        type="button"
        aria-label="Aumentar velocidad"
        onClick={() => onVelocidadChange(Math.min(3, velocidad + 0.5))}
        className="flex items-center justify-center text-text-muted"
      >
        <Plus className="size-3" aria-hidden="true" />
      </button>
    </div>
  );
}
