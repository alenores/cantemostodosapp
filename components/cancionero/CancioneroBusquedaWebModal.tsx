"use client";

import AcordesEmbedPrimeraVezHint from "@/components/salas/AcordesEmbedPrimeraVezHint";
import { BuscadorInternetPendingSkeleton } from "@/components/cancionero/CancioneroListSkeleton";
import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import LetraViewer, {
  LetraRevealFullControl,
} from "@/components/salas/LetraViewer";
import type { CifradoEditorWebImportData } from "@/components/cifrado/CifradoEditorIngresoWebSearch";
import { useAcordesEmbedPrimeraVez } from "@/hooks/useAcordesEmbedPrimeraVez";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import {
  esAcordesDeCanciones,
  resolverNombreArtistaDisplay,
} from "@/lib/buscador";
import { guardarLetraEnCancionero } from "@/lib/cancionero";
import { parseLetraTradicional } from "@/lib/cifrado-import";
import {
  getEmbedBottomClipPx,
  getEmbedTopClipPx,
  shouldApplyEmbedInitialOffset,
} from "@/lib/letra-display";
import { createClient } from "@/lib/supabase/client";
import type { ResultadoBusqueda } from "@/types";
import { ArrowLeft, Music, Search, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  consultaInicial: string;
  /** Dueño, superamigos y amigos: el alta completa. El resto guarda solo la letra. */
  puedeDarDeAlta: boolean;
  onClose: () => void;
  onImportar: (data: CifradoEditorWebImportData) => void;
  onGuardada: (id: number) => void;
};

function filtrarSoloAcordes(resultados: ResultadoBusqueda[]) {
  return resultados.filter((resultado) =>
    esAcordesDeCanciones(resultado.sitio, resultado.url),
  );
}

export default function CancioneroBusquedaWebModal({
  open,
  consultaInicial,
  puedeDarDeAlta,
  onClose,
  onImportar,
  onGuardada,
}: Props) {
  const [pantalla, setPantalla] = useState<"busqueda" | "preview">("busqueda");
  const [query, setQuery] = useState(consultaInicial);
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<ResultadoBusqueda | null>(
    null,
  );
  const [confirmando, setConfirmando] = useState(false);
  const [embedFullRevealed, setEmbedFullRevealed] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPantalla("busqueda");
    setQuery(consultaInicial);
    setResultados([]);
    setBusquedaRealizada(false);
    setError(null);
    setSeleccionado(null);
    setEmbedFullRevealed(false);

    if (consultaInicial.trim()) {
      void buscar(consultaInicial);
    }
    // La búsqueda inicial corresponde a la consulta con la que se abrió.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, consultaInicial]);

  useHardwareBack(open, () => {
    if (pantalla === "preview") {
      setPantalla("busqueda");
      setSeleccionado(null);
      return;
    }

    onClose();
  });

  async function buscar(texto: string) {
    const trimmed = texto.trim();
    if (!trimmed) {
      return;
    }

    setLoading(true);
    setError(null);
    setBusquedaRealizada(false);

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
            : "No se pudo buscar en la web",
        );
      }

      setResultados(filtrarSoloAcordes(Array.isArray(data) ? data : []));
      setBusquedaRealizada(true);
    } catch (searchError) {
      setResultados([]);
      setBusquedaRealizada(true);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Error al buscar en la web",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    void buscar(query);
  }

  async function obtenerTexto(url: string) {
    const response = await fetch(
      `/api/obtener-letra?url=${encodeURIComponent(url)}`,
    );
    const data = (await response.json()) as { letra?: string; error?: string };
    if (!response.ok || !data.letra?.trim()) {
      throw new Error(
        data.error ?? "No se pudo extraer la letra de esta canción",
      );
    }
    return data.letra.trim();
  }

  async function guardarSimple() {
    if (!seleccionado || confirmando) {
      return;
    }

    setConfirmando(true);
    setError(null);

    try {
      const texto = await obtenerTexto(seleccionado.url);
      const { nombre, artista } = resolverNombreArtistaDisplay(
        seleccionado.titulo,
        seleccionado.artista,
      );
      const id = await guardarLetraEnCancionero(createClient(), {
        nombre,
        artista: artista || null,
        letra: texto,
        url_letra: seleccionado.url,
      });
      onGuardada(id);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "No se pudo guardar la canción",
      );
    } finally {
      setConfirmando(false);
    }
  }

  async function importarCompleta() {
    if (!seleccionado || confirmando || !puedeDarDeAlta) {
      return;
    }

    setConfirmando(true);
    setError(null);

    try {
      const texto = await obtenerTexto(seleccionado.url);
      const { nombre, artista } = resolverNombreArtistaDisplay(
        seleccionado.titulo,
        seleccionado.artista,
      );
      const imported = parseLetraTradicional(texto);
      onImportar({
        textoTradicional: texto,
        letra: imported.letra,
        cifrado: imported.cifrado,
        nombre,
        artista,
        warnings: imported.warnings,
      });
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "No se pudo usar esta canción",
      );
    } finally {
      setConfirmando(false);
    }
  }

  const seleccionadoDisplay = useMemo(() => {
    if (!seleccionado) {
      return null;
    }

    return resolverNombreArtistaDisplay(
      seleccionado.titulo,
      seleccionado.artista,
    );
  }, [seleccionado]);

  const previewConRecorte =
    Boolean(seleccionado) &&
    !embedFullRevealed &&
    shouldApplyEmbedInitialOffset(seleccionado!.url);
  const previewEmbedUrl = seleccionado?.url ?? null;
  const { showAcordesPrimeraVezHint, dismissAcordesPrimeraVezHint } =
    useAcordesEmbedPrimeraVez(previewEmbedUrl);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-darker lg:bg-black/55 lg:p-6 lg:backdrop-blur-sm">
      <div className="relative min-h-0 flex-1 overflow-hidden lg:mx-auto lg:max-h-[min(92vh,820px)] lg:w-full lg:max-w-3xl lg:rounded-2xl lg:border lg:border-border lg:bg-bg-darker lg:shadow-2xl">
        {pantalla === "busqueda" ? (
          <section className="absolute inset-0 flex flex-col">
            <header className="shrink-0 border-b border-border px-4 py-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  aria-label="Cerrar búsqueda"
                  onClick={onClose}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
                >
                  <X className="size-5 text-text-primary" aria-hidden="true" />
                </button>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h2 className="text-lg font-extrabold text-text-primary">
                    Resultados de la web
                  </h2>
                  <p className="text-sm text-text-muted">
                    Vienen de acordesdcanciones.com
                  </p>
                </div>
              </div>
              <form className="mt-3 flex items-center gap-3" onSubmit={handleSearch}>
                <input
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar canción..."
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="min-h-11 flex-1 rounded-[10px] border border-border bg-bg-card px-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  aria-label="Buscar"
                  disabled={loading || !query.trim()}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent disabled:opacity-60"
                >
                  <Search className="size-5 text-white" aria-hidden="true" />
                </button>
              </form>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {error ? (
                <p className="py-6 text-center text-sm text-accent">{error}</p>
              ) : null}
              {loading ? <BuscadorInternetPendingSkeleton /> : null}
              {!loading && !busquedaRealizada ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Music className="size-10 text-text-faint" aria-hidden="true" />
                  <p className="text-sm text-text-muted">
                    Buscá la canción en Acordes de Canciones
                  </p>
                </div>
              ) : null}
              {!loading && busquedaRealizada && resultados.length === 0 && !error ? (
                <p className="py-6 text-center text-sm text-text-muted">
                  No encontramos resultados en Acordes de Canciones
                </p>
              ) : null}
              {!loading && resultados.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {resultados.map((resultado) => {
                    const display = resolverNombreArtistaDisplay(
                      resultado.titulo,
                      resultado.artista,
                    );
                    return (
                      <li key={resultado.url}>
                        <button
                          type="button"
                          onClick={() => {
                            setSeleccionado(resultado);
                            setEmbedFullRevealed(false);
                            setError(null);
                            setPantalla("preview");
                          }}
                          className="flex w-full items-center gap-3 overflow-hidden rounded-[12px] border border-border-card bg-bg-card px-3 py-3 text-left"
                        >
                          <LetraFuenteIcon tipo="acordes" premium={false} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[17px] font-semibold text-text-primary">
                              {display.nombre}
                            </p>
                            {display.artista ? (
                              <p className="truncate text-[14px] text-text-muted">
                                {display.artista}
                              </p>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </section>
        ) : seleccionado ? (
          <section className="absolute inset-0 flex flex-col">
            <header className="shrink-0 border-b border-border px-4 py-1.5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Volver a resultados"
                  onClick={() => {
                    setPantalla("busqueda");
                    setSeleccionado(null);
                    setError(null);
                  }}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
                >
                  <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
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

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-preview-frame">
              <div className="flex h-full min-h-0 flex-col justify-center px-[5%] py-4">
                <p className="mb-2 shrink-0 text-center text-base font-bold uppercase tracking-wide text-text-primary">
                  Previsualización
                </p>
                <div className="relative h-[50%] min-h-0 shrink-0 overflow-hidden rounded-[12px] border-2 border-dashed border-accent/85 shadow-[0_10px_40px_rgba(0,0,0,0.48),0_4px_12px_rgba(0,0,0,0.28)]">
                  {previewConRecorte ? (
                    <LetraRevealFullControl
                      onRevealFull={() => {
                        if (showAcordesPrimeraVezHint) {
                          dismissAcordesPrimeraVezHint();
                        }
                        setEmbedFullRevealed((current) => !current);
                      }}
                      expanded={embedFullRevealed}
                      className="absolute right-2 top-2"
                    />
                  ) : null}
                  {showAcordesPrimeraVezHint ? (
                    <AcordesEmbedPrimeraVezHint
                      onDismiss={dismissAcordesPrimeraVezHint}
                    />
                  ) : null}
                  <LetraViewer
                    url={seleccionado.url}
                    fill
                    initialScrollOffsetPx={
                      previewConRecorte
                        ? getEmbedTopClipPx(seleccionado.url)
                        : undefined
                    }
                    initialScrollBottomOffsetPx={
                      previewConRecorte && !showAcordesPrimeraVezHint
                        ? getEmbedBottomClipPx(seleccionado.url)
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>

            <footer className="shrink-0 border-t border-border bg-bg-darker px-4 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
              {error ? (
                <p className="mb-2 text-center text-sm text-accent">{error}</p>
              ) : null}
              <div>
                {puedeDarDeAlta ? (
                  <button
                    type="button"
                    disabled={confirmando}
                    onClick={() => void importarCompleta()}
                    className="flex min-h-10 w-full items-center justify-center rounded-[10px] bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {confirmando ? "Cargando..." : "Confirmar e importar"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={confirmando}
                    onClick={() => void guardarSimple()}
                    className="flex min-h-10 w-full items-center justify-center rounded-[10px] bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {confirmando ? "Cargando..." : "Guardar"}
                  </button>
                )}
              </div>
            </footer>
          </section>
        ) : null}
      </div>
    </div>
  );
}
