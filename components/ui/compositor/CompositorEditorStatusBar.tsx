"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CompositorCycleLayerIcons } from "@/components/ui/compositor/CompositorCycleLayerIcons";
import { CompositorCycleNameDialog } from "@/components/ui/compositor/CompositorCycleNameDialog";
import { CompositorSharedCycleSummary } from "@/components/ui/compositor/CompositorSharedCycleSummary";
import { TapButton } from "@/components/ui/TapFeedback";
import type { CompositorPiece } from "@/lib/compositor";
import type { CompositorCycle } from "@/lib/compositor-cycles";
import {
  COMPOSITOR_CONFIRM_DELETE_CYCLE_MESSAGE,
  COMPOSITOR_LABEL_COMPARTIR_COMUNIDAD,
  COMPOSITOR_CONFIRM_DESCARTAR_CAMBIOS_MESSAGE,
  COMPOSITOR_LABEL_DESCARTAR_CAMBIOS,
  COMPOSITOR_LABEL_GUARDAR_CAMBIOS,
  COMPOSITOR_LABEL_GUARDAR_CICLO,
  COMPOSITOR_LABEL_GUARDAR_COMO,
  COMPOSITOR_LABEL_NUEVO_CICLO_SIN_GUARDAR,
} from "@/lib/ritmo-terminologia";
import { formatDatabaseError } from "@/lib/supabase/errors";
import { BookmarkPlus, Globe, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type CompositorEditorStatusBarProps = {
  piece: CompositorPiece;
  disabled?: boolean;
  isLoggedIn: boolean;
  online: boolean;
  activeCycle: CompositorCycle | null;
  isPieceModifiedFromBaseline: boolean;
  cyclesBusy: boolean;
  cyclesError: string | null;
  cyclesNotice: string | null;
  editorNotice: string | null;
  trackOverflowWarning: string | null;
  suggestCycleName: () => string;
  onSaveCurrentCycle: (nombre: string) => Promise<unknown>;
  onUpdateActiveCycle: (nombre?: string) => Promise<unknown>;
  onDiscardChanges: () => void;
  onSetCyclePublic?: (cycleId: string, esPublico: boolean) => Promise<unknown>;
  onDeleteCycle?: (cycleId: string) => Promise<unknown>;
  onCycleDeleted?: () => void;
};

export function CompositorEditorStatusBar({
  piece,
  disabled = false,
  isLoggedIn,
  online,
  activeCycle,
  isPieceModifiedFromBaseline,
  cyclesBusy,
  cyclesError,
  cyclesNotice,
  editorNotice,
  trackOverflowWarning,
  suggestCycleName,
  onSaveCurrentCycle,
  onUpdateActiveCycle,
  onDiscardChanges,
  onSetCyclePublic,
  onDeleteCycle,
  onCycleDeleted,
}: CompositorEditorStatusBarProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [editCycleName, setEditCycleName] = useState("");
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const controlsDisabled = disabled || cyclesBusy;
  const saveDisabled = controlsDisabled || trackOverflowWarning !== null;
  const isEditingSaved = activeCycle !== null;
  const isNameModified =
    isEditingSaved && editCycleName.trim() !== activeCycle.nombre;
  const hasPendingChanges = isPieceModifiedFromBaseline || isNameModified;
  const canShare =
    isEditingSaved &&
    activeCycle.storage === "remote" &&
    isLoggedIn &&
    online &&
    onSetCyclePublic;

  useEffect(() => {
    setEditCycleName(activeCycle?.nombre ?? "");
  }, [activeCycle?.id, activeCycle?.nombre]);

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
        formatDatabaseError(error, "No se pudo guardar el ciclo."),
      );
    }
  }

  async function handleSaveChanges() {
    setActionError(null);

    try {
      await onUpdateActiveCycle(isEditingSaved ? editCycleName : undefined);
    } catch (error) {
      setActionError(
        formatDatabaseError(error, "No se pudo guardar los cambios."),
      );
    }
  }

  async function handleTogglePublic() {
    if (!activeCycle || !onSetCyclePublic) {
      return;
    }

    setActionError(null);

    try {
      await onSetCyclePublic(activeCycle.id, !activeCycle.esPublico);
    } catch (error) {
      setActionError(
        formatDatabaseError(error, "No se pudo actualizar la visibilidad del ciclo."),
      );
    }
  }

  async function handleDeleteCycle() {
    if (!activeCycle || !onDeleteCycle) {
      return;
    }

    setActionError(null);

    try {
      await onDeleteCycle(activeCycle.id);
      setDeleteConfirmOpen(false);
      onCycleDeleted?.();
    } catch (error) {
      setActionError(
        formatDatabaseError(error, "No se pudo eliminar el ciclo."),
      );
    }
  }

  const dialogError = saveDialogOpen ? actionError : null;
  const statusError = saveDialogOpen ? null : actionError ?? cyclesError;

  return (
    <div className="rounded-[10px] border border-compositor-config/30 bg-compositor-config/8 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-compositor-config">
            Modo editor
          </p>
          {isEditingSaved ? (
            <label className="mt-1 block">
              <span className="sr-only">Nombre del ciclo</span>
              <input
                type="text"
                value={editCycleName}
                maxLength={80}
                disabled={controlsDisabled}
                onChange={(event) => setEditCycleName(event.target.value)}
                className="w-full rounded-[8px] border border-border bg-bg-darker px-2.5 py-1.5 text-sm font-semibold text-text-primary outline-none focus:border-compositor-config disabled:opacity-60"
              />
            </label>
          ) : (
            <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
              {COMPOSITOR_LABEL_NUEVO_CICLO_SIN_GUARDAR}
            </p>
          )}
          {hasPendingChanges ? (
            <p className="mt-1 text-[10px] font-semibold text-[var(--tuner-cerca)]">
              Cambios sin guardar
            </p>
          ) : (
            <p className="mt-1 text-[10px] text-text-muted">Sin cambios pendientes</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {canShare ? (
            <TapButton
              type="button"
              aria-label={
                activeCycle.esPublico
                  ? `Dejar de compartir ${activeCycle.nombre}`
                  : COMPOSITOR_LABEL_COMPARTIR_COMUNIDAD
              }
              title={
                activeCycle.esPublico
                  ? "Dejar de compartir con la comunidad"
                  : COMPOSITOR_LABEL_COMPARTIR_COMUNIDAD
              }
              disabled={controlsDisabled}
              onClick={() => void handleTogglePublic()}
              className={`flex size-8 items-center justify-center rounded-full border disabled:opacity-40 ${
                activeCycle.esPublico
                  ? "border-compositor-config/35 bg-compositor-config/10"
                  : "border-border bg-bg-card"
              }`}
            >
              <Globe
                className={`size-3.5 ${
                  activeCycle.esPublico
                    ? "text-compositor-config"
                    : "text-text-muted"
                }`}
                aria-hidden="true"
              />
            </TapButton>
          ) : null}

          {isEditingSaved && onDeleteCycle ? (
            <TapButton
              type="button"
              aria-label={`Eliminar ${activeCycle.nombre}`}
              disabled={controlsDisabled}
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex size-8 items-center justify-center rounded-full border border-border bg-bg-card disabled:opacity-40"
            >
              <Trash2 className="size-3.5 text-text-muted" aria-hidden="true" />
            </TapButton>
          ) : null}
        </div>
      </div>

      <CompositorCycleLayerIcons piece={piece} />
      <CompositorSharedCycleSummary piece={piece} />

      <div className="mt-3 flex flex-wrap gap-2">
        {isEditingSaved ? (
          hasPendingChanges ? (
            <>
              <TapButton
                type="button"
                disabled={saveDisabled}
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
          ) : null
        ) : (
          <TapButton
            type="button"
            disabled={saveDisabled}
            onClick={openSaveDialog}
            className="inline-flex items-center gap-1.5 rounded-full border border-compositor-config/35 bg-compositor-config/15 px-3 py-1.5 text-[11px] font-bold text-compositor-config disabled:opacity-40"
          >
            <BookmarkPlus className="size-3.5" aria-hidden="true" />
            {COMPOSITOR_LABEL_GUARDAR_COMO}
          </TapButton>
        )}
      </div>

      {statusError ? (
        <p className="mt-2 text-[11px] leading-snug text-[var(--tuner-lejos)]">
          {statusError}
        </p>
      ) : trackOverflowWarning ? (
        <p className="mt-2 text-[11px] leading-snug text-[var(--tuner-lejos)]">
          {trackOverflowWarning}
        </p>
      ) : editorNotice ? (
        <p className="mt-2 text-[11px] leading-snug text-[var(--tuner-lejos)]">
          {editorNotice}
        </p>
      ) : cyclesNotice ? (
        <p className="mt-2 text-[11px] leading-snug text-[var(--tuner-cerca)]">
          {cyclesNotice}
        </p>
      ) : null}

      <CompositorCycleNameDialog
        open={saveDialogOpen}
        title={COMPOSITOR_LABEL_GUARDAR_CICLO}
        confirmLabel="Guardar"
        value={saveName}
        busy={cyclesBusy}
        error={dialogError}
        onChange={setSaveName}
        onConfirm={() => void handleSaveAsNew()}
        onCancel={() => {
          if (cyclesBusy) {
            return;
          }

          setSaveDialogOpen(false);
          setActionError(null);
        }}
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
          if (activeCycle) {
            setEditCycleName(activeCycle.nombre);
          }
        }}
        onCancel={() => setDiscardConfirmOpen(false)}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        message={
          activeCycle
            ? COMPOSITOR_CONFIRM_DELETE_CYCLE_MESSAGE(activeCycle.nombre)
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        deleteConfirm
        zIndex={60}
        onConfirm={() => void handleDeleteCycle()}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}
