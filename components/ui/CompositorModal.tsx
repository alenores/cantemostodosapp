"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CompositorCyclesLibrary } from "@/components/ui/compositor/CompositorCyclesLibrary";
import { CompositorEditor } from "@/components/ui/compositor/CompositorEditor";
import { ToolModalHeader } from "@/components/ui/ToolModalHeader";
import type { UseCompositorResult } from "@/hooks/useCompositor";
import {
  COMPOSITOR_CONFIRM_LEAVE_EDITOR_MESSAGE,
  COMPOSITOR_HELP_EDITOR_VACIO,
  COMPOSITOR_LABEL_EDITOR,
  COMPOSITOR_LABEL_MIS_CICLOS,
} from "@/lib/ritmo-terminologia";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type CompositorView = "library" | "editor";

type CompositorModalProps = {
  open: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  online: boolean;
} & UseCompositorResult;

export default function CompositorModal({
  open,
  onClose,
  isLoggedIn,
  online,
  piece,
  activeTrackId,
  activePresetId,
  selectedEventId,
  cycleGolpes,
  cycleBeatDurations,
  bpm,
  isPlaying,
  isPreviewingTrack,
  cycleProgress,
  tapTempoTapCount,
  samplesLoading,
  setActiveTrackId,
  setSelectedEventId,
  setBpm,
  setCycleGolpes,
  setCycleBeatDurationAtSlot,
  tonalidadComposicion,
  setTonalidadComposicion,
  addTrackEvent,
  updateTrackEvent,
  removeTrackEvent,
  toggleTrack,
  tapTempo,
  start,
  previewActiveTrack,
  stop,
  resetPiece,
  applyPreset,
  isPieceModifiedFromBaseline,
  discardCycleChanges,
  savedCycles,
  activeCycle,
  cyclesLoading,
  cyclesBusy,
  cyclesError,
  refreshCycles,
  saveCurrentCycle,
  updateActiveCycle,
  loadCycle,
  renameCycle,
  deleteCycle,
  suggestCycleName,
}: CompositorModalProps) {
  const [view, setView] = useState<CompositorView>("library");
  const [editorSessionStarted, setEditorSessionStarted] = useState(false);
  const [leaveEditorConfirmOpen, setLeaveEditorConfirmOpen] = useState(false);
  const [pendingView, setPendingView] = useState<CompositorView | null>(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setView("library");
      setEditorSessionStarted(false);
      setLeaveEditorConfirmOpen(false);
      setPendingView(null);
      setCloseConfirmOpen(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function beginNewCycleSession() {
    stop();
    resetPiece();
    setEditorSessionStarted(true);
    setView("editor");
  }

  function openCycleSession(cycleId: string) {
    stop();
    loadCycle(cycleId);
    setEditorSessionStarted(true);
    setView("editor");
  }

  function requestViewChange(nextView: CompositorView) {
    if (nextView === view) {
      return;
    }

    if (
      view === "editor" &&
      editorSessionStarted &&
      isPieceModifiedFromBaseline
    ) {
      setPendingView(nextView);
      setLeaveEditorConfirmOpen(true);
      return;
    }

    setView(nextView);
  }

  function confirmLeaveEditor() {
    if (pendingView === null) {
      return;
    }

    discardCycleChanges();
    setEditorSessionStarted(false);
    setView(pendingView);
    setPendingView(null);
    setLeaveEditorConfirmOpen(false);
  }

  function requestClose() {
    if (
      view === "editor" &&
      editorSessionStarted &&
      isPieceModifiedFromBaseline
    ) {
      setCloseConfirmOpen(true);
      return;
    }

    stop();
    onClose();
  }

  function confirmClose() {
    stop();
    setCloseConfirmOpen(false);
    onClose();
  }

  const modalTitle =
    view === "library" ? COMPOSITOR_LABEL_MIS_CICLOS : COMPOSITOR_LABEL_EDITOR;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6">
      <button
        type="button"
        aria-label="Cerrar compositor"
        className="absolute inset-0 bg-black/60"
        onClick={requestClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compositor-titulo"
        className="relative z-10 tool-modal-panel flex h-[min(92vh,780px)] flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      >
        <ToolModalHeader
          titleId="compositor-titulo"
          title={modalTitle}
          closeAriaLabel="Cerrar compositor"
          onClose={requestClose}
        />

        <div className="shrink-0 border-b border-border bg-bg-dark px-4 pb-3 pt-1">
          <div
            className="flex gap-1 rounded-full border border-border bg-bg-darker p-0.5"
            role="tablist"
            aria-label="Secciones del compositor"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "library"}
              onClick={() => requestViewChange("library")}
              className={`min-h-9 flex-1 rounded-full px-3 text-xs font-bold transition-colors ${
                view === "library"
                  ? "bg-compositor-config/15 text-compositor-config"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {COMPOSITOR_LABEL_MIS_CICLOS}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "editor"}
              onClick={() => requestViewChange("editor")}
              className={`min-h-9 flex-1 rounded-full px-3 text-xs font-bold transition-colors ${
                view === "editor"
                  ? "bg-compositor-config/15 text-compositor-config"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {COMPOSITOR_LABEL_EDITOR}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
          {view === "library" ? (
            <CompositorCyclesLibrary
              isLoggedIn={isLoggedIn}
              online={online}
              savedCycles={savedCycles}
              cyclesLoading={cyclesLoading}
              cyclesBusy={cyclesBusy}
              cyclesError={cyclesError}
              onRefreshCycles={refreshCycles}
              onBeginNewCycle={beginNewCycleSession}
              onOpenCycle={openCycleSession}
              onRenameCycle={renameCycle}
              onDeleteCycle={deleteCycle}
            />
          ) : editorSessionStarted ? (
            <CompositorEditor
              piece={piece}
              activeTrackId={activeTrackId}
              activePresetId={activePresetId}
              isPieceModifiedFromBaseline={isPieceModifiedFromBaseline}
              selectedEventId={selectedEventId}
              cycleGolpes={cycleGolpes}
              cycleBeatDurations={cycleBeatDurations}
              bpm={bpm}
              tonalidadComposicion={tonalidadComposicion}
              isPlaying={isPlaying}
              isPreviewingTrack={isPreviewingTrack}
              cycleProgress={cycleProgress}
              tapTempoTapCount={tapTempoTapCount}
              samplesLoading={samplesLoading}
              activeCycle={activeCycle}
              cyclesBusy={cyclesBusy}
              cyclesError={cyclesError}
              suggestCycleName={suggestCycleName}
              onSetActiveTrackId={setActiveTrackId}
              onSetSelectedEventId={setSelectedEventId}
              onToggleTrack={toggleTrack}
              onSetBpm={setBpm}
              onSetCycleGolpes={setCycleGolpes}
              onSetCycleBeatDurationAtSlot={setCycleBeatDurationAtSlot}
              onSetTonalidadComposicion={setTonalidadComposicion}
              onAddTrackEvent={addTrackEvent}
              onUpdateTrackEvent={updateTrackEvent}
              onRemoveTrackEvent={removeTrackEvent}
              onTapTempo={tapTempo}
              onStart={() => void start()}
              onPreviewActiveTrack={() => void previewActiveTrack()}
              onStop={stop}
              onReset={resetPiece}
              onApplyPreset={applyPreset}
              onSaveCurrentCycle={saveCurrentCycle}
              onUpdateActiveCycle={updateActiveCycle}
              onDiscardChanges={discardCycleChanges}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-[10px] border border-dashed border-border px-4 py-10 text-center">
              <p className="max-w-xs text-sm leading-relaxed text-text-muted">
                {COMPOSITOR_HELP_EDITOR_VACIO}
              </p>
              <button
                type="button"
                onClick={() => requestViewChange("library")}
                className="mt-4 rounded-full border border-compositor-config/35 bg-compositor-config/10 px-4 py-2 text-xs font-bold text-compositor-config"
              >
                Ir a {COMPOSITOR_LABEL_MIS_CICLOS}
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={leaveEditorConfirmOpen}
        message={COMPOSITOR_CONFIRM_LEAVE_EDITOR_MESSAGE}
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir editando"
        deleteConfirm
        zIndex={70}
        onConfirm={confirmLeaveEditor}
        onCancel={() => {
          setLeaveEditorConfirmOpen(false);
          setPendingView(null);
        }}
      />

      <ConfirmDialog
        open={closeConfirmOpen}
        message={COMPOSITOR_CONFIRM_LEAVE_EDITOR_MESSAGE}
        confirmLabel="Cerrar sin guardar"
        cancelLabel="Seguir editando"
        deleteConfirm
        zIndex={70}
        onConfirm={confirmClose}
        onCancel={() => setCloseConfirmOpen(false)}
      />
    </div>,
    document.body,
  );
}
