"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import AutoScrollControl from "@/components/home/AutoScrollControl";
import BuscadorModal from "@/components/salas/BuscadorModal";
import CancionActivaSection from "@/components/salas/CancionActivaSection";
import ColaAvisoToast from "@/components/salas/ColaAvisoToast";
import ColaJuntadaSheet from "@/components/salas/ColaJuntadaSheet";
import SalaPresenceBar from "@/components/salas/SalaPresenceBar";
import { SalaColaBootstrapSkeleton } from "@/components/salas/SalasSkeletons";
import { TapButton } from "@/components/ui/TapFeedback";
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
  getLetraModoLecturaHorizontalPadding,
  getLecturaColaAvisoTopCss,
  getLecturaFabMenuTopCss,
  getLecturaTopChromeTopCss,
  getSalaMainFooterPaddingCss,
  LECTURA_TOP_CHROME_SIDE_PX,
} from "@/lib/sala-layout";
import { triggerHaptic } from "@/lib/haptic";
import { getColaLocalItems } from "@/lib/offline/cola-local-store";
import { flushColaLocalToSupabase } from "@/lib/offline/cola-local-sync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useLetraAutoScroll } from "@/hooks/useLetraAutoScroll";
import { createClient, ensureRealtimeAuth } from "@/lib/supabase/client";
import type { ColaItem, PresenceUsuario, SesionSala } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ListMusic,
  Minimize2,
  Music2,
  SkipForward,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const FLOAT_BTN_SECONDARY =
  "rounded-2xl border border-accent/50 bg-bg-dark text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.5)]";
const FLOAT_BTN_DISABLED = "pointer-events-none opacity-40";
const LECTURA_TOP_CHIP =
  "rounded-full border border-border/50 bg-bg-dark/90 shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-md";
const LECTURA_FAB_CASCADE_STEP_MS = 55;

type SalaPageShellProps = {
  salaId: number;
  salaNombre: string;
  /** Solo para overlay offline desde Salas: cierra sin navegar. */
  embedded?: boolean;
  onClose?: () => void;
};

type SalaModoLecturaFabOptionProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  muted?: boolean;
  iconAfter?: boolean;
  cascadeIndex: number;
};

function SalaModoLecturaFabOption({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  muted = false,
  iconAfter = false,
  cascadeIndex,
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
      }`}
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
  onCerrar: () => void;
  onContraer: () => void;
  onSiguiente: () => void;
  onCola: () => void;
};

function SalaModoLecturaOverlay({
  abierto,
  pendientesCount,
  onCerrar,
  onContraer,
  onSiguiente,
  onCola,
}: SalaModoLecturaOverlayProps) {
  if (!abierto) {
    return null;
  }

  const menuTop = getLecturaFabMenuTopCss();

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default"
        aria-label="Cerrar menú de controles"
        onClick={onCerrar}
      />

      <div
        className="pointer-events-none fixed z-40 flex flex-col items-end gap-2"
        style={{
          top: menuTop,
          right: `max(${LECTURA_TOP_CHROME_SIDE_PX}px, env(safe-area-inset-right, 0px))`,
        }}
        role="menu"
        aria-label="Controles de modo lectura"
      >
        <SalaModoLecturaFabOption
          icon={Minimize2}
          label="Contraer"
          cascadeIndex={0}
          onClick={onContraer}
        />
        <SalaModoLecturaFabOption
          icon={SkipForward}
          label="Siguiente"
          iconAfter
          cascadeIndex={1}
          disabled={pendientesCount === 0}
          onClick={() => {
            onCerrar();
            onSiguiente();
          }}
        />
        <SalaModoLecturaFabOption
          icon={ListMusic}
          label={`Fila · ${pendientesCount}`}
          cascadeIndex={2}
          onClick={() => {
            onCerrar();
            onCola();
          }}
        />
        <SalaModoLecturaFabOption
          icon={Music2}
          label="Afinador"
          cascadeIndex={3}
          onClick={() => {
            console.log("TODO: afinador");
          }}
        />
      </div>
    </>
  );
}

export default function SalaPageShell({
  salaId,
  salaNombre,
  embedded = false,
  onClose,
}: SalaPageShellProps) {
  const online = useOnlineStatus();
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
  const letraScrollRef = useRef<HTMLDivElement>(null);

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
  });

  const presenceBarVisible =
    !modoLectura && online && presenceUsuarios.length > 0;

  const salirModoLectura = useCallback(() => {
    setOverlayAbierto(false);
    setModoLectura(false);
    document.body.removeAttribute("data-modo-lectura");
  }, []);

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
    if (!online) {
      const items = await getColaLocalItems(salaId);
      console.log(
        "[sala] loadColaCompleta setColaItems:",
        items.map((i) => i.nombre),
      );
      setColaItems(items);
      setCancionActiva(deriveCancionActivaFromCola(items));
      return;
    }

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
  }, [online, salaId]);

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
    initialColaLoadPendingRef.current = true;
    setColaBootstrapping(true);

    if (!online) {
      setPresenceUsuarios([]);
      void loadColaCompleta().finally(finishInitialColaLoad);
      return;
    }

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

      presenceChannel = supabase
        .channel(`presence-sala-${salaId}`)
        .on("presence", { event: "sync" }, () => {
          if (!presenceChannel) {
            return;
          }

          const state = presenceChannel.presenceState();
          const usuarios = Object.values(state)
            .flat()
            .map((p: unknown) => p as PresenceUsuario);
          setPresenceUsuarios(usuarios);
        })
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED" || !presenceChannel) {
            return;
          }

          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            await presenceChannel.track({
              user_id: user.id,
              nombre:
                user.user_metadata?.nombre ??
                user.email?.split("@")[0] ??
                "Usuario",
              avatar_url: user.user_metadata?.avatar_url ?? null,
            });
          }
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

  return (
    <div
      className="flex flex-col overflow-hidden bg-bg-sala"
      style={{ height: "100dvh" }}
    >
      {embedded && !modoLectura ? (
        <TapButton
          aria-label="Volver a salas"
          onClick={onClose}
          className="fixed z-30 flex size-9 items-center justify-center rounded-full border border-border/60 bg-bg-dark/90 text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
          style={{ top: 12, left: 12 }}
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </TapButton>
      ) : null}

      <main
        className={`relative flex min-h-0 flex-col ${
          modoLectura ? "overflow-hidden" : "flex-1 overflow-hidden"
        }`}
        style={
          modoLectura
            ? { height: "100dvh" }
            : {
                paddingBottom: getSalaMainFooterPaddingCss(),
              }
        }
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
            />
          )}
        </div>

        {presenceBarVisible ? (
          <SalaPresenceBar usuarios={presenceUsuarios} />
        ) : null}

        <ColaJuntadaSheet
          items={colaItems}
          salaId={salaId}
          offlineMode={!online}
          presenceBarVisible={presenceBarVisible}
          onColaChange={loadColaCompleta}
          onItemsReordered={handleColaItemsReordered}
          onOpenBuscador={handleOpenBuscador}
          presentacionOculta={modoLectura}
          onExpand={
            !modoLectura && cancionActiva
              ? () => setModoLectura(true)
              : undefined
          }
          onRequestOpen={(open) => {
            openColaRef.current = open;
          }}
          onRequestSiguiente={(siguiente) => {
            handleSiguienteRef.current = siguiente;
          }}
          colaAviso={!modoLectura ? colaAviso : null}
          colaAvisoExiting={colaAvisoExiting}
          onDragEnd={() => suppressColaRealtime(1500)}
        />
      </main>

      {modoLectura ? (
        <>
          {cancionActiva?.nombre ? (
            <div
              className={`pointer-events-none fixed z-[45] max-w-[min(75vw,calc(100%-3.25rem))] px-2.5 py-1.5 ${LECTURA_TOP_CHIP}`}
              style={{
                top: getLecturaTopChromeTopCss(),
                left: getLetraModoLecturaHorizontalPadding(),
              }}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-snug text-accent">
                  {cancionActiva.nombre}
                </span>
                {cancionActiva.artista ? (
                  <>
                    <span
                      className="shrink-0 text-[10px] leading-snug text-text-muted/70"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                    <span className="max-w-[38%] shrink-0 truncate text-[10px] leading-snug text-text-muted">
                      {cancionActiva.artista}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          <TapButton
            type="button"
            aria-label={
              overlayAbierto
                ? "Cerrar controles"
                : "Abrir controles de modo lectura"
            }
            onClick={() => setOverlayAbierto((open) => !open)}
            className={`fixed z-50 flex size-9 items-center justify-center ${LECTURA_TOP_CHIP} ${
              overlayAbierto ? "border-accent/45" : ""
            }`}
            style={{
              top: getLecturaTopChromeTopCss(),
              right: `max(${LECTURA_TOP_CHROME_SIDE_PX}px, env(safe-area-inset-right, 0px))`,
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

          <SalaModoLecturaOverlay
            abierto={overlayAbierto}
            pendientesCount={pendientesCount}
            onCerrar={() => setOverlayAbierto(false)}
            onContraer={salirModoLectura}
            onSiguiente={() => void handleSiguienteRef.current?.()}
            onCola={() => openColaRef.current?.()}
          />

          <AutoScrollControl
            level={autoScrollLevel}
            enabled={Boolean(cancionActiva)}
            onAccelerate={accelerateAutoScroll}
            onDecelerate={decelerateAutoScroll}
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
            right: `max(${LECTURA_TOP_CHROME_SIDE_PX}px, env(safe-area-inset-right, 0px))`,
          }}
        />
      ) : null}

      {buscadorOpen && (
        <BuscadorModal
          open={buscadorOpen}
          onClose={handleBuscadorClose}
          salaId={salaId}
          onDataChange={loadColaCompleta}
          onColaAdded={handleColaAdded}
        />
      )}

      <AppReadyMarker />
    </div>
  );
}
