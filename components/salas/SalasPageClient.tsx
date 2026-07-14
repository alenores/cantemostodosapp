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
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";

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

  const reloadMiembros = useCallback(async () => {
    if (!online || salaIds.length === 0) {
      setMiembrosBySala({});
      return;
    }

    try {
      const bySala = await fetchMiembrosSalas(salaIds);
      setMiembrosBySala(bySala);
    } catch (err) {
      console.warn("[salas] miembros:", err);
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
    void reloadMiembros();
  }, [reloadMiembros]);

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
    await reloadMiembros();
    router.refresh();
  }

  useHardwareBack(modalOpen, () => {
    setModalOpen(false);
  });

  useHardwareBack(detalleOpen, () => {
    setDetalleSala(null);
  });

  const pageAtmosphereStyle = {
    backgroundImage:
      "radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--accent-salas) 18%, transparent), transparent 70%)",
  } satisfies CSSProperties;

  return (
    <div
      className="relative flex min-h-full flex-1 flex-col bg-bg-app"
      style={pageAtmosphereStyle}
    >
      <AppReadyMarker />
      <AppTopHeader usuario={usuario} />

      <main className="app-page-main flex flex-1 flex-col gap-4 px-4 py-6 pb-24 lg:gap-5 lg:px-8 lg:py-8">
        <div className="app-page-container flex flex-1 flex-col gap-4 lg:gap-5">
          <header
            className="home-cascade-item flex items-start justify-between gap-3"
            style={{ ["--cascade-delay" as string]: "0ms" }}
          >
            <div className="min-w-0">
              <h2 className="text-2xl font-extrabold tracking-tight text-text-primary lg:text-[1.75rem]">
                Salas
              </h2>
              <p className="mt-1 max-w-md text-sm text-text-muted">
                Entrá a tocar con tu gente
              </p>
            </div>
            <TapButton
              aria-label="Crear sala"
              onClick={() => setModalOpen(true)}
              disabled={!online}
              className="mt-1 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-black text-text-faint disabled:opacity-40"
            >
              <Plus className="size-2.5" strokeWidth={2.5} aria-hidden="true" />
            </TapButton>
          </header>

          {!online && (
            <p
              className="home-cascade-item flex items-center gap-2 rounded-xl border border-border bg-bg-card/80 px-3 py-2.5 text-sm text-text-muted backdrop-blur-sm"
              style={{ ["--cascade-delay" as string]: "60ms" }}
              role="status"
            >
              <WifiOff className="size-4 shrink-0" aria-hidden="true" />
              Sin conexión · las salas necesitan internet. Usá Individual para
              tocar solo.
            </p>
          )}

          {avisoMensaje && (
            <p
              className="home-cascade-item rounded-xl border border-accent/40 bg-accent-dim px-4 py-3 text-sm text-text-primary"
              style={{ ["--cascade-delay" as string]: "80ms" }}
              role="status"
            >
              {avisoMensaje}
            </p>
          )}

          {errorMessage ? (
            <p className="text-sm text-accent" role="alert">
              No se pudieron cargar las salas: {errorMessage}
            </p>
          ) : salas.length > 0 ? (
            <div className="app-list-grid">
              {salas.map((sala, index) => (
                <SalaCard
                  key={sala.id}
                  sala={sala}
                  disabled={!online}
                  miembros={miembrosBySala[sala.id] ?? []}
                  cascadeDelayMs={100 + index * 70}
                  onOpen={openSala}
                  onOpenMiembros={openMiembros}
                />
              ))}
            </div>
          ) : (
            <div
              className="home-cascade-item flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-12 text-center"
              style={{
                ["--cascade-delay" as string]: "100ms",
                borderColor:
                  "color-mix(in srgb, var(--accent-salas) 35%, var(--border-card))",
                background:
                  "color-mix(in srgb, var(--accent-salas-dim) 55%, transparent)",
              }}
            >
              <span
                className="flex size-14 items-center justify-center rounded-2xl"
                style={{ background: "var(--accent-salas-dim)" }}
                aria-hidden="true"
              >
                <Users
                  className="size-7"
                  style={{ color: "var(--accent-salas)" }}
                />
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
                className="mt-1 flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: "var(--accent-salas)" }}
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
          detalleSala ? (miembrosBySala[detalleSala.id] ?? []) : []
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
