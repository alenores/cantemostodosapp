"use client";

import LetraViewer from "@/components/salas/LetraViewer";
import {
  agregarACola,
  agregarAGuardadas,
  type CancionInput,
} from "@/lib/cola-logic";
import { buildGuardadaKey } from "@/lib/sala-data";
import { createClient } from "@/lib/supabase/client";
import type { ResultadoBusqueda } from "@/types";
import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  ListPlus,
  Loader2,
  Music,
  Search,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type BuscadorModalProps = {
  open: boolean;
  onClose: () => void;
  salaId: number;
  guardadasKeys: Set<string>;
  onDataChange: () => Promise<void>;
};

type Pantalla = "busqueda" | "preview";

function toCancionInput(resultado: ResultadoBusqueda): CancionInput {
  return {
    nombre: resultado.titulo,
    artista: resultado.artista || null,
    url_letra: resultado.url,
  };
}

export default function BuscadorModal({
  open,
  onClose,
  salaId,
  guardadasKeys,
  onDataChange,
}: BuscadorModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pantalla, setPantalla] = useState<Pantalla>("busqueda");
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [seleccionado, setSeleccionado] = useState<ResultadoBusqueda | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [accionLoading, setAccionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const resetState = useCallback(() => {
    setPantalla("busqueda");
    setQuery("");
    setResultados([]);
    setSeleccionado(null);
    setLoading(false);
    setAccionLoading(false);
    setError(null);
    setBusquedaRealizada(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  useEffect(() => {
    if (open) {
      resetState();
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open, resetState]);

  function dismissKeyboard() {
    inputRef.current?.blur();

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  async function handleSearch(event?: FormEvent) {
    event?.preventDefault();

    const trimmed = query.trim();

    if (!trimmed) {
      return;
    }

    dismissKeyboard();

    setLoading(true);
    setError(null);
    setBusquedaRealizada(true);
    setResultados([]);

    try {
      const response = await fetch(
        `/api/buscar-letra?q=${encodeURIComponent(trimmed)}`,
      );
      const data = (await response.json()) as
        | ResultadoBusqueda[]
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Error al buscar canciones",
        );
      }

      setResultados(Array.isArray(data) ? data : []);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Error al buscar canciones",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSelectResultado(resultado: ResultadoBusqueda) {
    dismissKeyboard();
    setSeleccionado(resultado);
    setPantalla("preview");
  }

  function handleVolver() {
    setPantalla("busqueda");
    setSeleccionado(null);
  }

  const yaGuardada = seleccionado
    ? guardadasKeys.has(
        buildGuardadaKey(seleccionado.titulo, seleccionado.url),
      )
    : false;

  async function ejecutarAccion(tipo: "cola" | "guardar" | "ambas") {
    if (!seleccionado || accionLoading) {
      return;
    }

    setAccionLoading(true);
    setError(null);

    const supabase = createClient();
    const cancion = toCancionInput(seleccionado);

    try {
      if (tipo === "cola" || tipo === "ambas") {
        await agregarACola(supabase, salaId, cancion);
      }

      if ((tipo === "guardar" || tipo === "ambas") && !yaGuardada) {
        await agregarAGuardadas(supabase, salaId, cancion);
      }

      await onDataChange();
      handleClose();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Error al guardar la canción",
      );
    } finally {
      setAccionLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-darker">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <section
          className="absolute inset-0 flex flex-col transition-transform duration-350"
          style={{
            transform:
              pantalla === "preview" ? "translateY(-100%)" : "translateY(0)",
            transitionTimingFunction: "var(--transition-timing)",
          }}
        >
          <header className="shrink-0 border-b border-border px-4 py-3">
              <form
                className="flex items-center gap-3"
                onSubmit={handleSearch}
              >
                <button
                  type="button"
                  aria-label="Cerrar buscador"
                  onClick={handleClose}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
                >
                  <X className="size-5 text-text-primary" aria-hidden="true" />
                </button>

                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar canción..."
                  autoFocus
                  className="min-h-11 flex-1 rounded-[10px] border border-border bg-bg-card px-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
                />

                <button
                  type="submit"
                  aria-label="Buscar"
                  disabled={loading || !query.trim()}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2
                      className="size-5 animate-spin text-white"
                      aria-hidden="true"
                    />
                  ) : (
                    <Search className="size-5 text-white" aria-hidden="true" />
                  )}
                </button>
              </form>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {loading && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Loader2
                    className="size-8 animate-spin text-accent"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-text-secondary">
                    Buscando en acordesdcanciones y cifraclub...
                  </p>
                </div>
              )}

              {!loading && error && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Music
                    className="size-10 text-text-faint"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-text-muted">{error}</p>
                </div>
              )}

              {!loading && !error && !busquedaRealizada && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Music
                    className="size-10 text-text-faint"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-text-muted">
                    Escribí el nombre de la canción o el artista
                  </p>
                </div>
              )}

              {!loading &&
                !error &&
                busquedaRealizada &&
                resultados.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <Music
                      className="size-10 text-text-faint"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-text-muted">
                      Escribí el nombre de la canción o el artista
                    </p>
                  </div>
                )}

              {!loading && !error && resultados.length > 0 && (
                <>
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-[1.5px] text-text-faint">
                    {resultados.length} resultado
                    {resultados.length === 1 ? "" : "s"}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {resultados.map((resultado) => (
                      <li key={resultado.url}>
                        <button
                          type="button"
                          onClick={() => handleSelectResultado(resultado)}
                          className="flex w-full items-center gap-3 rounded-[12px] border border-border-card bg-bg-card px-3 py-3 text-left"
                        >
                          <Music
                            className="size-5 shrink-0 text-accent"
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold text-text-primary">
                              {resultado.titulo}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {resultado.artista && (
                                <span className="truncate text-[12px] text-text-muted">
                                  {resultado.artista}
                                </span>
                              )}
                              <span className="rounded-full bg-accent-dim px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                                {resultado.sitio}
                              </span>
                            </div>
                          </div>
                          <ChevronRight
                            className="size-5 shrink-0 text-text-faint"
                            aria-hidden="true"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
        </section>

        <section
          className="absolute inset-0 flex flex-col transition-transform duration-350"
          style={{
            transform:
              pantalla === "preview" ? "translateY(0)" : "translateY(100%)",
            transitionTimingFunction: "var(--transition-timing)",
          }}
        >
          {seleccionado && (
            <>
              <header className="shrink-0 border-b border-border px-4 py-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Volver a resultados"
                      onClick={handleVolver}
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
                    >
                      <ArrowLeft
                        className="size-5 text-text-primary"
                        aria-hidden="true"
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-extrabold text-text-primary">
                        {seleccionado.titulo}
                      </h2>
                      <p className="truncate text-[12px] text-text-muted">
                        {seleccionado.artista
                          ? `${seleccionado.artista} · ${seleccionado.sitio}`
                          : seleccionado.sitio}
                      </p>
                    </div>
                  </div>
                </header>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-preview-frame px-3 py-3">
                  <LetraViewer url={seleccionado.url} />
                </div>

                <footer className="shrink-0 border-t border-border bg-bg-darker px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                  <p className="mb-2 text-center text-sm font-semibold text-text-secondary">
                    ¿Confirmás esta canción?
                  </p>

                  {error && (
                    <p className="mb-2 text-sm text-accent">{error}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={accionLoading}
                      onClick={() => void ejecutarAccion("cola")}
                      className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[10px] bg-accent px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      <ListPlus className="size-4 shrink-0" aria-hidden="true" />
                      + fila
                    </button>

                    <button
                      type="button"
                      disabled={accionLoading || yaGuardada}
                      onClick={() => void ejecutarAccion("guardar")}
                      className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[10px] border border-border bg-bg-card px-2 py-1.5 text-xs font-semibold text-text-primary disabled:opacity-60"
                    >
                      <Bookmark className="size-4 shrink-0" aria-hidden="true" />
                      {yaGuardada ? "Ya guardada" : "Guardar"}
                    </button>

                    <button
                      type="button"
                      disabled={accionLoading || yaGuardada}
                      onClick={() => void ejecutarAccion("ambas")}
                      className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[10px] border border-border bg-bg-card px-2 py-1.5 text-xs font-semibold text-text-primary disabled:opacity-60"
                    >
                      {yaGuardada ? "Ya guardada" : "Ambas"}
                    </button>
                  </div>
                </footer>
              </>
            )}
        </section>
      </div>
    </div>
  );
}
