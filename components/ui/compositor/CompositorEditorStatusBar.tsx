"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CompositorCycleLayerIcons } from "@/components/ui/compositor/CompositorCycleLayerIcons";
import { CompositorCycleNameField } from "@/components/ui/compositor/CompositorCycleNameField";
import { CompositorSharedCycleSummary } from "@/components/ui/compositor/CompositorSharedCycleSummary";
import { TapButton } from "@/components/ui/TapFeedback";
import type { CompositorPiece } from "@/lib/compositor";
import type { CompositorCycle } from "@/lib/compositor-cycles";
import {
  COMPOSITOR_CONFIRM_DELETE_CYCLE_MESSAGE,
  COMPOSITOR_CONFIRM_RESET_MESSAGE,
  COMPOSITOR_LABEL_COMPARTIR_COMUNIDAD,
  COMPOSITOR_CONFIRM_DESCARTAR_CAMBIOS_MESSAGE,
  COMPOSITOR_ERROR_NOMBRE_CICLO_REQUERIDO,
  COMPOSITOR_LABEL_DESCARTAR_CAMBIOS,
  COMPOSITOR_LABEL_ELIMINAR_CICLO,
  COMPOSITOR_LABEL_GUARDAR_EDICIONES,
  COMPOSITOR_LABEL_GUARDAR_CICLO,
  COMPOSITOR_LABEL_RESET_ZONA,
} from "@/lib/ritmo-terminologia";
import { compositorBlockTitleClass } from "@/lib/compositor-block-edit-ui";
import { COMPOSITOR_ACTION_BUTTON_CLASS } from "@/lib/compositor-ui";
import { formatDatabaseError } from "@/lib/supabase/errors";
import { BookmarkPlus, Globe, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

type CompositorEditorStatusBarProps = {
  piece: CompositorPiece;
  disabled?: boolean;
  variant?: "default" | "compact" | "header";
  isLoggedIn: boolean;
  online: boolean;
  activeCycle: CompositorCycle | null;
  isPieceModifiedFromBaseline: boolean;
  cyclesBusy: boolean;
  cyclesError: string | null;
  cyclesNotice: string | null;
  editorNotice: string | null;
  trackOverflowWarning: string | null;
  cycleName: string;
  onCycleNameChange: (value: string) => void;
  onSaveCurrentCycle: (nombre: string) => Promise<unknown>;
  onUpdateActiveCycle: (nombre?: string) => Promise<unknown>;
  onDiscardChanges: () => void;
  onSetCyclePublic?: (cycleId: string, esPublico: boolean) => Promise<unknown>;
  onDeleteCycle?: (cycleId: string) => Promise<unknown>;
  onCycleDeleted?: () => void;
  onReset?: () => void;
};

export function CompositorEditorStatusBar({
  piece,
  disabled = false,
  variant = "default",
  isLoggedIn,
  online,
  activeCycle,
  isPieceModifiedFromBaseline,
  cyclesBusy,
  cyclesError,
  cyclesNotice,
  editorNotice,
  trackOverflowWarning,
  cycleName,
  onCycleNameChange,
  onSaveCurrentCycle,
  onUpdateActiveCycle,
  onDiscardChanges,
  onSetCyclePublic,
  onDeleteCycle,
  onCycleDeleted,
  onReset,
}: CompositorEditorStatusBarProps) {
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const controlsDisabled = disabled || cyclesBusy;
  const saveDisabled = controlsDisabled || trackOverflowWarning !== null;
  const isEditingSaved = activeCycle !== null;
  const isNameModified =
    isEditingSaved && cycleName.trim() !== activeCycle.nombre;
  const hasPendingChanges = isPieceModifiedFromBaseline || isNameModified;
  const canShare =
    isEditingSaved &&
    activeCycle.storage === "remote" &&
    isLoggedIn &&
    online &&
    onSetCyclePublic;

  function requireCycleName(): string | null {
    const normalized = cycleName.trim();

    if (!normalized) {
      setActionError(COMPOSITOR_ERROR_NOMBRE_CICLO_REQUERIDO);
      return null;
    }

    return normalized;
  }

  async function handleSaveNew() {
    setActionError(null);

    const normalized = requireCycleName();
    if (!normalized) {
      return;
    }

    try {
      await onSaveCurrentCycle(normalized);
    } catch (error) {
      setActionError(
        formatDatabaseError(error, "No se pudo guardar el ciclo."),
      );
    }
  }

  async function handleSaveChanges() {
    setActionError(null);

    const normalized = requireCycleName();
    if (!normalized) {
      return;
    }

    try {
      await onUpdateActiveCycle(normalized);
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

  const statusError = actionError ?? cyclesError;
  const isCompact = variant === "compact";
  const isHeader = variant === "header";

  const editSaveButtonClass = isEditingSaved
    ? "border-compositor-block-edit-border bg-compositor-block-edit-bg text-compositor-block-edit"
    : COMPOSITOR_ACTION_BUTTON_CLASS;

  const actionButtonSizeClass = isHeader
    ? "px-2.5 py-1 text-[10px]"
    : "px-3 py-1.5 text-[11px]";
  const actionIconSizeClass = isHeader ? "size-3" : "size-3.5";

  function renderSaveButton() {
    if (isEditingSaved) {
      return (
        <TapButton
          type="button"
          disabled={saveDisabled}
          onClick={() => void handleSaveChanges()}
          className={`inline-flex items-center gap-1 rounded-full border font-bold disabled:opacity-40 ${editSaveButtonClass} ${actionButtonSizeClass}`}
        >
          <BookmarkPlus className={actionIconSizeClass} aria-hidden="true" />
          {COMPOSITOR_LABEL_GUARDAR_EDICIONES}
        </TapButton>
      );
    }

    return (
      <TapButton
        type="button"
        disabled={saveDisabled}
        onClick={() => void handleSaveNew()}
        className={`inline-flex items-center gap-1 rounded-full font-bold disabled:opacity-40 ${COMPOSITOR_ACTION_BUTTON_CLASS} ${actionButtonSizeClass}`}
      >
        <BookmarkPlus className={actionIconSizeClass} aria-hidden="true" />
        {COMPOSITOR_LABEL_GUARDAR_CICLO}
      </TapButton>
    );
  }

  function renderDeleteButton() {
    if (!isEditingSaved || !onDeleteCycle) {
      return null;
    }

    return (
      <TapButton
        type="button"
        aria-label={`Eliminar ${activeCycle.nombre}`}
        disabled={controlsDisabled}
        onClick={() => setDeleteConfirmOpen(true)}
        className={`inline-flex items-center gap-1 rounded-full border border-[var(--tuner-lejos)]/35 bg-[var(--tuner-lejos)]/10 font-bold text-[var(--tuner-lejos)] disabled:opacity-40 ${actionButtonSizeClass}`}
      >
        <Trash2 className={actionIconSizeClass} aria-hidden="true" />
        {COMPOSITOR_LABEL_ELIMINAR_CICLO}
      </TapButton>
    );
  }

  function renderResetButton() {
    if (!onReset || isEditingSaved) {
      return null;
    }

    return (
      <TapButton
        type="button"
        disabled={controlsDisabled}
        onClick={() => setResetConfirmOpen(true)}
        aria-label="Restablecer todo el compositor"
        className={`inline-flex items-center gap-1 rounded-full border border-border bg-bg-darker font-bold text-text-muted disabled:opacity-40 ${actionButtonSizeClass}`}
      >
        <RotateCcw className={actionIconSizeClass} aria-hidden="true" />
        {COMPOSITOR_LABEL_RESET_ZONA}
      </TapButton>
    );
  }

  function renderStatusLabel() {
    if (hasPendingChanges) {
      return (
        <span className="shrink-0 text-[10px] font-semibold text-[var(--tuner-cerca)]">
          Sin guardar
        </span>
      );
    }

    if (isEditingSaved) {
      return (
        <span className="shrink-0 text-[10px] font-semibold text-compositor-block-edit">
          Modo edición
        </span>
      );
    }

    return (
      <span className="shrink-0 text-[10px] text-text-muted">Al día</span>
    );
  }

  const toolbarActions = (
    <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1">
      {isHeader ? (
        <div className="flex items-center gap-1.5">
          {renderStatusLabel()}
          {renderSaveButton()}
        </div>
      ) : (
        renderSaveButton()
      )}

      {isEditingSaved && hasPendingChanges ? (
        <TapButton
          type="button"
          disabled={controlsDisabled}
          onClick={() => setDiscardConfirmOpen(true)}
          className={`inline-flex items-center gap-1 rounded-full border border-border bg-bg-darker font-bold text-text-muted disabled:opacity-40 ${actionButtonSizeClass}`}
        >
          <RotateCcw className={actionIconSizeClass} aria-hidden="true" />
          {COMPOSITOR_LABEL_DESCARTAR_CAMBIOS}
        </TapButton>
      ) : null}

      {renderDeleteButton()}

      {renderResetButton()}

      {canShare ? (
        <TapButton
          type="button"
          aria-label={
            activeCycle.esPublico
              ? `Dejar de compartir ${activeCycle.nombre}`
              : COMPOSITOR_LABEL_COMPARTIR_COMUNIDAD
          }
          disabled={controlsDisabled}
          onClick={() => void handleTogglePublic()}
          className={`flex items-center justify-center rounded-full border disabled:opacity-40 ${
            isHeader ? "size-7" : "size-8"
          } ${
            activeCycle.esPublico
              ? "border-compositor-config/35 bg-compositor-config/10"
              : "border-border bg-bg-card"
          }`}
        >
          <Globe
            className={`${actionIconSizeClass} ${
              activeCycle.esPublico
                ? "text-compositor-config"
                : "text-text-muted"
            }`}
            aria-hidden="true"
          />
        </TapButton>
      ) : null}
    </div>
  );

  const toolbarRow = (
    <div
      className={`flex flex-wrap items-center gap-x-2 ${
        isHeader ? "min-h-8 gap-y-0.5" : "min-h-9 gap-y-1"
      }`}
    >
      {!isHeader ? renderStatusLabel() : null}

      {toolbarActions}
    </div>
  );

  const headerTitle = isHeader ? (
    <CompositorCycleNameField
      id="compositor-titulo"
      value={cycleName}
      mode={isEditingSaved ? "edit" : "create"}
      disabled={controlsDisabled}
      onChange={(value) => {
        setActionError(null);
        onCycleNameChange(value);
      }}
      className="mb-1"
    />
  ) : null;

  const statusMessage =
    statusError || trackOverflowWarning || editorNotice || cyclesNotice ? (
      <p
        className={`mt-1 truncate text-[10px] leading-snug ${
          statusError || trackOverflowWarning || editorNotice
            ? "text-[var(--tuner-lejos)]"
            : "text-[var(--tuner-cerca)]"
        }`}
      >
        {statusError ?? trackOverflowWarning ?? editorNotice ?? cyclesNotice}
      </p>
    ) : null;

  const dialogs = (
    <>
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
            onCycleNameChange(activeCycle.nombre);
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

      {onReset ? (
        <ConfirmDialog
          open={resetConfirmOpen}
          message={COMPOSITOR_CONFIRM_RESET_MESSAGE}
          confirmLabel="Sí, restablecer"
          cancelLabel="Cancelar"
          deleteConfirm
          zIndex={60}
          onConfirm={() => {
            setResetConfirmOpen(false);
            onReset();
          }}
          onCancel={() => setResetConfirmOpen(false)}
        />
      ) : null}
    </>
  );

  if (isHeader) {
    return (
      <div className="min-w-0">
        {headerTitle}
        {toolbarRow}
        {statusMessage}
        {dialogs}
      </div>
    );
  }

  if (isCompact) {
    return (
      <div
        className={`shrink-0 rounded-lg border px-3 py-1.5 ${
          isEditingSaved
            ? "border-compositor-block-edit-border bg-compositor-block-edit-bg"
            : "border-compositor-config/25 bg-compositor-config/6"
        }`}
      >
        {toolbarRow}
        {statusMessage}
        {dialogs}
      </div>
    );
  }

  return (
    <div
      className={`rounded-[10px] border px-3 py-3 ${
        isEditingSaved
          ? "border-compositor-block-edit-border bg-[color-mix(in_srgb,var(--compositor-block-edit)_8%,var(--bg-card))]"
          : "border-compositor-config/30 bg-compositor-config/8"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={compositorBlockTitleClass(isEditingSaved ? "edit" : "create")}
          >
            {isEditingSaved ? "Modo edición" : "Modo editor"}
          </p>
          {hasPendingChanges ? (
            <p className="mt-1 text-[10px] font-semibold text-[var(--tuner-cerca)]">
              Cambios sin guardar
            </p>
          ) : isEditingSaved ? (
            <p className="mt-1 text-[10px] font-semibold text-compositor-block-edit">
              Al día
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
        </div>
      </div>

      <CompositorCycleLayerIcons piece={piece} />
      <CompositorSharedCycleSummary piece={piece} />

      <div className="mt-3 flex flex-wrap gap-2">
        {renderSaveButton()}
        {isEditingSaved && hasPendingChanges ? (
          <TapButton
            type="button"
            disabled={controlsDisabled}
            onClick={() => setDiscardConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-darker px-3 py-1.5 text-[11px] font-bold text-text-muted disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {COMPOSITOR_LABEL_DESCARTAR_CAMBIOS}
          </TapButton>
        ) : null}
        {renderDeleteButton()}
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
            onCycleNameChange(activeCycle.nombre);
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
