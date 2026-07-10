"use client";

import {
  BuscadorInternetPendingSkeleton,
  BuscadorSearchSkeleton,
  CASCADE_MAX_DELAY_MS,
  CASCADE_STAGGER_MS,
} from "@/components/cancionero/CancioneroListSkeleton";
import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import LetraFuenteSitioBadge, {
  SitioLetraBadge,
} from "@/components/salas/LetraFuenteSitioBadge";
import LetraTexto from "@/components/salas/LetraTexto";
import LetraViewer, {
  LetraRevealTopControl,
} from "@/components/salas/LetraViewer";
import CancioneroFormModal from "@/components/ui/CancioneroFormModal";
import { TapButton } from "@/components/ui/TapFeedback";
import {
  esAcordesDeCanciones,
  esCifraClub,
  getResultadoIconoTipo,
  isResultadoPremium,
  mapCancionLocalAResultado,
  resolverNombreArtistaDisplay,
  resultadoKey,
} from "@/lib/buscador";
import {
  getEmbedBottomClipPx,
  getEmbedTopClipPx,
  shouldApplyEmbedInitialOffset,
} from "@/lib/letra-display";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePremiumCancioneroIds } from "@/hooks/usePremiumCancioneroIds";
import { type CancionInput } from "@/lib/cola-logic";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatDatabaseError } from "@/lib/supabase/errors";
import { agregarAMisCanciones, getMisCanciones } from "@/lib/mis-canciones";
import {
  getDuplicadoCancioneroNivel,
  guardarLetraEnCancionero,
  guardarLinkEnCancionero,
  type CancioneroFormData,
} from "@/lib/cancionero";
import {
  buscarEnCancionero,
  loadCancionesParaBusqueda,
} from "@/lib/sala-data";
import {
  addColaLocalItem,
  avanzarColaLocal,
  getColaLocalItems,
  verAhoraColaLocal,
} from "@/lib/offline/cola-local-store";
import { createClient } from "@/lib/supabase/client";
import type {
  CancionCancionero,
  ResultadoBusquedaBuscador,
  UsuarioCancion,
} from "@/types";
import {
  Eye,
  ArrowLeft,
  Bookmark,
  Check,
  Link2,
  ListPlus,
  Music,
  Search,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";

type BuscadorModalProps = {
  open: boolean;
  onClose: () => void;
  onColaAdded?: () => void;
  /** Por defecto: sala (cola de la juntada). */
  variant?: "sala" | "home";
  salaId?: number;
  onDataChange?: () => Promise<void>;
  /** Solo variant home */
  usuarioLogueado?: boolean;
  hasActivaOPendiente?: boolean;
  onVerAhora?: (cancion: CancionInput) => Promise<void>;
  onAgregarALista?: (cancion: CancionInput) => Promise<void>;
  /** Solo variant sala: hay canción activa (para confirmar Ver ahora). */
  hasCancionActiva?: boolean;
};

type Pantalla = "busqueda" | "preview";

type ResultadosAgrupados = {
  cancionero: ResultadoBusquedaBuscador[];
  linksGuardados: ResultadoBusquedaBuscador[];
  internet: ResultadoBusquedaBuscador[];
};

type ConfirmacionGuardado = "letra" | "link" | null;

type GuardarLetraModalState = {
  nombre: string;
  artista: string;
  letra: string;
  url: string;
};

type FuenteHomeBusqueda = "general" | "mis_canciones";

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

function mapMisCancionAResultado(
  cancion: UsuarioCancion,
  premiumIds: ReadonlySet<number>,
): ResultadoBusquedaBuscador {
  if (cancion.cancion_guardada_id !== null) {
    return {
      titulo: cancion.nombre,
      artista: cancion.artista ?? "",
      url: `cancionero://${cancion.cancion_guardada_id}`,
      sitio: "Favoritas",
      fuente: "cancionero",
      id: cancion.cancion_guardada_id,
      tiene_cifrado_avanzado: premiumIds.has(cancion.cancion_guardada_id),
    };
  }

  return {
    titulo: cancion.nombre,
    artista: cancion.artista ?? "",
    url: cancion.url_letra ?? "",
    sitio: "Favoritas",
    fuente: "link-guardado",
  };
}

const CONFIRMACION_MS = 1500;

function toCancionInput(resultado: ResultadoBusquedaBuscador): CancionInput {
  const letraTexto = resultado.letra?.trim() || null;
  const { nombre, artista } = resolverNombreArtistaDisplay(
    resultado.titulo,
    resultado.artista,
  );

  return {
    nombre,
    artista: artista || null,
    url_letra:
      resultado.fuente === "cancionero"
        ? resultado.id != null
          ? `cancionero://${resultado.id}`
          : ""
        : resultado.url.trim(),
    letra_texto: letraTexto,
  };
}

function getCascadeDelay(index: number): string {
  return `${Math.min(index * CASCADE_STAGGER_MS, CASCADE_MAX_DELAY_MS)}ms`;
}

function scheduleCascade(
  count: number,
  setActive: (active: boolean) => void,
  timerRef: MutableRefObject<number | undefined>,
) {
  if (timerRef.current !== undefined) {
    window.clearTimeout(timerRef.current);
  }

  if (count <= 0) {
    setActive(false);
    return;
  }

  setActive(true);
  const duration =
    Math.min(count * CASCADE_STAGGER_MS, CASCADE_MAX_DELAY_MS) + 520;
  timerRef.current = window.setTimeout(() => {
    setActive(false);
    timerRef.current = undefined;
  }, duration);
}

function ResultadoItem({
  resultado,
  onSelect,
  premiumIds,
}: {
  resultado: ResultadoBusquedaBuscador;
  onSelect: (resultado: ResultadoBusquedaBuscador) => void;
  premiumIds: ReadonlySet<number>;
}) {
  const esCancionero = resultado.fuente === "cancionero";
  const esLinkGuardado = resultado.fuente === "link-guardado";
  const iconoTipo = getResultadoIconoTipo(resultado);
  const premium = isResultadoPremium(resultado, premiumIds);
  const { nombre, artista } = resolverNombreArtistaDisplay(
    resultado.titulo,
    resultado.artista,
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(resultado)}
      className={`relative flex w-full items-center gap-3 overflow-hidden rounded-[12px] border bg-bg-card px-3 py-3 text-left ${
        esCancionero
          ? "border-[var(--tuner-in-tune)]/35"
          : "border-border-card"
      }`}
    >
      {esCancionero && (
        <>
          <span
            className="absolute inset-y-0 left-0 w-1 bg-[var(--tuner-in-tune)]"
            aria-hidden="true"
          />
          <span
            className="absolute inset-y-0 right-0 w-1 bg-[var(--tuner-in-tune)]"
            aria-hidden="true"
          />
        </>
      )}
      <LetraFuenteIcon tipo={iconoTipo} premium={premium} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-semibold text-text-primary">
          {nombre}
        </p>
        {(artista || !esCancionero) && (
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            {artista ? (
              <p className="min-w-0 flex-1 truncate text-[14px] text-text-muted">
                {artista}
              </p>
            ) : (
              <span className="min-w-0 flex-1" aria-hidden="true" />
            )}
            {!esCancionero && (
              <SitioLetraBadge sitio={resultado.sitio} url={resultado.url} />
            )}
          </div>
        )}
      </div>
      {esLinkGuardado && (
        <Link2
          className="absolute top-2 right-2 size-3.5 shrink-0 text-[#8BA4C4]"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function SeccionResultados({
  label,
  icon,
  resultados,
  onSelect,
  premiumIds,
  cascadeActive = false,
  cascadeStartIndex = 0,
  trailing,
}: {
  label: string;
  icon?: ReactNode;
  resultados: ResultadoBusquedaBuscador[];
  onSelect: (resultado: ResultadoBusquedaBuscador) => void;
  premiumIds: ReadonlySet<number>;
  cascadeActive?: boolean;
  cascadeStartIndex?: number;
  trailing?: ReactNode;
}) {
  if (resultados.length === 0 && !trailing) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <p className="text-[10px] font-medium uppercase tracking-[1.5px] text-text-faint">
          {label}
        </p>
      </div>
      {resultados.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {resultados.map((resultado, index) => (
            <li
              key={resultadoKey(resultado)}
              className={cascadeActive ? "cancionero-item-cascade" : undefined}
              style={
                cascadeActive
                  ? { animationDelay: getCascadeDelay(cascadeStartIndex + index) }
                  : undefined
              }
            >
              <ResultadoItem
                resultado={resultado}
                onSelect={onSelect}
                premiumIds={premiumIds}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {trailing}
    </div>
  );
}

export default function BuscadorModal({
  open,
  onClose,
  onColaAdded,
  variant = "sala",
  salaId,
  onDataChange,
  usuarioLogueado = false,
  hasActivaOPendiente = false,
  onVerAhora,
  onAgregarALista,
  hasCancionActiva = false,
}: BuscadorModalProps) {
  const isHome = variant === "home";
  const online = useOnlineStatus();
  const premiumIds = usePremiumCancioneroIds();
  const inputRef = useRef<HTMLInputElement>(null);
  const pantallaRef = useRef<Pantalla>("busqueda");
  const confirmacionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const localCascadeTimerRef = useRef<number | undefined>(undefined);
  const internetCascadeTimerRef = useRef<number | undefined>(undefined);

  const [pantalla, setPantalla] = useState<Pantalla>("busqueda");
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ResultadosAgrupados>({
    cancionero: [],
    linksGuardados: [],
    internet: [],
  });
  const [seleccionado, setSeleccionado] =
    useState<ResultadoBusquedaBuscador | null>(null);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingInternet, setLoadingInternet] = useState(false);
  const [accionLoading, setAccionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [confirmacion, setConfirmacion] = useState<ConfirmacionGuardado>(null);
  const [fabGuardarAbierto, setFabGuardarAbierto] = useState(false);
  const [embedTopRevealed, setEmbedTopRevealed] = useState(false);
  const [guardarLetraModal, setGuardarLetraModal] =
    useState<GuardarLetraModalState | null>(null);
  const [cancionesCancionero, setCancionesCancionero] = useState<
    CancionCancionero[]
  >([]);
  const [localCascadeActive, setLocalCascadeActive] = useState(false);
  const [internetCascadeActive, setInternetCascadeActive] = useState(false);
  const [fuenteHome, setFuenteHome] = useState<FuenteHomeBusqueda>("general");
  const [misCanciones, setMisCanciones] = useState<UsuarioCancion[]>([]);
  const [loadingMisCanciones, setLoadingMisCanciones] = useState(false);
  const [previewEsMisCanciones, setPreviewEsMisCanciones] = useState(false);
  const [promptMisCanciones, setPromptMisCanciones] = useState<{
    nombre: string;
    artista: string | null;
    cancion_guardada_id?: number | null;
    url_letra?: string | null;
  } | null>(null);
  const [promptVerAhoraSala, setPromptVerAhoraSala] = useState(false);
  const [guardadoRecienteId, setGuardadoRecienteId] = useState<number | null>(
    null,
  );

  const resultadosEnInternet = useMemo(
    () => [...resultados.linksGuardados, ...resultados.internet],
    [resultados.linksGuardados, resultados.internet],
  );

  const totalResultados =
    resultados.cancionero.length + resultadosEnInternet.length;

  const resetState = useCallback(() => {
    if (confirmacionTimerRef.current) {
      clearTimeout(confirmacionTimerRef.current);
      confirmacionTimerRef.current = null;
    }

    pantallaRef.current = "busqueda";
    setPantalla("busqueda");
    setQuery("");
    setResultados({ cancionero: [], linksGuardados: [], internet: [] });
    setSeleccionado(null);
    setLoadingLocal(false);
    setLoadingInternet(false);
    setAccionLoading(false);
    setError(null);
    setBusquedaRealizada(false);
    setConfirmacion(null);
    setFabGuardarAbierto(false);
    setEmbedTopRevealed(false);
    setGuardarLetraModal(null);
    setCancionesCancionero([]);
    setLocalCascadeActive(false);
    setInternetCascadeActive(false);
    setFuenteHome("general");
    setMisCanciones([]);
    setLoadingMisCanciones(false);
    setPreviewEsMisCanciones(false);
    setPromptMisCanciones(null);
    setPromptVerAhoraSala(false);
    setGuardadoRecienteId(null);

    if (localCascadeTimerRef.current !== undefined) {
      window.clearTimeout(localCascadeTimerRef.current);
      localCascadeTimerRef.current = undefined;
    }

    if (internetCascadeTimerRef.current !== undefined) {
      window.clearTimeout(internetCascadeTimerRef.current);
      internetCascadeTimerRef.current = undefined;
    }
  }, []);

  const cargarCancionesCancionero = useCallback(async () => {
    const canciones = await loadCancionesParaBusqueda(
      online ? createClient() : undefined,
    );
    setCancionesCancionero(
      canciones.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        artista: c.artista,
        letra: c.letra,
        tiene_cifrado_avanzado: c.tiene_cifrado_avanzado ?? false,
        user_id: c.user_id ?? null,
      })),
    );
  }, [online]);

  const syncMisCancionesResultados = useCallback(
    (searchQuery: string, animate = false) => {
      const filtradas = filterMisCanciones(misCanciones, searchQuery).map(
        (cancion) => mapMisCancionAResultado(cancion, premiumIds),
      );

      setResultados({
        cancionero: filtradas,
        linksGuardados: [],
        internet: [],
      });
      setBusquedaRealizada(true);
      setLoadingLocal(false);
      setLoadingInternet(false);
      setError(null);
      setLocalCascadeActive(false);

      if (animate && filtradas.length > 0) {
        scheduleCascade(
          filtradas.length,
          setLocalCascadeActive,
          localCascadeTimerRef,
        );
      }
    },
    [misCanciones, premiumIds],
  );

  const handleClose = useCallback(() => {
    onClose();
    resetState();
  }, [onClose, resetState]);

  useHardwareBack(open, () => {
    if (fabGuardarAbierto) {
      setFabGuardarAbierto(false);
      return;
    }

    if (promptVerAhoraSala) {
      setPromptVerAhoraSala(false);
      return;
    }

    if (confirmacion) {
      setConfirmacion(null);
      return;
    }

    if (pantallaRef.current === "preview") {
      handleVolver();
      return;
    }

    handleClose();
  });

  useEffect(() => {
    if (open && isHome && usuarioLogueado) {
      setLoadingMisCanciones(true);
      const supabase = createClient();
      void getMisCanciones(supabase)
        .then(setMisCanciones)
        .catch(() => setMisCanciones([]))
        .finally(() => setLoadingMisCanciones(false));
    }
  }, [open, isHome, usuarioLogueado]);

  useEffect(() => {
    if (
      !open ||
      !isHome ||
      fuenteHome !== "mis_canciones" ||
      !usuarioLogueado ||
      loadingMisCanciones
    ) {
      return;
    }

    syncMisCancionesResultados(query, false);
  }, [
    open,
    isHome,
    fuenteHome,
    usuarioLogueado,
    query,
    misCanciones,
    loadingMisCanciones,
    syncMisCancionesResultados,
  ]);

  useEffect(() => {
    if (open) {
      resetState();
      void cargarCancionesCancionero().catch(() => {
        // La búsqueda local sigue funcionando aunque falle esta carga.
      });
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open, resetState, cargarCancionesCancionero]);

  useEffect(() => {
    return () => {
      if (confirmacionTimerRef.current) {
        clearTimeout(confirmacionTimerRef.current);
      }

      if (localCascadeTimerRef.current !== undefined) {
        window.clearTimeout(localCascadeTimerRef.current);
      }

      if (internetCascadeTimerRef.current !== undefined) {
        window.clearTimeout(internetCascadeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    pantallaRef.current = pantalla;
  }, [pantalla]);

  function dismissKeyboard() {
    inputRef.current?.blur();

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  function mostrarConfirmacion(tipo: Exclude<ConfirmacionGuardado, null>) {
    setConfirmacion(tipo);

    if (confirmacionTimerRef.current) {
      clearTimeout(confirmacionTimerRef.current);
    }

    confirmacionTimerRef.current = setTimeout(() => {
      setConfirmacion(null);
      confirmacionTimerRef.current = null;
    }, CONFIRMACION_MS);
  }

  async function handleSearch(event?: FormEvent) {
    event?.preventDefault();

    if (isHome && fuenteHome === "mis_canciones") {
      dismissKeyboard();
      return;
    }

    const trimmed = query.trim();

    if (!trimmed) {
      return;
    }

    dismissKeyboard();

    setLoadingLocal(true);
    setLoadingInternet(true);
    setError(null);
    setBusquedaRealizada(true);
    setResultados({ cancionero: [], linksGuardados: [], internet: [] });
    setLocalCascadeActive(false);
    setInternetCascadeActive(false);

    try {
      const canciones = await loadCancionesParaBusqueda(
        online ? createClient() : undefined,
      );
      setCancionesCancionero(
        canciones.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          artista: c.artista,
          letra: c.letra,
          tiene_cifrado_avanzado: c.tiene_cifrado_avanzado ?? false,
          user_id: c.user_id ?? null,
        })),
      );

      const paso1 = buscarEnCancionero(trimmed, canciones, { conLetra: true });
      const paso2 = online
        ? buscarEnCancionero(trimmed, canciones, { soloLink: true })
        : [];

      setResultados({
        cancionero: paso1.map((c) =>
          mapCancionLocalAResultado(c, "cancionero"),
        ),
        linksGuardados: paso2.map((c) =>
          mapCancionLocalAResultado(c, "link-guardado"),
        ),
        internet: [],
      });
      scheduleCascade(
        paso1.length + paso2.length,
        setLocalCascadeActive,
        localCascadeTimerRef,
      );
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : online
            ? "Error al buscar en el cancionero"
            : "Error al buscar en el cancionero local",
      );
    } finally {
      setLoadingLocal(false);
    }

    if (!online) {
      setLoadingInternet(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/buscar-letra?q=${encodeURIComponent(trimmed)}`,
      );
      const data = (await response.json()) as
        | ResultadoBusquedaBuscador[]
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Error al buscar en internet",
        );
      }

      const internet = (Array.isArray(data) ? data : []).map((item) => {
        const { nombre, artista } = resolverNombreArtistaDisplay(
          item.titulo,
          item.artista,
        );

        return {
          ...item,
          titulo: nombre,
          artista,
          fuente: "internet" as const,
        };
      });

      setResultados((current) => ({
        ...current,
        internet,
      }));
      scheduleCascade(
        internet.length,
        setInternetCascadeActive,
        internetCascadeTimerRef,
      );
    } catch (searchError) {
      if (pantallaRef.current === "busqueda") {
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Error al buscar en internet",
        );
      }
    } finally {
      setLoadingInternet(false);
    }
  }

  function handleSelectResultado(resultado: ResultadoBusquedaBuscador) {
    dismissKeyboard();
    setSeleccionado(resultado);
    setPreviewEsMisCanciones(isHome && fuenteHome === "mis_canciones");
    setConfirmacion(null);
    setFabGuardarAbierto(false);
    setEmbedTopRevealed(false);
    setPromptVerAhoraSala(false);
    setError(null);
    pantallaRef.current = "preview";
    setPantalla("preview");
  }

  function handleVolver() {
    pantallaRef.current = "busqueda";
    setPantalla("busqueda");
    setSeleccionado(null);
    setConfirmacion(null);
    setFabGuardarAbierto(false);
    setEmbedTopRevealed(false);
    setPromptVerAhoraSala(false);
    setError(null);
  }

  async function handleVerAhoraHome() {
    if (!seleccionado || accionLoading || !onVerAhora) {
      return;
    }

    setAccionLoading(true);
    setError(null);

    try {
      await onVerAhora(toCancionInput(seleccionado));
      handleClose();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Error al mostrar la canción",
      );
    } finally {
      setAccionLoading(false);
    }
  }

  async function handleVerAhoraSala() {
    if (!seleccionado || accionLoading || salaId == null) {
      return;
    }

    setAccionLoading(true);
    setError(null);
    setPromptVerAhoraSala(false);

    try {
      if (!online) {
        await verAhoraColaLocal(salaId, toCancionInput(seleccionado));
        await onDataChange?.();
        onColaAdded?.();
        handleClose();
        return;
      }

      const response = await fetch("/api/cola/ver-ahora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          salaId,
          cancion: toCancionInput(seleccionado),
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Error al mostrar la canción");
      }

      await onDataChange?.();
      onColaAdded?.();
      handleClose();
    } catch (actionError) {
      setError(
        formatDatabaseError(actionError, "Error al mostrar la canción"),
      );
    } finally {
      setAccionLoading(false);
    }
  }

  function handleVerAhoraTap() {
    if (accionLoading) {
      return;
    }

    if (isHome) {
      void handleVerAhoraHome();
      return;
    }

    if (hasCancionActiva) {
      setPromptVerAhoraSala(true);
      return;
    }

    void handleVerAhoraSala();
  }

  async function handleAgregarAListaHome() {
    if (!seleccionado || accionLoading || !onAgregarALista) {
      return;
    }

    setAccionLoading(true);
    setError(null);

    try {
      await onAgregarALista(toCancionInput(seleccionado));
      handleVolver();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Error al agregar a la lista",
      );
    } finally {
      setAccionLoading(false);
    }
  }

  async function handleAgregarACola() {
    if (!seleccionado || accionLoading || salaId == null) {
      return;
    }

    setAccionLoading(true);
    setError(null);

    try {
      if (!online) {
        await addColaLocalItem(salaId, toCancionInput(seleccionado));

        const localItems = await getColaLocalItems(salaId);
        const tieneActiva = localItems.some((item) => item.estado === "activa");

        if (!tieneActiva) {
          const primeraPendiente = localItems.find(
            (item) => item.estado === "pendiente",
          );

          if (primeraPendiente) {
            await avanzarColaLocal(salaId, primeraPendiente.id);
          }
        }

        await onDataChange?.();
        handleVolver();
        return;
      }

      const response = await fetch("/api/cola/agregar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          salaId,
          cancion: toCancionInput(seleccionado),
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Error al agregar a la fila");
      }

      await onDataChange?.();
      handleVolver();
    } catch (actionError) {
      setError(
        formatDatabaseError(actionError, "Error al agregar a la fila"),
      );
    } finally {
      setAccionLoading(false);
    }
  }

  function maybePromptMisCanciones(
    nombre: string,
    artista: string | null,
    cancionGuardadaId?: number | null,
    urlLetra?: string | null,
  ) {
    if (!isHome || !usuarioLogueado) {
      return;
    }

    setPromptMisCanciones({
      nombre,
      artista,
      cancion_guardada_id: cancionGuardadaId ?? guardadoRecienteId,
      url_letra: urlLetra ?? seleccionado?.url ?? null,
    });
  }

  async function handleGuardarLink() {
    if (!seleccionado || accionLoading) {
      return;
    }

    setAccionLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const { nombre, artista } = resolverNombreArtistaDisplay(
        seleccionado.titulo,
        seleccionado.artista,
      );

      await guardarLinkEnCancionero(supabase, {
        nombre,
        artista: artista || null,
        url_letra: seleccionado.url,
      });
      await onDataChange?.();
      setFabGuardarAbierto(false);
      mostrarConfirmacion("link");
      maybePromptMisCanciones(nombre, artista || null, null, seleccionado.url);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Error al guardar el link",
      );
    } finally {
      setAccionLoading(false);
    }
  }

  async function handleGuardarLetraDesdeModal(form: CancioneroFormData) {
    if (!guardarLetraModal) {
      return;
    }

    const supabase = createClient();

    await guardarLetraEnCancionero(supabase, {
      nombre: form.nombre,
      artista: form.artista,
      letra: form.letra,
      url_letra: guardarLetraModal.url,
    });
  }

  async function handleGuardarLetraCompleta() {
    if (!seleccionado || accionLoading) {
      return;
    }

    setAccionLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/obtener-letra?url=${encodeURIComponent(seleccionado.url)}`,
      );
      const data = (await response.json()) as {
        letra?: string;
        error?: string;
      };

      if (!response.ok || !data.letra?.trim()) {
        throw new Error(
          data.error ?? "No se pudo extraer la letra de esta canción",
        );
      }

      const { nombre, artista } = resolverNombreArtistaDisplay(
        seleccionado.titulo,
        seleccionado.artista,
      );

      setGuardarLetraModal({
        nombre,
        artista,
        letra: data.letra,
        url: seleccionado.url,
      });
      setFabGuardarAbierto(false);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Error al guardar la letra",
      );
    } finally {
      setAccionLoading(false);
    }
  }

  const esCancioneroPreview = seleccionado?.fuente === "cancionero";
  const esLinkGuardadoPreview = seleccionado?.fuente === "link-guardado";
  const esInternetPreview = seleccionado?.fuente === "internet";
  const esAcordesSitio =
    seleccionado &&
    esAcordesDeCanciones(seleccionado.sitio, seleccionado.url);
  const esCifraSitio =
    seleccionado && esCifraClub(seleccionado.sitio, seleccionado.url);

  const seleccionadoDisplay = useMemo(() => {
    if (!seleccionado) {
      return null;
    }

    return resolverNombreArtistaDisplay(
      seleccionado.titulo,
      seleccionado.artista,
    );
  }, [seleccionado]);

  const duplicadoCompletoEnPreview = useMemo(() => {
    if (!seleccionadoDisplay) {
      return false;
    }

    return (
      getDuplicadoCancioneroNivel(
        cancionesCancionero,
        seleccionadoDisplay.nombre,
        seleccionadoDisplay.artista,
      ) === "nombre-artista"
    );
  }, [seleccionadoDisplay, cancionesCancionero]);

  const guardarDeshabilitado =
    !online ||
    (isHome && !usuarioLogueado) ||
    Boolean(
      esCancioneroPreview ||
        (esLinkGuardadoPreview && esCifraSitio) ||
        duplicadoCompletoEnPreview,
    );

  const guardarAccionDirecta = Boolean(esInternetPreview && esCifraSitio);

  const guardarAbreFab = Boolean(
    (esInternetPreview && esAcordesSitio) ||
      (esLinkGuardadoPreview && esAcordesSitio),
  );

  const fabMuestraLink = Boolean(esInternetPreview && esAcordesSitio);
  const fabMuestraCancion = Boolean(
    (esInternetPreview && esAcordesSitio) ||
      (esLinkGuardadoPreview && esAcordesSitio),
  );

  const previewConLetraLocal =
    (seleccionado?.fuente === "cancionero" ||
      seleccionado?.fuente === "link-guardado") &&
    Boolean(seleccionado.letra?.trim());

  const previewIframeConRecorteInicial = Boolean(
    seleccionado &&
      !previewConLetraLocal &&
      (esInternetPreview || esLinkGuardadoPreview) &&
      shouldApplyEmbedInitialOffset(seleccionado.url),
  );

  const previewEmbedOffsetPx =
    previewIframeConRecorteInicial && !embedTopRevealed && seleccionado
      ? getEmbedTopClipPx(seleccionado.url)
      : undefined;

  const previewEmbedBottomClipPx =
    previewIframeConRecorteInicial && seleccionado
      ? getEmbedBottomClipPx(seleccionado.url)
      : undefined;

  const previewIconoTipo = seleccionado
    ? getResultadoIconoTipo(seleccionado)
    : "cifra";

  const previewMuestraPaginaWeb = Boolean(
    seleccionado && !previewConLetraLocal,
  );

  const previewOrigenExplicacion = (() => {
    if (!seleccionado || !previewMuestraPaginaWeb) {
      return null;
    }

    if (esCifraSitio) {
      return "Se muestra como página web de Cifra Club, con menús y elementos del sitio.";
    }

    if (esAcordesSitio) {
      return "Se muestra como página web. Al guardar la letra completa se ve en hoja blanca.";
    }

    return "Se muestra como página web.";
  })();

  function handleGuardarTap() {
    if (!seleccionado || guardarDeshabilitado || accionLoading) {
      return;
    }

    if (guardarAccionDirecta) {
      void handleGuardarLink();
      return;
    }

    if (guardarAbreFab) {
      setFabGuardarAbierto((abierto) => !abierto);
    }
  }

  const mostrandoMisCanciones =
    isHome && fuenteHome === "mis_canciones" && usuarioLogueado;
  const buscadorCargando =
    loadingLocal || (mostrandoMisCanciones && loadingMisCanciones);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-darker lg:bg-black/55 lg:p-6 lg:backdrop-blur-sm">
      <div className="relative min-h-0 flex-1 overflow-hidden lg:mx-auto lg:max-h-[min(92vh,820px)] lg:w-full lg:max-w-3xl lg:rounded-2xl lg:border lg:border-border lg:bg-bg-darker lg:shadow-2xl">
        <section
          className="absolute inset-0 flex flex-col transition-transform duration-350"
          style={{
            transform:
              pantalla === "preview" ? "translateY(-100%)" : "translateY(0)",
            transitionTimingFunction: "var(--transition-timing)",
          }}
        >
          <header className="shrink-0 border-b border-border px-4 py-3">
            <form className="flex items-center gap-3" onSubmit={handleSearch}>
              <button
                type="button"
                aria-label="Cerrar buscador"
                onClick={handleClose}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
              >
                <X className="size-5 text-text-primary" aria-hidden="true" />
              </button>

              <input
                ref={inputRef}
                type="text"
                inputMode="search"
                enterKeyHint="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  mostrandoMisCanciones
                    ? "Filtrar favoritas..."
                    : "Buscar canción..."
                }
                autoFocus
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="min-h-11 flex-1 rounded-[10px] border border-border bg-bg-card px-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
              />

              <button
                type="submit"
                aria-label="Buscar"
                disabled={
                  buscadorCargando ||
                  (!mostrandoMisCanciones && !query.trim())
                }
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent disabled:opacity-60"
              >
                <Search className="size-5 text-white" aria-hidden="true" />
              </button>
            </form>

            {isHome ? (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFuenteHome("general");
                    setBusquedaRealizada(false);
                    setResultados({
                      cancionero: [],
                      linksGuardados: [],
                      internet: [],
                    });
                  }}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                    fuenteHome === "general"
                      ? "bg-accent text-white"
                      : "bg-bg-card text-text-muted"
                  }`}
                >
                  General
                </button>
                <button
                  type="button"
                  disabled={!usuarioLogueado}
                  onClick={() => {
                    setFuenteHome("mis_canciones");
                    setError(null);
                    if (!loadingMisCanciones && misCanciones.length > 0) {
                      syncMisCancionesResultados(query, true);
                    }
                  }}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold disabled:opacity-40 ${
                    fuenteHome === "mis_canciones"
                      ? "bg-accent text-white"
                      : "bg-bg-card text-text-muted"
                  }`}
                >
                  Favoritas
                </button>
              </div>
            ) : null}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {buscadorCargando && <BuscadorSearchSkeleton />}

            {!buscadorCargando && error && totalResultados === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Music
                  className="size-10 text-text-faint"
                  aria-hidden="true"
                />
                <p className="text-sm text-text-muted">{error}</p>
              </div>
            )}

            {!buscadorCargando && !error && !busquedaRealizada && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Music
                  className="size-10 text-text-faint"
                  aria-hidden="true"
                />
                <p className="text-sm text-text-muted">
                  Escribí el nombre de la canción o el artista
                </p>
              </div>
            )}

            {!buscadorCargando &&
              busquedaRealizada &&
              totalResultados === 0 &&
              !loadingInternet && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Music
                    className="size-10 text-text-faint"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-text-muted">
                    {mostrandoMisCanciones && misCanciones.length === 0
                      ? "No tenés canciones guardadas en Favoritas"
                      : "No encontramos resultados para tu búsqueda"}
                  </p>
                </div>
              )}

            {!buscadorCargando && (totalResultados > 0 || loadingInternet) && (
              <>
                {resultados.cancionero.length > 0 ? (
                  <SeccionResultados
                    label={
                      isHome && fuenteHome === "mis_canciones"
                        ? "Favoritas"
                        : "Del cancionero"
                    }
                    icon={
                      <Bookmark
                        className="size-3.5 shrink-0"
                        style={{ color: "var(--tuner-in-tune)" }}
                        aria-hidden="true"
                      />
                    }
                    resultados={resultados.cancionero}
                    onSelect={handleSelectResultado}
                    premiumIds={premiumIds}
                    cascadeActive={localCascadeActive}
                  />
                ) : null}
                {(resultados.linksGuardados.length > 0 ||
                  resultados.internet.length > 0 ||
                  loadingInternet) && (
                  <SeccionResultados
                    label="En internet"
                    icon={
                      <Link2
                        className="size-3.5 shrink-0 text-[#8BA4C4]"
                        aria-hidden="true"
                      />
                    }
                    resultados={resultados.linksGuardados}
                    onSelect={handleSelectResultado}
                    premiumIds={premiumIds}
                    cascadeActive={localCascadeActive}
                    cascadeStartIndex={resultados.cancionero.length}
                    trailing={
                      <>
                        {resultados.internet.length > 0 ? (
                          <ul className="mt-2 flex flex-col gap-2">
                            {resultados.internet.map((resultado, index) => (
                              <li
                                key={resultadoKey(resultado)}
                                className={
                                  internetCascadeActive
                                    ? "cancionero-item-cascade"
                                    : undefined
                                }
                                style={
                                  internetCascadeActive
                                    ? { animationDelay: getCascadeDelay(index) }
                                    : undefined
                                }
                              >
                                <ResultadoItem
                                  resultado={resultado}
                                  onSelect={handleSelectResultado}
                                  premiumIds={premiumIds}
                                />
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {loadingInternet ? (
                          <BuscadorInternetPendingSkeleton />
                        ) : null}
                      </>
                    }
                  />
                )}
              </>
            )}
          </div>
        </section>

        <section
          className="absolute inset-0 flex flex-col transition-transform duration-350"
          style={{
            transform:
              pantalla === "preview" ? "translateY(0)" : "translateY(100%)",
            transitionTimingFunction: "var(--transition-timing)",
          }}
        >
          {seleccionado && (
            <>
              <header className="shrink-0 border-b border-border px-4 py-1.5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Volver a resultados"
                    onClick={handleVolver}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
                  >
                    <ArrowLeft
                      className="size-5 text-text-primary"
                      aria-hidden="true"
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-extrabold text-text-primary">
                      {seleccionadoDisplay?.nombre ?? seleccionado.titulo}
                    </h2>
                    <p className="truncate text-[12px] text-text-muted">
                      {seleccionadoDisplay?.artista
                        ? `${seleccionadoDisplay.artista} · ${seleccionado.sitio}`
                        : seleccionado.sitio}
                    </p>
                  </div>
                </div>
              </header>

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-preview-frame pt-1.5 pb-2">
                <p className="mb-1 shrink-0 px-[10%] text-xs font-semibold uppercase tracking-wide text-[#f8f8f8]">
                  Previsualización
                </p>
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="relative mx-[10%] h-[80%] min-h-0 overflow-hidden rounded-[12px] border-2 border-dashed border-accent/85 shadow-[0_10px_40px_rgba(0,0,0,0.48),0_4px_12px_rgba(0,0,0,0.28)]">
                    {!previewConLetraLocal && previewIframeConRecorteInicial ? (
                      <LetraRevealTopControl
                        onRevealTop={() => setEmbedTopRevealed(true)}
                        className="top-2"
                      />
                    ) : null}
                    {previewConLetraLocal ? (
                      <div className="h-full min-h-0 overflow-y-auto bg-letra-bg">
                        <LetraTexto texto={seleccionado.letra!} />
                      </div>
                    ) : (
                      <LetraViewer
                        url={seleccionado.url}
                        fill
                        initialScrollOffsetPx={previewEmbedOffsetPx}
                        initialScrollBottomOffsetPx={previewEmbedBottomClipPx}
                      />
                    )}

                    {fabGuardarAbierto && fabMuestraCancion && (
                      <>
                        <button
                          type="button"
                          aria-label="Cerrar opciones de guardado"
                          className="absolute inset-0 z-10"
                          onClick={() => setFabGuardarAbierto(false)}
                        />
                        <div className="absolute bottom-3 right-2 z-20 flex flex-col gap-2">
                          <TapButton
                            aria-label={
                              esLinkGuardadoPreview
                                ? "Guardar canción"
                                : "Guardar letra completa"
                            }
                            disabled={accionLoading}
                            onClick={() => void handleGuardarLetraCompleta()}
                            className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-2 text-sm font-semibold text-text-primary shadow-[0_6px_20px_rgba(0,0,0,0.38)] disabled:opacity-60"
                          >
                            <Bookmark className="size-4 shrink-0 text-accent" />
                            {accionLoading
                              ? "Cargando letra..."
                              : esLinkGuardadoPreview
                                ? "Guardar canción"
                                : "Guardar letra completa"}
                          </TapButton>
                          {fabMuestraLink && (
                            <TapButton
                              aria-label="Guardar link"
                              disabled={accionLoading}
                              onClick={() => void handleGuardarLink()}
                              className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-2 text-sm font-semibold text-text-primary shadow-[0_6px_20px_rgba(0,0,0,0.38)] disabled:opacity-60"
                            >
                              <Link2 className="size-4 shrink-0 text-accent" />
                              Guardar link
                            </TapButton>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mx-[10%] flex min-h-0 flex-1 flex-col justify-start gap-1 pt-2">
                    <div className="flex items-center gap-2">
                      <LetraFuenteIcon tipo={previewIconoTipo} compact />
                      {esCancioneroPreview ? (
                        <LetraFuenteSitioBadge variant="cancionero" />
                      ) : (
                        <SitioLetraBadge
                          sitio={seleccionado.sitio}
                          url={seleccionado.url}
                        />
                      )}
                    </div>
                    {previewOrigenExplicacion ? (
                      <p className="text-[11px] leading-snug text-[#f8f8f8]/85">
                        {previewOrigenExplicacion}
                      </p>
                    ) : null}
                  </div>
                </div>

                {confirmacion && (
                  <button
                    type="button"
                    aria-label="Cerrar confirmación"
                    onClick={() => setConfirmacion(null)}
                    className="absolute inset-0 z-30 flex items-center justify-center bg-black/40"
                  >
                    <div
                      role="status"
                      className="flex flex-col items-center gap-3 rounded-[16px] border border-border bg-bg-card px-8 py-6 shadow-xl"
                    >
                      <div
                        className="flex size-14 items-center justify-center rounded-full"
                        style={{ backgroundColor: "var(--tuner-in-tune)" }}
                      >
                        <Check
                          className="size-8 text-white"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="text-lg font-bold text-text-primary">
                        {confirmacion === "letra"
                          ? "¡Guardada!"
                          : "¡Link guardado!"}
                      </p>
                    </div>
                  </button>
                )}
              </div>

              <footer className="shrink-0 border-t border-border bg-bg-darker px-4 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
                <p className="mb-1 text-center text-sm font-bold text-accent">
                  ¿Confirmás la canción?
                </p>

                {error && (
                  <p className="mb-2 text-center text-sm text-accent">{error}</p>
                )}

                {isHome ? (
                  <div
                    className={`grid gap-1.5 ${
                      previewEsMisCanciones ? "grid-cols-2" : "grid-cols-3"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={accionLoading || !hasActivaOPendiente}
                      onClick={() => void handleAgregarAListaHome()}
                      className="flex min-h-10 flex-col items-center justify-center gap-0 rounded-[10px] bg-accent px-1 py-1 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      <ListPlus className="size-4 shrink-0" aria-hidden="true" />
                      <span className="text-center leading-tight">
                        Sumar a la lista
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={accionLoading}
                      onClick={handleVerAhoraTap}
                      className="flex min-h-10 flex-col items-center justify-center gap-0 rounded-[10px] px-1 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--accent) 48%, white)",
                      }}
                    >
                      <Eye className="size-4 shrink-0" aria-hidden="true" />
                      <span className="text-center leading-tight">Ver ahora</span>
                    </button>

                    {!previewEsMisCanciones ? (
                      <button
                        type="button"
                        disabled={accionLoading || guardarDeshabilitado}
                        onClick={handleGuardarTap}
                        className="flex min-h-10 flex-col items-center justify-center gap-0 rounded-[10px] border border-border bg-bg-card px-1 py-1 text-xs font-semibold text-text-primary disabled:border-border-subtle disabled:text-text-faint"
                      >
                        <Bookmark className="size-4 shrink-0" aria-hidden="true" />
                        <span className="text-center leading-tight">Guardar</span>
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      disabled={accionLoading}
                      onClick={() => void handleAgregarACola()}
                      className="flex min-h-10 flex-col items-center justify-center gap-0 rounded-[10px] bg-accent px-1 py-1 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      <ListPlus className="size-4 shrink-0" aria-hidden="true" />
                      <span className="text-center leading-tight">
                        Sumar a la lista
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={accionLoading}
                      onClick={handleVerAhoraTap}
                      className="flex min-h-10 flex-col items-center justify-center gap-0 rounded-[10px] px-1 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      style={{ backgroundColor: "var(--tuner-flat-sharp)" }}
                    >
                      <Eye className="size-4 shrink-0" aria-hidden="true" />
                      <span className="text-center leading-tight">Ver ahora</span>
                    </button>

                    <button
                      type="button"
                      disabled={accionLoading || guardarDeshabilitado}
                      onClick={handleGuardarTap}
                      className="flex min-h-10 flex-col items-center justify-center gap-0 rounded-[10px] border border-border bg-bg-card px-1 py-1 text-xs font-semibold text-text-primary disabled:border-border-subtle disabled:text-text-faint"
                    >
                      <Bookmark className="size-4 shrink-0" aria-hidden="true" />
                      <span className="text-center leading-tight">Guardar</span>
                    </button>
                  </div>
                )}
              </footer>
            </>
          )}
        </section>
      </div>

      {guardarLetraModal && (
        <CancioneroFormModal
          open
          title="Guardar en cancionero"
          cancionesExistentes={cancionesCancionero}
          initialValues={{
            nombre: guardarLetraModal.nombre,
            artista: guardarLetraModal.artista,
            letra: guardarLetraModal.letra,
          }}
          onSubmit={handleGuardarLetraDesdeModal}
          onClose={() => setGuardarLetraModal(null)}
          onSaved={() => {
            void onDataChange?.();
            void cargarCancionesCancionero();
            mostrarConfirmacion("letra");
            if (guardarLetraModal) {
              maybePromptMisCanciones(
                guardarLetraModal.nombre,
                guardarLetraModal.artista || null,
                guardadoRecienteId,
                guardarLetraModal.url,
              );
            }
            setGuardarLetraModal(null);
          }}
        />
      )}

      <ConfirmDialog
        open={promptVerAhoraSala}
        message="¿Ver esta canción ahora? Se va a quitar la canción activa que se está viendo."
        confirmLabel="Sí, ver ahora"
        cancelLabel="Cancelar"
        zIndex={60}
        onCancel={() => setPromptVerAhoraSala(false)}
        onConfirm={() => {
          void handleVerAhoraSala();
        }}
      />

      <ConfirmDialog
        open={promptMisCanciones !== null}
        message="¿Querés sumarla a Favoritas?"
        confirmLabel="Sí, sumar"
        cancelLabel="No, gracias"
        zIndex={60}
        onCancel={() => setPromptMisCanciones(null)}
        onConfirm={() => {
          if (!promptMisCanciones) {
            return;
          }

          const payload = promptMisCanciones;
          setPromptMisCanciones(null);
          const supabase = createClient();

          void agregarAMisCanciones(supabase, payload).catch((error) => {
            console.error("[mis-canciones] error al agregar", error);
          });
        }}
      />
    </div>
  );
}
