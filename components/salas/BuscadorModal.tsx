"use client";

import LetraTexto from "@/components/salas/LetraTexto";
import LetraViewer from "@/components/salas/LetraViewer";
import { TapButton } from "@/components/ui/TapFeedback";
import {
  esAcordesDeCanciones,
  esCifraClub,
  mapCancionLocalAResultado,
  resultadoKey,
} from "@/lib/buscador";
import { agregarACola, type CancionInput } from "@/lib/cola-logic";
import {
  guardarLetraEnCancionero,
  guardarLinkEnCancionero,
} from "@/lib/cancionero";
import {
  buscarEnCancionero,
  fetchCancioneroBusqueda,
} from "@/lib/sala-data";
import { createClient } from "@/lib/supabase/client";
import type { ResultadoBusquedaBuscador } from "@/types";
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronRight,
  Link2,
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
  onDataChange: () => Promise<void>;
  onColaAdded?: () => void;
};

type Pantalla = "busqueda" | "preview";

type ResultadosAgrupados = {
  cancionero: ResultadoBusquedaBuscador[];
  linksGuardados: ResultadoBusquedaBuscador[];
  internet: ResultadoBusquedaBuscador[];
};

type ConfirmacionGuardado = "letra" | "link" | null;

const CONFIRMACION_MS = 1500;

function toCancionInput(resultado: ResultadoBusquedaBuscador): CancionInput {
  const letraTexto =
    resultado.fuente === "cancionero" ? resultado.letra?.trim() || null : null;

  return {
    nombre: resultado.titulo,
    artista: resultado.artista || null,
    url_letra:
      resultado.fuente === "cancionero" ? "" : resultado.url,
    letra_texto: letraTexto,
  };
}

function ResultadoItem({
  resultado,
  onSelect,
}: {
  resultado: ResultadoBusquedaBuscador;
  onSelect: (resultado: ResultadoBusquedaBuscador) => void;
}) {
  const esCancionero = resultado.fuente === "cancionero";

  return (
    <button
      type="button"
      onClick={() => onSelect(resultado)}
      className="flex w-full items-center gap-3 rounded-[12px] border border-border-card bg-bg-card px-3 py-3 text-left"
    >
      {esCancionero ? (
        <Bookmark
          className="size-5 shrink-0"
          style={{ color: "var(--tuner-in-tune)" }}
          aria-hidden="true"
        />
      ) : (
        <Music className="size-5 shrink-0 text-accent" aria-hidden="true" />
      )}
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
          {!esCancionero && (
            <span className="rounded-full bg-accent-dim px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
              {resultado.sitio}
            </span>
          )}
        </div>
      </div>
      <ChevronRight
        className="size-5 shrink-0 text-text-faint"
        aria-hidden="true"
      />
    </button>
  );
}

function SeccionResultados({
  label,
  resultados,
  onSelect,
}: {
  label: string;
  resultados: ResultadoBusquedaBuscador[];
  onSelect: (resultado: ResultadoBusquedaBuscador) => void;
}) {
  if (resultados.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[1.5px] text-text-faint">
        {label}
      </p>
      <ul className="flex flex-col gap-2">
        {resultados.map((resultado) => (
          <li key={resultadoKey(resultado)}>
            <ResultadoItem resultado={resultado} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BuscadorModal({
  open,
  onClose,
  salaId,
  onDataChange,
  onColaAdded,
}: BuscadorModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmacionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [pantalla, setPantalla] = useState<Pantalla>("busqueda");
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadosAgrupados>({
    cancionero: [],
    linksGuardados: [],
    internet: [],
  });
  const [seleccionado, setSeleccionado] =
    useState<ResultadoBusquedaBuscador | null>(null);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingInternet, setLoadingInternet] = useState(false);
  const [accionLoading, setAccionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [confirmacion, setConfirmacion] = useState<ConfirmacionGuardado>(null);

  const totalResultados =
    resultados.cancionero.length +
    resultados.linksGuardados.length +
    resultados.internet.length;

  const resetState = useCallback(() => {
    if (confirmacionTimerRef.current) {
      clearTimeout(confirmacionTimerRef.current);
      confirmacionTimerRef.current = null;
    }

    setPantalla("busqueda");
    setQuery("");
    setResultados({ cancionero: [], linksGuardados: [], internet: [] });
    setSeleccionado(null);
    setLoadingLocal(false);
    setLoadingInternet(false);
    setAccionLoading(false);
    setError(null);
    setBusquedaRealizada(false);
    setConfirmacion(null);
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

  useEffect(() => {
    return () => {
      if (confirmacionTimerRef.current) {
        clearTimeout(confirmacionTimerRef.current);
      }
    };
  }, []);

  function dismissKeyboard() {
    inputRef.current?.blur();

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  function mostrarConfirmacion(tipo: Exclude<ConfirmacionGuardado, null>) {
    setConfirmacion(tipo);

    if (confirmacionTimerRef.current) {
      clearTimeout(confirmacionTimerRef.current);
    }

    confirmacionTimerRef.current = setTimeout(() => {
      setConfirmacion(null);
      confirmacionTimerRef.current = null;
    }, CONFIRMACION_MS);
  }

  async function handleSearch(event?: FormEvent) {
    event?.preventDefault();

    const trimmed = query.trim();

    if (!trimmed) {
      return;
    }

    dismissKeyboard();

    setLoadingLocal(true);
    setLoadingInternet(true);
    setError(null);
    setBusquedaRealizada(true);
    setResultados({ cancionero: [], linksGuardados: [], internet: [] });

    try {
      const supabase = createClient();
      const canciones = await fetchCancioneroBusqueda(supabase);

      const paso1 = buscarEnCancionero(trimmed, canciones, { conLetra: true });
      const paso2 = buscarEnCancionero(trimmed, canciones, { soloLink: true });

      setResultados({
        cancionero: paso1.map((c) =>
          mapCancionLocalAResultado(c, "cancionero"),
        ),
        linksGuardados: paso2.map((c) =>
          mapCancionLocalAResultado(c, "link-guardado"),
        ),
        internet: [],
      });
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Error al buscar en el cancionero",
      );
    } finally {
      setLoadingLocal(false);
    }

    try {
      const response = await fetch(
        `/api/buscar-letra?q=${encodeURIComponent(trimmed)}`,
      );
      const data = (await response.json()) as
        | ResultadoBusquedaBuscador[]
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Error al buscar en internet",
        );
      }

      const internet = (Array.isArray(data) ? data : []).map((item) => ({
        ...item,
        fuente: "internet" as const,
      }));

      setResultados((current) => ({
        ...current,
        internet,
      }));
    } catch (searchError) {
      if (!error) {
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Error al buscar en internet",
        );
      }
    } finally {
      setLoadingInternet(false);
    }
  }

  function handleSelectResultado(resultado: ResultadoBusquedaBuscador) {
    dismissKeyboard();
    setSeleccionado(resultado);
    setConfirmacion(null);
    setPantalla("preview");
  }

  function handleVolver() {
    setPantalla("busqueda");
    setSeleccionado(null);
    setConfirmacion(null);
    setError(null);
  }

  async function handleAgregarACola() {
    if (!seleccionado || accionLoading) {
      return;
    }

    setAccionLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      await agregarACola(supabase, salaId, toCancionInput(seleccionado));
      await onDataChange();
      onColaAdded?.();
      handleClose();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Error al agregar a la cola",
      );
    } finally {
      setAccionLoading(false);
    }
  }

  async function handleGuardarLink() {
    if (!seleccionado || accionLoading) {
      return;
    }

    setAccionLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      await guardarLinkEnCancionero(supabase, {
        nombre: seleccionado.titulo,
        artista: seleccionado.artista || null,
        url_letra: seleccionado.url,
      });
      await onDataChange();
      mostrarConfirmacion("link");
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Error al guardar el link",
      );
    } finally {
      setAccionLoading(false);
    }
  }

  async function handleGuardarLetraCompleta() {
    if (!seleccionado || accionLoading) {
      return;
    }

    setAccionLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const response = await fetch(
        `/api/obtener-letra?url=${encodeURIComponent(seleccionado.url)}`,
      );
      const data = (await response.json()) as {
        letra?: string;
        error?: string;
      };

      if (!response.ok || !data.letra?.trim()) {
        throw new Error(
          data.error ?? "No se pudo extraer la letra de esta canción",
        );
      }

      await guardarLetraEnCancionero(supabase, {
        nombre: seleccionado.titulo,
        artista: seleccionado.artista || null,
        letra: data.letra,
        url_letra: seleccionado.url,
      });
      await onDataChange();
      mostrarConfirmacion("letra");
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Error al guardar la letra",
      );
    } finally {
      setAccionLoading(false);
    }
  }

  const esPreviewInternet = seleccionado?.fuente === "internet";
  const esAcordes =
    seleccionado &&
    esPreviewInternet &&
    esAcordesDeCanciones(seleccionado.sitio, seleccionado.url);
  const esCifra =
    seleccionado &&
    esPreviewInternet &&
    esCifraClub(seleccionado.sitio, seleccionado.url);
  const mostrarGuardar =
    esPreviewInternet && (esAcordes || esCifra);
  const previewConLetraLocal =
    seleccionado?.fuente === "cancionero" &&
    Boolean(seleccionado.letra?.trim());

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
            <form className="flex items-center gap-3" onSubmit={handleSearch}>
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
                type="text"
                inputMode="search"
                enterKeyHint="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar canción..."
                autoFocus
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="min-h-11 flex-1 rounded-[10px] border border-border bg-bg-card px-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
              />

              <button
                type="submit"
                aria-label="Buscar"
                disabled={!query.trim() || loadingLocal}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent disabled:opacity-60"
              >
                <Search className="size-5 text-white" aria-hidden="true" />
              </button>
            </form>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {loadingLocal && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Loader2
                  className="size-8 animate-spin text-accent"
                  aria-hidden="true"
                />
                <p className="text-sm text-text-secondary">
                  Buscando en el cancionero...
                </p>
              </div>
            )}

            {!loadingLocal && error && totalResultados === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Music
                  className="size-10 text-text-faint"
                  aria-hidden="true"
                />
                <p className="text-sm text-text-muted">{error}</p>
              </div>
            )}

            {!loadingLocal && !error && !busquedaRealizada && (
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

            {!loadingLocal &&
              busquedaRealizada &&
              totalResultados === 0 &&
              !loadingInternet && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Music
                    className="size-10 text-text-faint"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-text-muted">
                    No encontramos resultados para tu búsqueda
                  </p>
                </div>
              )}

            {!loadingLocal && totalResultados > 0 && (
              <>
                <SeccionResultados
                  label="Del cancionero"
                  resultados={resultados.cancionero}
                  onSelect={handleSelectResultado}
                />
                <SeccionResultados
                  label="Links guardados"
                  resultados={resultados.linksGuardados}
                  onSelect={handleSelectResultado}
                />
                <SeccionResultados
                  label="En internet"
                  resultados={resultados.internet}
                  onSelect={handleSelectResultado}
                />
              </>
            )}

            {!loadingLocal && loadingInternet && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-text-muted">
                <Loader2
                  className="size-4 animate-spin text-accent"
                  aria-hidden="true"
                />
                Buscando en acordesdcanciones y cifraclub...
              </div>
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

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-preview-frame px-3 pb-3 pt-2">
                <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-[#f8f8f8]">
                  Previsualización
                </p>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {previewConLetraLocal ? (
                    <div className="min-h-0 flex-1 overflow-y-auto rounded-[12px] bg-letra-bg">
                      <LetraTexto texto={seleccionado.letra!} />
                    </div>
                  ) : (
                    <LetraViewer url={seleccionado.url} elevated />
                  )}
                </div>

                {esAcordes && (
                  <div className="absolute bottom-4 right-3 z-20 flex flex-col gap-2">
                    <TapButton
                      aria-label="Guardar letra completa"
                      disabled={accionLoading}
                      onClick={() => void handleGuardarLetraCompleta()}
                      className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-2 text-sm font-semibold text-text-primary shadow-[0_6px_20px_rgba(0,0,0,0.38)] disabled:opacity-60"
                    >
                      <Bookmark className="size-4 shrink-0 text-accent" />
                      Guardar letra completa
                    </TapButton>
                    <TapButton
                      aria-label="Guardar link"
                      disabled={accionLoading}
                      onClick={() => void handleGuardarLink()}
                      className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-2 text-sm font-semibold text-text-primary shadow-[0_6px_20px_rgba(0,0,0,0.38)] disabled:opacity-60"
                    >
                      <Link2 className="size-4 shrink-0 text-accent" />
                      Guardar link
                    </TapButton>
                  </div>
                )}

                {confirmacion && (
                  <button
                    type="button"
                    aria-label="Cerrar confirmación"
                    onClick={() => setConfirmacion(null)}
                    className="absolute inset-0 z-30 flex items-center justify-center bg-black/40"
                  >
                    <div
                      role="status"
                      className="flex flex-col items-center gap-3 rounded-[16px] border border-border bg-bg-card px-8 py-6 shadow-xl"
                    >
                      <div
                        className="flex size-14 items-center justify-center rounded-full"
                        style={{ backgroundColor: "var(--tuner-in-tune)" }}
                      >
                        <Check
                          className="size-8 text-white"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="text-lg font-bold text-text-primary">
                        {confirmacion === "letra"
                          ? "¡Guardada!"
                          : "¡Link guardado!"}
                      </p>
                    </div>
                  </button>
                )}
              </div>

              <footer className="shrink-0 border-t border-border bg-bg-darker px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                <p className="mb-2 text-center text-base font-bold text-accent">
                  ¿Confirmás la canción?
                </p>

                {error && (
                  <p className="mb-2 text-sm text-accent">{error}</p>
                )}

                <div
                  className={
                    mostrarGuardar && esCifra
                      ? "grid grid-cols-2 gap-2"
                      : "grid grid-cols-1 gap-2"
                  }
                >
                  <button
                    type="button"
                    disabled={accionLoading}
                    onClick={() => void handleAgregarACola()}
                    className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[10px] bg-accent px-2 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <ListPlus className="size-4 shrink-0" aria-hidden="true" />
                    <span className="text-center leading-tight">Sumar a fila</span>
                  </button>

                  {esCifra && (
                    <button
                      type="button"
                      disabled={accionLoading}
                      onClick={() => void handleGuardarLink()}
                      className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[10px] border border-border bg-bg-card px-2 py-1.5 text-sm font-semibold text-text-primary disabled:opacity-60"
                    >
                      <Link2 className="size-4 shrink-0" aria-hidden="true" />
                      <span className="text-center leading-tight">Guardar</span>
                    </button>
                  )}
                </div>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
