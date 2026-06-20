"use client";

import SalasPageClient from "@/components/salas/SalasPageClient";
import { SalasLoadingSkeleton } from "@/components/ui/NavLoadingSkeleton";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { resolveOfflineSalasPayload } from "@/lib/auth/offline-entry";
import { countCancionesCancionero } from "@/lib/cancionero";
import { getAppSnapshot, saveAppSnapshot } from "@/lib/offline/app-snapshot-store";
import { warmOfflineCache } from "@/lib/offline/warm-offline-cache";
import { createClient } from "@/lib/supabase/client";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import type { Sala, UsuarioActivo } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SalasPageGateProps = {
  serverUsuario: UsuarioActivo | null;
  serverSalas: Pick<Sala, "id" | "nombre" | "descripcion">[] | null;
  cancioneroTotal: number;
  errorMessage: string | null;
  avisoInicial?: string | null;
};

type GateState =
  | { status: "loading" }
  | {
      status: "ready";
      payload: {
        salas: Pick<Sala, "id" | "nombre" | "descripcion">[];
        usuario: UsuarioActivo;
        cancioneroTotal: number;
        errorMessage: string | null;
        avisoInicial: string | null;
      };
    };

export default function SalasPageGate({
  serverUsuario,
  serverSalas,
  cancioneroTotal,
  errorMessage,
  avisoInicial = null,
}: SalasPageGateProps) {
  const online = useOnlineStatus();
  const router = useRouter();
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  const [gate, setGate] = useState<GateState>(() =>
    serverUsuario && serverSalas
      ? {
          status: "ready",
          payload: {
            salas: serverSalas,
            usuario: serverUsuario,
            cancioneroTotal,
            errorMessage,
            avisoInicial,
          },
        }
      : { status: "loading" },
  );

  useEffect(() => {
    if (serverUsuario && serverSalas) {
      const payload = {
        salas: serverSalas,
        usuario: serverUsuario,
        cancioneroTotal,
        errorMessage,
        avisoInicial,
      };

      setGate({ status: "ready", payload });
      void saveAppSnapshot({
        usuario: serverUsuario,
        salas: serverSalas,
        cancioneroTotal,
      });
      void warmOfflineCache();
      setRefreshAttempted(false);
      return;
    }

    let cancelled = false;

    async function bootstrapWithoutServerUser() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      if (!online) {
        const snapshot = await getAppSnapshot();

        if (cancelled) {
          return;
        }

        setGate({
          status: "ready",
          payload: resolveOfflineSalasPayload(snapshot, session, avisoInicial),
        });
        return;
      }

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      if (!refreshAttempted) {
        setRefreshAttempted(true);
        router.refresh();
        return;
      }

      const usuario = mapUserToUsuarioActivo(session.user);
      const [{ data: salas, error: salasError }, cancioneroTotalClient] =
        await Promise.all([
          supabase
            .from("salas")
            .select("id, nombre, descripcion")
            .eq("visible", true)
            .order("nombre"),
          countCancionesCancionero(supabase).catch(() => 0),
        ]);

      if (cancelled) {
        return;
      }

      const payload = {
        salas: salas ?? [],
        usuario,
        cancioneroTotal: cancioneroTotalClient,
        errorMessage: salasError?.message ?? null,
        avisoInicial,
      };

      setGate({ status: "ready", payload });
      void saveAppSnapshot({
        usuario,
        salas: payload.salas,
        cancioneroTotal: payload.cancioneroTotal,
      });
      void warmOfflineCache();
    }

    void bootstrapWithoutServerUser();

    return () => {
      cancelled = true;
    };
  }, [
    avisoInicial,
    cancioneroTotal,
    errorMessage,
    online,
    refreshAttempted,
    router,
    serverSalas,
    serverUsuario,
  ]);

  if (gate.status === "loading") {
    return <SalasLoadingSkeleton />;
  }

  return <SalasPageClient {...gate.payload} />;
}
