"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import HomeHubDestinations from "@/components/home/HomeHubDestinations";
import InstallHomeButton from "@/components/pwa/InstallHomeButton";
import { OpenFromHomeHelp } from "@/components/pwa/OpenFromHomeHelp";
import { usePwaOnDeviceInBrowser } from "@/hooks/usePwaOnDeviceInBrowser";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getPerfilAvisoMensaje } from "@/lib/perfil-avisos";
import "@/lib/pwa-install-prompt";
import {
  getPwaInstalledServerSnapshot,
  getPwaInstalledSnapshot,
  isIphoneForPwaInstall,
  isLikelyInAppBrowser,
  subscribePwaInstalled,
} from "@/lib/pwa-platform";
import type { UsuarioActivo } from "@/types";
import { WifiOff } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const AfinadorLayer = dynamic(() => import("@/components/ui/AfinadorLayer"), {
  ssr: false,
});

type CancioneroHubPageClientProps = {
  usuario: UsuarioActivo;
  avisoInicial?: string | null;
  isOwner?: boolean;
};

export default function CancioneroHubPageClient({
  usuario,
  avisoInicial = null,
  isOwner = false,
}: CancioneroHubPageClientProps) {
  const online = useOnlineStatus();
  const isDesktop = useIsDesktop();
  const isInstalledMode = useSyncExternalStore(
    subscribePwaInstalled,
    getPwaInstalledSnapshot,
    getPwaInstalledServerSnapshot,
  );
  const pwaOnDeviceInBrowser = usePwaOnDeviceInBrowser(isInstalledMode);
  const [iphone, setIphone] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [afinadorOpen, setAfinadorOpen] = useState(false);
  const [afinadorMounted, setAfinadorMounted] = useState(false);

  const avisoMensaje = getPerfilAvisoMensaje(avisoInicial);
  const tapaInicio = !isInstalledMode && pwaOnDeviceInBrowser === true;
  const mostrarBotonInstalar = !isInstalledMode && pwaOnDeviceInBrowser === false;

  useEffect(() => {
    setIphone(isIphoneForPwaInstall());
    setInApp(isLikelyInAppBrowser());
  }, []);

  useEffect(() => {
    if (!tapaInicio) return;
    document.body.setAttribute("data-pwa-abrir-desde-icono", "");
    return () => {
      document.body.removeAttribute("data-pwa-abrir-desde-icono");
    };
  }, [tapaInicio]);

  const openAfinador = useCallback(() => {
    setAfinadorMounted(true);
    setAfinadorOpen(true);
  }, []);

  return (
    <div className="home-inicio-fondo relative flex min-h-full flex-1 flex-col">
      <AppReadyMarker />

      {!isDesktop ? (
        <main className="app-page-main flex flex-col gap-3 bg-transparent px-5 py-5 pb-28 lg:px-8 lg:py-8">
          <div className="app-page-container flex flex-col gap-3 lg:gap-4">
            {tapaInicio ? (
              <div className="pwa-install-tema pt-2">
                <OpenFromHomeHelp platform={iphone ? "ios" : "android"} inAppBrowser={inApp} />
              </div>
            ) : null}

            {!tapaInicio && avisoMensaje ? (
              <p
                className="rounded-[10px] border border-accent/40 bg-accent-dim px-4 py-3 text-sm text-text-primary"
                role="status"
              >
                {avisoMensaje}
              </p>
            ) : null}

            {!tapaInicio && !online ? (
              <p
                className="flex items-center gap-2 rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-muted"
                role="status"
              >
                <WifiOff className="size-4 shrink-0" aria-hidden="true" />
                Sin conexión · mostrando copia local cuando aplique
              </p>
            ) : null}

            {!tapaInicio ? (
              <HomeHubDestinations
                usuario={usuario}
                isOwner={isOwner}
                onOpenAfinador={openAfinador}
                installSlot={mostrarBotonInstalar ? <InstallHomeButton /> : null}
              />
            ) : null}
          </div>
        </main>
      ) : null}

      {!isDesktop && afinadorMounted ? (
        <AfinadorLayer open={afinadorOpen} onOpenChange={setAfinadorOpen} />
      ) : null}
    </div>
  );
}
