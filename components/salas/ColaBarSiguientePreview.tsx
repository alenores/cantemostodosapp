"use client";

import ColaSiguienteButton from "@/components/salas/ColaSiguienteButton";

type ProximaDisplay = {
  nombre: string;
  artista: string | null;
};

type ColaBarSiguientePreviewProps = {
  showSiguiente: boolean;
  proximaDisplay: ProximaDisplay | null;
  onSiguiente: () => void;
};

export default function ColaBarSiguientePreview({
  showSiguiente,
  proximaDisplay,
  onSiguiente,
}: ColaBarSiguientePreviewProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-border/50 bg-black/20 px-2 py-1">
      {showSiguiente && (
        <ColaSiguienteButton
          onClick={(event) => {
            event.stopPropagation();
            onSiguiente();
          }}
        />
      )}

      <div className="pointer-events-none min-w-0 flex-1 leading-tight">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-accent">
          Próxima
        </p>
        {proximaDisplay ? (
          <p className="mt-0.5 truncate">
            <span className="text-base font-semibold text-text-primary">
              {proximaDisplay.nombre}
            </span>
            {proximaDisplay.artista && (
              <span className="text-xs text-text-muted">
                {" "}
                · {proximaDisplay.artista}
              </span>
            )}
          </p>
        ) : (
          <p className="mt-0.5 truncate text-xs text-text-muted">
            Sin canciones en fila
          </p>
        )}
      </div>
    </div>
  );
}
