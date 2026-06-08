"use client";

import BarraCola from "@/components/salas/BarraCola";
import CancionActivaSection from "@/components/salas/CancionActivaSection";
import ColaJuntadaSection from "@/components/salas/ColaJuntadaSection";
import {
  deriveColaResumen,
  fetchCancionActiva,
  fetchColaCompleta,
  fetchColaItemById,
  fetchGuardadasKeys,
  getColaItemIdFromSesion,
  type CancionActivaData,
  type ColaResumen,
} from "@/lib/sala-data";
import { createClient } from "@/lib/supabase/client";
import type { ColaItem, SesionSala } from "@/types";
import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
  }, [salaId]);

  const loadCancionActiva = useCallback(async () => {
    const supabase = createClient();
    const cancion = await fetchCancionActiva(supabase, salaId);
    setCancionActiva(cancion);
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

  useEffect(() => {
    const supabase = createClient();

    void loadCancionActiva();
    void loadColaCompleta();

    const sesionChannel = supabase
      .channel(`sesion-${salaId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sesion_sala",
          filter: `sala_id=eq.${salaId}`,
        },
        (payload) => {
          void updateCancionFromSesion(payload.new as SesionSala);
        },
      )
      .subscribe();

    const colaChannel = supabase
      .channel(`cola-${salaId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cola_juntada",
          filter: `sala_id=eq.${salaId}`,
        },
        () => {
          void loadColaCompleta();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(sesionChannel);
      void supabase.removeChannel(colaChannel);
    };
  }, [salaId, loadCancionActiva, loadColaCompleta, updateCancionFromSesion]);

  return (
    <div className="relative flex h-[100dvh] flex-col bg-bg-app">
      <header className="shrink-0 border-b border-border bg-bg-darker px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[1.5px] text-text-faint">
              Sala activa
            </p>
            <h1 className="truncate text-lg font-extrabold text-text-primary">
              {salaNombre}
            </h1>
          </div>
          <button
            type="button"
            aria-label="Buscar canción"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent"
          >
            <Search className="size-5 text-white" aria-hidden="true" />
          </button>
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
      />
    </div>
  );
}
