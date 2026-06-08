"use client";

import BuildVersionFooter from "@/components/BuildVersionFooter";
import UserAvatar from "@/components/perfil/UserAvatar";
import CrearSalaModal from "@/components/salas/CrearSalaModal";
import SalaCard from "@/components/salas/SalaCard";
import AddButton from "@/components/ui/AddButton";
import { TapLink } from "@/components/ui/TapFeedback";
import type { Sala, UsuarioActivo } from "@/types";
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
  errorMessage: string | null;
  usuario: UsuarioActivo;
};

export default function SalasPageClient({
  salas,
  errorMessage,
  usuario,
}: SalasPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
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

        <p className="text-xs font-medium uppercase tracking-widest text-text-faint">
          Salas disponibles
        </p>

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

      <AddButton
        ariaLabel="Crear sala"
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-4 z-40"
      />

      <CrearSalaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
