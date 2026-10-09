"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import BuildVersionFooter from "@/components/BuildVersionFooter";
import CrearSalaModal from "@/components/salas/CrearSalaModal";
import SalaCard from "@/components/salas/SalaCard";
import SalaMiembrosDetalleModal from "@/components/salas/SalaMiembrosDetalleModal";
import AppTopHeader from "@/components/ui/AppTopHeader";
import { useSalasNavigation } from "@/components/salas/SalasRouteCoordinator";
import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { fetchMiembrosSalas } from "@/lib/sala-miembros";
import type { Sala, SalaMiembro, UsuarioActivo } from "@/types";
import { Plus, Users, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getPerfilAvisoMensaje } from "@/lib/perfil-avisos";

type SalasPageClientProps = {
  salas: Pick<Sala, "id" | "nombre" | "descripcion" | "avatar_url">[];
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
  const [detalleSala, setDetalleSala] = useState<Pick<
    Sala,
    "id" | "nombre" | "descripcion" | "avatar_url"
  > | null>(null);
  const [miembrosBySala, setMiembrosBySala] = useState<
    Record<number, SalaMiembro[]>
  >({});
  const avisoMensaje = getPerfilAvisoMensaje(avisoInicial);
  const salaIds = useMemo(() => salas.map((sala) => sala.id), [salas]);
  const detalleOpen = detalleSala !== null;

  const loadMiembros = useCallback(async () => {
    if (!online || salaIds.length === 0) {
      return null;
    }

    try {
      return await fetchMiembrosSalas(salaIds);
    } catch (err) {
      console.warn("[salas] miembros:", err);
      return null;
    }
  }, [online, salaIds]);

  useEffect(() => {
    registerSalaNames(
      salas.map((sala) => ({
        id: sala.id,
        nombre: sala.nombre,
      })),
    );
  }, [registerSalaNames, salas]);

  useEffect(() => {
    let cancelled = false;
    void loadMiembros().then((bySala) => {
      if (!cancelled && bySala) {
        setMiembrosBySala(bySala);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadMiembros]);

  function openSala(
    sala: Pick<Sala, "id" | "nombre" | "descripcion" | "avatar_url">,
  ) {
    if (!online) {
      return;
    }

    enterSala({ id: sala.id, nombre: sala.nombre });
  }

  function openMiembros(
    sala: Pick<Sala, "id" | "nombre" | "descripcion" | "avatar_url">,
  ) {
    if (!online) {
      return;
    }
    setDetalleSala(sala);
  }

  async function handleMiembrosChanged() {
    const bySala = await loadMiembros();
    if (bySala) {
      setMiembrosBySala(bySala);
    }
    router.refresh();
  }

  useHardwareBack(modalOpen, () => {
    setModalOpen(false);
  });

  useHardwareBack(detalleOpen, () => {
    setDetalleSala(null);
  });

  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-[#181818]">
      <AppReadyMarker />
      <AppTopHeader usuario={usuario} />

      <main className="app-page-main flex flex-1 flex-col gap-5 px-5 py-7 pb-28 lg:gap-6 lg:px-8 lg:py-8">
        <div className="app-page-container flex flex-1 flex-col gap-5 lg:gap-6">
          <header className="flex items-start justify-between gap-3 pt-1">
            <div className="min-w-0">
              <h2 className="text-[clamp(30px,8vw,36px)] font-extrabold leading-[1.12] tracking-tight text-text-primary">
                Salas
              </h2>
              <p className="mt-2 max-w-md text-[14px] text-text-muted">
                Entrá a tocar con tu gente
              </p>
            </div>
            {salas.length > 0 || errorMessage ? (
              <TapButton
                type="button"
                aria-label="Crear sala"
                onClick={() => setModalOpen(true)}
                disabled={!online}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl border border-[#3a3a3d] bg-[#303032] px-3.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.2)] disabled:opacity-40"
              >
                <Plus className="size-4" strokeWidth={2.4} aria-hidden="true" />
                <span>Crear</span>
              </TapButton>
            ) : null}
          </header>

          {!online && (
            <p className="flex items-center gap-2 rounded-2xl border border-[#3a3a3d] bg-[#29292b] px-4 py-3 text-sm text-text-muted" role="status">
              <WifiOff className="size-4 shrink-0" aria-hidden="true" />
              Sin conexión · las salas necesitan internet. Usá Individual para
              tocar solo.
            </p>
          )}

          {avisoMensaje && (
            <p className="rounded-2xl border border-accent/40 bg-accent-dim px-4 py-3 text-sm text-text-primary" role="status">
              {avisoMensaje}
            </p>
          )}

          {errorMessage ? (
            <p className="text-sm text-accent" role="alert">
              No se pudieron cargar las salas: {errorMessage}
            </p>
          ) : salas.length > 0 ? (
            <div className="app-list-grid">
              {salas.map((sala) => (
                <SalaCard
                  key={sala.id}
                  sala={sala}
                  disabled={!online}
                  miembros={online ? (miembrosBySala[sala.id] ?? []) : []}
                  onOpen={openSala}
                  onOpenMiembros={openMiembros}
                />
              ))}
            </div>
          ) : (
            <div className="home-destination-card flex flex-1 flex-col items-center justify-center gap-5 rounded-[28px] px-6 py-12 text-center">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-[#3d3d40] text-white" aria-hidden="true">
                <Users className="size-8" />
              </span>
              <div className="max-w-xs space-y-1.5">
                <p className="text-base font-bold text-text-primary">
                  Todavía no tenés salas
                </p>
                <p className="text-sm text-text-muted">
                  Creá la primera o pedí que te inviten con el QR desde dentro
                  de una sala.
                </p>
              </div>
              <TapButton
                type="button"
                onClick={() => setModalOpen(true)}
                disabled={!online}
                className="mt-1 flex min-h-11 items-center gap-2 rounded-2xl bg-accent px-5 text-sm font-semibold text-white disabled:opacity-40"
              >
                <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                Crear sala
              </TapButton>
            </div>
          )}
        </div>
      </main>

      <BuildVersionFooter />

      <CrearSalaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => router.refresh()}
      />

      <SalaMiembrosDetalleModal
        open={detalleOpen}
        sala={detalleSala}
        miembros={
          detalleSala && online ? (miembrosBySala[detalleSala.id] ?? []) : []
        }
        currentUserId={usuario.id}
        onClose={() => setDetalleSala(null)}
        onChanged={() => {
          void handleMiembrosChanged();
        }}
      />
    </div>
  );
}
