"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CompositorCycleNameDialog } from "@/components/ui/compositor/CompositorCycleNameDialog";
import { TapButton } from "@/components/ui/TapFeedback";
import type { CompositorCycle } from "@/lib/compositor-cycles";
import {
  COMPOSITOR_CONFIRM_DESCARTAR_CAMBIOS_MESSAGE,
  COMPOSITOR_LABEL_DESCARTAR_CAMBIOS,
  COMPOSITOR_LABEL_EDITANDO_CICLO,
  COMPOSITOR_LABEL_GUARDAR_CAMBIOS,
  COMPOSITOR_LABEL_GUARDAR_CICLO,
  COMPOSITOR_LABEL_GUARDAR_COMO,
  COMPOSITOR_LABEL_NUEVO_CICLO_SIN_GUARDAR,
} from "@/lib/ritmo-terminologia";
import { BookmarkPlus, RotateCcw } from "lucide-react";
import { useState } from "react";

type CompositorEditorStatusBarProps = {
  disabled?: boolean;
  activeCycle: CompositorCycle | null;
  isPieceModifiedFromBaseline: boolean;
  cyclesBusy: boolean;
  cyclesError: string | null;
  suggestCycleName: () => string;
  onSaveCurrentCycle: (nombre: string) => Promise<unknown>;
  onUpdateActiveCycle: () => Promise<unknown>;
  onDiscardChanges: () => void;
};

export function CompositorEditorStatusBar({
  disabled = false,
  activeCycle,
  isPieceModifiedFromBaseline,
  cyclesBusy,
  cyclesError,
  suggestCycleName,
  onSaveCurrentCycle,
  onUpdateActiveCycle,
  onDiscardChanges,
}: CompositorEditorStatusBarProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const controlsDisabled = disabled || cyclesBusy;
  const isEditingSaved = activeCycle !== null;
  const statusLabel = isEditingSaved
    ? COMPOSITOR_LABEL_EDITANDO_CICLO(activeCycle.nombre)
    : COMPOSITOR_LABEL_NUEVO_CICLO_SIN_GUARDAR;

  function openSaveDialog() {
    setActionError(null);
    setSaveName(suggestCycleName());
    setSaveDialogOpen(true);
  }

  async function handleSaveAsNew() {
    setActionError(null);

    try {
      await onSaveCurrentCycle(saveName);
      setSaveDialogOpen(false);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "No se pudo guardar el ciclo.",
      );
    }
  }

  async function handleSaveChanges() {
    setActionError(null);

    try {
      await onUpdateActiveCycle();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "No se pudo guardar los cambios.",
      );
    }
  }

  return (
    <div className="rounded-[10px] border border-compositor-config/30 bg-compositor-config/8 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-compositor-config">
            Modo editor
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
            {statusLabel}
          </p>
          {isPieceModifiedFromBaseline ? (
            <p className="mt-1 text-[10px] font-semibold text-[var(--tuner-cerca)]">
              Cambios sin guardar
            </p>
          ) : (
            <p className="mt-1 text-[10px] text-text-muted">Sin cambios pendientes</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {isEditingSaved ? (
          <>
            {isPieceModifiedFromBaseline ? (
              <>
                <TapButton
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => void handleSaveChanges()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-compositor-config/35 bg-compositor-config/15 px-3 py-1.5 text-[11px] font-bold text-compositor-config disabled:opacity-40"
                >
                  <BookmarkPlus className="size-3.5" aria-hidden="true" />
                  {COMPOSITOR_LABEL_GUARDAR_CAMBIOS}
                </TapButton>
                <TapButton
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => setDiscardConfirmOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-darker px-3 py-1.5 text-[11px] font-bold text-text-muted disabled:opacity-40"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  {COMPOSITOR_LABEL_DESCARTAR_CAMBIOS}
                </TapButton>
              </>
            ) : null}
          </>
        ) : (
          <TapButton
            type="button"
            disabled={controlsDisabled}
            onClick={openSaveDialog}
            className="inline-flex items-center gap-1.5 rounded-full border border-compositor-config/35 bg-compositor-config/15 px-3 py-1.5 text-[11px] font-bold text-compositor-config disabled:opacity-40"
          >
            <BookmarkPlus className="size-3.5" aria-hidden="true" />
            {COMPOSITOR_LABEL_GUARDAR_COMO}
          </TapButton>
        )}
      </div>

      {cyclesError || actionError ? (
        <p className="mt-2 text-[11px] leading-snug text-[var(--tuner-lejos)]">
          {actionError ?? cyclesError}
        </p>
      ) : null}

      <CompositorCycleNameDialog
        open={saveDialogOpen}
        title={COMPOSITOR_LABEL_GUARDAR_CICLO}
        confirmLabel="Guardar"
        value={saveName}
        onChange={setSaveName}
        onConfirm={() => void handleSaveAsNew()}
        onCancel={() => setSaveDialogOpen(false)}
      />

      <ConfirmDialog
        open={discardConfirmOpen}
        message={COMPOSITOR_CONFIRM_DESCARTAR_CAMBIOS_MESSAGE}
        confirmLabel="Descartar"
        cancelLabel="Cancelar"
        deleteConfirm
        zIndex={60}
        onConfirm={() => {
          setDiscardConfirmOpen(false);
          onDiscardChanges();
        }}
        onCancel={() => setDiscardConfirmOpen(false)}
      />
    </div>
  );
}
