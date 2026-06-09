"use client";

import LetraTexto from "@/components/salas/LetraTexto";
import LetraViewer from "@/components/salas/LetraViewer";
import CancioneroFormModal from "@/components/ui/CancioneroFormModal";
import { TapButton } from "@/components/ui/TapFeedback";
import {
  esAcordesDeCanciones,
  esCifraClub,
  getResultadoIconoTipo,
  mapCancionLocalAResultado,
  resolverNombreArtistaDisplay,
  resultadoKey,
  type ResultadoIconoTipo,
} from "@/lib/buscador";
import { agregarACola, type CancionInput } from "@/lib/cola-logic";
import {
  getDuplicadoCancioneroNivel,
  guardarLetraEnCancionero,
  guardarLinkEnCancionero,
  type CancioneroFormData,
} from "@/lib/cancionero";
import {
  buscarEnCancionero,
  fetchCancioneroBusqueda,
} from "@/lib/sala-data";
import { createClient } from "@/lib/supabase/client";
import type { CancionCancionero, ResultadoBusquedaBuscador } from "@/types";
import {
  ArrowLeft,
  Bookmark,
  Check,
  FileText,
  Globe2,
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
  useMemo,
  useRef,
  useState,
  type ReactNode,
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

type GuardarLetraModalState = {
  nombre: string;
  artista: string;
  letra: string;
  url: string;
};

const CONFIRMACION_MS = 1500;

function toCancionInput(resultado: ResultadoBusquedaBuscador): CancionInput {
  const letraTexto =
    resultado.fuente === "cancionero" ? resultado.letra?.trim() || null : null;
  const { nombre, artista } = resolverNombreArtistaDisplay(
    resultado.titulo,
    resultado.artista,
  );

  return {
    nombre,
    artista: artista || null,
    url_letra:
      resultado.fuente === "cancionero" ? "" : resultado.url,
    letra_texto: letraTexto,
  };
}

const RESULTADO_ICONO_COLOR: Record<ResultadoIconoTipo, string> = {
  cancionero: "#7BC9A8",
  link: "#8BA4C4",
  acordes: "#5BB5A0",
  cifra: "var(--accent)",
};

function ResultadoIcono({ tipo }: { tipo: ResultadoIconoTipo }) {
  const className = "size-5 shrink-0";
  const color = RESULTADO_ICONO_COLOR[tipo];

  switch (tipo) {
    case "cancionero":
      return (
        <FileText className={className} style={{ color }} aria-hidden="true" />
      );
    case "link":
      return <Link2 className={className} style={{ color }} aria-hidden="true" />;
    case "acordes":
      return (
        <FileText className={className} style={{ color }} aria-hidden="true" />
      );
    case "cifra":
      return <Globe2 className={className} style={{ color }} aria-hidden="true" />;
  }
}

function ResultadoItem({
  resultado,
  onSelect,
}: {
  resultado: ResultadoBusquedaBuscador;
  onSelect: (resultado: ResultadoBusquedaBuscador) => void;
}) {
  const esCancionero = resultado.fuente === "cancionero";
  const iconoTipo = getResultadoIconoTipo(resultado);
  const { nombre, artista } = resolverNombreArtistaDisplay(
    resultado.titulo,
    resultado.artista,
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(resultado)}
      className="flex w-full items-center gap-3 rounded-[12px] border border-border-card bg-bg-card px-3 py-3 text-left"
    >
      <ResultadoIcono tipo={iconoTipo} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-text-primary">
          {nombre}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {artista && (
            <span className="truncate text-[12px] text-text-muted">
              {artista}
            </span>
          )}
          {!esCancionero && (
            <span className="rounded-full bg-accent-dim px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
              {resultado.sitio}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function SeccionResultados({
  label,
  icon,
  resultados,
  onSelect,
}: {
  label: string;
  icon?: ReactNode;
  resultados: ResultadoBusquedaBuscador[];
  onSelect: (resultado: ResultadoBusquedaBuscador) => void;
}) {
  if (resultados.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <p className="text-[10px] font-medium uppercase tracking-[1.5px] text-text-faint">
          {label}
        </p>
      </div>
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
  const [fabGuardarAbierto, setFabGuardarAbierto] = useState(false);
  const [guardarLetraModal, setGuardarLetraModal] =
    useState<GuardarLetraModalState | null>(null);
  const [cancionesCancionero, setCancionesCancionero] = useState<
    CancionCancionero[]
  >([]);

  const resultadosEnInternet = useMemo(
    () => [...resultados.linksGuardados, ...resultados.internet],
    [resultados.linksGuardados, resultados.internet],
  );

  const totalResultados =
    resultados.cancionero.length + resultadosEnInternet.length;

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
    setFabGuardarAbierto(false);
    setGuardarLetraModal(null);
    setCancionesCancionero([]);
  }, []);

  const cargarCancionesCancionero = useCallback(async () => {
    const supabase = createClient();
    const canciones = await fetchCancioneroBusqueda(supabase);
    setCancionesCancionero(canciones);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  useEffect(() => {
    if (open) {
      resetState();
      void cargarCancionesCancionero().catch(() => {
        // La búsqueda local sigue funcionando aunque falle esta carga.
      });
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open, resetState, cargarCancionesCancionero]);

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
      setCancionesCancionero(canciones);

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

      const internet = (Array.isArray(data) ? data : []).map((item) => {
        const { nombre, artista } = resolverNombreArtistaDisplay(
          item.titulo,
          item.artista,
        );

        return {
          ...item,
          titulo: nombre,
          artista,
          fuente: "internet" as const,
        };
      });

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
    setFabGuardarAbierto(false);
    setPantalla("preview");
  }

  function handleVolver() {
    setPantalla("busqueda");
    setSeleccionado(null);
    setConfirmacion(null);
    setFabGuardarAbierto(false);
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
      const { nombre, artista } = resolverNombreArtistaDisplay(
        seleccionado.titulo,
        seleccionado.artista,
      );

      await guardarLinkEnCancionero(supabase, {
        nombre,
        artista: artista || null,
        url_letra: seleccionado.url,
      });
      await onDataChange();
      setFabGuardarAbierto(false);
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

  async function handleGuardarLetraDesdeModal(form: CancioneroFormData) {
    if (!guardarLetraModal) {
      return;
    }

    const supabase = createClient();

    await guardarLetraEnCancionero(supabase, {
      nombre: form.nombre,
      artista: form.artista,
      letra: form.letra,
      url_letra: guardarLetraModal.url,
    });
  }

  async function handleGuardarLetraCompleta() {
    if (!seleccionado || accionLoading) {
      return;
    }

    setAccionLoading(true);
    setError(null);

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

      const { nombre, artista } = resolverNombreArtistaDisplay(
        seleccionado.titulo,
        seleccionado.artista,
      );

      setGuardarLetraModal({
        nombre,
        artista,
        letra: data.letra,
        url: seleccionado.url,
      });
      setFabGuardarAbierto(false);
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

  const esCancioneroPreview = seleccionado?.fuente === "cancionero";
  const esLinkGuardadoPreview = seleccionado?.fuente === "link-guardado";
  const esInternetPreview = seleccionado?.fuente === "internet";
  const esAcordesSitio =
    seleccionado &&
    esAcordesDeCanciones(seleccionado.sitio, seleccionado.url);
  const esCifraSitio =
    seleccionado && esCifraClub(seleccionado.sitio, seleccionado.url);

  const seleccionadoDisplay = useMemo(() => {
    if (!seleccionado) {
      return null;
    }

    return resolverNombreArtistaDisplay(
      seleccionado.titulo,
      seleccionado.artista,
    );
  }, [seleccionado]);

  const duplicadoCompletoEnPreview = useMemo(() => {
    if (!seleccionadoDisplay) {
      return false;
    }

    return (
      getDuplicadoCancioneroNivel(
        cancionesCancionero,
        seleccionadoDisplay.nombre,
        seleccionadoDisplay.artista,
      ) === "nombre-artista"
    );
  }, [seleccionadoDisplay, cancionesCancionero]);

  const guardarDeshabilitado = Boolean(
    esCancioneroPreview ||
      (esLinkGuardadoPreview && esCifraSitio) ||
      duplicadoCompletoEnPreview,
  );

  const guardarAccionDirecta = Boolean(esInternetPreview && esCifraSitio);

  const guardarAbreFab = Boolean(
    (esInternetPreview && esAcordesSitio) ||
      (esLinkGuardadoPreview && esAcordesSitio),
  );

  const fabMuestraLink = Boolean(esInternetPreview && esAcordesSitio);
  const fabMuestraCancion = Boolean(
    (esInternetPreview && esAcordesSitio) ||
      (esLinkGuardadoPreview && esAcordesSitio),
  );

  const previewConLetraLocal =
    seleccionado?.fuente === "cancionero" &&
    Boolean(seleccionado.letra?.trim());

  function handleGuardarTap() {
    if (!seleccionado || guardarDeshabilitado || accionLoading) {
      return;
    }

    if (guardarAccionDirecta) {
      void handleGuardarLink();
      return;
    }

    if (guardarAbreFab) {
      setFabGuardarAbierto((abierto) => !abierto);
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
                  icon={
                    <Bookmark
                      className="size-3.5 shrink-0"
                      style={{ color: "var(--tuner-in-tune)" }}
                      aria-hidden="true"
                    />
                  }
                  resultados={resultados.cancionero}
                  onSelect={handleSelectResultado}
                />
                <SeccionResultados
                  label="En internet"
                  icon={
                    <Link2
                      className="size-3.5 shrink-0 text-[#8BA4C4]"
                      aria-hidden="true"
                    />
                  }
                  resultados={resultadosEnInternet}
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
              <header className="shrink-0 border-b border-border px-4 py-1.5">
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
                      {seleccionadoDisplay?.nombre ?? seleccionado.titulo}
                    </h2>
                    <p className="truncate text-[12px] text-text-muted">
                      {seleccionadoDisplay?.artista
                        ? `${seleccionadoDisplay.artista} · ${seleccionado.sitio}`
                        : seleccionado.sitio}
                    </p>
                  </div>
                </div>
              </header>

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-preview-frame px-3 pt-1.5 pb-0">
                <p className="mb-1 shrink-0 text-xs font-semibold uppercase tracking-wide text-[#f8f8f8]">
                  Previsualización
                </p>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {previewConLetraLocal ? (
                    <div className="min-h-0 flex-1 overflow-y-auto rounded-[12px] bg-letra-bg">
                      <LetraTexto texto={seleccionado.letra!} />
                    </div>
                  ) : (
                    <LetraViewer url={seleccionado.url} elevated fill />
                  )}
                </div>

                {fabGuardarAbierto && fabMuestraCancion && (
                  <>
                    <button
                      type="button"
                      aria-label="Cerrar opciones de guardado"
                      className="absolute inset-0 z-10"
                      onClick={() => setFabGuardarAbierto(false)}
                    />
                    <div className="absolute bottom-4 right-3 z-20 flex flex-col gap-2">
                      <TapButton
                        aria-label={
                          esLinkGuardadoPreview
                            ? "Guardar canción"
                            : "Guardar letra completa"
                        }
                        disabled={accionLoading}
                        onClick={() => void handleGuardarLetraCompleta()}
                        className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-2 text-sm font-semibold text-text-primary shadow-[0_6px_20px_rgba(0,0,0,0.38)] disabled:opacity-60"
                      >
                        <Bookmark className="size-4 shrink-0 text-accent" />
                        {accionLoading
                          ? "Cargando letra..."
                          : esLinkGuardadoPreview
                            ? "Guardar canción"
                            : "Guardar letra completa"}
                      </TapButton>
                      {fabMuestraLink && (
                        <TapButton
                          aria-label="Guardar link"
                          disabled={accionLoading}
                          onClick={() => void handleGuardarLink()}
                          className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-2 text-sm font-semibold text-text-primary shadow-[0_6px_20px_rgba(0,0,0,0.38)] disabled:opacity-60"
                        >
                          <Link2 className="size-4 shrink-0 text-accent" />
                          Guardar link
                        </TapButton>
                      )}
                    </div>
                  </>
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

              <footer className="shrink-0 border-t border-border bg-bg-darker px-4 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
                <p className="mb-1 text-center text-sm font-bold text-accent">
                  ¿Confirmás la canción?
                </p>

                {error && (
                  <p className="mb-2 text-sm text-accent">{error}</p>
                )}

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={accionLoading}
                    onClick={() => void handleAgregarACola()}
                    className="flex min-h-10 flex-col items-center justify-center gap-0 rounded-[10px] bg-accent px-2 py-1 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <ListPlus className="size-4 shrink-0" aria-hidden="true" />
                    <span className="text-center leading-tight">Sumar a fila</span>
                  </button>

                  <button
                    type="button"
                    disabled={accionLoading || guardarDeshabilitado}
                    onClick={handleGuardarTap}
                    className="flex min-h-10 flex-col items-center justify-center gap-0 rounded-[10px] border border-border bg-bg-card px-2 py-1 text-sm font-semibold text-text-primary disabled:border-border-subtle disabled:text-text-faint"
                  >
                    <Bookmark className="size-4 shrink-0" aria-hidden="true" />
                    <span className="text-center leading-tight">Guardar</span>
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>

      {guardarLetraModal && (
        <CancioneroFormModal
          open
          title="Guardar en cancionero"
          cancionesExistentes={cancionesCancionero}
          initialValues={{
            nombre: guardarLetraModal.nombre,
            artista: guardarLetraModal.artista,
            letra: guardarLetraModal.letra,
          }}
          onSubmit={handleGuardarLetraDesdeModal}
          onClose={() => setGuardarLetraModal(null)}
          onSaved={() => {
            void onDataChange();
            void cargarCancionesCancionero();
            mostrarConfirmacion("letra");
            setGuardarLetraModal(null);
          }}
        />
      )}
    </div>
  );
}
