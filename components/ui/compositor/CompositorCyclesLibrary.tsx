"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CompositorCycleNameDialog } from "@/components/ui/compositor/CompositorCycleNameDialog";
import { TapButton } from "@/components/ui/TapFeedback";
import type { CompositorCycle } from "@/lib/compositor-cycles";
import { formatCompositorCycleSummary } from "@/lib/compositor";
import {
  COMPOSITOR_CONFIRM_DELETE_CYCLE_MESSAGE,
  COMPOSITOR_HELP_MIS_CICLOS,
  COMPOSITOR_LABEL_ABRIR_CICLO,
  COMPOSITOR_LABEL_MIS_CICLOS,
  COMPOSITOR_LABEL_NUEVO_CICLO,
} from "@/lib/ritmo-terminologia";
import { FolderOpen, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

type CompositorCyclesLibraryProps = {
  isLoggedIn: boolean;
  online: boolean;
  savedCycles: CompositorCycle[];
  cyclesLoading: boolean;
  cyclesBusy: boolean;
  cyclesError: string | null;
  onRefreshCycles: () => Promise<void>;
  onBeginNewCycle: () => void;
  onOpenCycle: (cycleId: string) => void;
  onRenameCycle: (cycleId: string, nombre: string) => Promise<unknown>;
  onDeleteCycle: (cycleId: string) => Promise<unknown>;
};

export function CompositorCyclesLibrary({
  isLoggedIn,
  online,
  savedCycles,
  cyclesLoading,
  cyclesBusy,
  cyclesError,
  onRefreshCycles,
  onBeginNewCycle,
  onOpenCycle,
  onRenameCycle,
  onDeleteCycle,
}: CompositorCyclesLibraryProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameCycleId, setRenameCycleId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [pendingDeleteCycleId, setPendingDeleteCycleId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pendingDeleteCycle = pendingDeleteCycleId
    ? savedCycles.find((cycle) => cycle.id === pendingDeleteCycleId) ?? null
    : null;

  const controlsDisabled = cyclesBusy;

  function openRenameDialog(cycle: CompositorCycle) {
    setActionError(null);
    setRenameCycleId(cycle.id);
    setRenameName(cycle.nombre);
    setRenameDialogOpen(true);
  }

  async function handleRenameCycle() {
    if (!renameCycleId) {
      return;
    }

    setActionError(null);

    try {
      await onRenameCycle(renameCycleId, renameName);
      setRenameDialogOpen(false);
      setRenameCycleId(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "No se pudo renombrar el ciclo.",
      );
    }
  }

  async function handleDeleteCycle() {
    if (!pendingDeleteCycleId) {
      return;
    }

    setActionError(null);

    try {
      await onDeleteCycle(pendingDeleteCycleId);
      setPendingDeleteCycleId(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "No se pudo eliminar el ciclo.",
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[10px] border border-border bg-bg-card/70 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-compositor-config">
              {COMPOSITOR_LABEL_MIS_CICLOS}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-text-muted">
              {COMPOSITOR_HELP_MIS_CICLOS}
            </p>
            {!isLoggedIn ? (
              <p className="mt-1 text-[10px] leading-snug text-text-muted">
                Se guardan en este dispositivo. Iniciá sesión para sincronizar en la nube.
              </p>
            ) : !online ? (
              <p className="mt-1 text-[10px] leading-snug text-text-muted">
                Sin conexión: se usan ciclos guardados en este dispositivo.
              </p>
            ) : null}
          </div>

          <TapButton
            type="button"
            aria-label="Actualizar lista de ciclos"
            disabled={controlsDisabled || cyclesLoading}
            onClick={() => void onRefreshCycles()}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-bg-darker disabled:opacity-40"
          >
            <RefreshCw
              className={`size-3.5 text-text-muted ${cyclesLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </TapButton>
        </div>

        <TapButton
          type="button"
          disabled={controlsDisabled}
          onClick={onBeginNewCycle}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-compositor-config/35 bg-compositor-config/10 px-3 py-2.5 text-sm font-bold text-compositor-config disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden="true" />
          {COMPOSITOR_LABEL_NUEVO_CICLO}
        </TapButton>

        {cyclesError || actionError ? (
          <p className="mt-2 text-[11px] leading-snug text-[var(--tuner-lejos)]">
            {actionError ?? cyclesError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        {cyclesLoading && savedCycles.length === 0 ? (
          <p className="px-1 text-[11px] text-text-muted">Cargando ciclos…</p>
        ) : null}

        {!cyclesLoading && savedCycles.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-border px-3 py-6 text-center text-[11px] leading-snug text-text-muted">
            Todavía no hay ciclos guardados.
            <br />
            Creá el primero con el botón de arriba.
          </p>
        ) : null}

        {savedCycles.map((cycle) => (
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
                  {cycle.storage === "remote" ? "Nube" : "En este dispositivo"}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <TapButton
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => onOpenCycle(cycle.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-compositor-config/35 bg-compositor-config/10 px-2.5 py-1 text-[10px] font-bold text-compositor-config disabled:opacity-40"
                >
                  <FolderOpen className="size-3" aria-hidden="true" />
                  {COMPOSITOR_LABEL_ABRIR_CICLO}
                </TapButton>

                <div className="flex items-center gap-1">
                  <TapButton
                    type="button"
                    aria-label={`Renombrar ${cycle.nombre}`}
                    disabled={controlsDisabled}
                    onClick={() => openRenameDialog(cycle)}
                    className="flex size-7 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
                  >
                    <Pencil className="size-3 text-text-muted" aria-hidden="true" />
                  </TapButton>
                  <TapButton
                    type="button"
                    aria-label={`Eliminar ${cycle.nombre}`}
                    disabled={controlsDisabled}
                    onClick={() => setPendingDeleteCycleId(cycle.id)}
                    className="flex size-7 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
                  >
                    <Trash2 className="size-3 text-text-muted" aria-hidden="true" />
                  </TapButton>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CompositorCycleNameDialog
        open={renameDialogOpen}
        title="Renombrar ciclo"
        confirmLabel="Guardar nombre"
        inputLabel="Nuevo nombre"
        value={renameName}
        onChange={setRenameName}
        onConfirm={() => void handleRenameCycle()}
        onCancel={() => {
          setRenameDialogOpen(false);
          setRenameCycleId(null);
        }}
      />

      <ConfirmDialog
        open={pendingDeleteCycleId !== null}
        message={
          pendingDeleteCycle
            ? COMPOSITOR_CONFIRM_DELETE_CYCLE_MESSAGE(pendingDeleteCycle.nombre)
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        deleteConfirm
        zIndex={60}
        onConfirm={() => void handleDeleteCycle()}
        onCancel={() => setPendingDeleteCycleId(null)}
      />
    </div>
  );
}
