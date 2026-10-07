"use client";

import { Check, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { palabrasArtista } from "@/lib/artistas-match";
import type { Artista } from "@/types";

type Props = {
  artistas: Artista[];
  artistaId: string | null;
  /** Nombre detectado que no está en la lista: se ofrece agregarlo. */
  textoParaAgregar?: string;
  /** Parecidos al nombre detectado: se muestran arriba de todo. */
  sugeridos?: Artista[];
  agregando?: boolean;
  onElegir: (artista: Artista | null) => void;
  onAgregar?: (nombre: string) => void;
  onClose: () => void;
};

export function ArtistaAvatar({
  artista,
  size = "size-9",
}: {
  artista: Artista;
  size?: string;
}) {
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-darker`}
    >
      {artista.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={artista.avatar_url} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-sm font-semibold text-text-muted">
          {artista.nombre.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function textoPlano(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Lista de artistas propia de la app (con foto), en lugar del desplegable del sistema. */
export default function ArtistaPickerSheet({
  artistas,
  artistaId,
  textoParaAgregar = "",
  sugeridos = [],
  agregando = false,
  onElegir,
  onAgregar,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    const buscado = textoPlano(query);
    const buscadas = palabrasArtista(query);
    if (!buscado) return artistas;
    return artistas.filter((artista) => {
      if (textoPlano(artista.nombre).includes(buscado)) return true;
      const palabras = palabrasArtista(artista.nombre);
      return buscadas.every((b) => palabras.some((p) => p.startsWith(b)));
    });
  }, [artistas, query]);

  const mostrarSugeridos = !query.trim() && sugeridos.length > 0;

  function fila(artista: Artista, prefijo: string) {
    const elegido = artista.id === artistaId;
    return (
      <li key={prefijo + artista.id}>
        <button
          type="button"
          onClick={() => onElegir(artista)}
          className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
            elegido
              ? "border-accent bg-accent-dim"
              : "border-border-card bg-bg-card hover:border-border hover:bg-bg-card-hover"
          }`}
        >
          <ArtistaAvatar artista={artista} size="size-10" />
          <span
            className={`min-w-0 flex-1 truncate font-medium ${
              elegido ? "text-accent" : "text-text-primary"
            }`}
          >
            {artista.nombre}
          </span>
          {elegido ? (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-bg-darker">
              <Check className="size-4" strokeWidth={3} aria-hidden="true" />
            </span>
          ) : null}
        </button>
      </li>
    );
  }

  const agregarTexto = (query.trim() || textoParaAgregar).trim();

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Elegir artista"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-bg-dark shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border bg-bg-card px-4 py-3">
          <h2 className="flex-1 text-lg font-bold text-text-primary">Elegir artista</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full border border-border p-1.5 text-text-secondary hover:border-accent hover:text-text-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar artista…"
              className="w-full rounded-xl border border-border bg-bg-darker py-2.5 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
            />
          </div>
        </div>

        <ul className="flex-1 space-y-2 overflow-y-auto p-3">
          {mostrarSugeridos ? (
            <li className="px-1 pt-1 text-xs font-semibold uppercase tracking-wide text-accent">
              Parecidos a «{textoParaAgregar}»
            </li>
          ) : null}
          {mostrarSugeridos ? sugeridos.map((artista) => fila(artista, "sug-")) : null}
          {mostrarSugeridos ? (
            <li className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Todos los artistas
            </li>
          ) : null}
          {filtrados.map((artista) => fila(artista, ""))}
          {filtrados.length === 0 ? (
            <li className="py-6 text-center text-sm text-text-muted">
              No hay artistas con ese nombre.
            </li>
          ) : null}
        </ul>

        <div className="flex gap-2 border-t border-border bg-bg-card p-3">
          <button
            type="button"
            onClick={() => onElegir(null)}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-primary hover:border-accent"
          >
            Sin artista
          </button>
          {onAgregar && agregarTexto ? (
            <button
              type="button"
              disabled={agregando}
              onClick={() => onAgregar(agregarTexto)}
              className={`flex flex-[2] items-center justify-center gap-1.5 truncate rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-60 ${
                sugeridos.length > 0
                  ? "border border-dashed border-border text-text-primary hover:border-accent"
                  : "bg-accent text-bg-darker hover:opacity-90"
              }`}
            >
              <Plus className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {agregando ? "Agregando…" : `Agregar «${agregarTexto}»`}
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
