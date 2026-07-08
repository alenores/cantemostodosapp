"use client";

import HubModuleCard from "@/components/ui/HubModuleCard";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  HUB_DESTINATION_INDIVIDUAL_CTA,
  HUB_DESTINATION_INDIVIDUAL_LABEL,
  HUB_DESTINATION_SALAS_CTA,
  HUB_DESTINATION_SALAS_LABEL,
  HUB_SECTION_DESTINOS_LABEL,
  HUB_WELCOME_TITLE,
} from "@/lib/herramientas-product";
import { Music2, Users, WifiOff } from "lucide-react";
import { HerramientasHubSectionLabel } from "@/components/cancionero/HerramientasHubSections";

export default function HomeHubDestinations() {
  const navigateWithProgress = useNavigateWithProgress();
  const online = useOnlineStatus();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-extrabold text-text-primary lg:text-2xl">{HUB_WELCOME_TITLE}</h2>

      <HerramientasHubSectionLabel label={HUB_SECTION_DESTINOS_LABEL} />

        <div className="app-hub-grid-destinos">
        <HubModuleCard
          label={HUB_DESTINATION_SALAS_LABEL}
          icon={Users}
          iconColor="#F4845F"
          ariaLabel={
            online
              ? "Ir a salas para cantar en grupo"
              : "Salas no disponible sin conexión"
          }
          onClick={() => navigateWithProgress("/salas")}
          disabled={!online}
          cta={
            <span className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-[9px] text-center text-sm font-bold text-white">
              {!online ? (
                <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
              ) : null}
              {HUB_DESTINATION_SALAS_CTA}
            </span>
          }
        />

        <HubModuleCard
          label={HUB_DESTINATION_INDIVIDUAL_LABEL}
          icon={Music2}
          iconColor="var(--accent)"
          ariaLabel="Cantar individualmente con letra y fila"
          onClick={() => navigateWithProgress("/individual")}
          cta={
            <span className="w-full rounded-lg bg-[#3A3A3A] px-3 py-[9px] text-center text-sm font-bold text-white">
              {HUB_DESTINATION_INDIVIDUAL_CTA}
            </span>
          }
        />
      </div>
    </section>
  );
}
