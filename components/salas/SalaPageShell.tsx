"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import LecturaBottomControls from "@/components/home/LecturaBottomControls";
import LecturaPcTopChrome from "@/components/home/LecturaPcTopChrome";
import ModoLecturaOverlay from "@/components/home/ModoLecturaOverlay";
import { buildColaLecturaNavItems } from "@/components/home/lecturaModoNavItems";
import LecturaTonoPanel from "@/components/home/LecturaTonoPanel";
import LecturaZoomPanel from "@/components/home/LecturaZoomPanel";
import CantarControlHeaderActions from "@/components/salas/CantarControlHeaderActions";
import BuscadorModal from "@/components/salas/BuscadorModal";
import CancionActivaSection from "@/components/salas/CancionActivaSection";
import ColaAvisoToast from "@/components/salas/ColaAvisoToast";
import ColaJuntadaSheet from "@/components/salas/ColaJuntadaSheet";
import SalaInviteQrModal from "@/components/salas/SalaInviteQrModal";
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
import { fetchMiembrosSalas } from "@/lib/sala-miembros";
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
import { useModoLecturaCocina } from "@/hooks/useModoLecturaCocina";
import { parsePresenceState } from "@/lib/presence";
import { createClient, ensureRealtimeAuth } from "@/lib/supabase/client";
import type { ColaItem, PresenceUsuario, SalaMiembro, SesionSala } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";

const LECTURA_TOP_CHIP =
  "rounded-full border border-border/50 bg-bg-dark/90 shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-md";

type SalaPageShellProps = {
  salaId: number;
  salaNombre: string;
};

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
  const [lecturaZoomEligible, setLecturaZoomEligible] = useState(false);
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [miembros, setMiembros] = useState<SalaMiembro[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const pendientesCount = useMemo(
    () => colaItems.filter((item) => item.estado === "pendiente").length,
    [colaItems],
  );

  const cancionActivaScrollKey = cancionActiva
    ? `${cancionActiva.nombre}::${cancionActiva.url_letra}`
    : null;

  const {
    overlayAbierto,
    setOverlayAbierto,
    afinadorOpen,
    setAfinadorOpen,
    compasesOcultos,
    setCompasesOcultos,
    toggleCompasesOcultos,
    acordesOcultos,
    toggleAcordesOcultos,
    zoomPanelAbierto,
    setZoomPanelAbierto,
    tonoPanelAbierto,
    setTonoPanelAbierto,
    abrirZoom,
    abrirTono,
    lecturaCompasPlayback,
    handleLecturaCompasPlaybackStateChange,
    lecturaTonalidad,
    handleLecturaTonalidadStateChange,
    autoScroll,
    zoom,
    resetVista,
  } = useModoLecturaCocina({
    active: modoLectura,
    scrollRef: letraScrollRef,
    contentKey: cancionActivaScrollKey,
    embedIframeRef,
  });

  const presenceBarVisible = !modoLectura && online;
  const isOwner = miembros.some(
    (m) => m.user_id === currentUserId && m.rol === "owner",
  );

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
    resetVista();
    setModoLectura(false);
    document.body.removeAttribute("data-modo-lectura");
  }, [resetVista]);

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

  const reloadMiembros = useCallback(async () => {
    try {
      const bySala = await fetchMiembrosSalas([salaId]);
      setMiembros(bySala[salaId] ?? []);
    } catch (err) {
      console.warn("[sala] no se pudieron cargar miembros:", err);
    }
  }, [salaId]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) {
        return;
      }
      setCurrentUserId(user?.id ?? null);
      await reloadMiembros();
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadMiembros]);

  useHardwareBack(inviteOpen, () => {
    setInviteOpen(false);
  });

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

  const lecturaNavItems = useMemo(() => {
    if (lecturaConColaLateral || disconnected) {
      return [];
    }

    return buildColaLecturaNavItems({
      pendientesCount,
      onBuscar: () => setBuscadorOpen(true),
      onSiguiente: () => void handleSiguienteRef.current?.(),
      onCola: () => openColaRef.current?.(),
    });
  }, [disconnected, lecturaConColaLateral, pendientesCount]);

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
            <SalaColaBootstrapSkeleton showBack />
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
              letraZoomFactor={zoom.factor}
              onLecturaZoomEligibleChange={setLecturaZoomEligible}
              compasesOcultos={compasesOcultos}
              onToggleCompasesOcultos={toggleCompasesOcultos}
              acordesOcultos={acordesOcultos}
              onToggleAcordesOcultos={toggleAcordesOcultos}
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
            <SalaPresenceBar
              usuarios={presenceUsuarios}
              onOpenInvite={() => setInviteOpen(true)}
            />
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
          <LecturaPcTopChrome
            fixedRightCss={lecturaFixedRightCss}
            onContraer={salirModoLectura}
            onAfinador={() => setAfinadorOpen(true)}
          />

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
            className={`fixed z-50 flex size-9 items-center justify-center lg:hidden ${LECTURA_TOP_CHIP} ${
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
              className={`fixed z-50 flex size-9 items-center justify-center lg:hidden ${LECTURA_TOP_CHIP}`}
              style={{
                top: getLecturaFabMenuTopCss(),
                right: lecturaFixedRightCss,
              }}
            >
              <Search className="size-4 text-accent" aria-hidden="true" />
            </TapButton>
          ) : null}

          <ModoLecturaOverlay
            abierto={overlayAbierto}
            fixedRightCss={lecturaFixedRightCss}
            navItems={lecturaNavItems}
            showZoomOption={lecturaZoomEligible}
            showTonoOption={Boolean(lecturaTonalidad)}
            showAcordesOption={Boolean(lecturaTonalidad)}
            hasCompases={Boolean(lecturaCompasPlayback?.hasCompases)}
            compasesOcultos={compasesOcultos}
            acordesOcultos={acordesOcultos}
            showAfinador={!disconnected}
            onCerrar={() => setOverlayAbierto(false)}
            onContraer={salirModoLectura}
            onAfinador={() => setAfinadorOpen(true)}
            onActivarCompases={() => setCompasesOcultos(false)}
            onToggleAcordesOcultos={toggleAcordesOcultos}
            onAbrirZoom={abrirZoom}
            onAbrirTono={abrirTono}
          />

          <LecturaZoomPanel
            open={zoomPanelAbierto}
            level={zoom.level}
            enabled={Boolean(cancionActiva)}
            onDecrease={zoom.decrease}
            onIncrease={zoom.increase}
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
            zoomLevel={zoom.level}
            zoomEnabled={Boolean(cancionActiva)}
            onZoomDecrease={zoom.decrease}
            onZoomIncrease={zoom.increase}
            autoScrollLevel={autoScroll.autoScrollLevel}
            autoScrollEnabled={Boolean(cancionActiva)}
            hasCompases={Boolean(lecturaCompasPlayback?.hasCompases)}
            compasesOcultos={compasesOcultos}
            onToggleCompasesOcultos={toggleCompasesOcultos}
            compasPlaying={lecturaCompasPlayback?.playing ?? false}
            compasCanPlay={lecturaCompasPlayback?.canPlay ?? false}
            compasBpm={lecturaCompasPlayback?.bpm ?? 120}
            onCompasTogglePlayback={() => lecturaCompasPlayback?.toggle()}
            onCompasBpmDecrease={() => lecturaCompasPlayback?.decreaseBpm()}
            onCompasBpmIncrease={() => lecturaCompasPlayback?.increaseBpm()}
            fixedRightCss={lecturaFixedRightCss}
            onAutoScrollAccelerate={autoScroll.accelerate}
            onAutoScrollDecelerate={autoScroll.decelerate}
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

      {currentUserId ? (
        <SalaInviteQrModal
          open={inviteOpen}
          salaId={salaId}
          salaNombre={salaNombre}
          isOwner={isOwner}
          userId={currentUserId}
          miembros={miembros}
          onClose={() => setInviteOpen(false)}
          onMiembrosChange={() => {
            void reloadMiembros();
          }}
        />
      ) : null}

      <AppReadyMarker />
    </div>
  );
}
