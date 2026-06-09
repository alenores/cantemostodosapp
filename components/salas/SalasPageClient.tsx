"use client";

import BuildVersionFooter from "@/components/BuildVersionFooter";
import UserAvatar from "@/components/perfil/UserAvatar";
import CrearSalaModal from "@/components/salas/CrearSalaModal";
import SalaCard from "@/components/salas/SalaCard";
import AfinadorModal from "@/components/ui/AfinadorModal";
import { TapButton, TapLink } from "@/components/ui/TapFeedback";
import { useAfinador } from "@/hooks/useAfinador";
import type { Sala, UsuarioActivo } from "@/types";
import { BookOpen, Gauge, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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
};

export default function SalasPageClient({
  salas,
  cancioneroTotal,
  errorMessage,
  usuario,
}: SalasPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [afinadorOpen, setAfinadorOpen] = useState(false);
  const {
    detection: afinadorDetection,
    micError: afinadorMicError,
    micReady: afinadorMicReady,
    start: startAfinador,
    stop: stopAfinador,
  } = useAfinador();
  const aviso = searchParams.get("aviso");
  const avisoMensaje = aviso ? AVISO_MENSAJES[aviso] : null;

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-bg-app">
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
            className="flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-2"
          >
            <UserAvatar
              nombre={usuario.nombre}
              email={usuario.email}
              avatarUrl={usuario.avatar_url}
              size={32}
            />
            <span className="max-w-[7rem] truncate text-sm font-semibold text-bg-darker">
              {usuario.nombre.trim() || "Mi perfil"}
            </span>
          </TapLink>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4 py-6 pb-24">
        {avisoMensaje && (
          <p
            className="rounded-[10px] border border-accent/40 bg-accent-dim px-4 py-3 text-sm text-text-primary"
            role="status"
          >
            {avisoMensaje}
          </p>
        )}

        <div className="grid grid-cols-2 gap-[10px]">
          <div className="flex flex-col items-center gap-[10px] rounded-[14px] border border-border bg-bg-dark px-3 py-4">
            <p className="text-center text-[13px] font-bold text-text-primary">
              Canciones guardadas
            </p>
            <div className="flex flex-1 items-center justify-center">
              <BookOpen
                className="size-16 text-accent"
                aria-hidden="true"
              />
            </div>
            <TapLink
              href="/cancionero"
              ariaLabel="Ver canciones guardadas"
              className="w-full rounded-lg bg-[#3A3A3A] px-3 py-[9px] text-center text-sm text-white"
            >
              <span className="font-bold">Ver </span>
              <span className="font-normal opacity-70">
                ({cancioneroTotal})
              </span>
            </TapLink>
          </div>

          <div className="flex flex-col items-center gap-[10px] rounded-[14px] border border-border bg-bg-dark px-3 py-4">
            <p className="text-center text-[13px] font-bold text-text-primary">
              Afinador
            </p>
            <div className="flex flex-1 items-center justify-center">
              <Gauge className="size-16 text-accent" aria-hidden="true" />
            </div>
            <TapButton
              aria-label="Abrir afinador"
              onClick={() => {
                void startAfinador();
                setAfinadorOpen(true);
              }}
              className="w-full rounded-lg bg-accent px-3 py-[9px] text-sm font-bold text-white"
            >
              Abrir
            </TapButton>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <TapButton
            aria-label="Crear sala"
            onClick={() => setModalOpen(true)}
            className="flex size-[18px] shrink-0 items-center justify-center rounded-full border border-border text-text-faint"
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
              <SalaCard key={sala.id} sala={sala} />
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
    </div>
  );
}
