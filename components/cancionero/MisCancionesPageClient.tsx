"use client";

import CancioneroListSkeleton from "@/components/cancionero/CancioneroListSkeleton";
import CancioneroSubpageShell from "@/components/cancionero/CancioneroSubpageShell";
import CancioneroVerModal from "@/components/cancionero/CancioneroVerModal";
import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import UrlLetraModal from "@/components/salas/UrlLetraModal";
import AddButton from "@/components/ui/AddButton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TapButton } from "@/components/ui/TapFeedback";
import { useColaIndividual } from "@/hooks/useColaIndividual";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import type { ResultadoIconoTipo } from "@/lib/buscador";
import { triggerHaptic } from "@/lib/haptic";
import {
  eliminarDeMisCanciones,
  getMisCanciones,
  usuarioCancionToCancionInput,
} from "@/lib/mis-canciones";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import { createClient } from "@/lib/supabase/client";
import type { CancionCancionero, UsuarioCancion } from "@/types";
import { ListPlus, Music, Search, Trash2 } from "lucide-react";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";

const inputClassName =
  "min-h-11 w-full rounded-[10px] border border-border bg-[#323232] pl-11 pr-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent";

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_CANCEL_PX = 10;
const SNACKBAR_MS = 3000;

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
  tieneCifradoAvanzado: boolean;
  actionsOpen: boolean;
  colaDeshabilitada: boolean;
  onOpenActions: () => void;
  onCloseActions: () => void;
  onVer: (cancion: UsuarioCancion) => void;
  onAgregarACola: (cancion: UsuarioCancion) => void;
  onEliminar: (cancion: UsuarioCancion) => void;
};

function MiCancionItem({
  cancion,
  tieneCifradoAvanzado,
  actionsOpen,
  colaDeshabilitada,
  onOpenActions,
  onCloseActions,
  onVer,
  onAgregarACola,
  onEliminar,
}: MiCancionItemProps) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

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

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      openActions();
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const start = pointerStartRef.current;

    if (!start || !longPressTimerRef.current) {
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (
      Math.abs(dx) >= LONG_PRESS_MOVE_CANCEL_PX ||
      Math.abs(dy) >= LONG_PRESS_MOVE_CANCEL_PX
    ) {
      pointerStartRef.current = null;
      clearLongPressTimer();
    }
  }

  function handlePointerEnd() {
    pointerStartRef.current = null;
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
      className={`relative cursor-pointer touch-pan-y rounded-[12px] border bg-bg-card px-3 py-3 select-none ${
        actionsOpen
          ? "z-30 border-accent/60 ring-1 ring-accent/30"
          : "border-border-card"
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        <LetraFuenteIcon
          tipo={getIconoTipo(cancion)}
          premium={tieneCifradoAvanzado}
        />
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
        <TapButton
          aria-label={`Agregar ${cancion.nombre} a la cola`}
          disabled={colaDeshabilitada}
          onClick={(event) => {
            event.stopPropagation();
            onAgregarACola(cancion);
          }}
          className={`flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-dark ${
            colaDeshabilitada ? "pointer-events-none opacity-40" : ""
          }`}
        >
          <ListPlus className="size-5 text-accent" aria-hidden="true" />
        </TapButton>
      </div>

      {actionsOpen && (
        <>
          <button
            type="button"
            aria-label="Cerrar acciones"
            data-no-tap-feedback
            className="fixed inset-0 z-40 cursor-default border-0 bg-transparent outline-none"
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

export default function MisCancionesPageClient() {
  const navigateWithProgress = useNavigateWithProgress();
  const supabase = useMemo(() => createClient(), []);
  const cola = useColaIndividual();
  const [canciones, setCanciones] = useState<UsuarioCancion[]>([]);
  const [cifradoAvanzadoIds, setCifradoAvanzadoIds] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [cancionViendo, setCancionViendo] = useState<CancionCancionero | null>(
    null,
  );
  const [carouselGlobalIds, setCarouselGlobalIds] = useState<number[]>([]);
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
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancionesFiltradas = useMemo(
    () => filterMisCanciones(canciones, query),
    [canciones, query],
  );

  const carouselEntries = useMemo(() => {
    const globalRefs = cancionesFiltradas.filter(
      (item) => item.cancion_guardada_id !== null,
    );

    return globalRefs
      .map((item) => item.cancion_guardada_id)
      .filter((id): id is number => id !== null);
  }, [cancionesFiltradas]);

  const showSnackbar = useCallback((message: string) => {
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }

    setSnackbar(message);
    snackbarTimerRef.current = setTimeout(() => {
      setSnackbar(null);
      snackbarTimerRef.current = null;
    }, SNACKBAR_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
    };
  }, []);

  const loadCanciones = useCallback(async () => {
    setLoading(true);
    setActionError(null);

    try {
      const data = await getMisCanciones(supabase);
      setCanciones(data);

      const globalIds = data
        .map((item) => item.cancion_guardada_id)
        .filter((id): id is number => id !== null);

      if (globalIds.length === 0) {
        setCifradoAvanzadoIds(new Set());
      } else {
        const avanzadoIds = new Set<number>();
        const { data: remoteRows, error: remoteError } = await supabase
          .from("canciones_guardadas")
          .select("id, tiene_cifrado_avanzado")
          .in("id", globalIds);

        if (!remoteError && remoteRows) {
          for (const row of remoteRows) {
            if (row.tiene_cifrado_avanzado) {
              avanzadoIds.add(row.id);
            }
          }
        } else {
          const local = await getCancioneroLocalAsCancionero();

          for (const id of globalIds) {
            const found = local.find((item) => item.id === id);

            if (found?.tiene_cifrado_avanzado) {
              avanzadoIds.add(id);
            }
          }
        }

        setCifradoAvanzadoIds(avanzadoIds);
      }
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

  const resolveGlobalCancion = useCallback(
    async (cancionGuardadaId: number): Promise<CancionCancionero | null> => {
      const { data, error } = await supabase
        .from("canciones_guardadas")
        .select("id, nombre, artista, letra")
        .eq("id", cancionGuardadaId)
        .maybeSingle();

      if (data) {
        return data as CancionCancionero;
      }

      const local = await getCancioneroLocalAsCancionero();
      const cached = local.find((item) => item.id === cancionGuardadaId);

      if (cached) {
        return cached;
      }

      if (error) {
        setViewError(error.message);
      }

      return null;
    },
    [supabase],
  );

  const handleVer = useCallback(
    async (cancion: UsuarioCancion) => {
      setViewError(null);

      if (cancion.cancion_guardada_id !== null) {
        const data = await resolveGlobalCancion(cancion.cancion_guardada_id);

        if (!data) {
          setViewError(
            "No se pudo cargar la letra. Verificá que la canción esté en el cancionero y sincronizada.",
          );
          return;
        }

        setCarouselGlobalIds(carouselEntries);
        setCancionViendo(data);
        return;
      }

      if (cancion.url_letra) {
        setUrlViendo({ url: cancion.url_letra, titulo: cancion.nombre });
        return;
      }

      setViewError("Esta canción no tiene letra disponible");
    },
    [carouselEntries, resolveGlobalCancion],
  );

  const cancionViendoIndex = useMemo(() => {
    if (!cancionViendo) {
      return -1;
    }

    return carouselGlobalIds.findIndex((id) => id === cancionViendo.id);
  }, [cancionViendo, carouselGlobalIds]);

  const handleNavigateCancion = useCallback(
    async (direction: -1 | 1) => {
      if (cancionViendoIndex === -1) {
        return;
      }

      const nextIndex = cancionViendoIndex + direction;

      if (nextIndex < 0 || nextIndex >= carouselGlobalIds.length) {
        return;
      }

      const nextId = carouselGlobalIds[nextIndex]!;
      const data = await resolveGlobalCancion(nextId);

      if (data) {
        setCancionViendo(data);
      }
    },
    [cancionViendoIndex, carouselGlobalIds, resolveGlobalCancion],
  );

  const handleAgregarACola = useCallback(
    async (cancion: UsuarioCancion) => {
      if (!cola.hasActivaOPendiente) {
        showSnackbar("Agregá una canción activa en Home primero");
        return;
      }

      let letraTexto: string | null = null;

      if (cancion.cancion_guardada_id !== null) {
        const global = await resolveGlobalCancion(cancion.cancion_guardada_id);
        letraTexto = global?.letra ?? null;
      }

      try {
        await cola.agregarALista(
          usuarioCancionToCancionInput(cancion, letraTexto),
        );
        showSnackbar("Agregada a la cola");
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "No se pudo agregar a la cola",
        );
      }
    },
    [cola, resolveGlobalCancion, showSnackbar],
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
    <>
      <CancioneroSubpageShell
        title="Favoritas"
        modalOpen={cancionViendo !== null || urlViendo !== null}
        headerAction={
          <AddButton
            ariaLabel="Agregar canción desde el cancionero"
            onClick={() =>
              navigateWithProgress("/cancionero/global?seleccionar=1")
            }
          />
        }
      >
        {loading ? (
          <CancioneroListSkeleton includeSearch cardCount={5} />
        ) : (
          <>
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
              />
            </div>

            {(actionError || viewError) && (
              <p className="text-sm text-accent" role="alert">
                {actionError ?? viewError}
              </p>
            )}

            {canciones.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
                <Music className="size-10 text-text-faint" aria-hidden="true" />
                <p className="max-w-xs text-sm text-text-muted">
                  Todavía no guardaste ninguna canción. Tocá + para elegir una del
                  cancionero global.
                </p>
              </div>
            ) : cancionesFiltradas.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">
                No hay canciones que coincidan con tu búsqueda.
              </p>
            ) : (
              <div className="app-list-grid">
                {cancionesFiltradas.map((cancion) => (
                  <MiCancionItem
                    key={cancion.id}
                    cancion={cancion}
                    tieneCifradoAvanzado={
                      cancion.cancion_guardada_id !== null &&
                      cifradoAvanzadoIds.has(cancion.cancion_guardada_id)
                    }
                    colaDeshabilitada={!cola.hasActivaOPendiente}
                    actionsOpen={activeCardId === cancion.id}
                    onOpenActions={() => setActiveCardId(cancion.id)}
                    onCloseActions={() => setActiveCardId(null)}
                    onVer={(item) => void handleVer(item)}
                    onAgregarACola={(item) => void handleAgregarACola(item)}
                    onEliminar={handleEliminar}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CancioneroSubpageShell>

      <CancioneroVerModal
        open={cancionViendo !== null}
        cancion={cancionViendo}
        onClose={() => setCancionViendo(null)}
        onAnterior={() => void handleNavigateCancion(-1)}
        onSiguiente={() => void handleNavigateCancion(1)}
        tieneAnterior={cancionViendoIndex > 0}
        tieneSiguiente={
          cancionViendoIndex >= 0 &&
          cancionViendoIndex < carouselGlobalIds.length - 1
        }
      />

      <UrlLetraModal
        open={urlViendo !== null}
        url={urlViendo?.url ?? null}
        titulo={urlViendo?.titulo ?? ""}
        onClose={() => setUrlViendo(null)}
      />

      <ConfirmDialog
        open={cancionAEliminar !== null}
        message="¿Eliminar esta canción de Favoritas?"
        confirmLabel={actionLoading ? "Eliminando..." : "Eliminar"}
        deleteConfirm
        onConfirm={() => void handleConfirmEliminar()}
        onCancel={handleCancelEliminar}
      />

      {snackbar && (
        <div
          className="fixed bottom-20 left-4 right-4 z-[400] mx-auto max-w-md rounded-[12px] border border-border bg-bg-dark px-4 py-3 text-center text-sm font-medium text-text-primary shadow-lg"
          role="status"
          aria-live="polite"
        >
          {snackbar}
        </div>
      )}
    </>
  );
}
