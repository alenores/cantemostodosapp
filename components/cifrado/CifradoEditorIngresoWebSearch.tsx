"use client";

import { BuscadorInternetPendingSkeleton } from "@/components/cancionero/CancioneroListSkeleton";
import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import { SitioLetraBadge } from "@/components/salas/LetraFuenteSitioBadge";
import LetraViewer from "@/components/salas/LetraViewer";
import { TapButton } from "@/components/ui/TapFeedback";
import {
  esAcordesDeCanciones,
  resolverNombreArtistaDisplay,
} from "@/lib/buscador";
import { parseLetraTradicional } from "@/lib/cifrado-import";
import type { CifradoData } from "@/lib/cifrado";
import {
  getEmbedBottomClipPx,
  getEmbedTopClipPx,
  shouldApplyEmbedInitialOffset,
} from "@/lib/letra-display";
import type { ResultadoBusqueda } from "@/types";
import { ArrowLeft, Music, Search } from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS } from "@/components/cifrado/cifrado-controls-ui";

export type CifradoEditorWebImportData = {
  letra: string;
  cifrado: CifradoData;
  nombre: string;
  artista: string;
  warnings: string[];
};

type CifradoEditorIngresoWebSearchProps = {
  onImport: (data: CifradoEditorWebImportData) => void;
  onError: (message: string) => void;
};

type Pantalla = "busqueda" | "preview";

function filtrarSoloAcordesDeCanciones(
  resultados: ResultadoBusqueda[],
): ResultadoBusqueda[] {
  return resultados.filter((resultado) =>
    esAcordesDeCanciones(resultado.sitio, resultado.url),
  );
}

function ResultadoItem({
  resultado,
  onSelect,
}: {
  resultado: ResultadoBusqueda;
  onSelect: (resultado: ResultadoBusqueda) => void;
}) {
  const { nombre, artista } = resolverNombreArtistaDisplay(
    resultado.titulo,
    resultado.artista,
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(resultado)}
      className="flex w-full items-center gap-3 overflow-hidden rounded-[12px] border border-border-card bg-bg-card px-3 py-3 text-left"
    >
      <LetraFuenteIcon tipo="acordes" premium={false} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-semibold text-text-primary">
          {nombre}
        </p>
        <div className="mt-0.5 flex min-w-0 items-center gap-2">
          {artista ? (
            <p className="min-w-0 flex-1 truncate text-[14px] text-text-muted">
              {artista}
            </p>
          ) : (
            <span className="min-w-0 flex-1" aria-hidden="true" />
          )}
          <SitioLetraBadge sitio={resultado.sitio} url={resultado.url} />
        </div>
      </div>
    </button>
  );
}

export default function CifradoEditorIngresoWebSearch({
  onImport,
  onError,
}: CifradoEditorIngresoWebSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pantalla, setPantalla] = useState<Pantalla>("busqueda");
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [seleccionado, setSeleccionado] = useState<ResultadoBusqueda | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [embedTopRevealed, setEmbedTopRevealed] = useState(false);

  const seleccionadoDisplay = useMemo(() => {
    if (!seleccionado) {
      return null;
    }

    return resolverNombreArtistaDisplay(
      seleccionado.titulo,
      seleccionado.artista,
    );
  }, [seleccionado]);

  const previewIframeConRecorteInicial = Boolean(
    seleccionado && shouldApplyEmbedInitialOffset(seleccionado.url),
  );

  const previewEmbedOffsetPx =
    previewIframeConRecorteInicial && !embedTopRevealed && seleccionado
      ? getEmbedTopClipPx(seleccionado.url)
      : undefined;

  const previewEmbedBottomClipPx =
    previewIframeConRecorteInicial && seleccionado
      ? getEmbedBottomClipPx(seleccionado.url)
      : undefined;

  async function handleSearch(event: FormEvent) {
    event.preventDefault();

    const trimmed = query.trim();

    if (!trimmed) {
      return;
    }

    setLoading(true);
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

      const filtrados = filtrarSoloAcordesDeCanciones(
        Array.isArray(data) ? data : [],
      );

      setResultados(filtrados);
      setBusquedaRealizada(true);
    } catch (searchError) {
      setResultados([]);
      setBusquedaRealizada(true);
      onError(
        searchError instanceof Error
          ? searchError.message
          : "Error al buscar en la web",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSelectResultado(resultado: ResultadoBusqueda) {
    setSeleccionado(resultado);
    setEmbedTopRevealed(false);
    setPantalla("preview");
  }

  function handleVolver() {
    setPantalla("busqueda");
    setSeleccionado(null);
    setEmbedTopRevealed(false);
  }

  async function handleUsarCancion() {
    if (!seleccionado || importando) {
      return;
    }

    setImportando(true);

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

      const imported = parseLetraTradicional(data.letra);
      const { nombre, artista } = resolverNombreArtistaDisplay(
        seleccionado.titulo,
        seleccionado.artista,
      );

      onImport({
        letra: imported.letra,
        cifrado: imported.cifrado,
        nombre,
        artista,
        warnings: imported.warnings,
      });
    } catch (importError) {
      onError(
        importError instanceof Error
          ? importError.message
          : "No se pudo importar la canción",
      );
    } finally {
      setImportando(false);
    }
  }

  if (pantalla === "preview" && seleccionado) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-label="Volver a resultados"
            onClick={handleVolver}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card"
          >
            <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-extrabold text-text-primary">
              {seleccionadoDisplay?.nombre ?? seleccionado.titulo}
            </h3>
            <p className="truncate text-xs text-text-muted">
              {seleccionadoDisplay?.artista
                ? `${seleccionadoDisplay.artista} · ${seleccionado.sitio}`
                : seleccionado.sitio}
            </p>
          </div>
        </div>

        <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Previsualización
        </p>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] bg-preview-frame">
          <LetraViewer
            url={seleccionado.url}
            elevated
            fill
            initialScrollOffsetPx={previewEmbedOffsetPx}
            initialScrollBottomOffsetPx={previewEmbedBottomClipPx}
            onRevealTop={
              previewIframeConRecorteInicial
                ? () => setEmbedTopRevealed(true)
                : undefined
            }
          />
        </div>

        <TapButton
          type="button"
          onClick={() => void handleUsarCancion()}
          disabled={importando}
          className={`mt-3 shrink-0 px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS}`}
        >
          {importando ? "Importando…" : "Usar esta canción"}
        </TapButton>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form
        className="mb-3 flex shrink-0 items-center gap-2"
        onSubmit={(event) => void handleSearch(event)}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar en Acordes de Canciones…"
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && <BuscadorInternetPendingSkeleton />}

        {!loading && !busquedaRealizada && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Music className="size-10 text-text-faint" aria-hidden="true" />
            <p className="text-sm text-text-muted">
              Buscá la canción en Acordes de Canciones
            </p>
          </div>
        )}

        {!loading && busquedaRealizada && resultados.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Music className="size-10 text-text-faint" aria-hidden="true" />
            <p className="text-sm text-text-muted">
              No encontramos resultados en Acordes de Canciones
            </p>
          </div>
        )}

        {!loading && resultados.length > 0 && (
          <ul className="flex flex-col gap-2">
            {resultados.map((resultado) => (
              <li key={resultado.url}>
                <ResultadoItem
                  resultado={resultado}
                  onSelect={handleSelectResultado}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
