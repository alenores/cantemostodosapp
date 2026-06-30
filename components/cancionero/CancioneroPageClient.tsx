"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import CancioneroItemCard from "@/components/cancionero/CancioneroItemCard";
import CancioneroListSkeleton, {
  CASCADE_MAX_DELAY_MS,
  CASCADE_STAGGER_MS,
} from "@/components/cancionero/CancioneroListSkeleton";
import CancioneroSubpageShell from "@/components/cancionero/CancioneroSubpageShell";
import CancioneroVerModal from "@/components/cancionero/CancioneroVerModal";
import AddButton from "@/components/ui/AddButton";
import CancioneroFormModal from "@/components/ui/CancioneroFormModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  deleteCancionCancionero,
  filterCancionesCancionero,
} from "@/lib/cancionero";
import {
  agregarAMisCanciones,
  getMisCanciones,
} from "@/lib/mis-canciones";
import { CANCIONERO_SYNC_EVENT } from "@/lib/offline/cancionero-events";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import { syncCancioneroLocal } from "@/lib/offline/cancionero-sync";
import { createClient } from "@/lib/supabase/client";
import type { CancionCancionero } from "@/types";
import { Music, Search, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const inputClassName =
  "min-h-11 w-full rounded-[10px] border border-border bg-[#323232] pl-11 pr-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent";

const SNACKBAR_MS = 3000;

export type CancioneroPageClientProps = {
  usuarioId: string | null;
  modoSeleccionMisCanciones?: boolean;
};

export default function CancioneroPageClient({
  usuarioId,
  modoSeleccionMisCanciones = false,
}: CancioneroPageClientProps) {
  const navigateWithProgress = useNavigateWithProgress();
  const online = useOnlineStatus();
  const supabase = useMemo(() => createClient(), []);
  const usuarioLogueado = usuarioId !== null;
  const [canciones, setCanciones] = useState<CancionCancionero[]>([]);
  const [localReady, setLocalReady] = useState(false);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [cancionEditando, setCancionEditando] = useState<CancionCancionero | null>(
    null,
  );
  const [cancionViendo, setCancionViendo] = useState<CancionCancionero | null>(
    null,
  );
  const [cancionAEliminar, setCancionAEliminar] = useState<CancionCancionero | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [cascadeActive, setCascadeActive] = useState(false);
  const [misCancionesIds, setMisCancionesIds] = useState<Set<number>>(new Set());
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const hadLoadedRef = useRef(false);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancionesFiltradas = useMemo(
    () => filterCancionesCancionero(canciones, query),
    [canciones, query],
  );

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

  const loadMisCancionesRefs = useCallback(async () => {
    if (!usuarioLogueado) {
      setMisCancionesIds(new Set());
      return;
    }

    try {
      const items = await getMisCanciones(supabase);
      setMisCancionesIds(
        new Set(
          items
            .map((item) => item.cancion_guardada_id)
            .filter((id): id is number => id !== null),
        ),
      );
    } catch {
      setMisCancionesIds(new Set());
    }
  }, [supabase, usuarioLogueado]);

  const loadLocalCanciones = useCallback(async () => {
    const data = await getCancioneroLocalAsCancionero();

    if (!hadLoadedRef.current && data.length > 0) {
      hadLoadedRef.current = true;
      setCascadeActive(true);
    }

    setCanciones(data);
    setLocalReady(true);
  }, []);

  useEffect(() => {
    void loadLocalCanciones();
    void loadMisCancionesRefs();

    function handleSyncFinished() {
      void loadLocalCanciones();
    }

    window.addEventListener(CANCIONERO_SYNC_EVENT, handleSyncFinished);

    return () => {
      window.removeEventListener(CANCIONERO_SYNC_EVENT, handleSyncFinished);
    };
  }, [loadLocalCanciones, loadMisCancionesRefs]);

  useEffect(() => {
    if (!cascadeActive || canciones.length === 0) {
      return;
    }

    const maxDelay = Math.min(
      canciones.length * CASCADE_STAGGER_MS,
      CASCADE_MAX_DELAY_MS,
    );

    const timer = window.setTimeout(() => {
      setCascadeActive(false);
    }, maxDelay + 520);

    return () => {
      window.clearTimeout(timer);
    };
  }, [cascadeActive, canciones.length]);

  const reloadCanciones = useCallback(async () => {
    if (!online) {
      await loadLocalCanciones();
      return;
    }

    await syncCancioneroLocal(supabase);
    await loadLocalCanciones();
  }, [loadLocalCanciones, online, supabase]);

  const sumarAMisCanciones = useCallback(
    async (cancion: CancionCancionero) => {
      if (!usuarioLogueado || !online) {
        showSnackbar("Iniciá sesión para guardar en Mis canciones");
        return;
      }

      if (misCancionesIds.has(cancion.id)) {
        showSnackbar("Ya está en Mis canciones");
        return;
      }

      setActionError(null);

      try {
        await agregarAMisCanciones(supabase, {
          nombre: cancion.nombre,
          artista: cancion.artista,
          cancion_guardada_id: cancion.id,
        });
        setMisCancionesIds((prev) => new Set(prev).add(cancion.id));
        showSnackbar("Sumada a Mis canciones");

        if (modoSeleccionMisCanciones) {
          navigateWithProgress("/cancionero/mis-canciones");
        }
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "No se pudo sumar a Mis canciones",
        );
      }
    },
    [
      misCancionesIds,
      modoSeleccionMisCanciones,
      navigateWithProgress,
      online,
      showSnackbar,
      supabase,
      usuarioLogueado,
    ],
  );

  function handleNuevaCancion() {
    if (!online || !usuarioLogueado) {
      return;
    }

    setCancionEditando(null);
    setFormOpen(true);
  }

  function handleEditar(cancion: CancionCancionero) {
    if (!online || !usuarioLogueado) {
      return;
    }

    setCancionEditando(cancion);
    setFormOpen(true);
  }

  function handleVer(cancion: CancionCancionero) {
    if (modoSeleccionMisCanciones) {
      void sumarAMisCanciones(cancion);
      return;
    }

    setCancionViendo(cancion);
  }

  const cancionViendoIndex = useMemo(() => {
    if (!cancionViendo) {
      return -1;
    }

    return cancionesFiltradas.findIndex(
      (cancion) => cancion.id === cancionViendo.id,
    );
  }, [cancionViendo, cancionesFiltradas]);

  function handleNavigateCancion(direction: -1 | 1) {
    if (cancionViendoIndex === -1) {
      return;
    }

    const nextIndex = cancionViendoIndex + direction;

    if (nextIndex < 0 || nextIndex >= cancionesFiltradas.length) {
      return;
    }

    setCancionViendo(cancionesFiltradas[nextIndex]!);
  }

  function handleEliminar(cancion: CancionCancionero) {
    if (!online || !usuarioLogueado) {
      return;
    }

    setCancionAEliminar(cancion);
  }

  async function handleConfirmEliminar() {
    if (!cancionAEliminar || actionLoading || !online) {
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      await deleteCancionCancionero(supabase, cancionAEliminar.id);
      await reloadCanciones();
      setCancionAEliminar(null);

      if (cancionViendo?.id === cancionAEliminar.id) {
        setCancionViendo(null);
      }
    } catch (confirmError) {
      setActionError(
        confirmError instanceof Error
          ? confirmError.message
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
    setActionError(null);
  }

  function cancelarModoSeleccion() {
    navigateWithProgress("/cancionero/mis-canciones");
  }

  useHardwareBack(cancionViendo !== null && !formOpen, () => {
    setCancionViendo(null);
  });

  useHardwareBack(
    cancionAEliminar !== null && !formOpen && cancionViendo === null,
    () => {
      handleCancelEliminar();
    },
  );

  const mutationsEnabled = online && usuarioLogueado;
  const mostrarSumarMisCanciones = usuarioLogueado && online;

  return (
    <>
      <AppReadyMarker />
      <CancioneroSubpageShell
        title="Cancionero"
        modalOpen={cancionViendo !== null || formOpen}
        headerAction={
          usuarioLogueado ? (
            <AddButton
              ariaLabel="Agregar canción"
              onClick={handleNuevaCancion}
              disabled={!online}
              className={!online ? "opacity-40" : ""}
            />
          ) : null
        }
      >
        {modoSeleccionMisCanciones && (
          <div
            className="flex items-start gap-2 rounded-[10px] border border-accent/40 bg-accent-dim px-3 py-2.5 text-sm text-text-primary"
            role="status"
          >
            <p className="min-w-0 flex-1">
              Seleccionar canción y sumar a &quot;Mis canciones&quot;
            </p>
            <TapButton
              aria-label="Cancelar selección"
              onClick={cancelarModoSeleccion}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              <X className="size-4 text-text-primary" aria-hidden="true" />
            </TapButton>
          </div>
        )}

        {!online && (
          <p
            className="flex items-center gap-2 rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-muted"
            role="status"
          >
            <WifiOff className="size-4 shrink-0" aria-hidden="true" />
            Sin conexión · mostrando copia local (solo lectura)
          </p>
        )}

        {!localReady ? (
          <CancioneroListSkeleton includeSearch cardCount={6} />
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

            {actionError && (
              <p className="text-sm text-accent" role="alert">
                {actionError}
              </p>
            )}

            {canciones.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
                <Music className="size-10 text-text-faint" aria-hidden="true" />
                <p className="max-w-xs text-sm text-text-muted">
                  {online
                    ? usuarioLogueado
                      ? "Aún no hay canciones. Tocá + para agregar la primera."
                      : "Aún no hay canciones en el cancionero."
                    : "No hay copia local todavía. Conectate a internet para sincronizar."}
                </p>
              </div>
            ) : cancionesFiltradas.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">
                No hay canciones que coincidan con tu búsqueda.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {cancionesFiltradas.map((cancion, index) => (
                  <div
                    key={cancion.id}
                    className={
                      cascadeActive ? "cancionero-item-cascade" : undefined
                    }
                    style={
                      cascadeActive
                        ? {
                            animationDelay: `${Math.min(
                              index * CASCADE_STAGGER_MS,
                              CASCADE_MAX_DELAY_MS,
                            )}ms`,
                          }
                        : undefined
                    }
                  >
                    <CancioneroItemCard
                      cancion={cancion}
                      mutationsEnabled={mutationsEnabled}
                      mostrarSumarMisCanciones={mostrarSumarMisCanciones}
                      modoSeleccion={modoSeleccionMisCanciones}
                      actionsOpen={activeCardId === cancion.id}
                      onOpenActions={() => setActiveCardId(cancion.id)}
                      onCloseActions={() => setActiveCardId(null)}
                      onVer={handleVer}
                      onSumarAMisCanciones={(item) =>
                        void sumarAMisCanciones(item)
                      }
                      onEditar={handleEditar}
                      onEliminar={handleEliminar}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CancioneroSubpageShell>

      <CancioneroFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setCancionEditando(null);
        }}
        onSaved={() => void reloadCanciones()}
        cancion={cancionEditando}
        cancionesExistentes={canciones}
      />

      <CancioneroVerModal
        open={cancionViendo !== null}
        cancion={cancionViendo}
        cancionAnterior={
          cancionViendoIndex > 0
            ? cancionesFiltradas[cancionViendoIndex - 1]!
            : null
        }
        cancionSiguiente={
          cancionViendoIndex >= 0 &&
          cancionViendoIndex < cancionesFiltradas.length - 1
            ? cancionesFiltradas[cancionViendoIndex + 1]!
            : null
        }
        onClose={() => setCancionViendo(null)}
        onAnterior={() => handleNavigateCancion(-1)}
        onSiguiente={() => handleNavigateCancion(1)}
        tieneAnterior={cancionViendoIndex > 0}
        tieneSiguiente={
          cancionViendoIndex >= 0 &&
          cancionViendoIndex < cancionesFiltradas.length - 1
        }
      />

      <ConfirmDialog
        open={cancionAEliminar !== null}
        message="¿Eliminar esta canción del cancionero?"
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
