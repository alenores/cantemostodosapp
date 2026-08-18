"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link2, Search, X } from "lucide-react";
import { TapButton } from "@/components/ui/TapFeedback";
import { SitioLetraBadge } from "@/components/salas/LetraFuenteSitioBadge";
import { loadCancionesParaBusqueda } from "@/lib/sala-data";
import { createClient } from "@/lib/supabase/client";
import { resolverNombreArtistaDisplay } from "@/lib/buscador";
import { extractSitio } from "@/lib/brave-search";
import type { CancionBusquedaLocal } from "@/lib/sala-data";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

type CifradoEditorSavedLinksModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CifradoEditorSavedLinksModal({
  open,
  onClose,
}: CifradoEditorSavedLinksModalProps) {
  const online = useOnlineStatus();
  const supabase = useMemo(() => createClient(), []);
  const [links, setLinks] = useState<CancionBusquedaLocal[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoading(true);
    let cancelled = false;

    void loadCancionesParaBusqueda(online ? supabase : undefined)
      .then((canciones) => {
        if (!cancelled) {
          // Filtrar solo los que tienen url_letra pero NO tienen letra nativa
          const linksGuardados = canciones.filter(
            (c) => Boolean(c.url_letra?.trim()) && !c.letra?.trim()
          );
          setLinks(linksGuardados);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, online, supabase]);

  const filteredLinks = useMemo(() => {
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!q) return links;

    return links.filter((link) => {
      const searchStr = `${link.nombre} ${link.artista || ""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return searchStr.includes(q);
    });
  }, [links, query]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-3 py-6">
      <button
        type="button"
        aria-label="Cerrar modal de links"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cifrado-editor-links-titulo"
        className="relative z-10 flex h-[min(88vh,640px)] w-full max-w-sm flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-2xl"
      >
        <header
          className="relative shrink-0 border-b bg-bg-dark px-4 pb-4 pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-bg-card"
          >
            <X className="size-4 text-text-primary" aria-hidden="true" />
          </button>

          <div className="flex flex-col items-center gap-2 pt-1">
            <div className="flex size-11 items-center justify-center rounded-full border border-accent/20 bg-accent/10">
              <Link2 className="size-5 text-accent" aria-hidden="true" />
            </div>
            <h2
              id="cifrado-editor-links-titulo"
              className="text-xl font-extrabold text-text-primary"
            >
              Links Guardados
            </h2>
            <p className="text-center text-xs text-text-muted">
              Abrí un link para copiar su letra
            </p>
          </div>

          <div className="mt-4 relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar link..."
              className="w-full rounded-[10px] border border-border bg-[#323232] pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
            />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain p-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-text-muted">Cargando links...</p>
          ) : filteredLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-70">
              <Link2 className="size-8 text-text-muted mb-2" aria-hidden="true" />
              <p className="text-sm text-text-muted text-center max-w-[200px]">
                {query ? "No hay links que coincidan." : "No tenés links guardados en tu cancionero."}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {filteredLinks.map((link) => {
                const { nombre, artista } = resolverNombreArtistaDisplay(link.nombre, link.artista);
                const sitio = extractSitio(link.url_letra);

                return (
                  <li key={link.id}>
                    <TapButton
                      type="button"
                      onClick={() => {
                        window.open(link.url_letra, "_blank");
                      }}
                      className="relative flex w-full items-center gap-3 overflow-hidden rounded-[12px] border border-border-card bg-bg-card px-3 py-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-text-primary">
                          {nombre}
                        </p>
                        <div className="mt-0.5 flex min-w-0 items-center gap-2">
                          {artista ? (
                            <p className="min-w-0 flex-1 truncate text-xs text-text-muted">
                              {artista}
                            </p>
                          ) : (
                            <span className="min-w-0 flex-1" aria-hidden="true" />
                          )}
                          <SitioLetraBadge sitio={sitio} url={link.url_letra} />
                        </div>
                      </div>
                    </TapButton>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
