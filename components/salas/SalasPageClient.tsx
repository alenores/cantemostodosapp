"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import BuildVersionFooter from "@/components/BuildVersionFooter";
import CancioneroPageClient from "@/components/cancionero/CancioneroPageClient";
import UserAvatar from "@/components/perfil/UserAvatar";
import CrearSalaModal from "@/components/salas/CrearSalaModal";
import SalaCard from "@/components/salas/SalaCard";
import SalaPageShell from "@/components/salas/SalaPageShell";
import AfinadorModal from "@/components/ui/AfinadorModal";
import { TapButton, TapLink } from "@/components/ui/TapFeedback";
import { useAfinador } from "@/hooks/useAfinador";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import type { Sala, UsuarioActivo } from "@/types";
import { BookOpen, Gauge, Plus, WifiOff } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const AVISO_MENSAJES: Record<string, string> = {
  "perfil-actualizado": "Perfil actualizado.",
  "email-pendiente":
    "Te enviamos un email para confirmar el cambio. Hasta entonces seguís entrando con el email actual.",
};

type SalasPageClientProps = {
  salas: Pick<Sala, "id" | "nombre" | "descripcion">[];
  cancioneroTotal: number;
  errorMessage: string | null;
  usuario: UsuarioActivo;
  avisoInicial?: string | null;
};

export default function SalasPageClient(props: SalasPageClientProps) {
  const searchParams = useSearchParams();

  return <SalasPageClientInner {...props} openCancioneroOnMount={searchParams.get("cancionero") === "1"} />;
}

function SalasPageClientInner({
  salas,
  cancioneroTotal,
  errorMessage,
  usuario,
  avisoInicial = null,
  openCancioneroOnMount = false,
}: SalasPageClientProps & { openCancioneroOnMount?: boolean }) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [modalOpen, setModalOpen] = useState(false);
  const [afinadorOpen, setAfinadorOpen] = useState(false);
  const [cancioneroOpen, setCancioneroOpen] = useState(false);
  const [salaOverlay, setSalaOverlay] = useState<Pick<
    Sala,
    "id" | "nombre"
  > | null>(null);
  const [cancioneroCount, setCancioneroCount] = useState(cancioneroTotal);
  const {
    detection: afinadorDetection,
    micError: afinadorMicError,
    micReady: afinadorMicReady,
    start: startAfinador,
    stop: stopAfinador,
  } = useAfinador();
  const avisoMensaje = avisoInicial ? AVISO_MENSAJES[avisoInicial] : null;

  useEffect(() => {
    if (openCancioneroOnMount) {
      setCancioneroOpen(true);
      window.history.replaceState(null, "", "/salas");
    }
  }, [openCancioneroOnMount]);

  useEffect(() => {
    if (online) {
      setCancioneroCount(cancioneroTotal);
      return;
    }

    void getCancioneroLocalAsCancionero().then((canciones) => {
      setCancioneroCount(canciones.length);
    });
  }, [online, cancioneroTotal]);

  function openCancionero() {
    if (online) {
      router.push("/cancionero");
      return;
    }

    setCancioneroOpen(true);
  }

  function closeCancionero() {
    setCancioneroOpen(false);
  }

  function openSala(sala: Pick<Sala, "id" | "nombre" | "descripcion">) {
    if (online) {
      router.push(`/salas/${sala.id}`);
      return;
    }

    setSalaOverlay({ id: sala.id, nombre: sala.nombre });
  }

  function closeSalaOverlay() {
    setSalaOverlay(null);
  }

  useHardwareBack(salaOverlay !== null && !cancioneroOpen, closeSalaOverlay);

  useHardwareBack(cancioneroOpen, closeCancionero);

  useHardwareBack(afinadorOpen && !cancioneroOpen, () => {
    stopAfinador();
    setAfinadorOpen(false);
  });

  useHardwareBack(modalOpen && !afinadorOpen && !cancioneroOpen, () => {
    setModalOpen(false);
  });

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-bg-app">
      <AppReadyMarker />
      <header className="border-b border-accent/40 bg-accent px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-lg"
            aria-hidden="true"
          />
          <h1 className="min-w-0 flex-1 text-lg font-extrabold tracking-tight text-bg-darker">
            CantemosTodosApp
          </h1>
          <TapLink
            href="/perfil"
            ariaLabel="Mi perfil"
            className="flex shrink-0 items-center gap-2 rounded-full py-1 pl-2 pr-1"
          >
            <span className="max-w-[7rem] truncate text-sm font-semibold text-bg-darker">
              {usuario.nombre.trim() || "Mi perfil"}
            </span>
            <UserAvatar
              nombre={usuario.nombre}
              email={usuario.email}
              avatarUrl={usuario.avatar_url}
              size={32}
            />
          </TapLink>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4 py-6 pb-24">
        {!online && (
          <p
            className="flex items-center gap-2 rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-muted"
            role="status"
          >
            <WifiOff className="size-4 shrink-0" aria-hidden="true" />
            Sin conexión · modo local activo
          </p>
        )}

        {avisoMensaje && (
          <p
            className="rounded-[10px] border border-accent/40 bg-accent-dim px-4 py-3 text-sm text-text-primary"
            role="status"
          >
            {avisoMensaje}
          </p>
        )}

        <div className="grid grid-cols-2 gap-[10px]">
          <TapButton
            aria-label="Ver canciones guardadas"
            onClick={openCancionero}
            className="flex flex-col items-center gap-[10px] rounded-[14px] border border-border bg-bg-dark px-3 py-4"
          >
            <p className="text-center text-[13px] font-bold text-text-primary">
              Canciones guardadas
            </p>
            <div className="flex flex-1 items-center justify-center">
              <BookOpen className="size-16 text-accent" aria-hidden="true" />
            </div>
            <div className="w-full rounded-lg bg-[#3A3A3A] px-3 py-[9px] text-center text-sm text-white">
              <span className="font-bold">Ver </span>
              <span className="font-normal opacity-70">({cancioneroCount})</span>
            </div>
          </TapButton>

          <TapButton
            aria-label="Abrir afinador"
            onClick={() => {
              void startAfinador();
              setAfinadorOpen(true);
            }}
            className="flex flex-col items-center gap-[10px] rounded-[14px] border border-border bg-bg-dark px-3 py-4"
          >
            <p className="text-center text-[13px] font-bold text-text-primary">
              Afinador
            </p>
            <div className="flex flex-1 items-center justify-center">
              <Gauge className="size-16 text-accent" aria-hidden="true" />
            </div>
            <span className="w-full rounded-lg bg-accent px-3 py-[9px] text-center text-sm font-bold text-white">
              Abrir
            </span>
          </TapButton>
        </div>

        <div className="flex items-center gap-1.5">
          <TapButton
            aria-label="Crear sala"
            onClick={() => setModalOpen(true)}
            disabled={!online}
            className="flex size-[18px] shrink-0 items-center justify-center rounded-full border border-border text-text-faint disabled:opacity-40"
          >
            <Plus className="size-2.5" strokeWidth={2.5} aria-hidden="true" />
          </TapButton>
          <p className="text-xs font-medium uppercase tracking-widest text-text-faint">
            Salas disponibles
          </p>
        </div>

        {errorMessage ? (
          <p className="text-sm text-accent" role="alert">
            No se pudieron cargar las salas: {errorMessage}
          </p>
        ) : salas.length > 0 ? (
          <div className="flex flex-col gap-3">
            {salas.map((sala) => (
              <SalaCard
                key={sala.id}
                sala={sala}
                offline={!online}
                onOpenOffline={openSala}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            No hay salas disponibles. Creá la primera con el botón +.
          </p>
        )}
      </main>

      <BuildVersionFooter />

      <CrearSalaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => router.refresh()}
      />

      <AfinadorModal
        open={afinadorOpen}
        detection={afinadorDetection}
        micError={afinadorMicError}
        micReady={afinadorMicReady}
        onClose={() => {
          stopAfinador();
          setAfinadorOpen(false);
        }}
      />

      {cancioneroOpen && (
        <div className="fixed inset-0 z-[200] flex min-h-0 flex-col overflow-hidden bg-bg-app">
          <CancioneroPageClient embedded onClose={closeCancionero} />
        </div>
      )}

      {salaOverlay && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-bg-app">
          <SalaPageShell
            salaId={salaOverlay.id}
            salaNombre={salaOverlay.nombre}
            embedded
            onClose={closeSalaOverlay}
          />
        </div>
      )}
    </div>
  );
}
