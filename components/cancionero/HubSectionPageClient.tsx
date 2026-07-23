"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import HubModuleCard from "@/components/ui/HubModuleCard";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { CANCIONERO_HUB_MODULES } from "@/lib/cancionero-hub-modules";
import {
  HUB_DESTINATION_CANCIONERO_LABEL,
  HUB_SECTION_PRACTICA_LABEL,
} from "@/lib/herramientas-product";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import { CANCIONERO_SYNC_EVENT } from "@/lib/offline/cancionero-events";
import type { UsuarioActivo } from "@/types";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const CancioneroHubToolsLayer = dynamic(
  () => import("@/components/cancionero/CancioneroHubToolsLayer"),
  { ssr: false },
);

type HubSection = "practica" | "canciones";

type HubSectionPageClientProps = {
  usuario: UsuarioActivo;
  section: HubSection;
  globalCountInicial?: number;
  favoritasCountInicial?: number;
};

function scheduleIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(callback, 400);
  return () => window.clearTimeout(id);
}

export default function HubSectionPageClient({
  usuario,
  section,
  globalCountInicial = 0,
  favoritasCountInicial = 0,
}: HubSectionPageClientProps) {
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
  const sectionLabel =
    section === "practica"
      ? HUB_SECTION_PRACTICA_LABEL
      : HUB_DESTINATION_CANCIONERO_LABEL;

  const refreshGlobalCount = useCallback(async () => {
    const canciones = await getCancioneroLocalAsCancionero();
    setGlobalCount(canciones.length);
  }, []);

  useEffect(() => {
    if (section !== "canciones") {
      return;
    }

    if (online) {
      setGlobalCount(globalCountInicial);
      return;
    }

    void refreshGlobalCount();
  }, [globalCountInicial, online, refreshGlobalCount, section]);

  useEffect(() => {
    setFavoritasCount(favoritasCountInicial);
  }, [favoritasCountInicial]);

  useEffect(() => {
    if (section !== "canciones") {
      return;
    }

    function handleSyncFinished() {
      void refreshGlobalCount();
    }

    window.addEventListener(CANCIONERO_SYNC_EVENT, handleSyncFinished);

    return () => {
      window.removeEventListener(CANCIONERO_SYNC_EVENT, handleSyncFinished);
    };
  }, [refreshGlobalCount, section]);

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
      if (href) {
        setPendingModuleId(moduleId);
        navigateWithProgress(href);
        return;
      }

      mountToolsLayer();
      setMetronomoOpen(true);
      return;
    }

    if (moduleDef.kind === "voz") {
      if (href) {
        setPendingModuleId(moduleId);
        navigateWithProgress(href);
        return;
      }

      mountToolsLayer();
      setVozOpen(true);
      return;
    }

    if (moduleDef.kind === "compositor") {
      if (href) {
        setPendingModuleId(moduleId);
        navigateWithProgress(href);
        return;
      }

      mountToolsLayer();
      setCompositorOpen(true);
      return;
    }

    if (moduleDef.kind === "editor-canciones") {
      // Celular: pantalla nueva del editor. PC: modal del editor actual (sin tocar).
      if (!isDesktop && href) {
        setPendingModuleId(moduleId);
        const separator = href.includes("?") ? "&" : "?";
        navigateWithProgress(`${href}${separator}desde=hub`);
        return;
      }

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
      module.section === section &&
      (!module.requiresAuth || isLoggedIn) &&
      (!module.desktopOnly || isDesktop),
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
    const ctaToneClass =
      module.ctaTextTone === "white"
        ? "hub-module-card__cta--text-white"
        : module.ctaTextTone === "on-light"
          ? "hub-module-card__cta--text-on-light"
          : "hub-module-card__cta--text-accent";

    const ctaModeClass =
      module.ctaMode === "soft"
        ? "hub-module-card__cta--soft"
        : "hub-module-card__cta--solid";

    const ctaClassName = `hub-module-card__cta ${ctaModeClass} ${ctaToneClass}`;

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
        <div className={ctaClassName}>{module.ctaLabel}</div>
      );

    return (
      <HubModuleCard
        key={module.id}
        moduleId={module.id}
        label={module.label}
        icon={module.icon}
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
        <main
          className="app-page-main flex flex-col gap-3 px-4 pb-24 lg:px-8 lg:py-8"
          style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}
        >
          <div className="app-page-container flex flex-col gap-3 lg:gap-4">
            <h2 className="text-xl font-extrabold text-text-primary">
              {sectionLabel}
            </h2>

            <div className="app-hub-grid">
              {visibleModules.map((module) => renderModuleCard(module))}
            </div>

            {section === "canciones" && !isLoggedIn ? (
              <p className="text-center text-sm text-text-muted">
                Iniciá sesión para acceder a Favoritas.
              </p>
            ) : null}
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
