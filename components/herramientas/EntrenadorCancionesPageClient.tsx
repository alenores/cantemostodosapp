"use client";

import CancioneroListSkeleton from "@/components/cancionero/CancioneroListSkeleton";
import CancioneroSubpageShell from "@/components/cancionero/CancioneroSubpageShell";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import {
  cloneCancioneroToPractica,
  deleteCancionPractica,
  listCancionesPractica,
  type CancionPracticaListItem,
} from "@/lib/canciones-practica";
import { fetchCancionCifradoDetalle, filterCancionesCancionero } from "@/lib/cancionero";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import { createClient } from "@/lib/supabase/client";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import type { CancionCancionero } from "@/types";
import { Music, Plus, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PointerEvent,
} from "react";

const inputClassName =
  "min-h-11 w-full rounded-[10px] border border-border bg-[#323232] pl-11 pr-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent";

function filterPractica(
  canciones: CancionPracticaListItem[],
  query: string,
): CancionPracticaListItem[] {
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

type PracticaCancionListItemProps = {
  cancion: CancionPracticaListItem;
  onOpen: () => void;
  onDelete: () => void;
};

function PracticaCancionListItem({
  cancion,
  onOpen,
  onDelete,
}: PracticaCancionListItemProps) {
  const [isPressed, setIsPressed] = useState(false);

  function handleOpenPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return;
    }

    setIsPressed(true);
  }

  function handleOpenPointerEnd() {
    setIsPressed(false);
  }

  return (
    <div
      style={isPressed ? { transform: "scale(0.97)" } : undefined}
      className="flex items-stretch gap-2 rounded-[12px] border border-border bg-bg-card transition-transform duration-100 ease-out"
    >
      <button
        type="button"
        data-no-tap-feedback
        aria-label={`Abrir ${cancion.nombre}`}
        onClick={onOpen}
        onPointerDown={handleOpenPointerDown}
        onPointerUp={handleOpenPointerEnd}
        onPointerLeave={handleOpenPointerEnd}
        onPointerCancel={handleOpenPointerEnd}
        className="min-w-0 flex-1 px-4 py-3 text-left"
      >
        <p className="truncate text-base font-bold text-text-primary">
          {cancion.nombre}
        </p>
        {cancion.artista ? (
          <p className="truncate text-sm text-text-muted">{cancion.artista}</p>
        ) : null}
      </button>
      <button
        type="button"
        data-no-tap-feedback
        aria-label={`Eliminar ${cancion.nombre}`}
        onClick={onDelete}
        className="flex w-12 shrink-0 items-center justify-center text-text-muted"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function EntrenadorCancionesPageClient() {
  const router = useRouter();
  const navigateWithProgress = useNavigateWithProgress();
  const supabase = useMemo(() => createClient(), []);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [canciones, setCanciones] = useState<CancionPracticaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [cancionero, setCancionero] = useState<CancionCancionero[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [cloningId, setCloningId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<CancionPracticaListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(
    () => filterPractica(canciones, query),
    [canciones, query],
  );

  const pickerFiltered = useMemo(
    () => filterCancionesCancionero(cancionero, pickerQuery),
    [cancionero, pickerQuery],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await listCancionesPractica(supabase);
      setCanciones(data);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar tus canciones de práctica";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const loggedIn = Boolean(
        session?.user &&
          mapUserToUsuarioActivo(session.user).id !== OFFLINE_GUEST_USUARIO.id,
      );

      setIsLoggedIn(loggedIn);

      if (!loggedIn) {
        router.replace("/");
        return;
      }

      await refresh();
    }

    void loadSession();
  }, [refresh, router, supabase]);

  useHardwareBack(pickerOpen, () => {
    setPickerOpen(false);
  });

  useHardwareBack(deleteTarget != null, () => {
    setDeleteTarget(null);
  });

  async function openPicker() {
    setPickerOpen(true);
    setPickerQuery("");
    setPickerLoading(true);

    try {
      const data = await getCancioneroLocalAsCancionero();
      setCancionero(data);
    } catch {
      setCancionero([]);
    } finally {
      setPickerLoading(false);
    }
  }

  async function handleClone(cancion: CancionCancionero) {
    setCloningId(cancion.id);
    setError(null);

    try {
      let detalle = null;

      if (cancion.tiene_cifrado_avanzado) {
        detalle = await fetchCancionCifradoDetalle(supabase, cancion.id);
      }

      const practicaId = await cloneCancioneroToPractica(
        supabase,
        cancion,
        detalle,
      );

      setPickerOpen(false);
      navigateWithProgress(
        `/practica/entrenador-canciones/ver?id=${practicaId}`,
      );
    } catch (cloneError) {
      const message =
        cloneError instanceof Error
          ? cloneError.message
          : "No se pudo agregar la canción";
      setError(message);
    } finally {
      setCloningId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    try {
      await deleteCancionPractica(supabase, deleteTarget.id);
      setCanciones((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar la canción";
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  if (isLoggedIn !== true) {
    return null;
  }

  return (
    <>
      <CancioneroSubpageShell
        title="Entrenador de canciones"
        backHref="/practica"
        backAriaLabel="Volver a Práctica"
        headerAction={
          <div className="flex shrink-0 items-center gap-2">
            <TapButton
              aria-label="Agregar desde el cancionero"
              onClick={() => void openPicker()}
              className="rounded-[10px] border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-primary"
            >
              Cancionero
            </TapButton>
            <TapButton
              aria-label="Crear canción nueva"
              onClick={() =>
                navigateWithProgress("/practica/entrenador-canciones/editor")
              }
              className="flex size-11 items-center justify-center rounded-full bg-[var(--accent-entrenador-canciones)] text-[var(--text-on-light)]"
            >
              <Plus className="size-5" aria-hidden="true" />
            </TapButton>
          </div>
        }
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar en mi práctica"
            className={inputClassName}
            aria-label="Buscar canciones de práctica"
          />
        </div>

        {error ? (
          <p className="rounded-[10px] border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {loading ? (
          <CancioneroListSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-border px-4 py-10 text-center">
            <Music
              className="size-8 text-[var(--accent-entrenador-canciones)]"
              aria-hidden="true"
            />
            <p className="text-base font-semibold text-text-primary">
              Todavía no tenés canciones de práctica
            </p>
            <p className="max-w-sm text-sm text-text-muted">
              Traé una del Cancionero o creá una nueva. Quedan solo para vos; no
              se publican en el Cancionero Global.
            </p>
          </div>
        ) : (
          <ul className="app-list-grid list-none p-0">
            {filtered.map((cancion) => (
              <li key={cancion.id}>
                <PracticaCancionListItem
                  cancion={cancion}
                  onOpen={() =>
                    navigateWithProgress(
                      `/practica/entrenador-canciones/ver?id=${cancion.id}`,
                    )
                  }
                  onDelete={() => setDeleteTarget(cancion)}
                />
              </li>
            ))}
          </ul>
        )}
      </CancioneroSubpageShell>

      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg-app/95 backdrop-blur-sm">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <h2 className="min-w-0 flex-1 text-lg font-extrabold text-text-primary">
              Desde el Cancionero
            </h2>
            <TapButton
              aria-label="Cerrar"
              onClick={() => setPickerOpen(false)}
              className="flex size-11 items-center justify-center rounded-full bg-bg-card"
            >
              <X className="size-5 text-text-primary" aria-hidden="true" />
            </TapButton>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-4">
            <div className="relative shrink-0">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={pickerQuery}
                onChange={(event) => setPickerQuery(event.target.value)}
                placeholder="Buscar en el cancionero"
                className={inputClassName}
                aria-label="Buscar en el cancionero"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {pickerLoading ? (
                <CancioneroListSkeleton />
              ) : pickerFiltered.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-muted">
                  No hay canciones para mostrar.
                </p>
              ) : (
                <ul className="flex list-none flex-col gap-2 p-0">
                  {pickerFiltered.map((cancion) => (
                    <li key={cancion.id}>
                      <TapButton
                        aria-label={`Agregar ${cancion.nombre}`}
                        disabled={cloningId !== null}
                        onClick={() => void handleClone(cancion)}
                        className="w-full rounded-[12px] border border-border bg-bg-card px-4 py-3 text-left disabled:opacity-50"
                      >
                        <p className="truncate text-base font-bold text-text-primary">
                          {cancion.nombre}
                          {cloningId === cancion.id ? "…" : ""}
                        </p>
                        {cancion.artista ? (
                          <p className="truncate text-sm text-text-muted">
                            {cancion.artista}
                          </p>
                        ) : null}
                      </TapButton>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget != null}
        message={
          deleteTarget
            ? `¿Eliminar “${deleteTarget.nombre}” de tu Entrenador? El Cancionero Global no se modifica.`
            : ""
        }
        confirmLabel={deleting ? "Eliminando…" : "Eliminar"}
        cancelLabel="Cancelar"
        deleteConfirm
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
