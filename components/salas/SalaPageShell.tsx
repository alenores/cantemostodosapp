"use client";

import BuscadorModal from "@/components/salas/BuscadorModal";
import CancionActivaSection from "@/components/salas/CancionActivaSection";
import ColaBottomSheet from "@/components/salas/ColaBottomSheet";
import { TapLink } from "@/components/ui/TapFeedback";
import {
  deriveCancionActivaFromCola,
  deriveColaResumen,
  fetchColaCompleta,
  fetchColaItemById,
  fetchGuardadasKeys,
  getColaItemIdFromSesion,
  type CancionActivaData,
} from "@/lib/sala-data";
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
  const [drawerProgress, setDrawerProgress] = useState(0);
  const [buscadorOpen, setBuscadorOpen] = useState(false);
  const [cancionActiva, setCancionActiva] = useState<CancionActivaData | null>(
    null,
  );
  const [colaItems, setColaItems] = useState<ColaItem[]>([]);
  const [guardadasKeys, setGuardadasKeys] = useState<Set<string>>(new Set());

  const loadColaCompleta = useCallback(async () => {
    const supabase = createClient();
    const [items, keys] = await Promise.all([
      fetchColaCompleta(supabase, salaId),
      fetchGuardadasKeys(supabase, salaId),
    ]);

    setColaItems(items);
    setGuardadasKeys(keys);
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
    <div className="relative flex h-[100dvh] flex-col bg-bg-app">
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
            <p className="text-[10px] font-semibold uppercase leading-tight tracking-[1.5px] text-accent">
              Sala activa
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

      <div
        className="relative flex min-h-0 flex-1 flex-col transition-opacity duration-150"
        style={{
          opacity: lyricsDimmed ? 1 - drawerProgress * 0.6 : 1,
        }}
      >
        <CancionActivaSection
          cancionNombre={cancionActiva?.nombre ?? null}
          artista={cancionActiva?.artista ?? null}
          urlLetra={cancionActiva?.url_letra ?? null}
        />
      </div>

      {lyricsDimmed && (
        <button
          type="button"
          aria-label="Cerrar cola"
          className="absolute inset-0 bottom-[52px] z-10 bg-black/40"
          style={{ opacity: drawerProgress }}
          onClick={() => closeDrawerRef.current()}
        />
      )}

      <ColaBottomSheet
        items={colaItems}
        guardadasKeys={guardadasKeys}
        salaId={salaId}
        onColaChange={loadColaCompleta}
        onOpenBuscador={() => setBuscadorOpen(true)}
        onProgressChange={setDrawerProgress}
        onRegisterClose={(close) => {
          closeDrawerRef.current = close;
        }}
      />

      {buscadorOpen && (
        <BuscadorModal
          open={buscadorOpen}
          onClose={() => setBuscadorOpen(false)}
          salaId={salaId}
          guardadasKeys={guardadasKeys}
          onDataChange={loadColaCompleta}
        />
      )}
    </div>
  );
}
