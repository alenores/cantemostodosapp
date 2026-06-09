"use client";

import CancioneroItemCard from "@/components/cancionero/CancioneroItemCard";
import CancioneroVerModal from "@/components/cancionero/CancioneroVerModal";
import AddButton from "@/components/ui/AddButton";
import CancioneroFormModal from "@/components/ui/CancioneroFormModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TapLink } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import {
  deleteCancionCancionero,
  fetchCancionesCancionero,
  filterCancionesCancionero,
} from "@/lib/cancionero";
import { createClient } from "@/lib/supabase/client";
import type { CancionCancionero } from "@/types";
import { ArrowLeft, Music, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

const inputClassName =
  "min-h-11 w-full rounded-[10px] border border-border bg-[#323232] pl-11 pr-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent";

type CancioneroPageClientProps = {
  cancionesIniciales: CancionCancionero[];
  errorMessage: string | null;
};

export default function CancioneroPageClient({
  cancionesIniciales,
  errorMessage,
}: CancioneroPageClientProps) {
  const [canciones, setCanciones] = useState(cancionesIniciales);
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

  const cancionesFiltradas = useMemo(
    () => filterCancionesCancionero(canciones, query),
    [canciones, query],
  );

  const reloadCanciones = useCallback(async () => {
    const supabase = createClient();
    const data = await fetchCancionesCancionero(supabase);
    setCanciones(data);
  }, []);

  function handleNuevaCancion() {
    setCancionEditando(null);
    setFormOpen(true);
  }

  function handleEditar(cancion: CancionCancionero) {
    setCancionEditando(cancion);
    setFormOpen(true);
  }

  function handleVer(cancion: CancionCancionero) {
    setCancionViendo(cancion);
  }

  function handleEliminar(cancion: CancionCancionero) {
    setCancionAEliminar(cancion);
  }

  async function handleConfirmEliminar() {
    if (!cancionAEliminar || actionLoading) {
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
    <div className="relative flex min-h-full flex-1 flex-col bg-bg-app">
      <header className="border-b border-border bg-bg-darker px-4 py-3">
        <div className="flex items-center gap-3">
          <TapLink
            href="/salas"
            ariaLabel="Volver a salas"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
          >
            <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
          </TapLink>
          <h1 className="min-w-0 flex-1 text-lg font-extrabold text-text-primary">
            Canciones guardadas
          </h1>
          <AddButton
            ariaLabel="Agregar canción"
            onClick={handleNuevaCancion}
          />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4 py-4 pb-8">
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

        {errorMessage ? (
          <p className="text-sm text-accent" role="alert">
            No se pudieron cargar las canciones: {errorMessage}
          </p>
        ) : canciones.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <Music className="size-10 text-text-faint" aria-hidden="true" />
            <p className="max-w-xs text-sm text-text-muted">
              Aún no hay canciones guardadas. Tocá + para agregar la primera.
            </p>
          </div>
        ) : cancionesFiltradas.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            No hay canciones que coincidan con tu búsqueda.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {cancionesFiltradas.map((cancion) => (
              <CancioneroItemCard
                key={cancion.id}
                cancion={cancion}
                actionsOpen={activeCardId === cancion.id}
                onOpenActions={() => setActiveCardId(cancion.id)}
                onCloseActions={() => setActiveCardId(null)}
                onVer={handleVer}
                onEditar={handleEditar}
                onEliminar={handleEliminar}
              />
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
