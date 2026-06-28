"use client";

import CancioneroVerModal from "@/components/cancionero/CancioneroVerModal";
import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import type { ResultadoIconoTipo } from "@/lib/buscador";
import { triggerHaptic } from "@/lib/haptic";
import {
  eliminarDeMisCanciones,
  getMisCanciones,
} from "@/lib/mis-canciones";
import { createClient } from "@/lib/supabase/client";
import type { CancionCancionero, UsuarioCancion } from "@/types";
import { Music, Search, Trash2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";

const inputClassName =
  "min-h-11 w-full rounded-[10px] border border-border bg-[#323232] pl-11 pr-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent";

const LONG_PRESS_MS = 500;

function filterMisCanciones(
  canciones: UsuarioCancion[],
  query: string,
): UsuarioCancion[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return canciones;
  }

  return canciones.filter((cancion) => {
    const matchesNombre = cancion.nombre.toLowerCase().includes(normalized);
    const matchesArtista = cancion.artista?.toLowerCase().includes(normalized);

    return matchesNombre || Boolean(matchesArtista);
  });
}

function getIconoTipo(cancion: UsuarioCancion): ResultadoIconoTipo {
  if (cancion.cancion_guardada_id !== null) {
    return "cancionero";
  }

  const url = (cancion.url_letra ?? "").toLowerCase();

  if (url.includes("cifraclub")) {
    return "cifra";
  }

  if (url.includes("acordesdcanciones")) {
    return "acordes";
  }

  return "cancionero";
}

type MiCancionItemProps = {
  cancion: UsuarioCancion;
  actionsOpen: boolean;
  onOpenActions: () => void;
  onCloseActions: () => void;
  onVer: (cancion: UsuarioCancion) => void;
  onEliminar: (cancion: UsuarioCancion) => void;
};

function MiCancionItem({
  cancion,
  actionsOpen,
  onOpenActions,
  onCloseActions,
  onVer,
  onEliminar,
}: MiCancionItemProps) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function openActions() {
    triggerHaptic();
    suppressClickRef.current = true;
    onOpenActions();
  }

  function handlePointerDown() {
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      openActions();
    }, LONG_PRESS_MS);
  }

  function handlePointerEnd() {
    clearLongPressTimer();
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (actionsOpen) {
      onCloseActions();
      return;
    }

    onVer(cancion);
  }

  function handleContextMenu(event: MouseEvent) {
    event.preventDefault();
    openActions();
  }

  return (
    <article
      className={`relative cursor-pointer rounded-[12px] border bg-bg-card px-3 py-3 select-none ${
        actionsOpen
          ? "z-30 border-accent/60 ring-1 ring-accent/30"
          : "border-border-card"
      }`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <LetraFuenteIcon tipo={getIconoTipo(cancion)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold text-text-primary">
            {cancion.nombre}
          </p>
          {cancion.artista ? (
            <p className="mt-0.5 truncate text-[14px] text-text-muted">
              {cancion.artista}
            </p>
          ) : null}
        </div>
      </div>

      {actionsOpen && (
        <>
          <button
            type="button"
            aria-label="Cerrar acciones"
            className="fixed inset-0 z-40"
            onClick={onCloseActions}
          />
          <div className="absolute right-3 top-1/2 z-50 -translate-y-1/2">
            <TapButton
              aria-label={`Eliminar ${cancion.nombre}`}
              onClick={(event) => {
                event.stopPropagation();
                onCloseActions();
                onEliminar(cancion);
              }}
              className="flex size-12 items-center justify-center rounded-full bg-[#d94a3d] text-white shadow-[0_6px_20px_rgba(0,0,0,0.38)]"
            >
              <Trash2 className="size-5" aria-hidden="true" />
            </TapButton>
          </div>
        </>
      )}
    </article>
  );
}

type UrlLetraModalProps = {
  open: boolean;
  url: string | null;
  titulo: string;
  onClose: () => void;
};

function UrlLetraModal({ open, url, titulo, onClose }: UrlLetraModalProps) {
  if (!open || !url) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-bg-app">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-bg-darker px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate text-lg font-extrabold text-text-primary">
          {titulo}
        </h2>
        <TapButton
          aria-label="Cerrar letra"
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
        >
          <X className="size-5 text-text-primary" aria-hidden="true" />
        </TapButton>
      </header>
      <iframe
        src={url}
        title={titulo}
        className="min-h-0 flex-1 border-0 bg-white"
      />
    </div>
  );
}

export default function MisCancionesPageClient() {
  const supabase = useMemo(() => createClient(), []);
  const [canciones, setCanciones] = useState<UsuarioCancion[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [cancionViendo, setCancionViendo] = useState<CancionCancionero | null>(
    null,
  );
  const [urlViendo, setUrlViendo] = useState<{
    url: string;
    titulo: string;
  } | null>(null);
  const [cancionAEliminar, setCancionAEliminar] = useState<UsuarioCancion | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);

  const cancionesFiltradas = useMemo(
    () => filterMisCanciones(canciones, query),
    [canciones, query],
  );

  const loadCanciones = useCallback(async () => {
    setLoading(true);
    setActionError(null);

    try {
      const data = await getMisCanciones(supabase);
      setCanciones(data);
    } catch (error) {
      console.error("[mis-canciones] error al cargar", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar tus canciones",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadCanciones();
  }, [loadCanciones]);

  const handleVer = useCallback(
    async (cancion: UsuarioCancion) => {
      setViewError(null);

      if (cancion.cancion_guardada_id !== null) {
        const { data, error } = await supabase
          .from("canciones_guardadas")
          .select("id, nombre, artista, letra")
          .eq("id", cancion.cancion_guardada_id)
          .maybeSingle();

        if (error || !data) {
          setViewError(
            error?.message ?? "No se pudo cargar la letra de esta canción",
          );
          return;
        }

        setCancionViendo(data as CancionCancionero);
        return;
      }

      if (cancion.url_letra) {
        setUrlViendo({ url: cancion.url_letra, titulo: cancion.nombre });
        return;
      }

      setViewError("Esta canción no tiene letra disponible");
    },
    [supabase],
  );

  function handleEliminar(cancion: UsuarioCancion) {
    setCancionAEliminar(cancion);
  }

  async function handleConfirmEliminar() {
    if (!cancionAEliminar || actionLoading) {
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      await eliminarDeMisCanciones(supabase, cancionAEliminar.id);
      setCanciones((prev) =>
        prev.filter((item) => item.id !== cancionAEliminar.id),
      );
      setCancionAEliminar(null);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la canción",
      );
    } finally {
      setActionLoading(false);
    }
  }

  function handleCancelEliminar() {
    if (actionLoading) {
      return;
    }

    setCancionAEliminar(null);
  }

  useHardwareBack(cancionViendo !== null, () => {
    setCancionViendo(null);
  });

  useHardwareBack(urlViendo !== null && cancionViendo === null, () => {
    setUrlViendo(null);
  });

  useHardwareBack(
    cancionAEliminar !== null && cancionViendo === null && urlViendo === null,
    () => {
      handleCancelEliminar();
    },
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-app">
      <header className="border-b border-border bg-bg-darker px-4 py-3">
        <h1 className="text-lg font-extrabold text-text-primary">
          Mis canciones
        </h1>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 pb-8">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveCardId(null);
            }}
            placeholder="Buscar por nombre o artista..."
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className={inputClassName}
            disabled={loading}
          />
        </div>

        {(actionError || viewError) && (
          <p className="text-sm text-accent" role="alert">
            {actionError ?? viewError}
          </p>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-text-muted">
            Cargando tus canciones...
          </p>
        ) : canciones.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <Music className="size-10 text-text-faint" aria-hidden="true" />
            <p className="max-w-xs text-sm text-text-muted">
              Todavía no guardaste ninguna canción. Buscá una canción y guardala
              aquí.
            </p>
          </div>
        ) : cancionesFiltradas.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            No hay canciones que coincidan con tu búsqueda.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {cancionesFiltradas.map((cancion) => (
              <MiCancionItem
                key={cancion.id}
                cancion={cancion}
                actionsOpen={activeCardId === cancion.id}
                onOpenActions={() => setActiveCardId(cancion.id)}
                onCloseActions={() => setActiveCardId(null)}
                onVer={(item) => void handleVer(item)}
                onEliminar={handleEliminar}
              />
            ))}
          </div>
        )}
      </main>

      <CancioneroVerModal
        open={cancionViendo !== null}
        cancion={cancionViendo}
        onClose={() => setCancionViendo(null)}
        tieneAnterior={false}
        tieneSiguiente={false}
      />

      <UrlLetraModal
        open={urlViendo !== null}
        url={urlViendo?.url ?? null}
        titulo={urlViendo?.titulo ?? ""}
        onClose={() => setUrlViendo(null)}
      />

      <ConfirmDialog
        open={cancionAEliminar !== null}
        message="¿Eliminar esta canción de Mis canciones?"
        confirmLabel={actionLoading ? "Eliminando..." : "Eliminar"}
        deleteConfirm
        onConfirm={() => void handleConfirmEliminar()}
        onCancel={handleCancelEliminar}
      />
    </div>
  );
}
