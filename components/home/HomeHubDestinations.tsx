"use client";

import HomeDestinationCard from "@/components/home/HomeDestinationCard";
import { useCancioneroNovedades } from "@/components/offline/CancioneroNovedadesContext";
import { TapButton } from "@/components/ui/TapFeedback";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { getActiveUserId } from "@/lib/auth/offline-user";
import {
  HUB_DESTINATION_AFINADOR_DESCRIPTION,
  HUB_DESTINATION_AFINADOR_LABEL,
  HUB_DESTINATION_CANCIONERO_DESCRIPTION,
  HUB_DESTINATION_CANCIONERO_LABEL,
  HUB_DESTINATION_INDIVIDUAL_DESCRIPTION,
  HUB_DESTINATION_INDIVIDUAL_LABEL,
  HUB_DESTINATION_PRACTICA_DESCRIPTION,
  HUB_DESTINATION_PRACTICA_LABEL,
  HUB_DESTINATION_SALAS_DESCRIPTION,
  HUB_DESTINATION_SALAS_LABEL,
  HUB_SECTION_DESTINOS_LABEL,
  HUB_WELCOME_TITLE,
} from "@/lib/herramientas-product";
import type { UsuarioActivo } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { Bell, Gauge, Guitar, Library, Loader2, MicVocal, Users, WifiOff } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type HomeHubDestinationsProps = {
  usuario: UsuarioActivo;
  isOwner: boolean;
  onOpenAfinador: () => void;
  installSlot?: ReactNode;
};

export default function HomeHubDestinations({
  usuario,
  isOwner,
  onOpenAfinador,
  installSlot = null,
}: HomeHubDestinationsProps) {
  const navigateWithProgress = useNavigateWithProgress();
  const online = useOnlineStatus();
  const novedades = useCancioneroNovedades();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [verifiedOwnerId, setVerifiedOwnerId] = useState<string | null>(null);

  const isLoggedIn = usuario.id !== OFFLINE_GUEST_USUARIO.id;
  const displayName = usuario.nombre.trim();
  const showName = isLoggedIn && displayName.length > 0;
  const showUsuarios = isOwner && verifiedOwnerId === usuario.id;

  useEffect(() => {
    let active = true;
    if (isOwner) {
      void getActiveUserId(createClient()).then((currentUserId) => {
        if (active) setVerifiedOwnerId(currentUserId === usuario.id ? usuario.id : null);
      }).catch(() => {
        if (active) setVerifiedOwnerId(null);
      });
    }
    return () => { active = false; };
  }, [isOwner, usuario.id]);

  function goTo(href: string) {
    setPendingHref(href);
    navigateWithProgress(href);
  }

  return (
    <section className="flex flex-col gap-7 pb-3">
      {installSlot}
      <div className="pt-1 text-left">
        <p className="text-[clamp(30px,8vw,36px)] font-extrabold leading-[1.12] tracking-tight text-text-primary">
          {HUB_WELCOME_TITLE},
        </p>
        {showName ? (
          <p className="mt-1 text-[clamp(30px,8vw,36px)] font-extrabold leading-[1.12] tracking-tight text-text-primary">
            ¡Hola, {displayName}!
          </p>
        ) : null}
        <h2 className="mt-2 text-[clamp(29px,7.6vw,35px)] font-extrabold leading-[1.12] tracking-tight text-text-primary">
          {HUB_SECTION_DESTINOS_LABEL}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="col-span-2 min-w-0">
          <HomeDestinationCard
            featured
            label={HUB_DESTINATION_INDIVIDUAL_LABEL}
            subtitle="Cantar solo"
            icon={Guitar}
            ariaLabel={`Ir a Individual: ${HUB_DESTINATION_INDIVIDUAL_DESCRIPTION}`}
            onClick={() => goTo("/individual")}
            pending={pendingHref === "/individual"}
          />
        </div>

        <div className="relative min-w-0">
          <HomeDestinationCard
            label={HUB_DESTINATION_CANCIONERO_LABEL}
            subtitle="Explorar"
            icon={Library}
            ariaLabel={`Ir a Cancionero: ${HUB_DESTINATION_CANCIONERO_DESCRIPTION}`}
            onClick={() => goTo("/canciones")}
            pending={pendingHref === "/canciones"}
          />
          {novedades.hasNotice ? (
            <button
              type="button"
              onClick={novedades.open}
              aria-label={`Ver novedades del Cancionero${novedades.count ? ` (${novedades.count})` : ""}`}
              className="absolute right-2 top-2 z-10 flex size-11 items-center justify-center rounded-full text-text-secondary"
            >
              <Bell className="size-5" aria-hidden="true" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-accent" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <HomeDestinationCard
          label={HUB_DESTINATION_SALAS_LABEL}
          subtitle="En grupo"
          icon={Users}
          ariaLabel={online ? `Ir a Salas: ${HUB_DESTINATION_SALAS_DESCRIPTION}` : "Salas no disponible sin conexión"}
          onClick={() => goTo("/salas")}
          disabled={!online}
          pending={pendingHref === "/salas"}
          trailing={!online ? <WifiOff className="size-4 text-text-secondary" /> : null}
        />

        <HomeDestinationCard
          label={HUB_DESTINATION_PRACTICA_LABEL}
          subtitle="Practicar"
          icon={MicVocal}
          ariaLabel={`Ir a Práctica: ${HUB_DESTINATION_PRACTICA_DESCRIPTION}`}
          onClick={() => goTo("/practica")}
          pending={pendingHref === "/practica"}
        />

        <HomeDestinationCard
          label={HUB_DESTINATION_AFINADOR_LABEL}
          subtitle="Afinar"
          icon={Gauge}
          ariaLabel={`Abrir Afinador: ${HUB_DESTINATION_AFINADOR_DESCRIPTION}`}
          onClick={onOpenAfinador}
        />

        {showUsuarios ? (
          <div className="col-span-2 min-w-0">
            <TapButton
              type="button"
              aria-label="Ir a Usuarios: administrar cuentas"
              onClick={() => goTo("/inicio/usuarios")}
              disabled={pendingHref === "/inicio/usuarios"}
              className="home-destination-card relative flex w-full items-center gap-4 rounded-[24px] px-5 py-4 text-left"
            >
              {pendingHref === "/inicio/usuarios" ? (
                <span className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-bg-app/55" aria-hidden="true">
                  <Loader2 className="size-6 animate-spin text-text-primary" />
                </span>
              ) : null}
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white" aria-hidden="true">
                <Users className="size-7" strokeWidth={2.2} />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-extrabold uppercase tracking-[0.015em] text-text-primary">Usuarios</span>
                <span className="mt-1 block text-[13px] text-text-muted">Administrar cuentas</span>
              </span>
            </TapButton>
          </div>
        ) : null}
      </div>
    </section>
  );
}
