"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import SalasPageClient from "@/components/salas/SalasPageClient";
import { SalasLoadingSkeleton } from "@/components/ui/NavLoadingSkeleton";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { resolveOfflineSalasPayload } from "@/lib/auth/offline-entry";
import { getAppSnapshot, saveAppSnapshot } from "@/lib/offline/app-snapshot-store";
import { warmOfflineCache } from "@/lib/offline/warm-offline-cache";
import { fetchSalasDelUsuario } from "@/lib/sala-miembros";
import { createClient } from "@/lib/supabase/client";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import type { Sala, UsuarioActivo } from "@/types";
import { Users, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SalasPageGateProps = {
  serverUsuario: UsuarioActivo | null;
  serverSalas: Pick<Sala, "id" | "nombre" | "descripcion" | "avatar_url">[] | null;
  errorMessage: string | null;
  avisoInicial?: string | null;
};

type GateState =
  | { status: "loading" }
  | { status: "guest" }
  | {
      status: "ready";
      payload: {
        salas: Pick<Sala, "id" | "nombre" | "descripcion" | "avatar_url">[];
        usuario: UsuarioActivo;
        errorMessage: string | null;
        avisoInicial: string | null;
      };
    };

function SalasInvitado({ online }: { online: boolean }) {
  return (
    <div className="tono-pagina relative flex h-full min-h-0 flex-1 flex-col overflow-y-auto">
      <AppReadyMarker />
      <main className="app-page-main flex flex-1 flex-col gap-5 px-5 py-7 pb-28 lg:gap-6 lg:px-8 lg:py-8">
        <div className="app-page-container flex flex-1 flex-col gap-5 lg:gap-6">
          <header className="pt-1">
            <h2 className="text-[clamp(30px,8vw,36px)] font-extrabold leading-[1.12] tracking-tight text-text-primary">
              Salas
            </h2>
            <p className="mt-2 max-w-md text-[14px] text-text-muted">
              Entrá a tocar con tu gente
            </p>
          </header>

          {!online ? (
            <p
              className="tono-borde tono-campo flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm text-text-muted"
              role="status"
            >
              <WifiOff className="size-4 shrink-0" aria-hidden="true" />
              Sin conexión · las salas necesitan internet. Usá Individual para
              tocar solo.
            </p>
          ) : null}

          <div className="home-destination-card flex flex-1 flex-col items-center justify-center gap-5 rounded-[28px] px-6 py-12 text-center">
            <span
              className="tono-pozo flex size-16 items-center justify-center rounded-2xl text-text-primary"
              aria-hidden="true"
            >
              <Users className="size-8" />
            </span>
            <div className="max-w-xs space-y-1.5">
              <p className="text-base font-bold text-text-primary">
                Cantar en grupo
              </p>
              <p className="text-sm text-text-muted">
                Varias personas ven la misma canción al mismo tiempo y
                comparten una fila. Para usarla, iniciá sesión.
              </p>
            </div>
            <Link
              href="/auth/login?next=/salas"
              className="mt-1 flex min-h-11 items-center rounded-2xl bg-accent px-5 text-sm font-semibold text-white"
            >
              Iniciá sesión
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SalasPageGate({
  serverUsuario,
  serverSalas,
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
        errorMessage,
        avisoInicial,
      };

      setGate({ status: "ready", payload });
      void saveAppSnapshot({
        usuario: serverUsuario,
        salas: serverSalas,
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

      if (!session) {
        setGate({ status: "guest" });
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

      if (!refreshAttempted) {
        setRefreshAttempted(true);
        router.refresh();
        return;
      }

      const usuario = mapUserToUsuarioActivo(session.user);
      const { salas, error: salasError } = await fetchSalasDelUsuario(
        supabase,
        session.user.id,
      );

      if (cancelled) {
        return;
      }

      const payload = {
        salas,
        usuario,
        errorMessage: salasError,
        avisoInicial,
      };

      setGate({ status: "ready", payload });
      void saveAppSnapshot({
        usuario,
        salas: payload.salas,
      });
      void warmOfflineCache();
    }

    void bootstrapWithoutServerUser();

    return () => {
      cancelled = true;
    };
  }, [
    avisoInicial,
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

  if (gate.status === "guest") {
    return <SalasInvitado online={online} />;
  }

  return <SalasPageClient {...gate.payload} />;
}
