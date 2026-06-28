"use client";

import { Minimize2, Music2, Search } from "lucide-react";

type ModoLecturaOverlayProps = {
  abierto: boolean;
  onCerrar: () => void;
  onSalirModoLectura: () => void;
};

type OverlayOptionProps = {
  icon: typeof Search;
  label: string;
  onClick: () => void;
  muted?: boolean;
};

function OverlayOption({
  icon: Icon,
  label,
  onClick,
  muted = false,
}: OverlayOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-[200px] items-center gap-3 rounded-2xl border border-border bg-bg-dark/95 px-6 py-4 text-sm font-medium ${
        muted ? "text-text-muted" : "text-text-primary"
      }`}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {label}
    </button>
  );
}

export default function ModoLecturaOverlay({
  abierto,
  onCerrar,
  onSalirModoLectura,
}: ModoLecturaOverlayProps) {
  if (!abierto) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6"
      style={{
        backgroundColor: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(2px)",
      }}
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label="Controles de modo lectura"
    >
      <div
        className="flex flex-col items-center gap-6"
        onClick={(event) => event.stopPropagation()}
      >
        <OverlayOption
          icon={Search}
          label="Buscar canción"
          onClick={() => {
            onCerrar();
            console.log("TODO: abrir buscador");
          }}
        />
        <OverlayOption
          icon={Music2}
          label="Afinador"
          onClick={() => {
            console.log("TODO: abrir afinador");
          }}
        />
        <OverlayOption
          icon={Minimize2}
          label="Salir del modo lectura"
          muted
          onClick={onSalirModoLectura}
        />
      </div>
    </div>
  );
}
