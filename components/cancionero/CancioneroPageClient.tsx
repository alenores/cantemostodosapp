"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import CancioneroItemCard from "@/components/cancionero/CancioneroItemCard";
import CancioneroListSkeleton, {
  CASCADE_MAX_DELAY_MS,
  CASCADE_STAGGER_MS,
} from "@/components/cancionero/CancioneroListSkeleton";
import CancioneroSubpageShell from "@/components/cancionero/CancioneroSubpageShell";
import CancioneroVerModal from "@/components/cancionero/CancioneroVerModal";
import CifradoViewerModal from "@/components/cifrado/CifradoViewerModal";
import AddButton from "@/components/ui/AddButton";
import CancioneroFormModal from "@/components/ui/CancioneroFormModal";
import CifradoEditor from "@/components/ui/CifradoEditor";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  deleteCancionCancionero,
  fetchCancionCifradoDetalle,
  filterCancionesCancionero,
} from "@/lib/cancionero";
import {
  agregarAMisCanciones,
  getMisCanciones,
} from "@/lib/mis-canciones";
import {
  CANCIONERO_SYNC_EVENT,
  dispatchCancioneroSyncFinished,
} from "@/lib/offline/cancionero-events";
import {
  getCancioneroLocalAsCancionero,
  patchCancioneroLocalRecord,
} from "@/lib/offline/cancionero-store";
import { syncCancioneroLocal } from "@/lib/offline/cancionero-sync";
import { buildCifradoEditorSession } from "@/lib/cifrado-editor-session";
import type {
  CifradoEditorSession,
  CifradoSaveResult,
} from "@/lib/cifrado-editor-session";
import { createClient } from "@/lib/supabase/client";
import type { CancionCancionero, CancionCifradoDetalle } from "@/types";
import type { CancioneroFormData } from "@/lib/cancionero";
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
  const [cifradoDetalle, setCifradoDetalle] =
    useState<CancionCifradoDetalle | null>(null);
  const [cifradoLoading, setCifradoLoading] = useState(false);
  const [cifradoViewerOpen, setCifradoViewerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSession, setEditorSession] = useState<CifradoEditorSession | null>(
    null,
  );
  const [editorLoading, setEditorLoading] = useState(false);
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

    await syncCancioneroLocal(supabase, { force: true });
    await loadLocalCanciones();
    dispatchCancioneroSyncFinished();
  }, [loadLocalCanciones, online, supabase]);

  const sumarAMisCanciones = useCallback(
    async (cancion: CancionCancionero) => {
      if (!usuarioLogueado || !online) {
        showSnackbar("Iniciá sesión para guardar en Favoritas");
        return;
      }

      if (misCancionesIds.has(cancion.id)) {
        showSnackbar("Ya está en Favoritas");
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
        showSnackbar("Sumada a Favoritas");

        if (modoSeleccionMisCanciones) {
          navigateWithProgress("/canciones/favoritas");
        }
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "No se pudo sumar a Favoritas",
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

  async function handleAdicionAvanzada(form: CancioneroFormData) {
    if (!online || !usuarioLogueado || editorLoading) {
      return;
    }

    setEditorLoading(true);
    setActionError(null);

    try {
      const esAvanzada = Boolean(cancionEditando?.tiene_cifrado_avanzado);
      let detalle: CancionCifradoDetalle | null = null;

      if (esAvanzada && cancionEditando) {
        detalle = await fetchCancionCifradoDetalle(supabase, cancionEditando.id);

        if (!detalle) {
          throw new Error("No se pudo cargar el cifrado guardado de esta canción.");
        }
      }

      const session = buildCifradoEditorSession({
        cancionId: cancionEditando?.id,
        nombre: form.nombre,
        artista: form.artista,
        letra: form.letra,
        esAvanzada,
        detalle,
      });

      setFormOpen(false);
      setCancionEditando(null);
      setEditorSession(session);
      setEditorOpen(true);
    } catch (adicionError) {
      setActionError(
        adicionError instanceof Error
          ? adicionError.message
          : "No se pudo abrir el editor avanzado",
      );
    } finally {
      setEditorLoading(false);
    }
  }

  function handleEditorClose() {
    setEditorOpen(false);
    setEditorSession(null);
  }

  async function refreshCifradoDetalle(cancionId: number) {
    try {
      const detalle = await fetchCancionCifradoDetalle(supabase, cancionId);
      setCifradoDetalle(detalle);
    } catch {
      setCifradoDetalle(null);
    }
  }

  async function handleEditorSaved(result?: CifradoSaveResult) {
    if (result) {
      await patchCancioneroLocalRecord(result.id, {
        nombre: result.nombre,
        artista: result.artista,
        letra: result.letra,
        tiene_cifrado_avanzado: result.tiene_cifrado_avanzado,
      });

      setCanciones((prev) =>
        prev.map((cancion) =>
          cancion.id === result.id
            ? {
                ...cancion,
                nombre: result.nombre,
                artista: result.artista,
                letra: result.letra,
                tiene_cifrado_avanzado: result.tiene_cifrado_avanzado,
              }
            : cancion,
        ),
      );

      if (cancionViendo?.id === result.id) {
        setCancionViendo((prev) =>
          prev
            ? {
                ...prev,
                nombre: result.nombre,
                artista: result.artista,
                letra: result.letra,
                tiene_cifrado_avanzado: result.tiene_cifrado_avanzado,
              }
            : prev,
        );
        await refreshCifradoDetalle(result.id);
      } else if (cifradoDetalle?.id === result.id) {
        await refreshCifradoDetalle(result.id);
      }
    }

    await reloadCanciones();
    handleEditorClose();
  }

  function handleVer(cancion: CancionCancionero) {
    if (modoSeleccionMisCanciones) {
      void sumarAMisCanciones(cancion);
      return;
    }

    setCifradoDetalle(null);
    setCancionViendo(cancion);

    if (cancion.tiene_cifrado_avanzado && online) {
      void refreshCifradoDetalle(cancion.id);
    }
  }

  useEffect(() => {
    if (!cancionViendo?.tiene_cifrado_avanzado || !online) {
      setCifradoDetalle(null);
      setCifradoLoading(false);
      return;
    }

    let cancelled = false;
    setCifradoLoading(true);

    void fetchCancionCifradoDetalle(supabase, cancionViendo.id)
      .then((detalle) => {
        if (!cancelled) {
          setCifradoDetalle(detalle);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCifradoDetalle(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCifradoLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cancionViendo?.id, cancionViendo?.tiene_cifrado_avanzado, online, supabase]);

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
    navigateWithProgress("/canciones/favoritas");
  }

  useHardwareBack(cifradoViewerOpen, () => {
    setCifradoViewerOpen(false);
  });

  useHardwareBack(cancionViendo !== null && !formOpen && !cifradoViewerOpen, () => {
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
        modalOpen={cancionViendo !== null || formOpen || cifradoViewerOpen}
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
              Seleccionar canción y sumar a &quot;Favoritas&quot;
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
              <div className="app-list-grid">
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
        onAdicionAvanzada={(form) => void handleAdicionAvanzada(form)}
      />

      <CifradoEditor
        open={editorOpen}
        isLoggedIn={usuarioLogueado}
        session={editorSession}
        onClose={handleEditorClose}
        onSaved={(result) => void handleEditorSaved(result)}
      />

      <CancioneroVerModal
        open={cancionViendo !== null && !cifradoViewerOpen}
        cancion={cancionViendo}
        cifradoDetalle={cifradoDetalle}
        cifradoLoading={cifradoLoading}
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
        onClose={() => {
          setCancionViendo(null);
          setCifradoDetalle(null);
        }}
        onAnterior={() => handleNavigateCancion(-1)}
        onSiguiente={() => handleNavigateCancion(1)}
        onExpand={() => setCifradoViewerOpen(true)}
        tieneAnterior={cancionViendoIndex > 0}
        tieneSiguiente={
          cancionViendoIndex >= 0 &&
          cancionViendoIndex < cancionesFiltradas.length - 1
        }
      />

      <CifradoViewerModal
        open={cifradoViewerOpen}
        cancion={cancionViendo}
        cifradoDetalle={cifradoDetalle}
        onClose={() => setCifradoViewerOpen(false)}
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
