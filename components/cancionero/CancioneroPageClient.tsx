"use client";
import VincularNombreArtista from "@/components/artistas/VincularNombreArtista";
import { artistaCoincideBusqueda } from "@/lib/artistas-alias-busqueda";
import { useAliasBusqueda } from "@/hooks/useAliasBusqueda";

import AppReadyMarker from "@/components/AppReadyMarker";
import { useCancioneroNovedades } from "@/components/offline/CancioneroNovedadesContext";
import CancioneroItemCard from "@/components/cancionero/CancioneroItemCard";
import CancioneroCardVisual from "@/components/cancionero/CancioneroCardVisual";
import CancioneroListSkeleton, {
  CASCADE_MAX_DELAY_MS,
  CASCADE_STAGGER_MS,
} from "@/components/cancionero/CancioneroListSkeleton";
import CancioneroModoLectura from "@/components/cancionero/CancioneroModoLectura";
import CancioneroSubpageShell from "@/components/cancionero/CancioneroSubpageShell";
import CancioneroVerModal from "@/components/cancionero/CancioneroVerModal";
import AddButton from "@/components/ui/AddButton";
import CifradoEditor from "@/components/ui/CifradoEditor";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TapButton } from "@/components/ui/TapFeedback";
import { useCategoriaUsuario } from "@/hooks/useCategoriaUsuario";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  deleteCancionCancionero,
  fetchCancionCifradoDetalle,
  filterCancionesCancionero,
} from "@/lib/cancionero";
import {
  agregarAMisCanciones,
  eliminarCancionDeFavoritas,
  getMisCanciones,
} from "@/lib/mis-canciones";
import {
  CANCIONERO_SYNC_EVENT,
  dispatchCancioneroSyncFinished,
  requestCancioneroUpdateCheck,
} from "@/lib/offline/cancionero-events";
import {
  getCancioneroLocalAsCancionero,
  getCancioneroLocalCifradoDetalle,
  deleteCancioneroLocalRecord,
} from "@/lib/offline/cancionero-store";
import { buildCifradoEditorSession } from "@/lib/cifrado-editor-session";
import type {
  CifradoEditorSession,
  CifradoSaveResult,
} from "@/lib/cifrado-editor-session";
import { createClient } from "@/lib/supabase/client";
import {
  puedeEditarCancionCancionero,
  puedeSumarCanciones,
} from "@/lib/usuarios-categorias";
import { listCancionesPractica, type CancionPracticaListItem } from "@/lib/canciones-practica";
import { CANCIONES_PRACTICA_LOCAL_EVENT } from "@/lib/offline/canciones-practica-events";
import type { CancionCancionero, CancionCifradoDetalle, Artista, UsuarioActivo } from "@/types";
import { ArtistasManagerModal } from "@/components/ui/ArtistasManagerModal";
import { ArtistasFilterModal } from "@/components/ui/ArtistasFilterModal";
import { getArtistas } from "@/lib/artistas";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import { Bell, Music, Search, Star, WifiOff, X, Settings, Users } from "lucide-react";
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
  const isDesktop = useIsDesktop();
  const novedades = useCancioneroNovedades();
  const supabase = useMemo(() => createClient(), []);
  const usuarioLogueado = usuarioId !== null;
  const categoria = useCategoriaUsuario();
  const puedeSumar = usuarioLogueado && puedeSumarCanciones(categoria);
  const [canciones, setCanciones] = useState<CancionCancionero[]>([]);
  const [cancionesPractica, setCancionesPractica] = useState<CancionPracticaListItem[]>([]);
  const [localReady, setLocalReady] = useState(false);
  const [query, setQuery] = useState("");
  const [cancionViendo, setCancionViendo] = useState<CancionCancionero | null>(
    null,
  );
  const [cifradoDetalle, setCifradoDetalle] =
    useState<CancionCifradoDetalle | null>(null);
  const [cifradoLoading, setCifradoLoading] = useState(false);
  const [modoLectura, setModoLectura] = useState(false);
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
  const [artistas, setArtistas] = useState<Artista[]>([]);
  const [usuarioActual, setUsuarioActual] = useState<UsuarioActivo | null>(null);
  const [selectedArtistaIds, setSelectedArtistaIds] = useState<Set<string>>(new Set());
  const [artistasManagerOpen, setArtistasManagerOpen] = useState(false);
  const [artistasFilterOpen, setArtistasFilterOpen] = useState(false);
  const aliasBusqueda = useAliasBusqueda();

  useEffect(() => {
    getArtistas(supabase).then(setArtistas);
  }, [supabase]);
  useEffect(() => {
    if (!usuarioLogueado) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session?.user) {
        setUsuarioActual(mapUserToUsuarioActivo(data.session.user));
      }
    });
    return () => { active = false; };
  }, [supabase, usuarioLogueado]);
  const artistasPorId = useMemo(() => new Map(artistas.map((artista) => [artista.id, artista])), [artistas]);
  const artistasPorNombre = useMemo(() => new Map(artistas.map((artista) => [artista.nombre.toLocaleLowerCase("es"), artista])), [artistas]);
  const fotoArtista = useCallback((artistaId: string | null | undefined, nombre: string | null) =>
    (artistaId ? artistasPorId.get(artistaId) : null)?.avatar_url
      ?? (nombre ? artistasPorNombre.get(nombre.toLocaleLowerCase("es"))?.avatar_url : null)
      ?? null,
  [artistasPorId, artistasPorNombre]);
  const hadLoadedRef = useRef(false);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conteoCancionesPorArtista = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const cancion of canciones) {
      if (!cancion.artista) continue;
      conteo.set(cancion.artista, (conteo.get(cancion.artista) ?? 0) + 1);
    }
    return conteo;
  }, [canciones]);

  const cancionesFiltradas = useMemo(() => {
    let list = filterCancionesCancionero(canciones, query, aliasBusqueda);
    if (selectedArtistaIds.size > 0) {
      const selectedNames = new Set(artistas.filter(a => selectedArtistaIds.has(a.id)).map(a => a.nombre));
      list = list.filter(c => c.artista && selectedNames.has(c.artista));
    }
    return list;
  }, [canciones, query, selectedArtistaIds, artistas, aliasBusqueda]);
  const practicaFiltradas = useMemo(() => {
    if (!usuarioLogueado) return [];
    const normalized = query.trim().toLowerCase();
    let list = cancionesPractica.filter((cancion) => !normalized || cancion.nombre.toLowerCase().includes(normalized) || artistaCoincideBusqueda(cancion.artista, normalized, aliasBusqueda, cancion.nombre));
    if (selectedArtistaIds.size > 0) {
      const selectedNames = new Set(artistas.filter(a => selectedArtistaIds.has(a.id)).map(a => a.nombre));
      list = list.filter(c => c.artista && selectedNames.has(c.artista));
    }
    return list;
  }, [cancionesPractica, query, usuarioLogueado, selectedArtistaIds, artistas, aliasBusqueda]);

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
    const allData = await getCancioneroLocalAsCancionero();
    const data = allData.filter((c) => Boolean(c.letra?.trim()));

    if (!hadLoadedRef.current && data.length > 0) {
      hadLoadedRef.current = true;
      setCascadeActive(true);
    }

    setCanciones(data);
    setLocalReady(true);
  }, []);

  const loadPractica = useCallback(async (skipSync = false) => {
    try {
      setCancionesPractica(await listCancionesPractica(supabase, { skipSync }));
    } catch {
      setCancionesPractica([]);
    }
  }, [supabase]);

  useEffect(() => {
    if (!usuarioLogueado) return;
    void Promise.resolve().then(() => loadPractica());
    const handleChange = () => { void loadPractica(true); };
    window.addEventListener(CANCIONES_PRACTICA_LOCAL_EVENT, handleChange);
    return () => window.removeEventListener(CANCIONES_PRACTICA_LOCAL_EVENT, handleChange);
  }, [loadPractica, usuarioLogueado]);

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
    if (online) requestCancioneroUpdateCheck();
    await loadLocalCanciones();
  }, [loadLocalCanciones, online]);

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

  const quitarDeFavoritas = useCallback(
    async (cancion: CancionCancionero) => {
      if (!usuarioLogueado || !online) {
        showSnackbar("Conectate para quitar de Favoritas");
        return;
      }

      setActionError(null);

      try {
        await eliminarCancionDeFavoritas(supabase, cancion.id);
        setMisCancionesIds((prev) => {
          const next = new Set(prev);
          next.delete(cancion.id);
          return next;
        });
        showSnackbar("Quitada de Favoritas");
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "No se pudo quitar de Favoritas",
        );
      }
    },
    [online, showSnackbar, supabase, usuarioLogueado],
  );

  /** Un toque suma a Favoritas; otro toque la quita. */
  const alternarFavorita = useCallback(
    (cancion: CancionCancionero) =>
      misCancionesIds.has(cancion.id)
        ? quitarDeFavoritas(cancion)
        : sumarAMisCanciones(cancion),
    [misCancionesIds, quitarDeFavoritas, sumarAMisCanciones],
  );

  function handleNuevaCancion() {
    if (!online || !puedeSumar) {
      return;
    }

    // Celular: pantalla nueva del editor. PC: modal del editor actual (sin tocar).
    if (!isDesktop) {
      navigateWithProgress("/canciones/editor?desde=cancionero");
      return;
    }

    setEditorSession(null);
    setEditorOpen(true);
  }

  async function openEditorForCancion(cancion: CancionCancionero) {
    if (!online || !usuarioLogueado || editorLoading) {
      return;
    }

    setEditorLoading(true);
    setActionError(null);
    setActiveCardId(null);

    try {
      const esAvanzada = Boolean(cancion.tiene_cifrado_avanzado);
      let detalle: CancionCifradoDetalle | null = null;

      if (esAvanzada) {
        detalle = await fetchCancionCifradoDetalle(supabase, cancion.id);

        if (!detalle) {
          throw new Error("No se pudo cargar el cifrado guardado de esta canción.");
        }
      }

      const session = buildCifradoEditorSession({
        cancionId: cancion.id,
        nombre: cancion.nombre,
        artista: cancion.artista ?? "",
        letra: cancion.letra ?? "",
        esAvanzada,
        detalle,
      });

      setEditorSession(session);
      setEditorOpen(true);
    } catch (editorError) {
      setActionError(
        editorError instanceof Error
          ? editorError.message
          : "No se pudo abrir el editor",
      );
    } finally {
      setEditorLoading(false);
    }
  }

  function handleEditar(cancion: CancionCancionero) {
    if (!online || !usuarioLogueado || !puedeEditarCancionCancionero(cancion, usuarioId, categoria)) {
      return;
    }

    // Celular: pantalla nueva del editor. PC: modal del editor actual (sin tocar).
    if (!isDesktop) {
      navigateWithProgress(
        `/canciones/editor?id=${cancion.id}&desde=cancionero`,
      );
      return;
    }

    void openEditorForCancion(cancion);
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
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!cancionViendo?.tiene_cifrado_avanzado) {
        if (!cancelled) {
          setCifradoDetalle(null);
          setCifradoLoading(false);
        }
        return;
      }

      setCifradoLoading(true);
      const songId = cancionViendo.id;
      const local = await getCancioneroLocalCifradoDetalle(songId);

      if (cancelled) {
        return;
      }

      // Sin red: usá la copia local; si no hay, no borres la que ya se veía
      // (pasa al cortar WiFi con la canción abierta).
      setCifradoDetalle((current) => {
        if (local) return local;
        if (!online && current?.id === songId) return current;
        return null;
      });

      if (!online) {
        setCifradoLoading(false);
        return;
      }

      try {
        const remote = await fetchCancionCifradoDetalle(supabase, songId);

        if (!cancelled) {
          setCifradoDetalle(remote ?? local);
        }
      } catch {
        if (!cancelled) {
          setCifradoDetalle((current) => local ?? (current?.id === songId ? current : null));
        }
      } finally {
        if (!cancelled) {
          setCifradoLoading(false);
        }
      }
    })();

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
    if (!online || !usuarioLogueado || !puedeEditarCancionCancionero(cancion, usuarioId, categoria)) {
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
      await deleteCancioneroLocalRecord(cancionAEliminar.id);
      dispatchCancioneroSyncFinished();
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

  useHardwareBack(
    cancionViendo !== null && !editorOpen && !modoLectura,
    () => {
      setCancionViendo(null);
    },
  );

  useHardwareBack(
    cancionAEliminar !== null && !editorOpen && cancionViendo === null,
    () => {
      handleCancelEliminar();
    },
  );

  const mutationsEnabled = online && usuarioLogueado;
  const mostrarSumarMisCanciones = usuarioLogueado && online;

  return (
    <>
      <AppReadyMarker />
      <ArtistasManagerModal isOpen={artistasManagerOpen} onClose={() => setArtistasManagerOpen(false)} />
      {artistasFilterOpen ? (
        <ArtistasFilterModal
          isOpen
          onClose={() => setArtistasFilterOpen(false)}
          artistas={artistas}
          conteoCanciones={conteoCancionesPorArtista}
          selectedIds={selectedArtistaIds}
          onApply={(ids) => {
            setSelectedArtistaIds(ids);
            setArtistasFilterOpen(false);
          }}
          onManageArtistas={() => setArtistasManagerOpen(true)}
        />
      ) : null}
      <CancioneroSubpageShell
        title="Cancionero"
        modalOpen={cancionViendo !== null || editorOpen || modoLectura}
        headerAction={
          puedeSumar ? (
            <AddButton
              ariaLabel="Agregar canción"
              onClick={handleNuevaCancion}
              disabled={!online}
              className={!online ? "opacity-40" : ""}
            />
          ) : null
        }
      >
        {isDesktop && novedades.count > 0 ? (
          <button type="button" onClick={novedades.open} aria-label="Ver novedades del Cancionero"
            className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-bg-card px-4 py-3 text-left">
            <Bell className="size-5 text-accent" aria-hidden="true" />
            <span>Novedades{novedades.count ? ` (${novedades.count})` : ""}</span>
          </button>
        ) : null}
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
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
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
                <TapButton
                  type="button"
                  aria-label="Filtrar por Artista"
                  onClick={() => setArtistasFilterOpen(true)}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] border transition-colors ${
                    selectedArtistaIds.size > 0 
                      ? "border-accent bg-accent/10 text-accent" 
                      : "border-border bg-bg-card text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Users className="size-5" />
                </TapButton>
              </div>
              <VincularNombreArtista texto={query} />
              {selectedArtistaIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {Array.from(selectedArtistaIds).map(id => {
                    const artista = artistas.find(a => a.id === id);
                    if (!artista) return null;
                    return (
                      <div key={id} className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 pl-1.5 pr-2 py-1 text-sm text-accent">
                        {artista.avatar_url ? (
                          <img src={artista.avatar_url} alt="" className="size-5 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold">
                            {artista.nombre.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium max-w-[120px] truncate">{artista.nombre}</span>
                        <button 
                          onClick={() => {
                            setSelectedArtistaIds(prev => {
                              const next = new Set(prev);
                              next.delete(id);
                              return next;
                            });
                          }}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-accent/20"
                          aria-label={`Quitar filtro de ${artista.nombre}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {actionError && (
              <p className="text-sm text-accent" role="alert">
                {actionError}
              </p>
            )}

            {canciones.length === 0 && (!usuarioLogueado || cancionesPractica.length === 0) ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
                <Music className="size-10 text-text-faint" aria-hidden="true" />
                <p className="max-w-xs text-sm text-text-muted">
                  {online
                    ? "Todavía no hay canciones descargadas. Abrí las novedades del Cancionero y aceptá la descarga."
                    : "No hay copia local todavía. Conectate y aceptá la descarga del Cancionero."}
                </p>
              </div>
            ) : cancionesFiltradas.length === 0 && practicaFiltradas.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">
                No hay canciones que coincidan con tu búsqueda.
              </p>
            ) : (
              <div className="app-list-grid">
                {cancionesFiltradas.map((cancion, index) => (
                  <div
                    key={cancion.id}
                    className={`min-w-0 max-w-full${
                      cascadeActive ? " cancionero-item-cascade" : ""
                    }`}
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
                      artistaAvatarUrl={fotoArtista(cancion.artista_id, cancion.artista)}
                      isDesktop={isDesktop}
                      mutationsEnabled={mutationsEnabled}
                      puedeEditarEliminar={puedeEditarCancionCancionero(
                        cancion,
                        usuarioId,
                        categoria,
                      )}
                      isFavorita={misCancionesIds.has(cancion.id)}
                      mostrarSumarMisCanciones={mostrarSumarMisCanciones}
                      modoSeleccion={modoSeleccionMisCanciones}
                      actionsOpen={activeCardId === cancion.id}
                      onOpenActions={() => setActiveCardId(cancion.id)}
                      onCloseActions={() => setActiveCardId(null)}
                      onVer={handleVer}
                      onAlternarFavorita={(item) =>
                        void alternarFavorita(item)
                      }
                      onEditar={handleEditar}
                      onEliminar={handleEliminar}
                    />
                  </div>
                ))}
                {practicaFiltradas.map((cancion) => (
                  <button
                    key={`practica-${cancion.id}`}
                    type="button"
                    onClick={() => navigateWithProgress(`/practica/entrenador-canciones/ver?id=${cancion.id}`)}
                    className="relative min-w-0 rounded-[12px] border border-border-card bg-bg-card p-3 text-left transition-colors hover:border-text-faint/50"
                  >
                    <CancioneroCardVisual
                      nombre={cancion.nombre}
                      artista={cancion.artista}
                      artistaAvatarUrl={fotoArtista(null, cancion.artista)}
                      agregadoNombre={usuarioActual?.nombre.trim() || "Vos"}
                      agregadoAvatarUrl={usuarioActual?.avatar_url}
                      insignia={<Star className="size-4 fill-current text-[var(--accent-vocal)]" aria-label="Entrenador de canciones" />}
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </CancioneroSubpageShell>

      <CifradoEditor
        open={editorOpen}
        isLoggedIn={usuarioLogueado}
        session={editorSession}
        onClose={handleEditorClose}
        onSaved={(result) => void handleEditorSaved(result)}
      />

      <CancioneroVerModal
        open={cancionViendo !== null && !modoLectura}
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
        onExpand={() => setModoLectura(true)}
        tieneAnterior={cancionViendoIndex > 0}
        tieneSiguiente={
          cancionViendoIndex >= 0 &&
          cancionViendoIndex < cancionesFiltradas.length - 1
        }
      />

      {cancionViendo ? (
        <CancioneroModoLectura
          open={modoLectura}
          cancion={cancionViendo}
          cifradoDetalle={cifradoDetalle}
          cifradoLoading={cifradoLoading}
          items={cancionesFiltradas}
          onSelectCancion={setCancionViendo}
          onAnterior={() => handleNavigateCancion(-1)}
          onSiguiente={() => handleNavigateCancion(1)}
          tieneAnterior={cancionViendoIndex > 0}
          tieneSiguiente={
            cancionViendoIndex >= 0 &&
            cancionViendoIndex < cancionesFiltradas.length - 1
          }
          onContraer={() => setModoLectura(false)}
        />
      ) : null}

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
