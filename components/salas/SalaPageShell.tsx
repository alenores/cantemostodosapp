"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import BuscadorModal from "@/components/salas/BuscadorModal";
import CancionActivaSection from "@/components/salas/CancionActivaSection";
import ColaJuntadaSheet from "@/components/salas/ColaJuntadaSheet";
// import ColaBottomSheet from "@/components/salas/ColaBottomSheet";
import { TapButton, TapLink } from "@/components/ui/TapFeedback";
import {
  deriveCancionActivaFromCola,
  fetchColaCompleta,
  fetchColaItemById,
  getColaItemIdFromSesion,
  type CancionActivaData,
} from "@/lib/sala-data";
import { COLA_AVISO_SHOW_DELAY_MS } from "@/lib/sala-layout";
import { triggerHaptic } from "@/lib/haptic";
import { getColaLocalItems } from "@/lib/offline/cola-local-store";
import { flushColaLocalToSupabase } from "@/lib/offline/cola-local-sync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { createClient, ensureRealtimeAuth } from "@/lib/supabase/client";
import type { ColaItem, SesionSala } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ArrowLeft, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const GIT_COMMIT_SHA = process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ?? "dev";
const SHOW_BUILD_SHA =
  process.env.NODE_ENV === "production" && GIT_COMMIT_SHA !== "dev";

type SalaPageShellProps = {
  salaId: number;
  salaNombre: string;
  /** Solo para overlay offline desde Salas: cierra sin navegar. */
  embedded?: boolean;
  onClose?: () => void;
};

export default function SalaPageShell({
  salaId,
  salaNombre,
  embedded = false,
  onClose,
}: SalaPageShellProps) {
  const online = useOnlineStatus();
  const colaAvisoShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colaAvisoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [colaAviso, setColaAviso] = useState<string | null>(null);
  const [colaAvisoEntered, setColaAvisoEntered] = useState(false);

  const handleColaAdded = useCallback(() => {
    triggerHaptic();

    if (colaAvisoShowTimerRef.current) {
      clearTimeout(colaAvisoShowTimerRef.current);
    }

    if (colaAvisoHideTimerRef.current) {
      clearTimeout(colaAvisoHideTimerRef.current);
    }

    setColaAviso(null);

    colaAvisoShowTimerRef.current = setTimeout(() => {
      setColaAviso("Canción sumada a la lista");
      colaAvisoShowTimerRef.current = null;

      colaAvisoHideTimerRef.current = setTimeout(() => {
        setColaAviso(null);
        colaAvisoHideTimerRef.current = null;
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

  const handleColaItemsReordered = useCallback((items: ColaItem[]) => {
    setColaItems(items);
    setCancionActiva(deriveCancionActivaFromCola(items));
  }, []);

  const loadColaCompleta = useCallback(async () => {
    if (!online) {
      const items = await getColaLocalItems(salaId);
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
    if (!colaAviso) {
      setColaAvisoEntered(false);
      return;
    }

    setColaAvisoEntered(false);
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setColaAvisoEntered(true);
      });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [colaAviso]);

  useEffect(() => {
    if (!online) {
      void loadColaCompleta();
      return;
    }

    const supabase = createClient();
    let sesionChannel: RealtimeChannel | null = null;
    let colaChannel: RealtimeChannel | null = null;
    let cancelled = false;

    async function subscribeChannels() {
      const authed = await ensureRealtimeAuth(supabase);

      if (!authed || cancelled) {
        return;
      }

      void loadColaCompleta();

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
            void loadColaCompleta();
          },
        )
        .subscribe((status, err) => {
          console.log("[cola] status:", status, err?.message ?? "");
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

      if (sesionChannel) {
        void supabase.removeChannel(sesionChannel);
      }

      if (colaChannel) {
        void supabase.removeChannel(colaChannel);
      }
    };
  }, [online, salaId, loadColaCompleta, handleSesionChange]);

  return (
    <div
      className="relative flex flex-col overflow-hidden overscroll-none bg-bg-app"
      style={{ height: "100dvh" }}
    >
      <AppReadyMarker />
      <header className="shrink-0 border-b border-accent/35 bg-accent-dim px-2 py-1.5">
        <div className="flex items-center gap-1">
          {embedded ? (
            <TapButton
              aria-label="Volver a salas"
              onClick={onClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-primary"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </TapButton>
          ) : (
            <TapLink
              href="/salas"
              ariaLabel="Volver a salas"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-primary"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </TapLink>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold leading-tight text-accent">
              sala
              {SHOW_BUILD_SHA && (
                <span className="normal-case tracking-normal text-text-muted">
                  {" "}
                  · {GIT_COMMIT_SHA}
                </span>
              )}
            </p>
            <h1 className="truncate text-base font-extrabold leading-tight text-text-primary">
              {salaNombre}
            </h1>
            {!online && (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-text-muted">
                <WifiOff className="size-3 shrink-0" aria-hidden="true" />
                Lista local en este celular
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <CancionActivaSection
          cancionNombre={cancionActiva?.nombre ?? null}
          artista={cancionActiva?.artista ?? null}
          urlLetra={cancionActiva?.url_letra ?? null}
          letraTexto={cancionActiva?.letra_texto ?? null}
        />
      </main>

      <ColaJuntadaSheet
        items={colaItems}
        salaId={salaId}
        offlineMode={!online}
        onColaChange={loadColaCompleta}
        onItemsReordered={handleColaItemsReordered}
        onOpenBuscador={handleOpenBuscador}
      />

      {colaAviso ? (
        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-none fixed left-1/2 z-40 w-fit max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-[10px] border border-accent/30 bg-bg-cola-aviso px-3.5 py-2 text-center text-sm font-semibold whitespace-nowrap text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.38)] transition-[opacity,transform] duration-300 ease-out ${
            colaAvisoEntered ? "opacity-100" : "translate-y-2 opacity-0"
          }`}
          style={{
            bottom:
              "calc(56px + 16px + 72px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {colaAviso}
        </div>
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
    </div>
  );
}
