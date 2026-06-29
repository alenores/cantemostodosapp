"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import PwaInstallBanners from "@/components/pwa/PwaInstallBanners";
import HubModuleCard from "@/components/ui/HubModuleCard";
import AfinadorModal from "@/components/ui/AfinadorModal";
import { useAfinador } from "@/hooks/useAfinador";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { CANCIONERO_HUB_MODULES } from "@/lib/cancionero-hub-modules";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import { CANCIONERO_SYNC_EVENT } from "@/lib/offline/cancionero-events";
import type { UsuarioActivo } from "@/types";
import { WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type CancioneroHubPageClientProps = {
  usuario: UsuarioActivo;
  globalCountInicial: number;
};

export default function CancioneroHubPageClient({
  usuario,
  globalCountInicial,
}: CancioneroHubPageClientProps) {
  const pathname = usePathname();
  const navigateWithProgress = useNavigateWithProgress();
  const online = useOnlineStatus();
  const [globalCount, setGlobalCount] = useState(globalCountInicial);
  const [afinadorOpen, setAfinadorOpen] = useState(false);
  const [pendingModuleId, setPendingModuleId] = useState<string | null>(null);
  const {
    detection: afinadorDetection,
    micError: afinadorMicError,
    micPermissionGranted: afinadorMicPermissionGranted,
    micReady: afinadorMicReady,
    micStarting: afinadorMicStarting,
    start: startAfinador,
    stop: stopAfinador,
  } = useAfinador();

  const refreshGlobalCount = useCallback(async () => {
    const canciones = await getCancioneroLocalAsCancionero();
    setGlobalCount(canciones.length);
  }, []);

  useEffect(() => {
    if (online) {
      setGlobalCount(globalCountInicial);
      return;
    }

    void refreshGlobalCount();
  }, [globalCountInicial, online, refreshGlobalCount]);

  useEffect(() => {
    function handleSyncFinished() {
      void refreshGlobalCount();
    }

    window.addEventListener(CANCIONERO_SYNC_EVENT, handleSyncFinished);

    return () => {
      window.removeEventListener(CANCIONERO_SYNC_EVENT, handleSyncFinished);
    };
  }, [refreshGlobalCount]);

  useHardwareBack(afinadorOpen, () => {
    stopAfinador();
    setAfinadorOpen(false);
  });

  useEffect(() => {
    setPendingModuleId(null);
  }, [pathname]);

  const isLoggedIn = usuario.id !== OFFLINE_GUEST_USUARIO.id;

  function handleModuleClick(moduleId: string, href?: string) {
    const moduleDef = CANCIONERO_HUB_MODULES.find((item) => item.id === moduleId);

    if (!moduleDef) {
      return;
    }

    if (moduleDef.requiresAuth && !isLoggedIn) {
      return;
    }

    if (moduleDef.kind === "afinador") {
      setAfinadorOpen(true);
      if (afinadorMicPermissionGranted) {
        void startAfinador();
      }
      return;
    }

    if (href) {
      setPendingModuleId(moduleId);
      navigateWithProgress(href);
    }
  }

  const visibleModules = CANCIONERO_HUB_MODULES.filter(
    (module) => !module.requiresAuth || isLoggedIn,
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg-app">
      <AppReadyMarker />

      <main className="flex flex-1 flex-col gap-3 px-4 py-6">
        <PwaInstallBanners />

        {!online && (
          <p
            className="flex items-center gap-2 rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-muted"
            role="status"
          >
            <WifiOff className="size-4 shrink-0" aria-hidden="true" />
            Sin conexión · mostrando copia local cuando aplique
          </p>
        )}

        <div className="grid grid-cols-2 gap-[10px]">
          {visibleModules.map((module) => {
            const ctaClassName =
              module.ctaVariant === "accent"
                ? "w-full rounded-lg bg-accent px-3 py-[9px] text-center text-sm font-bold text-white"
                : "w-full rounded-lg bg-[#3A3A3A] px-3 py-[9px] text-center text-sm text-white";

            const ctaContent =
              module.id === "cancionero" ? (
                <div className={ctaClassName}>
                  <span className="font-bold">{module.ctaLabel} </span>
                  <span className="font-normal opacity-70">({globalCount})</span>
                </div>
              ) : (
                <span className={ctaClassName}>{module.ctaLabel}</span>
              );

            return (
              <HubModuleCard
                key={module.id}
                label={module.label}
                icon={module.icon}
                iconColor={module.iconColor}
                ariaLabel={
                  module.kind === "afinador"
                    ? "Abrir afinador"
                    : `Abrir ${module.label}`
                }
                onClick={() => handleModuleClick(module.id, module.href)}
                pending={pendingModuleId === module.id}
                cta={ctaContent}
              />
            );
          })}
        </div>

        {!isLoggedIn && (
          <p className="text-center text-sm text-text-muted">
            Iniciá sesión para acceder a Mis canciones.
          </p>
        )}
      </main>

      <AfinadorModal
        open={afinadorOpen}
        detection={afinadorDetection}
        micError={afinadorMicError}
        micPermissionGranted={afinadorMicPermissionGranted}
        micReady={afinadorMicReady}
        micStarting={afinadorMicStarting}
        onRequestMic={() => void startAfinador()}
        onClose={() => {
          stopAfinador();
          setAfinadorOpen(false);
        }}
      />
    </div>
  );
}
