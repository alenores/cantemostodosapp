"use client";
import { artistaCoincideBusqueda, getAliasBusqueda } from "@/lib/artistas-alias-busqueda";

import CancioneroCardVisual from "@/components/cancionero/CancioneroCardVisual";
import CancioneroListSkeleton from "@/components/cancionero/CancioneroListSkeleton";
import CancioneroSubpageShell from "@/components/cancionero/CancioneroSubpageShell";
import CancioneroVerModal from "@/components/cancionero/CancioneroVerModal";
import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import UrlLetraModal from "@/components/salas/UrlLetraModal";
import AddButton from "@/components/ui/AddButton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { ArtistasFilterModal } from "@/components/ui/ArtistasFilterModal";
import { TapButton } from "@/components/ui/TapFeedback";
import { useColaIndividual } from "@/hooks/useColaIndividual";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { ResultadoIconoTipo } from "@/lib/buscador";
import { triggerHaptic } from "@/lib/haptic";
import {
  eliminarDeMisCanciones,
  getMisCanciones,
  usuarioCancionToCancionInput,
} from "@/lib/mis-canciones";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import { getArtistas } from "@/lib/artistas";
import {
  ARTISTAS_FOTOS_EVENT,
  artistasConFotoLocal,
  leerArtistasFotos,
} from "@/lib/offline/artista-fotos";
import { createClient } from "@/lib/supabase/client";
import type { Artista, CancionCancionero, UsuarioCancion } from "@/types";
import { ListPlus, Music, Search, Trash2, Users, X } from "lucide-react";
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
  nombresArtista: Set<string> | null,
): UsuarioCancion[] {
  const normalized = query.trim().toLowerCase();

  return canciones.filter((cancion) => {
    if (
      nombresArtista &&
      nombresArtista.size > 0 &&
      (!cancion.artista || !nombresArtista.has(cancion.artista))
    ) {
      return false;
    }

    if (!normalized) return true;

    const matchesNombre = cancion.nombre.toLowerCase().includes(normalized);
    const matchesArtista = artistaCoincideBusqueda(
      cancion.artista,
      normalized,
      getAliasBusqueda(),
      cancion.nombre,
    );

    return matchesNombre || Boolean(matchesArtista);
  });
}

function artistasDelListado(
  canciones: UsuarioCancion[],
  catalogo: Artista[],
): Artista[] {
  const porId = new Map(catalogo.map((artista) => [artista.id, artista]));
  const porNombre = new Map(
    catalogo.map((artista) => [artista.nombre.toLocaleLowerCase("es"), artista]),
  );
  const vistos = new Map<string, Artista>();

  for (const cancion of canciones) {
    const nombre = cancion.artista?.trim();
    if (!nombre) continue;

    const conocido =
      (cancion.artista_id ? porId.get(cancion.artista_id) : undefined) ??
      porNombre.get(nombre.toLocaleLowerCase("es"));
    const artista = conocido ?? {
      id: `nombre:${nombre.toLocaleLowerCase("es")}`,
      nombre,
      avatar_url: null,
    };

    if (!vistos.has(artista.id)) vistos.set(artista.id, artista);
  }

  return [...vistos.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es"),
  );
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
  artistaAvatarUrl?: string | null;
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
  artistaAvatarUrl,
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
  const [isPressed, setIsPressed] = useState(false);

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
    if (event.button !== 0) return;

    setIsPressed(true);
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      setIsPressed(false);
      openActions();
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const start = pointerStartRef.current;

    if (!start) {
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
      setIsPressed(false);
    }
  }

  function handlePointerEnd() {
    pointerStartRef.current = null;
    clearLongPressTimer();
    setIsPressed(false);
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
      style={isPressed ? { transform: "scale(0.97)" } : undefined}
      className={`relative w-full min-w-0 max-w-full cursor-pointer touch-pan-y rounded-estandar border bg-bg-card p-3 select-none transition-transform duration-100 ease-out hover:border-text-faint/50 ${
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
      <CancioneroCardVisual
        nombre={cancion.nombre}
        artista={cancion.artista}
        artistaAvatarUrl={artistaAvatarUrl}
        iconos={
          <>
            <LetraFuenteIcon
              tipo={getIconoTipo(cancion)}
              premium={tieneCifradoAvanzado}
              favorita
              compact
            />
            <TapButton
              aria-label={`Agregar ${cancion.nombre} a la fila`}
              disabled={colaDeshabilitada}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onAgregarACola(cancion);
              }}
              className={`flex size-6 items-center justify-center rounded-md text-text-secondary hover:text-accent ${
                colaDeshabilitada ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <ListPlus className="size-[18px]" aria-hidden="true" />
            </TapButton>
          </>
        }
      />

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
  const online = useOnlineStatus();
  const supabase = useMemo(() => createClient(), []);
  const cola = useColaIndividual();
  const [canciones, setCanciones] = useState<UsuarioCancion[]>([]);
  const [cifradoAvanzadoIds, setCifradoAvanzadoIds] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [artistas, setArtistas] = useState<Artista[]>([]);
  const [selectedArtistaIds, setSelectedArtistaIds] = useState<Set<string>>(
    new Set(),
  );
  const [artistasFilterOpen, setArtistasFilterOpen] = useState(false);
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
  const revokeFotosRef = useRef<() => void>(() => {});

  const artistasFavoritas = useMemo(
    () => artistasDelListado(canciones, artistas),
    [artistas, canciones],
  );
  const artistasPorId = useMemo(
    () => new Map(artistasFavoritas.map((artista) => [artista.id, artista])),
    [artistasFavoritas],
  );
  const artistasPorNombre = useMemo(
    () =>
      new Map(
        artistasFavoritas.map((artista) => [
          artista.nombre.toLocaleLowerCase("es"),
          artista,
        ]),
      ),
    [artistasFavoritas],
  );
  const nombresArtistaElegidos = useMemo(() => {
    if (selectedArtistaIds.size === 0) return null;
    return new Set(
      artistasFavoritas
        .filter((artista) => selectedArtistaIds.has(artista.id))
        .map((artista) => artista.nombre),
    );
  }, [artistasFavoritas, selectedArtistaIds]);
  const conteoPorArtista = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const cancion of canciones) {
      if (!cancion.artista) continue;
      conteo.set(cancion.artista, (conteo.get(cancion.artista) ?? 0) + 1);
    }
    return conteo;
  }, [canciones]);

  const cancionesFiltradas = useMemo(
    () => filterMisCanciones(canciones, query, nombresArtistaElegidos),
    [canciones, nombresArtistaElegidos, query],
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
    const timer = window.setTimeout(() => void loadCanciones(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCanciones]);

  const resolveGlobalCancion = useCallback(
    async (cancionGuardadaId: number): Promise<CancionCancionero | null> => {
      const local = await getCancioneroLocalAsCancionero();
      const cached = local.find((item) => item.id === cancionGuardadaId);

      if (!online) {
        return cached ?? null;
      }

      const { data, error } = await supabase
        .from("canciones_guardadas")
        .select("id, nombre, artista, letra, tiene_cifrado_avanzado, user_id")
        .eq("id", cancionGuardadaId)
        .maybeSingle();

      if (data) {
        return {
          id: data.id,
          nombre: data.nombre,
          artista: data.artista,
          letra: data.letra,
          tiene_cifrado_avanzado: data.tiene_cifrado_avanzado ?? false,
          user_id: data.user_id ?? null,
        };
      }

      if (cached) {
        return cached;
      }

      if (error) {
        setViewError(error.message);
      }

      return null;
    },
    [online, supabase],
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
        showSnackbar("Agregada a la fila");
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "No se pudo agregar a la fila",
        );
      }
    },
    [cola, resolveGlobalCancion, showSnackbar],
  );

  function handleEliminar(cancion: UsuarioCancion) {
    if (!online) {
      setActionError("Conectate a internet para quitar canciones de Favoritas.");
      return;
    }
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

  function fotoArtista(cancion: UsuarioCancion) {
    return (
      (cancion.artista_id ? artistasPorId.get(cancion.artista_id) : undefined)
        ?.avatar_url ??
      (cancion.artista
        ? artistasPorNombre.get(cancion.artista.toLocaleLowerCase("es"))?.avatar_url
        : null) ??
      null
    );
  }

  return (
    <>
      {artistasFilterOpen ? (
        <ArtistasFilterModal
          isOpen
          onClose={() => setArtistasFilterOpen(false)}
          artistas={artistasFavoritas}
          conteoCanciones={conteoPorArtista}
          selectedIds={selectedArtistaIds}
          onApply={(ids) => {
            setSelectedArtistaIds(ids);
            setArtistasFilterOpen(false);
          }}
        />
      ) : null}
      <CancioneroSubpageShell
        title="Favoritas"
        modalOpen={cancionViendo !== null || urlViendo !== null}
        headerAction={
          <AddButton
            ariaLabel="Agregar canción desde el cancionero"
            disabled={!online}
            className={!online ? "cursor-not-allowed opacity-45" : ""}
            onClick={() =>
              navigateWithProgress("/canciones/cancionero?seleccionar=1")
            }
          />
        }
      >
        {!online ? (
          <p className="rounded-[10px] border border-border bg-bg-card px-3 py-2 text-sm text-text-muted">
            Sin conexión · mostrando las Favoritas guardadas en este celular.
          </p>
        ) : null}
        {loading ? (
          <CancioneroListSkeleton includeSearch cardCount={5} trailing="bookmark" />
        ) : (
          <>
            <div className="flex flex-col gap-2">
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
                  aria-label="Filtrar por artista"
                  onClick={() => setArtistasFilterOpen(true)}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] border transition-colors ${
                    selectedArtistaIds.size > 0
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-bg-card text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Users className="size-5" aria-hidden="true" />
                </TapButton>
              </div>
              {selectedArtistaIds.size > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {Array.from(selectedArtistaIds).map((id) => {
                    const artista = artistasFavoritas.find((item) => item.id === id);
                    if (!artista) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 py-1 pl-1.5 pr-2 text-sm text-accent"
                      >
                        <span className="max-w-[120px] truncate font-medium">
                          {artista.nombre}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedArtistaIds((prev) => {
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
              ) : null}
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
                    artistaAvatarUrl={fotoArtista(cancion)}
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
