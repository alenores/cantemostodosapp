"use client";

import SalasPageClient from "@/components/salas/SalasPageClient";
import { SalasLoadingSkeleton } from "@/components/ui/NavLoadingSkeleton";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getAppSnapshot, saveAppSnapshot } from "@/lib/offline/app-snapshot-store";
import { APP_SHELL_BG } from "@/lib/splash-theme";
import { createClient } from "@/lib/supabase/client";
import type { Sala, UsuarioActivo } from "@/types";
import { WifiOff } from "lucide-react";
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
  | { status: "ready"; payload: Omit<SalasPageGateProps, "serverUsuario" | "serverSalas"> & {
      salas: Pick<Sala, "id" | "nombre" | "descripcion">[];
      usuario: UsuarioActivo;
    } }
  | { status: "offline-no-session" };

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

      if (!session) {
        if (online) {
          router.replace("/auth/login");
        } else {
          setGate({ status: "offline-no-session" });
        }
        return;
      }

      if (online) {
        if (!refreshAttemptedRef.current) {
          refreshAttemptedRef.current = true;
          router.refresh();
          return;
        }

        router.replace("/auth/login");
        return;
      }

      const snapshot = await getAppSnapshot();

      if (cancelled) {
        return;
      }

      if (!snapshot) {
        setGate({ status: "offline-no-session" });
        return;
      }

      setGate({
        status: "ready",
        payload: {
          salas: snapshot.salas,
          usuario: snapshot.usuario,
          cancioneroTotal: snapshot.cancioneroTotal,
          errorMessage: null,
          avisoInicial,
        },
      });
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

  if (gate.status === "offline-no-session") {
    return (
      <div
        className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center"
        style={{ backgroundColor: APP_SHELL_BG }}
      >
        <WifiOff className="size-12 text-text-muted" aria-hidden="true" />
        <h1 className="text-xl font-extrabold text-text-primary">Sin conexión</h1>
        <p className="max-w-sm text-sm text-text-muted">
          No hay sesión guardada en este celular. Conectate a internet y entrá
          una vez; después podés abrir la app sin WiFi.
        </p>
      </div>
    );
  }

  return <SalasPageClient {...gate.payload} />;
}
