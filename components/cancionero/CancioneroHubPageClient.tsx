"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import HomeHubDestinations from "@/components/home/HomeHubDestinations";
import PwaInstallBanners from "@/components/pwa/PwaInstallBanners";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getPerfilAvisoMensaje } from "@/lib/perfil-avisos";
import type { UsuarioActivo } from "@/types";
import { WifiOff } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

const AfinadorLayer = dynamic(() => import("@/components/ui/AfinadorLayer"), {
  ssr: false,
});

type CancioneroHubPageClientProps = {
  usuario: UsuarioActivo;
  avisoInicial?: string | null;
};

export default function CancioneroHubPageClient({
  usuario,
  avisoInicial = null,
}: CancioneroHubPageClientProps) {
  const online = useOnlineStatus();
  const isDesktop = useIsDesktop();
  const [afinadorOpen, setAfinadorOpen] = useState(false);
  const [afinadorMounted, setAfinadorMounted] = useState(false);

  const avisoMensaje = getPerfilAvisoMensaje(avisoInicial);

  const openAfinador = useCallback(() => {
    setAfinadorMounted(true);
    setAfinadorOpen(true);
  }, []);

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-bg-app">
      <AppReadyMarker />

      {!isDesktop ? (
        <main className="app-page-main flex flex-col gap-3 px-4 py-6 pb-24 lg:px-8 lg:py-8">
          <div className="app-page-container flex flex-col gap-3 lg:gap-4">
            <PwaInstallBanners />

            {avisoMensaje ? (
              <p
                className="rounded-[10px] border border-accent/40 bg-accent-dim px-4 py-3 text-sm text-text-primary"
                role="status"
              >
                {avisoMensaje}
              </p>
            ) : null}

            {!online ? (
              <p
                className="flex items-center gap-2 rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-muted"
                role="status"
              >
                <WifiOff className="size-4 shrink-0" aria-hidden="true" />
                Sin conexión · mostrando copia local cuando aplique
              </p>
            ) : null}

            <HomeHubDestinations
              usuario={usuario}
              onOpenAfinador={openAfinador}
            />
          </div>
        </main>
      ) : null}

      {!isDesktop && afinadorMounted ? (
        <AfinadorLayer open={afinadorOpen} onOpenChange={setAfinadorOpen} />
      ) : null}
    </div>
  );
}
