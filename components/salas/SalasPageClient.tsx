"use client";

import BuildVersionFooter from "@/components/BuildVersionFooter";
import CrearSalaModal from "@/components/salas/CrearSalaModal";
import SalaCard from "@/components/salas/SalaCard";
import { TapButton } from "@/components/ui/TapFeedback";
import type { Sala } from "@/types";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SalasPageClientProps = {
  salas: Pick<Sala, "id" | "nombre" | "descripcion">[];
  errorMessage: string | null;
};

export default function SalasPageClient({
  salas,
  errorMessage,
}: SalasPageClientProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-bg-app">
      <header className="border-b border-accent/40 bg-accent px-4 py-3">
        <h1 className="text-lg font-extrabold tracking-tight text-bg-darker">
          CantemosTodosApp
        </h1>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4 py-6 pb-24">
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

      <TapButton
        aria-label="Crear sala"
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_4px_20px_rgba(244,132,95,0.45)]"
      >
        <Plus className="size-6" aria-hidden="true" />
      </TapButton>

      <CrearSalaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
