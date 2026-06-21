"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import CancioneroItemCard from "@/components/cancionero/CancioneroItemCard";
import CancioneroListSkeleton, {
  CASCADE_MAX_DELAY_MS,
  CASCADE_STAGGER_MS,
} from "@/components/cancionero/CancioneroListSkeleton";
import CancioneroVerModal from "@/components/cancionero/CancioneroVerModal";
import AddButton from "@/components/ui/AddButton";
import CancioneroFormModal from "@/components/ui/CancioneroFormModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TapButton, TapLink } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  deleteCancionCancionero,
  filterCancionesCancionero,
} from "@/lib/cancionero";
import { CANCIONERO_SYNC_EVENT } from "@/lib/offline/cancionero-events";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import { syncCancioneroLocal } from "@/lib/offline/cancionero-sync";
import { createClient } from "@/lib/supabase/client";
import type { CancionCancionero } from "@/types";
import { ArrowLeft, Music, Search, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const inputClassName =
  "min-h-11 w-full rounded-[10px] border border-border bg-[#323232] pl-11 pr-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent";

export type CancioneroPageClientProps = {
  embedded?: boolean;
  onClose?: () => void;
};

export default function CancioneroPageClient({
  embedded = false,
  onClose,
}: CancioneroPageClientProps = {}) {
  const online = useOnlineStatus();
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
  const hadLoadedRef = useRef(false);

  const cancionesFiltradas = useMemo(
    () => filterCancionesCancionero(canciones, query),
    [canciones, query],
  );

  const loadLocalCanciones = useCallback(async () => {
    const data = await getCancioneroLocalAsCancionero();
    setCanciones(data);
    setLocalReady(true);
  }, []);

  useEffect(() => {
    void loadLocalCanciones();

    function handleSyncFinished() {
      void loadLocalCanciones();
    }

    window.addEventListener(CANCIONERO_SYNC_EVENT, handleSyncFinished);

    return () => {
      window.removeEventListener(CANCIONERO_SYNC_EVENT, handleSyncFinished);
    };
  }, [loadLocalCanciones]);

  useEffect(() => {
    if (!localReady || canciones.length === 0) {
      return;
    }

    if (hadLoadedRef.current) {
      return;
    }

    hadLoadedRef.current = true;
    setCascadeActive(true);

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
  }, [canciones.length, localReady]);

  const reloadCanciones = useCallback(async () => {
    if (!online) {
      await loadLocalCanciones();
      return;
    }

    const supabase = createClient();
    await syncCancioneroLocal(supabase);
    await loadLocalCanciones();
  }, [loadLocalCanciones, online]);

  function handleNuevaCancion() {
    if (!online) {
      return;
    }

    setCancionEditando(null);
    setFormOpen(true);
  }

  function handleEditar(cancion: CancionCancionero) {
    if (!online) {
      return;
    }

    setCancionEditando(cancion);
    setFormOpen(true);
  }

  function handleVer(cancion: CancionCancionero) {
    setCancionViendo(cancion);
  }

  function handleEliminar(cancion: CancionCancionero) {
    if (!online) {
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

    const supabase = createClient();

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

  useHardwareBack(cancionViendo !== null && !formOpen, () => {
    setCancionViendo(null);
  });

  useHardwareBack(
    cancionAEliminar !== null && !formOpen && cancionViendo === null,
    () => {
      handleCancelEliminar();
    },
  );

  return (
    <div
      className={`relative flex flex-col bg-bg-app ${
        embedded
          ? "min-h-0 h-full flex-1 overflow-hidden"
          : "min-h-full flex-1"
      }`}
    >
      <AppReadyMarker />
      <header className="border-b border-border bg-bg-darker px-4 py-3">
        <div className="flex items-center gap-3">
          {embedded ? (
            <TapButton
              aria-label="Volver a salas"
              onClick={onClose}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
            </TapButton>
          ) : (
            <TapLink
              href="/salas"
              ariaLabel="Volver a salas"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
            </TapLink>
          )}
          <h1 className="min-w-0 flex-1 text-lg font-extrabold text-text-primary">
            Canciones guardadas
          </h1>
          <AddButton
            ariaLabel="Agregar canción"
            onClick={handleNuevaCancion}
            disabled={!online}
            className={!online ? "opacity-40" : ""}
          />
        </div>
      </header>

      <main
        className={`flex flex-1 flex-col gap-3 px-4 py-4 pb-8 ${
          embedded ? "min-h-0 overflow-y-auto overscroll-y-contain" : ""
        }`}
      >
        {!online && (
          <p
            className="flex items-center gap-2 rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-muted"
            role="status"
          >
            <WifiOff className="size-4 shrink-0" aria-hidden="true" />
            Sin conexión · mostrando copia local (solo lectura)
          </p>
        )}

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
            disabled={!localReady}
            className={`${inputClassName} ${!localReady ? "opacity-70" : ""}`}
          />
        </div>

        {actionError && (
          <p className="text-sm text-accent" role="alert">
            {actionError}
          </p>
        )}

        {!localReady ? (
          <CancioneroListSkeleton includeSearch={false} />
        ) : canciones.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <Music className="size-10 text-text-faint" aria-hidden="true" />
            <p className="max-w-xs text-sm text-text-muted">
              {online
                ? "Aún no hay canciones guardadas. Tocá + para agregar la primera."
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
                className={cascadeActive ? "cancionero-item-cascade" : undefined}
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
                  mutationsEnabled={online}
                  actionsOpen={activeCardId === cancion.id}
                  onOpenActions={() => setActiveCardId(cancion.id)}
                  onCloseActions={() => setActiveCardId(null)}
                  onVer={handleVer}
                  onEditar={handleEditar}
                  onEliminar={handleEliminar}
                />
              </div>
            ))}
          </div>
        )}
      </main>

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
        onClose={() => setCancionViendo(null)}
      />

      <ConfirmDialog
        open={cancionAEliminar !== null}
        message="¿Eliminar esta canción del cancionero?"
        confirmLabel={actionLoading ? "Eliminando..." : "Eliminar"}
        deleteConfirm
        onConfirm={() => void handleConfirmEliminar()}
        onCancel={handleCancelEliminar}
      />
    </div>
  );
}
