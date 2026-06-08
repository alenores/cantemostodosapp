"use client";

import BarraCola from "@/components/salas/BarraCola";
import BuscadorModal from "@/components/salas/BuscadorModal";
import CancionActivaSection from "@/components/salas/CancionActivaSection";
import ColaJuntadaSection from "@/components/salas/ColaJuntadaSection";
import {
  deriveCancionActivaFromCola,
  deriveColaResumen,
  fetchColaCompleta,
  fetchColaItemById,
  fetchGuardadasKeys,
  getColaItemIdFromSesion,
  type CancionActivaData,
  type ColaResumen,
} from "@/lib/sala-data";
import { createClient, ensureRealtimeAuth } from "@/lib/supabase/client";
import type { ColaItem, SesionSala } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const GIT_COMMIT_SHA = process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ?? "dev";
const SHOW_BUILD_SHA =
  process.env.NODE_ENV === "production" && GIT_COMMIT_SHA !== "dev";

type SalaPageShellProps = {
  salaId: number;
  salaNombre: string;
};

const emptyColaResumen: ColaResumen = {
  pendientes: 0,
  proximaNombre: null,
};

export default function SalaPageShell({ salaId, salaNombre }: SalaPageShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [buscadorOpen, setBuscadorOpen] = useState(false);
  const [cancionActiva, setCancionActiva] = useState<CancionActivaData | null>(
    null,
  );
  const [colaItems, setColaItems] = useState<ColaItem[]>([]);
  const [guardadasKeys, setGuardadasKeys] = useState<Set<string>>(new Set());
  const [colaResumen, setColaResumen] = useState<ColaResumen>(emptyColaResumen);

  const loadColaCompleta = useCallback(async () => {
    const supabase = createClient();
    const [items, keys] = await Promise.all([
      fetchColaCompleta(supabase, salaId),
      fetchGuardadasKeys(supabase, salaId),
    ]);

    setColaItems(items);
    setGuardadasKeys(keys);
    setColaResumen(deriveColaResumen(items));
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

  return (
    <div className="relative flex h-[100dvh] flex-col bg-bg-app">
      <header className="shrink-0 border-b border-accent/35 bg-accent-dim px-2 py-1.5">
        <div className="flex items-center gap-1">
          <Link
            href="/salas"
            aria-label="Volver a salas"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-primary"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
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
        className={`relative flex min-h-0 flex-1 flex-col transition-opacity duration-350 ${
          drawerOpen ? "opacity-40" : "opacity-100"
        }`}
        style={{ transitionTimingFunction: "var(--transition-timing)" }}
      >
        <CancionActivaSection
          cancionNombre={cancionActiva?.nombre ?? null}
          artista={cancionActiva?.artista ?? null}
          urlLetra={cancionActiva?.url_letra ?? null}
        />
      </div>

      {drawerOpen && (
        <button
          type="button"
          aria-label="Cerrar cola"
          className="absolute inset-0 bottom-[52px] z-10 bg-black/40"
          onClick={() => {
            setDrawerOpen(false);
            setDrawerExpanded(false);
          }}
        />
      )}

      <ColaJuntadaSection
        open={drawerOpen}
        expanded={drawerExpanded}
        onToggleExpand={() => setDrawerExpanded((prev) => !prev)}
        items={colaItems}
        guardadasKeys={guardadasKeys}
        salaId={salaId}
        onColaChange={loadColaCompleta}
        onOpenBuscador={() => setBuscadorOpen(true)}
      />

      <BarraCola
        pendientes={colaResumen.pendientes}
        proximaNombre={colaResumen.proximaNombre}
        open={drawerOpen}
        onToggle={() =>
          setDrawerOpen((prev) => {
            if (prev) {
              setDrawerExpanded(false);
            }
            return !prev;
          })
        }
        onOpen={() => setDrawerOpen(true)}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerExpanded(false);
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
