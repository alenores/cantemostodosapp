import { artistaCoincideBusqueda } from "@/lib/artistas-alias-busqueda";
import { useAliasBusqueda } from "@/hooks/useAliasBusqueda";
import { Search, X, Settings, Check } from "lucide-react";
import { useState, useMemo } from "react";
import { TapButton } from "@/components/ui/TapFeedback";
import type { Artista } from "@/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  artistas: Artista[];
  /** Canciones del cancionero por nombre de artista. */
  conteoCanciones: Map<string, number>;
  selectedIds: Set<string>;
  onApply: (ids: Set<string>) => void;
  onManageArtistas: () => void;
};

function textoCanciones(cantidad: number): string {
  return cantidad === 1 ? "1 canción" : `${cantidad} canciones`;
}

export function ArtistasFilterModal({
  isOpen,
  onClose,
  artistas,
  conteoCanciones,
  selectedIds,
  onApply,
  onManageArtistas,
}: Props) {
  const [query, setQuery] = useState("");
  const [draftSelected, setDraftSelected] = useState<Set<string>>(selectedIds);

  const aliasBusqueda = useAliasBusqueda();

  const filteredArtistas = useMemo(() => {
    if (!query.trim()) return artistas;
    return artistas.filter((a) => artistaCoincideBusqueda(a.nombre, query, aliasBusqueda));
  }, [aliasBusqueda, artistas, query]);

  const cancionesSeleccionadas = useMemo(
    () =>
      artistas
        .filter((a) => draftSelected.has(a.id))
        .reduce((total, a) => total + (conteoCanciones.get(a.nombre) ?? 0), 0),
    [artistas, conteoCanciones, draftSelected],
  );

  if (!isOpen) return null;

  function toggleArtista(id: string) {
    setDraftSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const haySeleccion = draftSelected.size > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-bg-dark shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border bg-bg-card px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-text-primary">
              Filtrar por artista
            </h2>
            <p className="text-xs text-text-muted">
              {haySeleccion
                ? `${draftSelected.size} elegido${draftSelected.size === 1 ? "" : "s"} · ${textoCanciones(cancionesSeleccionadas)}`
                : "Tocá uno o más artistas"}
            </p>
          </div>
          <TapButton
            onClick={onManageArtistas}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-accent hover:text-text-primary"
            aria-label="Gestionar artistas"
          >
            <Settings className="size-4" />
            Gestionar
          </TapButton>
          <TapButton
            onClick={onClose}
            className="rounded-full border border-border p-1.5 text-text-secondary hover:border-accent hover:text-text-primary"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </TapButton>
        </div>

        <div className="border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar artista…"
              className="w-full rounded-xl border border-border bg-bg-darker py-2.5 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {filteredArtistas.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted">
              No se encontraron artistas.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {filteredArtistas.map((artista) => {
                const isSelected = draftSelected.has(artista.id);
                const cantidad = conteoCanciones.get(artista.nombre) ?? 0;
                return (
                  <li key={artista.id}>
                    <TapButton
                      onClick={() => toggleArtista(artista.id)}
                      aria-pressed={isSelected}
                      className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                        isSelected
                          ? "border-accent bg-accent-dim"
                          : "border-border-card bg-bg-card hover:border-border hover:bg-bg-card-hover"
                      }`}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-darker">
                        {artista.avatar_url ? (
                          <img
                            src={artista.avatar_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-text-muted">
                            {artista.nombre.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-medium ${
                            isSelected ? "text-accent" : "text-text-primary"
                          }`}
                        >
                          {artista.nombre}
                        </p>
                        <p
                          className={`text-xs ${
                            cantidad > 0 ? "text-text-secondary" : "text-text-faint"
                          }`}
                        >
                          {cantidad > 0 ? textoCanciones(cantidad) : "Sin canciones"}
                        </p>
                      </div>
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
                          isSelected
                            ? "border-accent bg-accent text-bg-darker"
                            : "border-text-faint"
                        }`}
                        aria-hidden="true"
                      >
                        {isSelected ? <Check className="size-4" strokeWidth={3} /> : null}
                      </span>
                    </TapButton>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex gap-2 border-t border-border bg-bg-card p-4">
          <TapButton
            onClick={() => setDraftSelected(new Set())}
            disabled={!haySeleccion}
            className="flex-1 rounded-xl border border-border py-3 font-semibold text-text-primary hover:border-accent disabled:opacity-40"
          >
            Limpiar
          </TapButton>
          <TapButton
            onClick={() => onApply(draftSelected)}
            className="flex-[2] rounded-xl bg-accent py-3 font-semibold text-bg-darker shadow-lg hover:opacity-90"
          >
            {haySeleccion ? `Ver ${textoCanciones(cancionesSeleccionadas)}` : "Ver todas"}
          </TapButton>
        </div>
      </div>
    </div>
  );
}
