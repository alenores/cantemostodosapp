"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import BuildVersionFooter from "@/components/BuildVersionFooter";
import PwaInstallBanners from "@/components/pwa/PwaInstallBanners";
import UserAvatar from "@/components/perfil/UserAvatar";
import CrearSalaModal from "@/components/salas/CrearSalaModal";
import SalaCard from "@/components/salas/SalaCard";
import { useSalasNavigation } from "@/components/salas/SalasRouteCoordinator";
import { TapButton, TapLink } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { Sala, UsuarioActivo } from "@/types";
import { Plus, WifiOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const AVISO_MENSAJES: Record<string, string> = {
  "perfil-actualizado": "Perfil actualizado.",
  "email-pendiente":
    "Te enviamos un email para confirmar el cambio. Hasta entonces seguís entrando con el email actual.",
};

type SalasPageClientProps = {
  salas: Pick<Sala, "id" | "nombre" | "descripcion">[];
  errorMessage: string | null;
  usuario: UsuarioActivo;
  avisoInicial?: string | null;
};

export default function SalasPageClient({
  salas,
  errorMessage,
  usuario,
  avisoInicial = null,
}: SalasPageClientProps) {
  const router = useRouter();
  const online = useOnlineStatus();
  const { enterSala, registerSalaNames } = useSalasNavigation();
  const [modalOpen, setModalOpen] = useState(false);
  const avisoMensaje = avisoInicial ? AVISO_MENSAJES[avisoInicial] : null;

  useEffect(() => {
    registerSalaNames(
      salas.map((sala) => ({
        id: sala.id,
        nombre: sala.nombre,
      })),
    );
  }, [registerSalaNames, salas]);

  function openSala(sala: Pick<Sala, "id" | "nombre" | "descripcion">) {
    enterSala(
      { id: sala.id, nombre: sala.nombre },
      { offline: !online },
    );
  }

  useHardwareBack(modalOpen, () => {
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
        <PwaInstallBanners />

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
              <SalaCard key={sala.id} sala={sala} onOpen={openSala} />
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
    </div>
  );
}
