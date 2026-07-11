"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import type {
  LecturaCompasPlaybackState,
  LecturaTonalidadState,
} from "@/components/cifrado/LetraCifradoLecturaShell";
import LecturaBottomControls from "@/components/home/LecturaBottomControls";
import LecturaTonoPanel from "@/components/home/LecturaTonoPanel";
import LecturaZoomPanel from "@/components/home/LecturaZoomPanel";
import CantarControlHeaderActions from "@/components/salas/CantarControlHeaderActions";
import BuscadorModal from "@/components/salas/BuscadorModal";
import CancionActivaSection from "@/components/salas/CancionActivaSection";
import ColaAvisoToast from "@/components/salas/ColaAvisoToast";
import ColaJuntadaSheet from "@/components/salas/ColaJuntadaSheet";
import SalaPresenceBar from "@/components/salas/SalaPresenceBar";
import { SalaColaBootstrapSkeleton } from "@/components/salas/SalasSkeletons";
import { TapButton } from "@/components/ui/TapFeedback";
import AfinadorLayer from "@/components/ui/AfinadorLayer";
import {
  deriveCancionActivaFromCola,
  fetchColaCompleta,
  fetchColaItemById,
  getColaItemIdFromSesion,
  type CancionActivaData,
} from "@/lib/sala-data";
import {
  COLA_AVISO_EXIT_MS,
  COLA_AVISO_SHOW_DELAY_MS,
  getLecturaColaAvisoTopCss,
  getLecturaFabMenuTopCss,
  getLecturaFixedRightCss,
  getLecturaTopChromeTopCss,
  getSalaMainFooterPaddingCss,
} from "@/lib/sala-layout";
import { triggerHaptic } from "@/lib/haptic";
import { flushColaLocalToSupabase } from "@/lib/offline/cola-local-sync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useColaSidePanel } from "@/hooks/useColaSidePanel";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useLetraAutoScroll } from "@/hooks/useLetraAutoScroll";
import { useLetraZoom } from "@/hooks/useLetraZoom";
import { parsePresenceState } from "@/lib/presence";
import { createClient, ensureRealtimeAuth } from "@/lib/supabase/client";
import type { ColaItem, PresenceUsuario, SesionSala } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  ListMusic,
  ArrowLeft,
  Minimize2,
  Music,
  Music2,
  Search,
  SkipForward,
  SlidersHorizontal,
  Type,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";

const FLOAT_BTN_SECONDARY =
  "rounded-2xl border border-accent/50 bg-bg-dark text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.5)]";
const FLOAT_BTN_DISABLED = "pointer-events-none opacity-40";
const LECTURA_TOP_CHIP =
  "rounded-full border border-border/50 bg-bg-dark/90 shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-md";
const LECTURA_FAB_CASCADE_STEP_MS = 55;

type SalaPageShellProps = {
  salaId: number;
  salaNombre: string;
};

type SalaModoLecturaFabOptionProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  muted?: boolean;
  iconAfter?: boolean;
  cascadeIndex: number;
  className?: string;
};

function SalaModoLecturaFabOption({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  muted = false,
  iconAfter = false,
  cascadeIndex,
  className = "",
}: SalaModoLecturaFabOptionProps) {
  const iconNode = (
    <Icon
      className={`size-4 shrink-0 ${muted ? "text-text-muted" : ""}`}
      aria-hidden="true"
    />
  );

  return (
    <TapButton
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`sala-lectura-fab-item pointer-events-auto flex items-center gap-2 px-4 py-2 text-sm font-medium ${FLOAT_BTN_SECONDARY} ${
        disabled ? FLOAT_BTN_DISABLED : ""
      } ${className}`}
      style={{
        animationDelay: `${cascadeIndex * LECTURA_FAB_CASCADE_STEP_MS}ms`,
      }}
    >
      {iconAfter ? (
        <>
          <span className={muted ? "text-text-muted" : undefined}>{label}</span>
          {iconNode}
        </>
      ) : (
        <>
          {iconNode}
          <span className={muted ? "text-text-muted" : undefined}>{label}</span>
        </>
      )}
    </TapButton>
  );
}

type SalaModoLecturaOverlayProps = {
  abierto: boolean;
  pendientesCount: number;
  collaborationDisabled?: boolean;
  fixedRightCss: string;
  menuCompacto?: boolean;
  showZoomOption?: boolean;
  showTonoOption?: boolean;
  hasCompases?: boolean;
  compasesOcultos?: boolean;
  onCerrar: () => void;
  onContraer: () => void;
  onSiguiente: () => void;
  onCola: () => void;
  onBuscar: () => void;
  onAfinador: () => void;
  onActivarCompases?: () => void;
  onAbrirZoom?: () => void;
  onAbrirTono?: () => void;
};

function SalaModoLecturaOverlay({
  abierto,
  pendientesCount,
  collaborationDisabled = false,
  fixedRightCss,
  menuCompacto = false,
  showZoomOption = false,
  showTonoOption = false,
  hasCompases = false,
  compasesOcultos = false,
  onCerrar,
  onContraer,
  onSiguiente,
  onCola,
  onBuscar,
  onAfinador,
  onActivarCompases,
  onAbrirZoom,
  onAbrirTono,
}: SalaModoLecturaOverlayProps) {
  if (!abierto) {
    return null;
  }

  const menuTop = getLecturaFabMenuTopCss();
  let cascadeIndex = 0;
  const showActivarCompases = hasCompases && compasesOcultos;

  return (
    <>
      <button
        type="button"
        data-no-tap-feedback
        className="fixed inset-0 z-40 cursor-default border-0 bg-transparent outline-none"
        aria-label="Cerrar menú de controles"
        onClick={onCerrar}
      />

      <div
        className="pointer-events-none fixed z-40 flex flex-col items-end gap-2"
        style={{
          top: menuTop,
          right: fixedRightCss,
        }}
        role="menu"
        aria-label="Controles de modo lectura"
      >
        <SalaModoLecturaFabOption
          icon={Minimize2}
          label="Contraer"
          cascadeIndex={cascadeIndex++}
          onClick={onContraer}
        />
        {!collaborationDisabled ? (
          <>
            {!menuCompacto ? (
              <>
                <SalaModoLecturaFabOption
                  icon={Search}
                  label="Buscar"
                  cascadeIndex={cascadeIndex++}
                  onClick={() => {
                    onCerrar();
                    onBuscar();
                  }}
                />
                <SalaModoLecturaFabOption
                  icon={SkipForward}
                  label="Siguiente"
                  iconAfter
                  cascadeIndex={cascadeIndex++}
                  disabled={pendientesCount === 0}
                  onClick={() => {
                    onCerrar();
                    onSiguiente();
                  }}
                />
                <SalaModoLecturaFabOption
                  icon={ListMusic}
                  label={`Fila · ${pendientesCount}`}
                  cascadeIndex={cascadeIndex++}
                  onClick={() => {
                    onCerrar();
                    onCola();
                  }}
                />
              </>
            ) : null}
          </>
        ) : null}
        {showActivarCompases ? (
          <SalaModoLecturaFabOption
            icon={Music2}
            label="Activar compases"
            cascadeIndex={cascadeIndex++}
            onClick={() => {
              onCerrar();
              onActivarCompases?.();
            }}
          />
        ) : null}
        {showTonoOption ? (
          <SalaModoLecturaFabOption
            icon={Music}
            label="Cambiar de tono"
            cascadeIndex={cascadeIndex++}
            onClick={() => {
              onCerrar();
              onAbrirTono?.();
            }}
            className="lg:hidden"
          />
        ) : null}
        {showZoomOption ? (
          <SalaModoLecturaFabOption
            icon={Type}
            label="Tamaño letra"
            cascadeIndex={cascadeIndex++}
            onClick={() => {
              onCerrar();
              onAbrirZoom?.();
            }}
            className="lg:hidden"
          />
        ) : null}
        {!collaborationDisabled ? (
          <SalaModoLecturaFabOption
            icon={AudioLines}
            label="Afinador"
            cascadeIndex={cascadeIndex++}
            onClick={() => {
              onCerrar();
              onAfinador();
            }}
          />
        ) : null}
      </div>
    </>
  );
}

export default function SalaPageShell({
  salaId,
  salaNombre,
}: SalaPageShellProps) {
  const navigateWithProgress = useNavigateWithProgress();
  const colaSidePanel = useColaSidePanel();
  const online = useOnlineStatus();
  const disconnected = !online;
  const [hadOnlineSession, setHadOnlineSession] = useState(false);
  const colaAvisoShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colaAvisoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colaChangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressColaRealtimeUntil = useRef(0);
  const initialColaLoadPendingRef = useRef(true);
  const openColaRef = useRef<(() => void) | null>(null);
  const handleSiguienteRef = useRef<(() => void) | null>(null);
  const [colaAviso, setColaAviso] = useState<string | null>(null);
  const [colaAvisoExiting, setColaAvisoExiting] = useState(false);
  const [modoLectura, setModoLectura] = useState(false);
  const [overlayAbierto, setOverlayAbierto] = useState(false);
  const [lecturaZoomEligible, setLecturaZoomEligible] = useState(false);
  const [compasesOcultos, setCompasesOcultos] = useState(false);
  const [zoomPanelAbierto, setZoomPanelAbierto] = useState(false);
  const [tonoPanelAbierto, setTonoPanelAbierto] = useState(false);
  const [lecturaCompasPlayback, setLecturaCompasPlayback] =
    useState<LecturaCompasPlaybackState | null>(null);
  const [lecturaTonalidad, setLecturaTonalidad] =
    useState<LecturaTonalidadState | null>(null);
  const lecturaPantallaCompleta = modoLectura && !colaSidePanel;
  const lecturaConColaLateral = modoLectura && colaSidePanel;
  const lecturaFixedRightCss = getLecturaFixedRightCss(lecturaConColaLateral);
  const letraScrollRef = useRef<HTMLDivElement>(null);
  const embedIframeRef = useRef<HTMLIFrameElement>(null);

  const handleColaAdded = useCallback(() => {
    triggerHaptic();

    if (colaAvisoShowTimerRef.current) {
      clearTimeout(colaAvisoShowTimerRef.current);
    }

    if (colaAvisoHideTimerRef.current) {
      clearTimeout(colaAvisoHideTimerRef.current);
    }

    setColaAvisoExiting(false);
    setColaAviso(null);

    colaAvisoShowTimerRef.current = setTimeout(() => {
      setColaAviso("Canción sumada a la lista");
      colaAvisoShowTimerRef.current = null;

      colaAvisoHideTimerRef.current = setTimeout(() => {
        setColaAvisoExiting(true);

        colaAvisoHideTimerRef.current = setTimeout(() => {
          setColaAviso(null);
          setColaAvisoExiting(false);
          colaAvisoHideTimerRef.current = null;
        }, COLA_AVISO_EXIT_MS);
      }, 2500);
    }, COLA_AVISO_SHOW_DELAY_MS);
  }, []);

  const handleOpenBuscador = useCallback(() => {
    setBuscadorOpen(true);
  }, []);

  const handleBuscadorClose = useCallback(() => {
    setBuscadorOpen(false);
  }, []);

  const [buscadorOpen, setBuscadorOpen] = useState(false);
  const [afinadorOpen, setAfinadorOpen] = useState(false);
  const [cancionActiva, setCancionActiva] = useState<CancionActivaData | null>(
    null,
  );
  const [cancionNombreRevealGen, setCancionNombreRevealGen] = useState(0);
  const prevCancionRevealKeyRef = useRef<string | null>(null);
  const [colaItems, setColaItems] = useState<ColaItem[]>([]);
  const [colaBootstrapping, setColaBootstrapping] = useState(true);
  const [presenceUsuarios, setPresenceUsuarios] = useState<PresenceUsuario[]>(
    [],
  );

  const pendientesCount = useMemo(
    () => colaItems.filter((item) => item.estado === "pendiente").length,
    [colaItems],
  );

  const cancionActivaScrollKey = cancionActiva
    ? `${cancionActiva.nombre}::${cancionActiva.url_letra}`
    : null;

  const {
    autoScrollLevel,
    accelerate: accelerateAutoScroll,
    decelerate: decelerateAutoScroll,
  } = useLetraAutoScroll(letraScrollRef, {
    enabled: modoLectura,
    contentKey: cancionActivaScrollKey,
    embedIframeRef,
  });

  const {
    level: letraZoomLevel,
    factor: letraZoomFactor,
    decrease: decreaseLetraZoom,
    increase: increaseLetraZoom,
  } = useLetraZoom(cancionActivaScrollKey);

  useEffect(() => {
    setCompasesOcultos(false);
    setLecturaCompasPlayback(null);
    setLecturaTonalidad(null);
    setZoomPanelAbierto(false);
    setTonoPanelAbierto(false);
  }, [cancionActivaScrollKey]);

  const handleLecturaCompasPlaybackStateChange = useCallback(
    (state: LecturaCompasPlaybackState | null) => {
      setLecturaCompasPlayback(state);
    },
    [],
  );

  const handleLecturaTonalidadStateChange = useCallback(
    (state: LecturaTonalidadState | null) => {
      setLecturaTonalidad(state);
    },
    [],
  );

  const presenceBarVisible =
    !modoLectura && online && presenceUsuarios.length > 0;

  const handleLeaveSala = useCallback(() => {
    navigateWithProgress("/salas");
  }, [navigateWithProgress]);

  useHardwareBack(!modoLectura, handleLeaveSala);

  useEffect(() => {
    if (disconnected) {
      setBuscadorOpen(false);
      setOverlayAbierto(false);
      setPresenceUsuarios([]);
    }
  }, [disconnected]);

  useEffect(() => {
    const revealKey = cancionActiva
      ? `${cancionActiva.nombre}::${cancionActiva.url_letra}`
      : null;

    if (prevCancionRevealKeyRef.current === null) {
      prevCancionRevealKeyRef.current = revealKey;
      return;
    }

    if (revealKey !== null && prevCancionRevealKeyRef.current !== revealKey) {
      prevCancionRevealKeyRef.current = revealKey;
      setCancionNombreRevealGen((generation) => generation + 1);
      return;
    }

    if (revealKey === null) {
      prevCancionRevealKeyRef.current = null;
    }
  }, [cancionActiva]);

  const salirModoLectura = useCallback(() => {
    setOverlayAbierto(false);
    setZoomPanelAbierto(false);
    setTonoPanelAbierto(false);
    setAfinadorOpen(false);
    setCompasesOcultos(false);
    setLecturaCompasPlayback(null);
    setLecturaTonalidad(null);
    setModoLectura(false);
    document.body.removeAttribute("data-modo-lectura");
  }, []);

  const handleModoLecturaBack = useCallback(() => {
    if (tonoPanelAbierto) {
      setTonoPanelAbierto(false);
      return;
    }

    if (zoomPanelAbierto) {
      setZoomPanelAbierto(false);
      return;
    }

    if (overlayAbierto) {
      setOverlayAbierto(false);
      return;
    }

    salirModoLectura();
  }, [overlayAbierto, salirModoLectura, tonoPanelAbierto, zoomPanelAbierto]);

  useHardwareBack(modoLectura, handleModoLecturaBack);

  useEffect(() => {
    if (modoLectura) {
      document.body.setAttribute("data-modo-lectura", "true");
    } else {
      document.body.removeAttribute("data-modo-lectura");
    }

    return () => {
      document.body.removeAttribute("data-modo-lectura");
    };
  }, [modoLectura]);

  useEffect(() => {
    document.body.setAttribute("data-sala-nombre", salaNombre);

    return () => {
      document.body.removeAttribute("data-sala-nombre");
    };
  }, [salaNombre]);

  useEffect(() => {
    document.body.setAttribute(
      "data-sala-conectados",
      String(presenceUsuarios.length),
    );

    return () => {
      document.body.removeAttribute("data-sala-conectados");
    };
  }, [presenceUsuarios]);

  const handleColaItemsReordered = useCallback((items: ColaItem[]) => {
    console.log(
      "[sala] handleColaItemsReordered llamado:",
      items.map((i) => i.nombre),
    );
    setColaItems(items);
    setCancionActiva(deriveCancionActivaFromCola(items));
  }, []);

  const suppressColaRealtime = useCallback((ms: number) => {
    suppressColaRealtimeUntil.current = Date.now() + ms;
  }, []);

  const finishInitialColaLoad = useCallback(() => {
    if (!initialColaLoadPendingRef.current) {
      return;
    }

    initialColaLoadPendingRef.current = false;
    setColaBootstrapping(false);
  }, []);

  const loadColaCompleta = useCallback(async () => {
    const supabase = createClient();

    try {
      const flushed = await flushColaLocalToSupabase(supabase, salaId);

      if (flushed > 0) {
        console.info(
          `[cola-local] ${flushed} canciones subidas al final de la cola`,
        );
      }
    } catch (flushError) {
      console.warn("[cola-local] Error al subir cola local:", flushError);
    }

    const items = await fetchColaCompleta(supabase, salaId);

    console.log(
      "[sala] loadColaCompleta setColaItems:",
      items.map((i) => i.nombre),
    );
    setColaItems(items);
    setCancionActiva(deriveCancionActivaFromCola(items));
  }, [salaId]);

  const updateCancionFromSesion = useCallback(async (sesion: SesionSala) => {
    const colaItemId = getColaItemIdFromSesion(sesion);

    if (!colaItemId) {
      setCancionActiva(null);
      return;
    }

    const supabase = createClient();
    const cancion = await fetchColaItemById(supabase, colaItemId);
    setCancionActiva(cancion);
  }, []);

  const handleSesionChange = useCallback(
    (payload: { new: Record<string, unknown> }) => {
      console.log("[sesion] evento:", payload.new);
      void updateCancionFromSesion(payload.new as SesionSala);
    },
    [updateCancionFromSesion],
  );

  useEffect(() => {
    if (!online) {
      finishInitialColaLoad();
      return;
    }

    initialColaLoadPendingRef.current = true;
    setColaBootstrapping(true);
    setHadOnlineSession(true);

    const supabase = createClient();
    let sesionChannel: RealtimeChannel | null = null;
    let colaChannel: RealtimeChannel | null = null;
    let presenceChannel: RealtimeChannel | null = null;
    let cancelled = false;

    async function subscribeChannels() {
      const authed = await ensureRealtimeAuth(supabase);

      if (cancelled) {
        return;
      }

      void loadColaCompleta().finally(finishInitialColaLoad);

      if (!authed) {
        return;
      }

      sesionChannel = supabase
        .channel(`sesion-${salaId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "sesion_sala",
            filter: `sala_id=eq.${salaId}`,
          },
          handleSesionChange,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "sesion_sala",
            filter: `sala_id=eq.${salaId}`,
          },
          handleSesionChange,
        )
        .subscribe((status, err) => {
          console.log("[sesion] status:", status, err?.message ?? "");
        });

      colaChannel = supabase
        .channel(`cola-${salaId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cola_juntada",
            filter: `sala_id=eq.${salaId}`,
          },
          (payload) => {
            console.log("[cola] evento:", payload.eventType, payload.new);
            if (colaChangeDebounceRef.current) {
              clearTimeout(colaChangeDebounceRef.current);
            }
            colaChangeDebounceRef.current = setTimeout(() => {
              if (Date.now() < suppressColaRealtimeUntil.current) {
                colaChangeDebounceRef.current = null;
                return;
              }
              void loadColaCompleta();
              colaChangeDebounceRef.current = null;
            }, 600);
          },
        )
        .subscribe((status, err) => {
          console.log("[cola] status:", status, err?.message ?? "");
        });

      const presenceTopic = `presence-sala-${salaId}`;
      const stalePresence = supabase
        .getChannels()
        .find((channel) => channel.topic === `realtime:${presenceTopic}`);

      if (stalePresence) {
        await supabase.removeChannel(stalePresence);
      }

      if (cancelled) {
        return;
      }

      async function trackPresence(channel: RealtimeChannel) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) {
          return;
        }

        await channel.track({
          user_id: user.id,
          nombre:
            user.user_metadata?.nombre ??
            user.email?.split("@")[0] ??
            "Usuario",
          avatar_url: user.user_metadata?.avatar_url ?? null,
        });
      }

      presenceChannel = supabase
        .channel(presenceTopic)
        .on("presence", { event: "sync" }, () => {
          if (!presenceChannel) {
            return;
          }

          setPresenceUsuarios(parsePresenceState(presenceChannel.presenceState()));
        })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED" || !presenceChannel) {
            return;
          }

          void trackPresence(presenceChannel);
        });
    }

    void subscribeChannels();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();

      if (colaAvisoShowTimerRef.current) {
        clearTimeout(colaAvisoShowTimerRef.current);
      }

      if (colaAvisoHideTimerRef.current) {
        clearTimeout(colaAvisoHideTimerRef.current);
      }

      if (colaChangeDebounceRef.current) {
        clearTimeout(colaChangeDebounceRef.current);
      }

      if (sesionChannel) {
        void supabase.removeChannel(sesionChannel);
      }

      if (colaChannel) {
        void supabase.removeChannel(colaChannel);
      }

      if (presenceChannel) {
        void supabase.removeChannel(presenceChannel);
      }
    };
  }, [online, salaId, loadColaCompleta, handleSesionChange, finishInitialColaLoad]);

  const headerLeading = !modoLectura ? (
    <TapButton
      type="button"
      aria-label="Volver a salas"
      onClick={handleLeaveSala}
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-bg-dark/80 text-text-primary lg:hidden"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
    </TapButton>
  ) : null;

  const headerActions =
    !modoLectura && !disconnected && !colaSidePanel ? (
      <CantarControlHeaderActions onSearch={handleOpenBuscador} />
    ) : null;

  const handleExpand = useCallback(() => {
    setModoLectura(true);
  }, []);

  return (
    <div
      className="flex flex-col overflow-hidden bg-bg-sala"
      style={{ height: "100dvh" }}
    >
      {disconnected && !modoLectura ? (
        <div
          className="shrink-0 border-b border-border bg-bg-card px-4 py-3"
          role="status"
        >
          <div className="flex items-start gap-2.5">
            <WifiOff
              className="mt-0.5 size-4 shrink-0 text-text-muted"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                Sin conexión
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {hadOnlineSession
                  ? "Podés seguir leyendo la canción. Salí de la sala cuando termines."
                  : "Las salas necesitan internet. Volvé cuando tengas señal."}
              </p>
            </div>
            <TapButton
              aria-label="Volver a salas"
              onClick={handleLeaveSala}
              className="shrink-0 rounded-[10px] border border-border px-3 py-1.5 text-xs font-semibold text-text-primary"
            >
              Salir
            </TapButton>
          </div>
        </div>
      ) : null}

      <main
        className={`sala-cantar-main relative flex min-h-0 flex-col ${
          lecturaPantallaCompleta
            ? "overflow-hidden"
            : "flex-1 overflow-hidden lg:flex-row"
        }`}
        style={
          lecturaPantallaCompleta
            ? { height: "100dvh" }
            : {
                paddingBottom: getSalaMainFooterPaddingCss(),
              }
        }
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {colaBootstrapping && !modoLectura ? (
            <SalaColaBootstrapSkeleton />
          ) : (
            <CancionActivaSection
              cancionNombre={cancionActiva?.nombre ?? null}
              artista={cancionActiva?.artista ?? null}
              urlLetra={cancionActiva?.url_letra ?? null}
              letraTexto={cancionActiva?.letra_texto ?? null}
              modoLectura={modoLectura}
              letraScrollRef={letraScrollRef}
              embedIframeRef={embedIframeRef}
              nombreRevealGeneration={cancionNombreRevealGen}
              headerLeading={headerLeading}
              headerAction={headerActions}
              letraZoomFactor={letraZoomFactor}
              onLecturaZoomEligibleChange={setLecturaZoomEligible}
              compasesOcultos={compasesOcultos}
              onToggleCompasesOcultos={() =>
                setCompasesOcultos((ocultos) => !ocultos)
              }
              onLecturaCompasPlaybackStateChange={
                handleLecturaCompasPlaybackStateChange
              }
              onLecturaTonalidadStateChange={handleLecturaTonalidadStateChange}
              onExpand={
                !modoLectura && cancionActiva && !disconnected
                  ? handleExpand
                  : undefined
              }
              controlFilaActions={
                !modoLectura && !disconnected
                  ? {
                      pendientesCount,
                      colaAviso,
                      colaAvisoExiting,
                      onOpenFila: () => openColaRef.current?.(),
                      onSiguiente: () => void handleSiguienteRef.current?.(),
                      siguienteDisabled: pendientesCount === 0,
                      showSiguiente: Boolean(cancionActiva),
                    }
                  : null
              }
            />
          )}

          {presenceBarVisible ? (
            <SalaPresenceBar usuarios={presenceUsuarios} />
          ) : null}
        </div>

        <ColaJuntadaSheet
          items={colaItems}
          salaId={salaId}
          controlsHidden={disconnected}
          presenceBarVisible={presenceBarVisible}
          onColaChange={loadColaCompleta}
          onItemsReordered={handleColaItemsReordered}
          onOpenBuscador={handleOpenBuscador}
          presentacionOculta={lecturaPantallaCompleta}
          onRequestOpen={(open) => {
            openColaRef.current = open;
          }}
          onRequestSiguiente={(siguiente) => {
            handleSiguienteRef.current = siguiente;
          }}
          onDragEnd={() => suppressColaRealtime(1500)}
        />
      </main>

      {modoLectura ? (
        <>

          <TapButton
            type="button"
            aria-label={
              overlayAbierto
                ? "Cerrar controles"
                : "Abrir controles de modo lectura"
            }
            onClick={() => {
              setZoomPanelAbierto(false);
              setTonoPanelAbierto(false);
              setOverlayAbierto((open) => !open);
            }}
            className={`fixed z-50 flex size-9 items-center justify-center ${LECTURA_TOP_CHIP} ${
              overlayAbierto ? "border-accent/45" : ""
            }`}
            style={{
              top: getLecturaTopChromeTopCss(),
              right: lecturaFixedRightCss,
            }}
          >
            {overlayAbierto ? (
              <X className="size-4 text-text-primary" aria-hidden="true" />
            ) : (
              <SlidersHorizontal
                className="size-4 text-accent"
                aria-hidden="true"
              />
            )}
          </TapButton>

          {!overlayAbierto ? (
            <TapButton
              type="button"
              aria-label="Buscar"
              onClick={() => setBuscadorOpen(true)}
              className={`fixed z-50 flex size-9 items-center justify-center ${LECTURA_TOP_CHIP}`}
              style={{
                top: getLecturaFabMenuTopCss(),
                right: lecturaFixedRightCss,
              }}
            >
              <Search className="size-4 text-accent" aria-hidden="true" />
            </TapButton>
          ) : null}

          <SalaModoLecturaOverlay
            abierto={overlayAbierto}
            pendientesCount={pendientesCount}
            collaborationDisabled={disconnected}
            fixedRightCss={lecturaFixedRightCss}
            menuCompacto={lecturaConColaLateral}
            showZoomOption={lecturaZoomEligible}
            showTonoOption={Boolean(lecturaTonalidad)}
            hasCompases={Boolean(lecturaCompasPlayback?.hasCompases)}
            compasesOcultos={compasesOcultos}
            onCerrar={() => setOverlayAbierto(false)}
            onContraer={salirModoLectura}
            onSiguiente={() => void handleSiguienteRef.current?.()}
            onCola={() => openColaRef.current?.()}
            onBuscar={() => setBuscadorOpen(true)}
            onAfinador={() => setAfinadorOpen(true)}
            onActivarCompases={() => setCompasesOcultos(false)}
            onAbrirZoom={() => {
              setTonoPanelAbierto(false);
              setZoomPanelAbierto(true);
            }}
            onAbrirTono={() => {
              setZoomPanelAbierto(false);
              setTonoPanelAbierto(true);
            }}
          />

          <LecturaZoomPanel
            open={zoomPanelAbierto}
            level={letraZoomLevel}
            enabled={Boolean(cancionActiva)}
            onDecrease={decreaseLetraZoom}
            onIncrease={increaseLetraZoom}
            onClose={() => setZoomPanelAbierto(false)}
          />

          {lecturaTonalidad ? (
            <LecturaTonoPanel
              open={tonoPanelAbierto}
              tonalidadIndex={lecturaTonalidad.tonalidadIndex}
              notacion={lecturaTonalidad.notacion}
              onTonalidadChange={lecturaTonalidad.setTonalidad}
              onClose={() => setTonoPanelAbierto(false)}
            />
          ) : null}

          <LecturaBottomControls
            showZoom={lecturaZoomEligible}
            zoomLevel={letraZoomLevel}
            zoomEnabled={Boolean(cancionActiva)}
            onZoomDecrease={decreaseLetraZoom}
            onZoomIncrease={increaseLetraZoom}
            autoScrollLevel={autoScrollLevel}
            autoScrollEnabled={Boolean(cancionActiva)}
            hasCompases={Boolean(lecturaCompasPlayback?.hasCompases)}
            compasesOcultos={compasesOcultos}
            onToggleCompasesOcultos={() =>
              setCompasesOcultos((ocultos) => !ocultos)
            }
            compasPlaying={lecturaCompasPlayback?.playing ?? false}
            compasCanPlay={lecturaCompasPlayback?.canPlay ?? false}
            compasBpm={lecturaCompasPlayback?.bpm ?? 120}
            onCompasTogglePlayback={() => lecturaCompasPlayback?.toggle()}
            onCompasBpmDecrease={() => lecturaCompasPlayback?.decreaseBpm()}
            onCompasBpmIncrease={() => lecturaCompasPlayback?.increaseBpm()}
            fixedRightCss={lecturaFixedRightCss}
            onAutoScrollAccelerate={accelerateAutoScroll}
            onAutoScrollDecelerate={decelerateAutoScroll}
          />
        </>
      ) : null}

      {modoLectura && colaAviso ? (
        <ColaAvisoToast
          message={colaAviso}
          exiting={colaAvisoExiting}
          className="fixed z-[48]"
          style={{
            top: getLecturaColaAvisoTopCss(),
            right: lecturaFixedRightCss,
          }}
        />
      ) : null}

      <AfinadorLayer open={afinadorOpen} onOpenChange={setAfinadorOpen} />

      {buscadorOpen && (
        <BuscadorModal
          open={buscadorOpen}
          onClose={handleBuscadorClose}
          salaId={salaId}
          onDataChange={loadColaCompleta}
          onColaAdded={handleColaAdded}
          hasCancionActiva={colaItems.some((item) => item.estado === "activa")}
        />
      )}

      <AppReadyMarker />
    </div>
  );
}
