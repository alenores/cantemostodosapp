"use client";
import { artistaCoincideBusqueda, getAliasBusqueda } from "@/lib/artistas-alias-busqueda";

import CancioneroListSkeleton from "@/components/cancionero/CancioneroListSkeleton";
import CancioneroSubpageShell from "@/components/cancionero/CancioneroSubpageShell";
import PracticaCancionCard from "@/components/herramientas/PracticaCancionCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { getArtistas } from "@/lib/artistas";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { getActiveUserId } from "@/lib/auth/offline-user";
import {
  deleteCancionPractica,
  listCancionesPractica,
  type CancionPracticaListItem,
} from "@/lib/canciones-practica";
import {
  ARTISTAS_FOTOS_EVENT,
  artistasConFotoLocal,
  leerArtistasFotos,
} from "@/lib/offline/artista-fotos";
import { CANCIONES_PRACTICA_LOCAL_EVENT } from "@/lib/offline/canciones-practica-events";
import { createClient } from "@/lib/supabase/client";
import type { Artista } from "@/types";
import { Music, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
    const matchesArtista = artistaCoincideBusqueda(cancion.artista, normalized, getAliasBusqueda(), cancion.nombre);

    return matchesNombre || Boolean(matchesArtista);
  });
}

export default function EntrenadorCancionesPageClient() {
  const router = useRouter();
  const navigateWithProgress = useNavigateWithProgress();
  const supabase = useMemo(() => createClient(), []);
  const online = useOnlineStatus();
  const isDesktop = useIsDesktop();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [artistas, setArtistas] = useState<Artista[]>([]);
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [canciones, setCanciones] = useState<CancionPracticaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<CancionPracticaListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(
    () => filterPractica(canciones, query),
    [canciones, query],
  );

  const artistasPorNombre = useMemo(
    () =>
      new Map(
        artistas.map((artista) => [
          artista.nombre.toLocaleLowerCase("es"),
          artista,
        ]),
      ),
    [artistas],
  );

  const fotoArtista = useCallback(
    (nombre: string | null) =>
      (nombre
        ? artistasPorNombre.get(nombre.toLocaleLowerCase("es"))?.avatar_url
        : null) ?? null,
    [artistasPorNombre],
  );

  const revokeFotosRef = useRef<() => void>(() => {});
  useEffect(() => {
    let cancelado = false;

    function aplicar(lista: Artista[], revoke: () => void) {
      if (cancelado) {
        revoke();
        return;
      }
      revokeFotosRef.current();
      revokeFotosRef.current = revoke;
      setArtistas(lista);
    }

    async function cargarArtistas() {
      const locales = await leerArtistasFotos().catch(() => []);
      if (!online) {
        const copia = artistasConFotoLocal(locales);
        aplicar(copia.artistas, copia.revoke);
        return;
      }

      const remotos = await getArtistas(supabase);
      if (remotos.length === 0) {
        const copia = artistasConFotoLocal(locales);
        aplicar(copia.artistas, copia.revoke);
        return;
      }

      const localPorId = new Map(locales.map((fila) => [fila.id, fila]));
      const urls: string[] = [];
      const lista = remotos.map((artista) => {
        const local = localPorId.get(artista.id);
        if (!local?.blob || local.avatar_url !== artista.avatar_url) return artista;
        const url = URL.createObjectURL(local.blob);
        urls.push(url);
        return { ...artista, avatar_url: url };
      });
      aplicar(lista, () => {
        for (const url of urls) URL.revokeObjectURL(url);
      });
    }

    void cargarArtistas();
    window.addEventListener(ARTISTAS_FOTOS_EVENT, cargarArtistas);
    return () => {
      cancelado = true;
      window.removeEventListener(ARTISTAS_FOTOS_EVENT, cargarArtistas);
    };
  }, [online, supabase]);
  useEffect(() => () => revokeFotosRef.current(), []);

  const refresh = useCallback(async (skipSync = false) => {
    setLoading(true);
    setError(null);

    try {
      const data = await listCancionesPractica(supabase, { skipSync });
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
    const handleLocalChange = () => { void refresh(true); };
    window.addEventListener(CANCIONES_PRACTICA_LOCAL_EVENT, handleLocalChange);
    return () => window.removeEventListener(CANCIONES_PRACTICA_LOCAL_EVENT, handleLocalChange);
  }, [refresh]);

  useEffect(() => {
    async function loadSession() {
      const activeUserId = await getActiveUserId(supabase);
      const loggedIn = Boolean(
        activeUserId && activeUserId !== OFFLINE_GUEST_USUARIO.id,
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

  useHardwareBack(deleteTarget != null, () => {
    setDeleteTarget(null);
  });

  useHardwareBack(activeCardId != null && deleteTarget == null, () => {
    setActiveCardId(null);
  });

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
                aria-label="Agregar canción"
                onClick={() =>
                  navigateWithProgress("/practica/entrenador-canciones/editor")
                }
                className="flex size-11 items-center justify-center rounded-full bg-[var(--accent-vocal)] text-[var(--text-on-light)]"
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

          {!online ? (
            <p className="rounded-[10px] border border-border bg-bg-card px-3 py-2 text-sm text-text-muted">
              Sin conexión · podés abrir y editar tu práctica. Los cambios se sincronizan después.
            </p>
          ) : null}

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
                Tocá + para traer una del Cancionero o crear una nueva. Quedan solo
                para vos; no se publican en el Cancionero Global.
              </p>
            </div>
          ) : (
            <ul className="app-list-grid list-none p-0">
              {filtered.map((cancion) => (
                <li
                  key={cancion.id}
                  className={activeCardId === cancion.id ? "relative z-30" : undefined}
                >
                  <PracticaCancionCard
                    cancion={cancion}
                    artistaAvatarUrl={fotoArtista(cancion.artista)}
                    isDesktop={isDesktop}
                    actionsOpen={activeCardId === cancion.id}
                    onOpenActions={() => setActiveCardId(cancion.id)}
                    onCloseActions={() => setActiveCardId(null)}
                    onOpen={() =>
                      navigateWithProgress(
                        `/practica/entrenador-canciones/ver?id=${cancion.id}`,
                      )
                    }
                    onEditar={() =>
                      navigateWithProgress(
                        `/practica/entrenador-canciones/editor?id=${cancion.id}`,
                      )
                    }
                    onEliminar={() => {
                      setActiveCardId(null);
                      setDeleteTarget(cancion);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </CancioneroSubpageShell>

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
