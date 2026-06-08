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
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <header className="border-b border-accent/40 bg-accent px-4 py-3">
        <h1 className="text-lg font-extrabold tracking-tight text-bg-darker">
          CantemosTodosApp
        </h1>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-text-faint">
            Salas disponibles
          </p>
          <TapButton
            aria-label="Crear sala"
            onClick={() => setModalOpen(true)}
            className="flex size-10 items-center justify-center rounded-full bg-accent text-white shadow-sm"
          >
            <Plus className="size-5" aria-hidden="true" />
          </TapButton>
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
    </div>
  );
}
