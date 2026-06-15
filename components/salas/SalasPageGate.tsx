"use client";

import SalasPageClient from "@/components/salas/SalasPageClient";
import { SalasLoadingSkeleton } from "@/components/ui/NavLoadingSkeleton";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { resolveOfflineSalasPayload } from "@/lib/auth/offline-entry";
import { getAppSnapshot, saveAppSnapshot } from "@/lib/offline/app-snapshot-store";
import { createClient } from "@/lib/supabase/client";
import type { Sala, UsuarioActivo } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const refreshAttemptedRef = useRef(false);
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
      refreshAttemptedRef.current = false;
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

      if (!refreshAttemptedRef.current) {
        refreshAttemptedRef.current = true;
        router.refresh();
        return;
      }

      router.replace("/auth/login");
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
    router,
    serverSalas,
    serverUsuario,
  ]);

  if (gate.status === "loading") {
    return <SalasLoadingSkeleton />;
  }

  return <SalasPageClient {...gate.payload} />;
}
