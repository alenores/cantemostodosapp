"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { COLA_SIDE_PANEL_CLASS } from "@/lib/cola-ui";
import type { CancionCancionero } from "@/types";
import { useEffect, useRef } from "react";

type CancioneroLecturaListaPanelProps = {
  items: CancionCancionero[];
  cancionActivaId: number | null;
  onSelectCancion: (cancion: CancionCancionero) => void;
};

export default function CancioneroLecturaListaPanel({
  items,
  cancionActivaId,
  onSelectCancion,
}: CancioneroLecturaListaPanelProps) {
  const activaRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    activaRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [cancionActivaId]);

  return (
    <aside
      className={`${COLA_SIDE_PANEL_CLASS} bg-bg-darker`}
      aria-label="Canciones del filtro"
    >
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold text-text-primary">Canciones</h2>
        <p className="mt-0.5 text-[11px] text-text-muted">
          {items.length === 1
            ? "1 resultado"
            : `${items.length} resultados`}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-text-muted">
            No hay canciones en el filtro.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((cancion) => {
              const activa = cancion.id === cancionActivaId;

              return (
                <li
                  key={cancion.id}
                  ref={activa ? activaRef : undefined}
                >
                  <TapButton
                    type="button"
                    aria-current={activa ? "true" : undefined}
                    onClick={() => onSelectCancion(cancion)}
                    className={`flex w-full flex-col items-start rounded-[10px] px-3 py-2.5 text-left transition-colors ${
                      activa
                        ? "border border-accent/35 bg-accent/10"
                        : "border border-transparent hover:bg-bg-card"
                    }`}
                  >
                    <span
                      className={`w-full truncate text-[14px] font-semibold leading-snug ${
                        activa ? "text-accent" : "text-text-primary"
                      }`}
                    >
                      {cancion.nombre}
                    </span>
                    {cancion.artista ? (
                      <span className="w-full truncate text-[12px] leading-snug text-text-muted">
                        {cancion.artista}
                      </span>
                    ) : null}
                  </TapButton>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
