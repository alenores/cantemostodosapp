"use client";

import AgregarSalaModal from "@/components/cancionero/AgregarSalaModal";
import CancioneroItemCard from "@/components/cancionero/CancioneroItemCard";
import AddButton from "@/components/ui/AddButton";
import CancioneroFormModal from "@/components/ui/CancioneroFormModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TapLink } from "@/components/ui/TapFeedback";
import {
  agregarCancioneroACola,
  deleteCancionCancionero,
  fetchCancionesCancionero,
  filterCancionesCancionero,
} from "@/lib/cancionero";
import { createClient } from "@/lib/supabase/client";
import type { CancionCancionero, Sala } from "@/types";
import { ArrowLeft, Music, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

const inputClassName =
  "min-h-11 w-full rounded-[10px] border border-border bg-bg-card pl-11 pr-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent";

type CancioneroPageClientProps = {
  cancionesIniciales: CancionCancionero[];
  salas: Pick<Sala, "id" | "nombre" | "descripcion">[];
  errorMessage: string | null;
};

type PendingConfirm =
  | { type: "eliminar"; cancion: CancionCancionero }
  | {
      type: "agregar";
      cancion: CancionCancionero;
      salaId: number;
      salaNombre: string;
    };

export default function CancioneroPageClient({
  cancionesIniciales,
  salas,
  errorMessage,
}: CancioneroPageClientProps) {
  const [canciones, setCanciones] = useState(cancionesIniciales);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [cancionEditando, setCancionEditando] = useState<CancionCancionero | null>(
    null,
  );
  const [agregarSalaOpen, setAgregarSalaOpen] = useState(false);
  const [cancionParaSala, setCancionParaSala] = useState<CancionCancionero | null>(
    null,
  );
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  function handleAgregarSala(cancion: CancionCancionero) {
    setCancionParaSala(cancion);
    setAgregarSalaOpen(true);
  }

  function handleSelectSala(salaId: number) {
    if (!cancionParaSala) {
      return;
    }

    const sala = salas.find((item) => item.id === salaId);

    if (!sala) {
      return;
    }

    setAgregarSalaOpen(false);
    setPendingConfirm({
      type: "agregar",
      cancion: cancionParaSala,
      salaId: sala.id,
      salaNombre: sala.nombre,
    });
  }

  function handleEliminar(cancion: CancionCancionero) {
    setPendingConfirm({ type: "eliminar", cancion });
  }

  async function handleConfirm() {
    if (!pendingConfirm || actionLoading) {
      return;
    }

    setActionLoading(true);
    setActionError(null);

    const supabase = createClient();

    try {
      if (pendingConfirm.type === "eliminar") {
        await deleteCancionCancionero(supabase, pendingConfirm.cancion.id);
        await reloadCanciones();
      } else {
        await agregarCancioneroACola(
          supabase,
          pendingConfirm.salaId,
          pendingConfirm.cancion,
        );
      }

      setPendingConfirm(null);
      setCancionParaSala(null);
    } catch (confirmError) {
      setActionError(
        confirmError instanceof Error
          ? confirmError.message
          : "No se pudo completar la acción",
      );
    } finally {
      setActionLoading(false);
    }
  }

  function handleCancelConfirm() {
    if (actionLoading) {
      return;
    }

    setPendingConfirm(null);
    setActionError(null);
  }

  const confirmMessage =
    pendingConfirm?.type === "eliminar"
      ? "¿Eliminar esta canción del cancionero?"
      : pendingConfirm?.type === "agregar"
        ? `¿Agregar "${pendingConfirm.cancion.nombre}" a la cola de "${pendingConfirm.salaNombre}"?`
        : "";

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
            onChange={(event) => setQuery(event.target.value)}
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
                onAgregarSala={handleAgregarSala}
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
      />

      <AgregarSalaModal
        open={agregarSalaOpen}
        cancionNombre={cancionParaSala?.nombre ?? ""}
        salas={salas}
        onSelectSala={handleSelectSala}
        onClose={() => {
          setAgregarSalaOpen(false);
          setCancionParaSala(null);
        }}
      />

      <ConfirmDialog
        open={pendingConfirm !== null}
        message={confirmMessage}
        confirmLabel={actionLoading ? "Procesando..." : "Confirmar"}
        onConfirm={() => void handleConfirm()}
        onCancel={handleCancelConfirm}
      />
    </div>
  );
}
