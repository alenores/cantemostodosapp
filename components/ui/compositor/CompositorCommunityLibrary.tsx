"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import type { CompositorCommunityCycle } from "@/lib/compositor-cycles";
import { formatCompositorCycleSummary } from "@/lib/compositor";
import {
  COMPOSITOR_HELP_COMUNIDAD,
  COMPOSITOR_HELP_COMUNIDAD_OFFLINE,
  COMPOSITOR_HELP_COMUNIDAD_SIN_SESION,
  COMPOSITOR_LABEL_AGREGAR_A_MIS_CICLOS,
  COMPOSITOR_LABEL_COMUNIDAD,
} from "@/lib/ritmo-terminologia";
import { COMPOSITOR_ACTION_BUTTON_CLASS } from "@/lib/compositor-ui";
import { Download, RefreshCw, Users } from "lucide-react";
import { useState } from "react";

type CompositorCommunityLibraryProps = {
  isLoggedIn: boolean;
  online: boolean;
  communityCycles: CompositorCommunityCycle[];
  communityLoading: boolean;
  communityError: string | null;
  cyclesBusy: boolean;
  onRefreshCommunityCycles: () => Promise<void>;
  onImportCycle: (cycle: CompositorCommunityCycle) => Promise<unknown>;
};

export function CompositorCommunityLibrary({
  isLoggedIn,
  online,
  communityCycles,
  communityLoading,
  communityError,
  cyclesBusy,
  onRefreshCommunityCycles,
  onImportCycle,
}: CompositorCommunityLibraryProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [importingCycleId, setImportingCycleId] = useState<string | null>(null);

  const controlsDisabled = cyclesBusy;
  const canBrowseCommunity = isLoggedIn && online;

  async function handleImportCycle(cycle: CompositorCommunityCycle) {
    setActionError(null);
    setImportingCycleId(cycle.id);

    try {
      await onImportCycle(cycle);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No se pudo agregar el ciclo a tu biblioteca.",
      );
    } finally {
      setImportingCycleId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[10px] border border-border bg-bg-card/70 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-compositor-config">
              {COMPOSITOR_LABEL_COMUNIDAD}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-text-muted">
              {COMPOSITOR_HELP_COMUNIDAD}
            </p>
            {!isLoggedIn ? (
              <p className="mt-1 text-[10px] leading-snug text-text-muted">
                {COMPOSITOR_HELP_COMUNIDAD_SIN_SESION}
              </p>
            ) : !online ? (
              <p className="mt-1 text-[10px] leading-snug text-text-muted">
                {COMPOSITOR_HELP_COMUNIDAD_OFFLINE}
              </p>
            ) : null}
          </div>

          <TapButton
            type="button"
            aria-label="Actualizar ciclos de la comunidad"
            disabled={controlsDisabled || communityLoading || !canBrowseCommunity}
            onClick={() => void onRefreshCommunityCycles()}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-bg-darker disabled:opacity-40"
          >
            <RefreshCw
              className={`size-3.5 text-text-muted ${communityLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </TapButton>
        </div>

        {communityError || actionError ? (
          <p className="mt-2 text-[11px] leading-snug text-[var(--tuner-lejos)]">
            {actionError ?? communityError}
          </p>
        ) : null}
      </div>

      {!canBrowseCommunity ? (
        <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-border px-4 py-10 text-center">
          <Users className="size-8 text-text-muted/60" aria-hidden="true" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-muted">
            {!isLoggedIn
              ? COMPOSITOR_HELP_COMUNIDAD_SIN_SESION
              : COMPOSITOR_HELP_COMUNIDAD_OFFLINE}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {communityLoading && communityCycles.length === 0 ? (
            <p className="px-1 text-[11px] text-text-muted">Cargando ciclos…</p>
          ) : null}

          {!communityLoading && communityCycles.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-border px-3 py-6 text-center text-[11px] leading-snug text-text-muted">
              Todavía no hay ciclos compartidos por la comunidad.
            </p>
          ) : null}

          {communityCycles.map((cycle) => (
            <div
              key={cycle.id}
              className="rounded-[10px] border border-border bg-bg-darker/70 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {cycle.nombre}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-text-muted">
                    {formatCompositorCycleSummary(cycle.piece)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-text-muted">
                    Compartido por la comunidad
                  </p>
                </div>

                <TapButton
                  type="button"
                  disabled={
                    controlsDisabled || importingCycleId === cycle.id
                  }
                  onClick={() => void handleImportCycle(cycle)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] disabled:opacity-40 ${COMPOSITOR_ACTION_BUTTON_CLASS}`}
                >
                  <Download className="size-3" aria-hidden="true" />
                  {COMPOSITOR_LABEL_AGREGAR_A_MIS_CICLOS}
                </TapButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
