import { Search, X, Settings, Check } from "lucide-react";
import { useState, useMemo } from "react";
import { TapButton } from "@/components/ui/TapFeedback";
import type { Artista } from "@/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  artistas: Artista[];
  selectedIds: Set<string>;
  onApply: (ids: Set<string>) => void;
  onManageArtistas: () => void;
};

export function ArtistasFilterModal({
  isOpen,
  onClose,
  artistas,
  selectedIds,
  onApply,
  onManageArtistas,
}: Props) {
  const [query, setQuery] = useState("");
  const [draftSelected, setDraftSelected] = useState<Set<string>>(selectedIds);

  const filteredArtistas = useMemo(() => {
    if (!query.trim()) return artistas;
    const lowerQuery = query.toLowerCase();
    return artistas.filter((a) => a.nombre.toLowerCase().includes(lowerQuery));
  }, [artistas, query]);

  if (!isOpen) return null;

  function toggleArtista(id: string) {
    setDraftSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border/50 p-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-text-primary">
              Filtrar por Artista
            </h2>
          </div>
          <TapButton
            onClick={() => {
              onManageArtistas();
            }}
            className="rounded-full p-2 text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            aria-label="Gestionar artistas"
          >
            <Settings className="size-5" />
          </TapButton>
          <TapButton
            onClick={onClose}
            className="rounded-full p-2 text-text-secondary hover:bg-bg-hover"
          >
            <X className="size-5" />
          </TapButton>
        </div>

        <div className="border-b border-border/50 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar artista..."
              className="w-full rounded-xl border border-border bg-bg-page py-2.5 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredArtistas.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted">
              No se encontraron artistas.
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {filteredArtistas.map((artista) => {
                const isSelected = draftSelected.has(artista.id);
                return (
                  <li key={artista.id}>
                    <TapButton
                      onClick={() => toggleArtista(artista.id)}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                        isSelected ? "bg-brand-primary/10" : "hover:bg-bg-hover"
                      }`}
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-page">
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
                      <span
                        className={`flex-1 font-medium ${
                          isSelected ? "text-brand-primary" : "text-text-primary"
                        }`}
                      >
                        {artista.nombre}
                      </span>
                      {isSelected && (
                        <Check className="size-5 text-brand-primary" />
                      )}
                    </TapButton>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border/50 p-4">
          <TapButton
            onClick={() => onApply(draftSelected)}
            className="w-full rounded-xl bg-brand-primary py-3 font-semibold text-white shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary"
          >
            Ver Resultados {draftSelected.size > 0 && `(${draftSelected.size})`}
          </TapButton>
          {draftSelected.size > 0 && (
            <TapButton
              onClick={() => setDraftSelected(new Set())}
              className="w-full rounded-xl py-2 font-medium text-text-muted hover:bg-bg-hover hover:text-text-primary"
            >
              Limpiar selección
            </TapButton>
          )}
        </div>
      </div>
    </div>
  );
}
