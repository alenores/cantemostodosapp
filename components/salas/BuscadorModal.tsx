"use client";
import VincularNombreArtista from "@/components/artistas/VincularNombreArtista";
import { artistaCoincideBusqueda, getAliasBusqueda } from "@/lib/artistas-alias-busqueda";

import {
  BuscadorInternetPendingSkeleton,
  BuscadorSearchSkeleton,
  CASCADE_MAX_DELAY_MS,
  CASCADE_STAGGER_MS,
} from "@/components/cancionero/CancioneroListSkeleton";
import AcordesEmbedPrimeraVezHint from "@/components/salas/AcordesEmbedPrimeraVezHint";
import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import ValidacionMarcaIcon from "@/components/cancionero/ValidacionMarcaIcon";
import { SitioLetraBadge } from "@/components/salas/LetraFuenteSitioBadge";
import LetraTexto from "@/components/salas/LetraTexto";
import LetraViewer, {
  LetraRevealFullControl,
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
import { useAcordesEmbedPrimeraVez } from "@/hooks/useAcordesEmbedPrimeraVez";
import { useAliasBusqueda } from "@/hooks/useAliasBusqueda";
import { useCategoriaUsuario } from "@/hooks/useCategoriaUsuario";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePremiumCancioneroIds } from "@/hooks/usePremiumCancioneroIds";
import { type CancionInput } from "@/lib/cola-logic";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatDatabaseError } from "@/lib/supabase/errors";
import { agregarAMisCanciones, getMisCanciones } from "@/lib/mis-canciones";
import {
  filterCancionesCancionero,
  getDuplicadoCancioneroNivel,
  guardarLetraEnCancionero,
  guardarLinkEnCancionero,
  type CancioneroFormData,
} from "@/lib/cancionero";
import { getArtistas } from "@/lib/artistas";
import {
  ARTISTAS_FOTOS_EVENT,
  artistasConFotoLocal,
  leerArtistasFotos,
} from "@/lib/offline/artista-fotos";
import { puedeSumarCanciones } from "@/lib/usuarios-categorias";
import {
  buscarEnCancionero,
  loadCancionesParaBusqueda,
  type CancionBusquedaLocal,
} from "@/lib/sala-data";
import {
  addColaLocalItem,
  avanzarColaLocal,
  getColaLocalItems,
  verAhoraColaLocal,
} from "@/lib/offline/cola-local-store";
import { createClient } from "@/lib/supabase/client";
import {
  getCancionPractica,
  listCancionesPractica,
  type CancionPracticaListItem,
} from "@/lib/canciones-practica";
import type {
  Artista,
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
  Music2,
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
    const matchesArtista = artistaCoincideBusqueda(cancion.artista, normalized, getAliasBusqueda(), cancion.nombre);
    return matchesNombre || Boolean(matchesArtista);
  });
}

function mapMisCancionAResultado(
  cancion: UsuarioCancion,
  premiumIds: ReadonlySet<number>,
  local?: CancionBusquedaLocal,
): ResultadoBusquedaBuscador {
  if (cancion.cancion_guardada_id !== null) {
    return {
      titulo: cancion.nombre,
      artista: cancion.artista ?? "",
      url: `cancionero://${cancion.cancion_guardada_id}`,
      sitio: "Favoritas",
      fuente: "cancionero",
      id: cancion.cancion_guardada_id,
      tiene_cifrado_avanzado:
        local?.tiene_cifrado_avanzado ??
        premiumIds.has(cancion.cancion_guardada_id),
      artista_id: local?.artista_id ?? null,
      validada: local?.validada ?? false,
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
  favoritaIds,
  artistaAvatarUrl,
}: {
  resultado: ResultadoBusquedaBuscador;
  onSelect: (resultado: ResultadoBusquedaBuscador) => void;
  premiumIds: ReadonlySet<number>;
  favoritaIds: ReadonlySet<number>;
  artistaAvatarUrl?: string | null;
}) {
  const esDelCancionero = resultado.fuente === "cancionero";
  const esPractica = resultado.fuente === "practica";
  const esCancionero = esDelCancionero || esPractica;
  const esLinkGuardado = resultado.fuente === "link-guardado";
  const iconoTipo = getResultadoIconoTipo(resultado);
  const premium = isResultadoPremium(resultado, premiumIds);
  const { nombre, artista } = resolverNombreArtistaDisplay(
    resultado.titulo,
    resultado.artista,
  );
  const esFavoritaDelUsuario =
    resultado.sitio === "Favoritas" ||
    (esDelCancionero && resultado.id != null && favoritaIds.has(resultado.id));
  const inicial = artista
    ? artista.charAt(0).toLocaleUpperCase("es")
    : "";

  return (
    <button
      type="button"
      onClick={() => onSelect(resultado)}
      className={`relative w-full overflow-hidden rounded-[12px] border bg-bg-card px-3 py-3 text-left ${
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
      <p className="truncate text-[17px] font-bold leading-tight text-text-primary">
        {nombre}
      </p>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <span className="flex size-[22px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#3a3a40] text-[11px] font-semibold text-white/80">
          {artistaAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artistaAvatarUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : inicial ? (
            inicial
          ) : (
            <Music2 className="size-3.5" aria-hidden="true" />
          )}
        </span>
        <p className="min-w-0 flex-1 truncate text-[14px] text-text-muted">
          {artista || "Artista sin indicar"}
        </p>
        <span className="flex shrink-0 items-center gap-1.5">
          {esDelCancionero ? (
            <LetraFuenteIcon
              tipo="cancionero"
              premium={premium}
              compact
            />
          ) : esPractica ? (
            <LetraFuenteIcon tipo="practica" compact />
          ) : (
            <LetraFuenteIcon tipo={iconoTipo} premium={premium} compact />
          )}
          {esDelCancionero && resultado.validada ? (
            <ValidacionMarcaIcon className="size-4" />
          ) : null}
          {esFavoritaDelUsuario ? (
            <Bookmark
              className="size-4 shrink-0 fill-current"
              style={{ color: "var(--tuner-in-tune)" }}
              aria-label="En Favoritas"
            />
          ) : null}
          {esLinkGuardado ? (
            <Link2
              className="size-3.5 shrink-0 text-[#8BA4C4]"
              aria-hidden="true"
            />
          ) : null}
          {!esCancionero && !esLinkGuardado ? (
            <SitioLetraBadge sitio={resultado.sitio} url={resultado.url} />
          ) : null}
        </span>
      </div>
    </button>
  );
}

function SeccionResultados({
  label,
  icon,
  resultados,
  onSelect,
  premiumIds,
  favoritaIds,
  fotoArtista,
  cascadeActive = false,
  cascadeStartIndex = 0,
  trailing,
}: {
  label: string;
  icon?: ReactNode;
  resultados: ResultadoBusquedaBuscador[];
  onSelect: (resultado: ResultadoBusquedaBuscador) => void;
  premiumIds: ReadonlySet<number>;
  favoritaIds: ReadonlySet<number>;
  fotoArtista: (resultado: ResultadoBusquedaBuscador) => string | null;
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
                favoritaIds={favoritaIds}
                artistaAvatarUrl={fotoArtista(resultado)}
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
  const aliasBusqueda = useAliasBusqueda();
  const categoria = useCategoriaUsuario();
  /** Solo dueño y amigos suman canciones al Cancionero: al resto no se le muestra «Guardar». */
  const puedeGuardarEnCancionero =
    (!isHome || usuarioLogueado) && puedeSumarCanciones(categoria);
  const premiumIds = usePremiumCancioneroIds();
  const inputRef = useRef<HTMLInputElement>(null);
  const pantallaRef = useRef<Pantalla>("busqueda");
  const confirmacionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const localCascadeTimerRef = useRef<number | undefined>(undefined);
  const internetCascadeTimerRef = useRef<number | undefined>(undefined);
  const webRequestRef = useRef(0);
  const cargaGenRef = useRef(0);

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
  const [webError, setWebError] = useState<string | null>(null);
  const [webQuery, setWebQuery] = useState<string | null>(null);
  const [cancioneroListo, setCancioneroListo] = useState(false);
  const [confirmacion, setConfirmacion] = useState<ConfirmacionGuardado>(null);
  const [fabGuardarAbierto, setFabGuardarAbierto] = useState(false);
  const [embedFullRevealed, setEmbedFullRevealed] = useState(false);
  const [guardarLetraModal, setGuardarLetraModal] =
    useState<GuardarLetraModalState | null>(null);
  const [cancionesCancionero, setCancionesCancionero] = useState<
    CancionCancionero[]
  >([]);
  const [cancionesLocales, setCancionesLocales] = useState<
    CancionBusquedaLocal[]
  >([]);
  const [practicaItems, setPracticaItems] = useState<CancionPracticaListItem[]>(
    [],
  );
  const [localCascadeActive, setLocalCascadeActive] = useState(false);
  const [internetCascadeActive, setInternetCascadeActive] = useState(false);
  const [fuenteHome, setFuenteHome] = useState<FuenteHomeBusqueda>("general");
  const [misCanciones, setMisCanciones] = useState<UsuarioCancion[]>([]);
  const [artistas, setArtistas] = useState<Artista[]>([]);
  const revokeFotosRef = useRef<() => void>(() => {});
  const [loadingMisCanciones, setLoadingMisCanciones] = useState(false);
  const [previewEsMisCanciones, setPreviewEsMisCanciones] = useState(false);
  const [promptVerAhoraSala, setPromptVerAhoraSala] = useState(false);
  const [guardadoRecienteId, setGuardadoRecienteId] = useState<number | null>(
    null,
  );

  const mostrandoMisCanciones =
    isHome && fuenteHome === "mis_canciones" && usuarioLogueado;
  const favoritaIds = useMemo(() => {
    const ids = new Set<number>();
    for (const cancion of misCanciones) {
      if (cancion.cancion_guardada_id != null) {
        ids.add(cancion.cancion_guardada_id);
      }
    }
    return ids;
  }, [misCanciones]);
  const artistasPorId = useMemo(
    () => new Map(artistas.map((artista) => [artista.id, artista])),
    [artistas],
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
    (resultado: ResultadoBusquedaBuscador) => {
      const porId = resultado.artista_id
        ? artistasPorId.get(resultado.artista_id)
        : null;
      const nombre = resultado.artista?.trim();
      return (
        porId?.avatar_url ??
        (nombre
          ? artistasPorNombre.get(nombre.toLocaleLowerCase("es"))?.avatar_url
          : null) ??
        null
      );
    },
    [artistasPorId, artistasPorNombre],
  );
  const webActiva = webQuery !== null && webQuery === query.trim();

  const resultadosCancioneroFiltrados = useMemo(() => {
    const conLetra = cancionesLocales.filter((cancion) =>
      Boolean(cancion.letra?.trim()),
    );
    const ranked = filterCancionesCancionero(conLetra, query, aliasBusqueda);
    const porId = new Map(conLetra.map((cancion) => [cancion.id, cancion]));

    return ranked.flatMap((cancion) => {
      const local = porId.get(cancion.id);
      return local ? [mapCancionLocalAResultado(local, "cancionero")] : [];
    });
  }, [aliasBusqueda, cancionesLocales, query]);

  const practicaFiltrados = useMemo(() => {
    if (!isHome || !usuarioLogueado || fuenteHome === "mis_canciones") {
      return [];
    }

    const normalized = query.trim().toLowerCase();

    return practicaItems
      .filter(
        (item) =>
          !normalized ||
          item.nombre.toLowerCase().includes(normalized) ||
          artistaCoincideBusqueda(
            item.artista,
            normalized,
            aliasBusqueda,
            item.nombre,
          ),
      )
      .map(
        (item): ResultadoBusquedaBuscador => ({
          id: item.id,
          titulo: item.nombre,
          artista: item.artista ?? "",
          url: `practica://${item.id}`,
          sitio: "Entrenador de canciones",
          fuente: "practica",
          tiene_cifrado_avanzado: false,
        }),
      );
  }, [aliasBusqueda, fuenteHome, isHome, practicaItems, query, usuarioLogueado]);

  const listaCancionero = mostrandoMisCanciones
    ? resultados.cancionero
    : [...resultadosCancioneroFiltrados, ...practicaFiltrados];

  const resetState = useCallback(() => {
    webRequestRef.current += 1;
    cargaGenRef.current += 1;

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
    setWebError(null);
    setWebQuery(null);
    setCancioneroListo(false);
    setConfirmacion(null);
    setFabGuardarAbierto(false);
    setEmbedFullRevealed(false);
    setGuardarLetraModal(null);
    setCancionesCancionero([]);
    setCancionesLocales([]);
    setPracticaItems([]);
    setLocalCascadeActive(false);
    setInternetCascadeActive(false);
    setFuenteHome("general");
    setMisCanciones([]);
    setArtistas([]);
    setLoadingMisCanciones(false);
    setPreviewEsMisCanciones(false);
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
    const generacion = ++cargaGenRef.current;
    setLoadingLocal(true);

    try {
      const canciones = await loadCancionesParaBusqueda(
        online ? createClient() : undefined,
      );

      if (cargaGenRef.current !== generacion) {
        return;
      }

      const ordenadas = [...canciones].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
      );

      setCancionesLocales(ordenadas);
      setCancionesCancionero(
        ordenadas.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          artista: c.artista,
          letra: c.letra,
          tiene_cifrado_avanzado: c.tiene_cifrado_avanzado ?? false,
          user_id: c.user_id ?? null,
        })),
      );
      setError(null);
    } catch (loadError) {
      if (cargaGenRef.current !== generacion) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Error al cargar el cancionero",
      );
    } finally {
      if (cargaGenRef.current === generacion) {
        setLoadingLocal(false);
        setCancioneroListo(true);
      }
    }
  }, [online]);

  const syncMisCancionesResultados = useCallback(
    (searchQuery: string, animate = false) => {
      const localesPorId = new Map(cancionesLocales.map((cancion) => [cancion.id, cancion]));
      const filtradas = filterMisCanciones(misCanciones, searchQuery).filter(cancion => online || cancionesCancionero.some(local => local.id === cancion.cancion_guardada_id && Boolean(local.letra?.trim()))).map(
        (cancion) =>
          mapMisCancionAResultado(
            cancion,
            premiumIds,
            cancion.cancion_guardada_id != null
              ? localesPorId.get(cancion.cancion_guardada_id)
              : undefined,
          ),
      );

      setResultados({
        cancionero: filtradas,
        linksGuardados: [],
        internet: [],
      });
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
    [misCanciones, premiumIds, online, cancionesCancionero, cancionesLocales],
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
    if (!open || (isHome && !usuarioLogueado)) {
      return;
    }

    setLoadingMisCanciones(true);
    const supabase = createClient();
    void getMisCanciones(supabase)
      .then(setMisCanciones)
      .catch(() => setMisCanciones([]))
      .finally(() => setLoadingMisCanciones(false));
  }, [open, isHome, usuarioLogueado]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelado = false;
    const supabase = createClient();

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
        if (!local?.blob || local.avatar_url !== artista.avatar_url) {
          return artista;
        }

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
      revokeFotosRef.current();
      revokeFotosRef.current = () => {};
    };
  }, [open, online]);

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
    aliasBusqueda,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelado = false;
    resetState();
    void cargarCancionesCancionero();

    if (isHome && usuarioLogueado) {
      void listCancionesPractica(createClient())
        .then((items) => {
          if (!cancelado) {
            setPracticaItems(items);
          }
        })
        .catch(() => {
          if (!cancelado) {
            setPracticaItems([]);
          }
        });
    }

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      cancelado = true;
    };
  }, [open, resetState, cargarCancionesCancionero, isHome, usuarioLogueado]);

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

  function handleQueryChange(value: string) {
    webRequestRef.current += 1;
    setQuery(value);
    setWebQuery(null);
    setWebError(null);
    setLoadingInternet(false);
    setInternetCascadeActive(false);
    setResultados((current) => ({
      ...current,
      linksGuardados: [],
      internet: [],
    }));
  }

  function handleFilterSubmit(event: FormEvent) {
    event.preventDefault();
    dismissKeyboard();
  }

  async function handleBuscarWeb() {
    const trimmed = query.trim();

    if (
      !trimmed ||
      !online ||
      mostrandoMisCanciones ||
      loadingInternet
    ) {
      return;
    }

    const requestId = ++webRequestRef.current;
    dismissKeyboard();
    setWebError(null);
    setLoadingInternet(true);
    setWebQuery(trimmed);
    setInternetCascadeActive(false);
    setResultados((current) => ({
      ...current,
      linksGuardados: [],
      internet: [],
    }));

    const links = buscarEnCancionero(trimmed, cancionesLocales, {
      soloLink: true,
    }).map((cancion) => mapCancionLocalAResultado(cancion, "link-guardado"));

    try {
      const response = await fetch(
        `/api/buscar-letra?q=${encodeURIComponent(trimmed)}`,
      );
      const data = (await response.json()) as
        | ResultadoBusquedaBuscador[]
        | { error?: string };

      if (webRequestRef.current !== requestId) {
        return;
      }

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
        linksGuardados: links,
        internet,
      }));
      scheduleCascade(
        links.length + internet.length,
        setInternetCascadeActive,
        internetCascadeTimerRef,
      );
    } catch (searchError) {
      if (webRequestRef.current !== requestId) {
        return;
      }

      setWebQuery(null);
      setWebError(
        searchError instanceof Error
          ? searchError.message
          : "Error al buscar en internet",
      );
      setResultados((current) => ({
        ...current,
        linksGuardados: [],
        internet: [],
      }));
    } finally {
      if (webRequestRef.current === requestId) {
        setLoadingInternet(false);
      }
    }
  }

  async function handleSelectResultado(resultado: ResultadoBusquedaBuscador) {
    dismissKeyboard();
    let elegido = resultado;

    if (
      resultado.fuente === "practica" &&
      resultado.id != null &&
      !resultado.letra?.trim()
    ) {
      try {
        const detalle = await getCancionPractica(createClient(), resultado.id);
        if (detalle?.letra?.trim()) {
          elegido = { ...resultado, letra: detalle.letra };
        }
      } catch {
        elegido = resultado;
      }
    }

    setSeleccionado(elegido);
    setPreviewEsMisCanciones((isHome && fuenteHome === "mis_canciones") || resultado.fuente === "practica");
    setConfirmacion(null);
    setFabGuardarAbierto(false);
    setEmbedFullRevealed(false);
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
    setEmbedFullRevealed(false);
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

      if (esAcordesDeCanciones(seleccionado.sitio, seleccionado.url)) {
        const supabase = createClient();
        await guardarLetraEnCancionero(supabase, {
          nombre,
          artista: artista || null,
          letra: data.letra,
          url_letra: seleccionado.url,
        });
        await onDataChange?.();
        await cargarCancionesCancionero();
        setFabGuardarAbierto(false);
        mostrarConfirmacion("letra");
        return;
      }

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
        seleccionado?.fuente === "practica" ||
        (esLinkGuardadoPreview && esCifraSitio) ||
        duplicadoCompletoEnPreview,
    );

  const guardarAccionDirecta = Boolean(
    esInternetPreview && (esCifraSitio || esAcordesSitio),
  );

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
      seleccionado?.fuente === "practica" ||
      seleccionado?.fuente === "link-guardado") &&
    Boolean(seleccionado.letra?.trim());

  const previewIframeConRecorteInicial = Boolean(
    seleccionado &&
      !previewConLetraLocal &&
      (esInternetPreview || esLinkGuardadoPreview) &&
      shouldApplyEmbedInitialOffset(seleccionado.url),
  );

  const previewEmbedOffsetPx =
    previewIframeConRecorteInicial && !embedFullRevealed && seleccionado
      ? getEmbedTopClipPx(seleccionado.url)
      : undefined;

  const previewEmbedUrl =
    previewIframeConRecorteInicial && seleccionado ? seleccionado.url : null;
  const { showAcordesPrimeraVezHint, dismissAcordesPrimeraVezHint } =
    useAcordesEmbedPrimeraVez(previewEmbedUrl);

  const previewEmbedBottomClipPx =
    previewIframeConRecorteInicial &&
    seleccionado &&
    !embedFullRevealed &&
    !showAcordesPrimeraVezHint
      ? getEmbedBottomClipPx(seleccionado.url)
      : undefined;

  function handleRevealEmbedFull() {
    if (!embedFullRevealed && showAcordesPrimeraVezHint) {
      dismissAcordesPrimeraVezHint();
    }
    setEmbedFullRevealed((current) => !current);
  }

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
    if (
      !seleccionado ||
      !puedeGuardarEnCancionero ||
      guardarDeshabilitado ||
      accionLoading
    ) {
      return;
    }

    if (guardarAccionDirecta) {
      if (esAcordesSitio) {
        void handleGuardarLetraCompleta();
      } else {
        void handleGuardarLink();
      }
      return;
    }

    if (guardarAbreFab) {
      setFabGuardarAbierto((abierto) => !abierto);
    }
  }

  const buscadorCargando =
    !cancioneroListo ||
    loadingLocal ||
    (mostrandoMisCanciones && loadingMisCanciones);
  const mensajeListaVacia = error
    ? error
    : mostrandoMisCanciones && misCanciones.length === 0
      ? "No tenés canciones guardadas en Favoritas"
      : !query.trim() && !mostrandoMisCanciones
        ? "No hay canciones en el cancionero"
        : "No encontramos resultados para tu búsqueda";
  const mostrarBotonWeb =
    !mostrandoMisCanciones &&
    Boolean(query.trim()) &&
    online &&
    !webActiva &&
    !loadingInternet;

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
            <form className="flex items-center gap-3" onSubmit={handleFilterSubmit}>
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
                enterKeyHint="done"
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                placeholder={
                  mostrandoMisCanciones
                    ? "Filtrar favoritas..."
                    : "Buscar por nombre, artista o letra..."
                }
                autoFocus
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="min-h-11 flex-1 rounded-[10px] border border-border bg-bg-card px-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
              />
            </form>

            <VincularNombreArtista texto={query} />

            {isHome ? (
              <div
                className="mt-3 h-[44px] flex w-full gap-1 rounded-full border border-border bg-bg-darker p-1"
                role="tablist"
                aria-label="Origen de búsqueda"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={fuenteHome === "general"}
                  onClick={() => {
                    webRequestRef.current += 1;
                    setFuenteHome("general");
                    setWebQuery(null);
                    setWebError(null);
                    setLoadingInternet(false);
                    setResultados((current) => ({
                      ...current,
                      linksGuardados: [],
                      internet: [],
                    }));
                  }}
                  className={`flex-1 h-full rounded-full px-4 text-xs font-bold transition-all flex items-center justify-center ${
                    fuenteHome === "general"
                      ? "bg-accent text-white shadow-sm"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  General
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={fuenteHome === "mis_canciones"}
                  disabled={!usuarioLogueado}
                  onClick={() => {
                    webRequestRef.current += 1;
                    setFuenteHome("mis_canciones");
                    setWebQuery(null);
                    setWebError(null);
                    setLoadingInternet(false);
                    setError(null);
                    if (!loadingMisCanciones && misCanciones.length > 0) {
                      syncMisCancionesResultados(query, true);
                    }
                  }}
                  className={`flex-1 h-full rounded-full px-4 text-xs font-bold transition-all flex items-center justify-center disabled:opacity-40 ${
                    fuenteHome === "mis_canciones"
                      ? "bg-accent text-white shadow-sm"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Favoritas
                </button>
              </div>
            ) : null}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {buscadorCargando && <BuscadorSearchSkeleton />}

            {!buscadorCargando && listaCancionero.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Music
                  className="size-10 text-text-faint"
                  aria-hidden="true"
                />
                <p className="text-sm text-text-muted">{mensajeListaVacia}</p>
              </div>
            )}

            {!buscadorCargando && listaCancionero.length > 0 && (
              <SeccionResultados
                label={mostrandoMisCanciones ? "Favoritas" : "Del cancionero"}
                icon={
                  <Bookmark
                    className="size-3.5 shrink-0"
                    style={{ color: "var(--tuner-in-tune)" }}
                    aria-hidden="true"
                  />
                }
                resultados={listaCancionero}
                onSelect={handleSelectResultado}
                premiumIds={premiumIds}
                favoritaIds={favoritaIds}
                fotoArtista={fotoArtista}
                cascadeActive={mostrandoMisCanciones && localCascadeActive}
              />
            )}

            {!buscadorCargando &&
              !mostrandoMisCanciones &&
              Boolean(query.trim()) &&
              !online &&
              !webActiva && (
                <p className="mt-2 text-center text-sm text-text-muted">
                  Para buscar en la web necesitás conexión
                </p>
              )}

            {!buscadorCargando && mostrarBotonWeb && (
              <div className="mt-2 flex flex-col gap-3">
                {webError ? (
                  <p className="text-center text-sm text-text-muted">{webError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleBuscarWeb()}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-bg-card px-4 text-sm font-bold text-text-primary"
                >
                  <Search className="size-4" aria-hidden="true" />
                  Buscar en la web
                </button>
              </div>
            )}

            {!buscadorCargando &&
              !mostrandoMisCanciones &&
              webActiva &&
              (resultados.linksGuardados.length > 0 ||
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
                  favoritaIds={favoritaIds}
                  fotoArtista={fotoArtista}
                  cascadeActive={internetCascadeActive}
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
                                favoritaIds={favoritaIds}
                                artistaAvatarUrl={fotoArtista(resultado)}
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

            {!buscadorCargando &&
              !mostrandoMisCanciones &&
              webActiva &&
              !loadingInternet &&
              resultados.linksGuardados.length === 0 &&
              resultados.internet.length === 0 && (
                <p className="py-6 text-center text-sm text-text-muted">
                  No encontramos resultados en la web
                </p>
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
                      <LetraRevealFullControl
                        onRevealFull={handleRevealEmbedFull}
                        expanded={embedFullRevealed}
                        className="absolute right-2 top-2"
                      />
                    ) : null}
                    {showAcordesPrimeraVezHint ? (
                      <AcordesEmbedPrimeraVezHint
                        onDismiss={dismissAcordesPrimeraVezHint}
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
                      {esCancioneroPreview ? null : (
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
                      previewEsMisCanciones || !puedeGuardarEnCancionero
                        ? "grid-cols-2"
                        : "grid-cols-[2fr_2fr_1fr]"
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

                    {!previewEsMisCanciones && puedeGuardarEnCancionero ? (
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
                  <div
                    className={`grid gap-1.5 ${
                      puedeGuardarEnCancionero ? "grid-cols-[2fr_2fr_1fr]" : "grid-cols-2"
                    }`}
                  >
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

                    {puedeGuardarEnCancionero ? (
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


    </div>
  );
}
