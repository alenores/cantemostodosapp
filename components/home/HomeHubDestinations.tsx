"use client";

import HomeDestinationCard from "@/components/home/HomeDestinationCard";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import {
  HUB_DESTINATION_AFINADOR_DESCRIPTION,
  HUB_DESTINATION_AFINADOR_HELP,
  HUB_DESTINATION_AFINADOR_LABEL,
  HUB_DESTINATION_CANCIONERO_DESCRIPTION,
  HUB_DESTINATION_CANCIONERO_HELP,
  HUB_DESTINATION_CANCIONERO_LABEL,
  HUB_DESTINATION_INDIVIDUAL_DESCRIPTION,
  HUB_DESTINATION_INDIVIDUAL_HELP,
  HUB_DESTINATION_INDIVIDUAL_LABEL,
  HUB_DESTINATION_PRACTICA_DESCRIPTION,
  HUB_DESTINATION_PRACTICA_HELP,
  HUB_DESTINATION_PRACTICA_LABEL,
  HUB_DESTINATION_SALAS_DESCRIPTION,
  HUB_DESTINATION_SALAS_HELP,
  HUB_DESTINATION_SALAS_LABEL,
  HUB_SECTION_DESTINOS_LABEL,
  HUB_WELCOME_TITLE,
} from "@/lib/herramientas-product";
import type { UsuarioActivo } from "@/types";
import { Gauge, Library, MicVocal, Music2, Users, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const CASCADE_STEP_MS = 140;
const CASCADE_ENTER_MS = 520;
const TITLE_INVITE_DURATION_MS = 10_000;
const TITLE_INVITE_SLOT_MS = 2_000;
const CARD_COUNT = 5;

type HomeHubDestinationsProps = {
  usuario: UsuarioActivo;
  onOpenAfinador: () => void;
};

export default function HomeHubDestinations({
  usuario,
  onOpenAfinador,
}: HomeHubDestinationsProps) {
  const navigateWithProgress = useNavigateWithProgress();
  const online = useOnlineStatus();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [titleInviteIndex, setTitleInviteIndex] = useState<number | null>(null);

  const isLoggedIn = usuario.id !== OFFLINE_GUEST_USUARIO.id;
  const displayName = usuario.nombre.trim();
  const showName = isLoggedIn && displayName.length > 0;

  const cascadeDelays = useMemo(() => {
    let step = 0;
    const next = () => {
      const delay = step * CASCADE_STEP_MS;
      step += 1;
      return delay;
    };

    return {
      welcome: next(),
      name: showName ? next() : null,
      question: next(),
      cards: Array.from({ length: CARD_COUNT }, () => next()),
    };
  }, [showName]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const lastCardDelay = cascadeDelays.cards[CARD_COUNT - 1] ?? 0;
    const inviteStartMs = lastCardDelay + CASCADE_ENTER_MS;
    const timers: number[] = [];

    for (let index = 0; index < CARD_COUNT; index += 1) {
      timers.push(
        window.setTimeout(() => {
          setTitleInviteIndex(index);
        }, inviteStartMs + index * TITLE_INVITE_SLOT_MS),
      );
    }

    timers.push(
      window.setTimeout(() => {
        setTitleInviteIndex(null);
      }, inviteStartMs + TITLE_INVITE_DURATION_MS),
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
      setTitleInviteIndex(null);
    };
  }, [cascadeDelays]);

  function goTo(href: string) {
    setPendingHref(href);
    navigateWithProgress(href);
  }

  return (
    <section className="flex flex-col gap-3 pb-3">
      <h2
        className="home-cascade-item text-center text-xl font-extrabold text-text-primary"
        style={{ ["--cascade-delay" as string]: `${cascadeDelays.welcome}ms` }}
      >
        {HUB_WELCOME_TITLE}
      </h2>

      {showName && cascadeDelays.name !== null ? (
        <p
          className="home-cascade-item text-center text-lg font-semibold text-accent"
          style={{ ["--cascade-delay" as string]: `${cascadeDelays.name}ms` }}
        >
          {displayName}
        </p>
      ) : null}

      <p
        className="home-cascade-item text-center text-base font-semibold text-text-primary"
        style={{ ["--cascade-delay" as string]: `${cascadeDelays.question}ms` }}
      >
        {HUB_SECTION_DESTINOS_LABEL}
      </p>

      <div className="flex flex-col gap-3">
        <HomeDestinationCard
          label={HUB_DESTINATION_CANCIONERO_LABEL}
          description={HUB_DESTINATION_CANCIONERO_DESCRIPTION}
          helpText={HUB_DESTINATION_CANCIONERO_HELP}
          icon={Library}
          accentVar="--accent-cancionero"
          accentDimVar="--accent-cancionero-dim"
          ariaLabel="Ir a Cancionero"
          onClick={() => goTo("/canciones")}
          pending={pendingHref === "/canciones"}
          cascadeDelayMs={cascadeDelays.cards[0]}
          titleInviteActive={titleInviteIndex === 0}
        />

        <HomeDestinationCard
          label={HUB_DESTINATION_INDIVIDUAL_LABEL}
          description={HUB_DESTINATION_INDIVIDUAL_DESCRIPTION}
          helpText={HUB_DESTINATION_INDIVIDUAL_HELP}
          icon={Music2}
          accentVar="--accent-individual"
          accentDimVar="--accent-individual-dim"
          ariaLabel="Ir a Individual"
          onClick={() => goTo("/individual")}
          pending={pendingHref === "/individual"}
          cascadeDelayMs={cascadeDelays.cards[1]}
          titleInviteActive={titleInviteIndex === 1}
        />

        <HomeDestinationCard
          label={HUB_DESTINATION_SALAS_LABEL}
          description={HUB_DESTINATION_SALAS_DESCRIPTION}
          helpText={HUB_DESTINATION_SALAS_HELP}
          icon={Users}
          accentVar="--accent-salas"
          accentDimVar="--accent-salas-dim"
          ariaLabel={
            online
              ? "Ir a Salas"
              : "Salas no disponible sin conexión"
          }
          onClick={() => goTo("/salas")}
          disabled={!online}
          pending={pendingHref === "/salas"}
          cascadeDelayMs={cascadeDelays.cards[2]}
          titleInviteActive={titleInviteIndex === 2}
          trailing={
            !online ? (
              <WifiOff
                className="size-4 shrink-0 text-text-faint"
                aria-hidden="true"
              />
            ) : null
          }
        />

        <HomeDestinationCard
          label={HUB_DESTINATION_PRACTICA_LABEL}
          description={HUB_DESTINATION_PRACTICA_DESCRIPTION}
          helpText={HUB_DESTINATION_PRACTICA_HELP}
          icon={MicVocal}
          accentVar="--accent-practica"
          accentDimVar="--accent-practica-dim"
          ariaLabel="Ir a Práctica"
          onClick={() => goTo("/practica")}
          pending={pendingHref === "/practica"}
          cascadeDelayMs={cascadeDelays.cards[3]}
          titleInviteActive={titleInviteIndex === 3}
        />

        <HomeDestinationCard
          label={HUB_DESTINATION_AFINADOR_LABEL}
          description={HUB_DESTINATION_AFINADOR_DESCRIPTION}
          helpText={HUB_DESTINATION_AFINADOR_HELP}
          icon={Gauge}
          accentVar="--accent-afinador"
          accentDimVar="--accent-afinador-dim"
          ariaLabel="Abrir afinador"
          onClick={onOpenAfinador}
          cascadeDelayMs={cascadeDelays.cards[4]}
          titleInviteActive={titleInviteIndex === 4}
        />
      </div>
    </section>
  );
}
