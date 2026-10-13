"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { filterCancionesCancionero } from "@/lib/cancionero";
import { COLA_SIDE_PANEL_CLASS } from "@/lib/cola-ui";
import type { CancionCancionero } from "@/types";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const [query, setQuery] = useState("");
  const visibles = useMemo(
    () => filterCancionesCancionero(items, query),
    [items, query],
  );
  const buscando = query.trim().length > 0;

  useEffect(() => {
    activaRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [cancionActivaId]);

  const conteo = buscando
    ? visibles.length === 1
      ? `1 de ${items.length}`
      : `${visibles.length} de ${items.length}`
    : items.length === 1
      ? "1 resultado"
      : `${items.length} resultados`;

  return (
    <aside
      className={`${COLA_SIDE_PANEL_CLASS} bg-bg-darker`}
      aria-label="Canciones del filtro"
    >
      <div className="shrink-0 border-b border-border px-3 py-3">
        <h2 className="px-1 text-sm font-bold text-text-primary">Canciones</h2>
        <label className="relative mt-2 block">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, artista o letra"
            aria-label="Filtrar por nombre, artista o letra"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="h-8 w-full rounded-lg border border-border/60 bg-black/20 pl-8 pr-8 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent/60 [&::-webkit-search-cancel-button]:hidden"
          />
          {buscando ? (
            <button
              type="button"
              aria-label="Borrar búsqueda"
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-text-muted hover:text-text-primary"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <p className="mt-1.5 px-1 text-[11px] text-text-muted">{conteo}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {visibles.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-text-muted">
            {buscando
              ? "Ninguna canción coincide."
              : "No hay canciones en el filtro."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {visibles.map((cancion) => {
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
