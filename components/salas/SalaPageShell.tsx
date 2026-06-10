"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import BuscadorModal from "@/components/salas/BuscadorModal";
import CancionActivaSection from "@/components/salas/CancionActivaSection";
import ColaBottomSheet from "@/components/salas/ColaBottomSheet";
import { TapLink } from "@/components/ui/TapFeedback";
import {
  deriveCancionActivaFromCola,
  deriveColaResumen,
  fetchColaCompleta,
  fetchColaItemById,
  getColaItemIdFromSesion,
  type CancionActivaData,
} from "@/lib/sala-data";
import { COLA_AVISO_SHOW_DELAY_MS, COLA_BAR_HEIGHT_PX } from "@/lib/sala-layout";
import { triggerHaptic } from "@/lib/haptic";
import { createClient, ensureRealtimeAuth } from "@/lib/supabase/client";
import type { ColaItem, SesionSala } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const GIT_COMMIT_SHA = process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ?? "dev";
const SHOW_BUILD_SHA =
  process.env.NODE_ENV === "production" && GIT_COMMIT_SHA !== "dev";

type SalaPageShellProps = {
  salaId: number;
  salaNombre: string;
};

export default function SalaPageShell({ salaId, salaNombre }: SalaPageShellProps) {
  const closeDrawerRef = useRef<() => void>(() => {});
  const openDrawerRef = useRef<() => void>(() => {});
  const colaAvisoShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colaAvisoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drawerProgress, setDrawerProgress] = useState(0);
  const [colaAviso, setColaAviso] = useState<string | null>(null);

  const handleDrawerProgressChange = useCallback((progress: number) => {
    setDrawerProgress(progress);
  }, []);

  const handleRegisterDrawerClose = useCallback((close: () => void) => {
    closeDrawerRef.current = close;
  }, []);

  const handleRegisterDrawerOpen = useCallback((open: () => void) => {
    openDrawerRef.current = open;
  }, []);

  const handleColaAdded = useCallback(() => {
    triggerHaptic();

    if (colaAvisoShowTimerRef.current) {
      clearTimeout(colaAvisoShowTimerRef.current);
    }

    if (colaAvisoHideTimerRef.current) {
      clearTimeout(colaAvisoHideTimerRef.current);
    }

    setColaAviso(null);
    openDrawerRef.current();

    colaAvisoShowTimerRef.current = setTimeout(() => {
      setColaAviso("Canción sumada a la lista");
      colaAvisoShowTimerRef.current = null;

      colaAvisoHideTimerRef.current = setTimeout(() => {
        setColaAviso(null);
        colaAvisoHideTimerRef.current = null;
      }, 2500);
    }, COLA_AVISO_SHOW_DELAY_MS);
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
    const supabase = createClient();
    const items = await fetchColaCompleta(supabase, salaId);

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
  }, [salaId, loadColaCompleta, handleSesionChange]);

  const lyricsDimmed = drawerProgress > 0.05;

  return (
    <div
      className="relative flex flex-col overflow-hidden overscroll-none bg-bg-app"
      style={{ height: "100dvh" }}
    >
      <AppReadyMarker />
      <header className="shrink-0 border-b border-accent/35 bg-accent-dim px-2 py-1.5">
        <div className="flex items-center gap-1">
          <TapLink
            href="/salas"
            ariaLabel="Volver a salas"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-primary"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </TapLink>
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
          </div>
        </div>
      </header>

      <main
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-150"
        style={{
          opacity: lyricsDimmed ? 1 - drawerProgress * 0.6 : 1,
        }}
      >
        <CancionActivaSection
          cancionNombre={cancionActiva?.nombre ?? null}
          artista={cancionActiva?.artista ?? null}
          urlLetra={cancionActiva?.url_letra ?? null}
          letraTexto={cancionActiva?.letra_texto ?? null}
        />
      </main>

      {lyricsDimmed && (
        <button
          type="button"
          aria-label="Cerrar cola"
          className="absolute inset-x-0 top-0 z-10 bg-black/40"
          style={{
            bottom: COLA_BAR_HEIGHT_PX,
            opacity: drawerProgress,
            pointerEvents: drawerProgress > 0.35 ? "auto" : "none",
          }}
          onClick={() => closeDrawerRef.current()}
        />
      )}

      <ColaBottomSheet
        items={colaItems}
        salaId={salaId}
        onColaChange={loadColaCompleta}
        onItemsReordered={handleColaItemsReordered}
        onOpenBuscador={() => setBuscadorOpen(true)}
        avisoMensaje={colaAviso}
        onProgressChange={handleDrawerProgressChange}
        onRegisterClose={handleRegisterDrawerClose}
        onRegisterOpen={handleRegisterDrawerOpen}
      />

      {buscadorOpen && (
        <BuscadorModal
          open={buscadorOpen}
          onClose={() => setBuscadorOpen(false)}
          salaId={salaId}
          onDataChange={loadColaCompleta}
          onColaAdded={handleColaAdded}
        />
      )}
    </div>
  );
}
