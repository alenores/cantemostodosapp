"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import {
  HerramientasHubSectionLabel,
  HUB_SECTION_CANCIONES_LABEL,
  HUB_SECTION_HERRAMIENTAS_LABEL,
  HUB_SECTION_PRACTICA_LABEL,
} from "@/components/cancionero/HerramientasHubSections";
import HomeHubDestinations from "@/components/home/HomeHubDestinations";
import PwaInstallBanners from "@/components/pwa/PwaInstallBanners";
import HubModuleCard from "@/components/ui/HubModuleCard";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getPerfilAvisoMensaje } from "@/lib/perfil-avisos";
import { CANCIONERO_HUB_MODULES } from "@/lib/cancionero-hub-modules";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import { CANCIONERO_SYNC_EVENT } from "@/lib/offline/cancionero-events";
import type { UsuarioActivo } from "@/types";
import { WifiOff } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const CancioneroHubToolsLayer = dynamic(
  () => import("@/components/cancionero/CancioneroHubToolsLayer"),
  { ssr: false },
);

type CancioneroHubPageClientProps = {
  usuario: UsuarioActivo;
  globalCountInicial: number;
  favoritasCountInicial: number;
  avisoInicial?: string | null;
};

function scheduleIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(callback, 400);
  return () => window.clearTimeout(id);
}

export default function CancioneroHubPageClient({
  usuario,
  globalCountInicial,
  favoritasCountInicial,
  avisoInicial = null,
}: CancioneroHubPageClientProps) {
  const pathname = usePathname();
  const navigateWithProgress = useNavigateWithProgress();
  const online = useOnlineStatus();
  const isDesktop = useIsDesktop();
  const [globalCount, setGlobalCount] = useState(globalCountInicial);
  const [favoritasCount, setFavoritasCount] = useState(favoritasCountInicial);
  const [afinadorOpen, setAfinadorOpen] = useState(false);
  const [metronomoOpen, setMetronomoOpen] = useState(false);
  const [vozOpen, setVozOpen] = useState(false);
  const [compositorOpen, setCompositorOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toolsLayerMounted, setToolsLayerMounted] = useState(false);
  const [pendingModuleId, setPendingModuleId] = useState<string | null>(null);

  const isLoggedIn = usuario.id !== OFFLINE_GUEST_USUARIO.id;

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
    setFavoritasCount(favoritasCountInicial);
  }, [favoritasCountInicial]);

  useEffect(() => {
    function handleSyncFinished() {
      void refreshGlobalCount();
    }

    window.addEventListener(CANCIONERO_SYNC_EVENT, handleSyncFinished);

    return () => {
      window.removeEventListener(CANCIONERO_SYNC_EVENT, handleSyncFinished);
    };
  }, [refreshGlobalCount]);

  useEffect(() => {
    return scheduleIdle(() => {
      setToolsLayerMounted(true);
    });
  }, []);

  useEffect(() => {
    setPendingModuleId(null);
  }, [pathname]);

  const mountToolsLayer = useCallback(() => {
    setToolsLayerMounted(true);
  }, []);

  const avisoMensaje = getPerfilAvisoMensaje(avisoInicial);

  function handleModuleClick(moduleId: string, href?: string) {
    const moduleDef = CANCIONERO_HUB_MODULES.find((item) => item.id === moduleId);

    if (!moduleDef) {
      return;
    }

    if (moduleDef.requiresAuth && !isLoggedIn) {
      return;
    }

    if (moduleDef.kind === "afinador") {
      mountToolsLayer();
      setAfinadorOpen(true);
      return;
    }

    if (moduleDef.kind === "metronomo") {
      mountToolsLayer();
      setMetronomoOpen(true);
      return;
    }

    if (moduleDef.kind === "voz") {
      mountToolsLayer();
      setVozOpen(true);
      return;
    }

    if (moduleDef.kind === "compositor") {
      mountToolsLayer();
      setCompositorOpen(true);
      return;
    }

    if (moduleDef.kind === "editor-canciones") {
      mountToolsLayer();
      setEditorOpen(true);
      return;
    }

    if (href) {
      setPendingModuleId(moduleId);
      navigateWithProgress(href);
    }
  }

  const visibleModules = CANCIONERO_HUB_MODULES.filter(
    (module) =>
      (!module.requiresAuth || isLoggedIn) &&
      (!module.desktopOnly || isDesktop),
  );
  const cancionesModules = visibleModules.filter(
    (module) => module.section === "canciones",
  );
  const herramientasModules = visibleModules.filter(
    (module) => module.section === "herramientas",
  );
  const practicaModules = visibleModules.filter(
    (module) => module.section === "practica",
  );

  function getModuleAriaLabel(
    kind: (typeof CANCIONERO_HUB_MODULES)[number]["kind"],
    label: string,
  ): string {
    switch (kind) {
      case "afinador":
        return "Abrir afinador";
      case "metronomo":
        return "Abrir metrónomo";
      case "voz":
        return "Abrir entrenador vocal";
      case "compositor":
        return "Abrir compositor";
      case "editor-canciones":
        return "Abrir editor de canciones";
      default:
        return `Abrir ${label}`;
    }
  }

  function renderModuleCard(
    module: (typeof CANCIONERO_HUB_MODULES)[number],
  ) {
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
      ) : module.id === "mis-canciones" ? (
        <div className={ctaClassName}>
          <span className="font-bold">{module.ctaLabel} </span>
          <span className="font-normal opacity-70">({favoritasCount})</span>
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
        ariaLabel={getModuleAriaLabel(module.kind, module.label)}
        onClick={() => handleModuleClick(module.id, module.href)}
        pending={pendingModuleId === module.id}
        badge={module.comingSoon ? "Próx." : undefined}
        cta={ctaContent}
      />
    );
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-bg-app">
      <AppReadyMarker />

      {!isDesktop ? (
        <main className="app-page-main flex flex-col gap-3 px-4 py-6 pb-24 lg:px-8 lg:py-8">
          <div className="app-page-container flex flex-col gap-3 lg:gap-4">
            <PwaInstallBanners />

            {avisoMensaje && (
              <p
                className="rounded-[10px] border border-accent/40 bg-accent-dim px-4 py-3 text-sm text-text-primary"
                role="status"
              >
                {avisoMensaje}
              </p>
            )}

            {!online && (
              <p
                className="flex items-center gap-2 rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-muted"
                role="status"
              >
                <WifiOff className="size-4 shrink-0" aria-hidden="true" />
                Sin conexión · mostrando copia local cuando aplique
              </p>
            )}

            <HomeHubDestinations />

            <HerramientasHubSectionLabel label={HUB_SECTION_CANCIONES_LABEL} />

            <div className="app-hub-grid">
              {cancionesModules.map((module) => renderModuleCard(module))}
            </div>

            <HerramientasHubSectionLabel label={HUB_SECTION_HERRAMIENTAS_LABEL} />

            <div className="app-hub-grid">
              {herramientasModules.map((module) => renderModuleCard(module))}
            </div>

            <HerramientasHubSectionLabel label={HUB_SECTION_PRACTICA_LABEL} />

            <div className="app-hub-grid">
              {practicaModules.map((module) => renderModuleCard(module))}
            </div>

            {!isLoggedIn && (
              <p className="text-center text-sm text-text-muted">
                Iniciá sesión para acceder a Favoritas.
              </p>
            )}
          </div>
        </main>
      ) : null}

      {!isDesktop && toolsLayerMounted ? (
        <CancioneroHubToolsLayer
          isLoggedIn={isLoggedIn}
          online={online}
          afinadorOpen={afinadorOpen}
          metronomoOpen={metronomoOpen}
          vozOpen={vozOpen}
          compositorOpen={compositorOpen}
          editorOpen={editorOpen}
          onAfinadorOpenChange={setAfinadorOpen}
          onMetronomoOpenChange={setMetronomoOpen}
          onVozOpenChange={setVozOpen}
          onCompositorOpenChange={setCompositorOpen}
          onEditorOpenChange={setEditorOpen}
          onGlobalCountRefresh={refreshGlobalCount}
        />
      ) : null}
    </div>
  );
}
