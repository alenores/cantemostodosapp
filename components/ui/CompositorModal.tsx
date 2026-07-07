"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CompositorCommunityLibrary } from "@/components/ui/compositor/CompositorCommunityLibrary";
import { CompositorCyclesLibrary } from "@/components/ui/compositor/CompositorCyclesLibrary";
import { CompositorEditor } from "@/components/ui/compositor/CompositorEditor";
import { CompositorListenView } from "@/components/ui/compositor/CompositorListenView";
import { CompositorMidiCropStep } from "@/components/ui/compositor/CompositorMidiCropStep";
import { CompositorMidiReview } from "@/components/ui/compositor/CompositorMidiReview";
import { ToolModalHeader } from "@/components/ui/ToolModalHeader";
import { ToolPresentationRoot } from "@/components/ui/ToolPresentationRoot";
import type { ToolPresentation } from "@/lib/tool-presentation";
import { isToolPagePresentation } from "@/lib/tool-presentation";
import { useCompositorCommunityCycles } from "@/hooks/useCompositorCommunityCycles";
import type { UseCompositorResult } from "@/hooks/useCompositor";
import { useCompositorMidiImport } from "@/hooks/useCompositorMidiImport";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import type { CompositorInstrumentId } from "@/lib/compositor";
import { buildCropPreviewPiece } from "@/lib/compositor-midi";
import {
  COMPOSITOR_CONFIRM_CANCELAR_IMPORT_MIDI,
  COMPOSITOR_CONFIRM_LEAVE_EDITOR_MESSAGE,
  COMPOSITOR_LABEL_COMUNIDAD,
  COMPOSITOR_LABEL_COMPOSITOR,
  COMPOSITOR_LABEL_EDITANDO_CICLO,
  COMPOSITOR_LABEL_MIS_CICLOS,
  COMPOSITOR_LABEL_NUEVO_CICLO_SIN_GUARDAR,
  COMPOSITOR_LABEL_REVISION_MIDI,
  COMPOSITOR_LABEL_RECORTE_MIDI,
  COMPOSITOR_TAB_PRACTICAR,
} from "@/lib/ritmo-terminologia";
import { useEffect, useState } from "react";

type CompositorLibraryTab = "mine" | "community";

type CompositorModalProps = {
  open: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  online: boolean;
  presentation?: ToolPresentation;
} & UseCompositorResult;

export default function CompositorModal({
  open,
  onClose,
  isLoggedIn,
  online,
  piece,
  activeTrackId,
  activeDrumPatternId,
  selectedEventId,
  cycleGolpes,
  cycleBeatDurations,
  bpm,
  isPlaying,
  isPreviewingTrack,
  isPreviewingCrop,
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
  placeTrackEvent,
  updateTrackEvent,
  removeTrackEvent,
  toggleTrack,
  tapTempo,
  start,
  previewActiveTrack,
  previewPieceOnce,
  previewPieceTrackOnce,
  stop,
  resetPiece,
  applyDrumPattern,
  isPieceModifiedFromBaseline,
  discardCycleChanges,
  savedCycles,
  activeCycle,
  cyclesLoading,
  cyclesBusy,
  cyclesError,
  cyclesNotice,
  editorNotice,
  refreshCycles,
  saveCurrentCycle,
  updateActiveCycle,
  loadCycle,
  deleteCycle,
  suggestCycleName,
  setCyclePublic,
  importCommunityCycle,
  clearActiveCycle,
  presentation = "modal",
}: CompositorModalProps) {
  const isPage = isToolPagePresentation(presentation);
  const [libraryTab, setLibraryTab] = useState<CompositorLibraryTab>("mine");
  const [editorOpen, setEditorOpen] = useState(false);
  const [listenOpen, setListenOpen] = useState(false);
  const [listenCycleName, setListenCycleName] = useState("");
  const [leaveEditorConfirmOpen, setLeaveEditorConfirmOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [cancelMidiConfirmOpen, setCancelMidiConfirmOpen] = useState(false);

  const midiImport = useCompositorMidiImport();
  const inMidiImport = midiImport.inMidiImport;
  const inMidiCrop = midiImport.inMidiCrop;
  const inMidiReview = midiImport.inMidiReview;

  const {
    communityCycles,
    communityLoading,
    communityError,
    refreshCommunityCycles,
  } = useCompositorCommunityCycles({
    isLoggedIn,
    online,
    enabled: open && libraryTab === "community",
  });

  useEffect(() => {
    if (open) {
      setLibraryTab("mine");
      setEditorOpen(false);
      setListenOpen(false);
      setListenCycleName("");
      setLeaveEditorConfirmOpen(false);
      setCloseConfirmOpen(false);
      setCancelMidiConfirmOpen(false);
      midiImport.discardSession();
    }
    // Solo al abrir el modal; discardSession es estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!inMidiCrop) {
      stop();
    }
  }, [inMidiCrop, stop]);

  useHardwareBack(open && (editorOpen || listenOpen || inMidiImport), () => {
    if (inMidiReview) {
      midiImport.backToCrop();
      return;
    }

    if (inMidiCrop) {
      setCancelMidiConfirmOpen(true);
      return;
    }

    if (listenOpen) {
      closeListenSession();
      return;
    }

    requestLeaveEditor();
  });

  if (!open && !isPage) {
    return null;
  }

  function beginNewCycleSession() {
    stop();
    resetPiece();
    setListenOpen(false);
    setEditorOpen(true);
  }

  function openEditCycleSession(cycleId: string) {
    stop();
    loadCycle(cycleId);
    setListenOpen(false);
    setEditorOpen(true);
  }

  function openListenCycleSession(cycleId: string) {
    const cycle = savedCycles.find((entry) => entry.id === cycleId);

    if (!cycle) {
      return;
    }

    stop();
    loadCycle(cycleId);
    setListenCycleName(cycle.nombre);
    setEditorOpen(false);
    setListenOpen(true);
  }

  function closeListenSession() {
    stop();
    clearActiveCycle();
    resetPiece();
    setListenOpen(false);
    setListenCycleName("");
  }

  function requestLibraryTabChange(nextTab: CompositorLibraryTab) {
    if (nextTab === libraryTab || editorOpen || listenOpen || inMidiImport) {
      return;
    }

    setLibraryTab(nextTab);
  }

  async function handleImportMidiFile(file: File) {
    stop();

    try {
      await midiImport.startImport(file);
    } catch {
      // El error queda en midiImport.error
    }
  }

  function discardMidiReview() {
    stop();
    midiImport.discardSession();
    setCancelMidiConfirmOpen(false);
  }

  async function handlePreviewCrop() {
    if (!midiImport.fileSession) {
      return;
    }

    const previewPiece = buildCropPreviewPiece(midiImport.fileSession);

    if (!previewPiece) {
      return;
    }

    await previewPieceOnce(previewPiece);
  }

  function handleConfirmCrop() {
    stop();
    return midiImport.confirmCrop();
  }

  async function handlePreviewMidiReviewLayer(
    instrumentId: CompositorInstrumentId,
  ) {
    const review = midiImport.reviewSession;

    if (!review) {
      return;
    }

    if (isPreviewingTrack) {
      stop();
      return;
    }

    await previewPieceTrackOnce(review.draftPiece, instrumentId);
  }

  async function handleMidiSave(nombre: string) {
    const piece = midiImport.getPieceForSave();

    if (!piece) {
      throw new Error("Resolvé todos los conflictos antes de guardar.");
    }

    await saveCurrentCycle(nombre, piece);
    midiImport.completeSaveAndReturnToCrop();
  }

  function requestMidiBack() {
    if (inMidiReview) {
      stop();
      midiImport.backToCrop();
      return;
    }

    if (inMidiCrop) {
      stop();
      setCancelMidiConfirmOpen(true);
    }
  }

  function requestLeaveEditor() {
    if (editorOpen && isPieceModifiedFromBaseline) {
      setLeaveEditorConfirmOpen(true);
      return;
    }

    setEditorOpen(false);
  }

  function confirmLeaveEditor() {
    discardCycleChanges();
    setEditorOpen(false);
    setLeaveEditorConfirmOpen(false);
  }

  function requestClose() {
    if (inMidiImport) {
      setCancelMidiConfirmOpen(true);
      return;
    }

    if (editorOpen && isPieceModifiedFromBaseline) {
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

  const modalTitle = listenOpen
    ? listenCycleName || COMPOSITOR_TAB_PRACTICAR
    : editorOpen
    ? activeCycle
      ? COMPOSITOR_LABEL_EDITANDO_CICLO(activeCycle.nombre)
      : COMPOSITOR_LABEL_NUEVO_CICLO_SIN_GUARDAR
    : inMidiReview
      ? COMPOSITOR_LABEL_REVISION_MIDI
      : inMidiCrop
        ? COMPOSITOR_LABEL_RECORTE_MIDI
        : COMPOSITOR_LABEL_COMPOSITOR;

  return (
    <ToolPresentationRoot
      presentation={presentation}
      open={open}
      onClose={requestClose}
      closeAriaLabel="Cerrar compositor"
      panelClassName={
        isPage
          ? ""
          : "relative z-10 tool-modal-panel-wide flex h-[min(92vh,780px)] flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      }
      trailing={
        <>
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

          <ConfirmDialog
            open={cancelMidiConfirmOpen}
            message={COMPOSITOR_CONFIRM_CANCELAR_IMPORT_MIDI}
            confirmLabel="Salir"
            cancelLabel="Seguir revisando"
            deleteConfirm
            zIndex={70}
            onConfirm={discardMidiReview}
            onCancel={() => setCancelMidiConfirmOpen(false)}
          />
        </>
      }
    >
      <ToolModalHeader
        titleId="compositor-titulo"
        title={modalTitle}
        closeAriaLabel="Cerrar compositor"
        onClose={requestClose}
        onBack={
          listenOpen
            ? closeListenSession
            : editorOpen
            ? requestLeaveEditor
            : inMidiImport
              ? requestMidiBack
              : undefined
        }
        backAriaLabel={
          listenOpen
            ? "Volver a mis ciclos"
            : inMidiReview
            ? "Volver al recorte"
            : inMidiCrop
              ? "Cancelar importación"
              : "Volver a mis ciclos"
        }
        showClose={!isPage}
      />

        {!editorOpen && !listenOpen && !inMidiImport ? (
          <div className="shrink-0 border-b border-border bg-bg-dark px-4 pb-3 pt-1">
            <div
              className="tool-segmented-control tool-segmented-control--inline"
              role="tablist"
              aria-label="Secciones del compositor"
            >
              <button
                type="button"
                role="tab"
                aria-selected={libraryTab === "mine"}
                onClick={() => requestLibraryTabChange("mine")}
                className={`min-h-9 shrink-0 rounded-full px-4 text-xs font-bold transition-colors lg:px-5 ${
                  libraryTab === "mine"
                    ? "bg-compositor-config/15 text-compositor-config"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {COMPOSITOR_LABEL_MIS_CICLOS}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={libraryTab === "community"}
                onClick={() => requestLibraryTabChange("community")}
                className={`min-h-9 shrink-0 rounded-full px-4 text-xs font-bold transition-colors lg:px-5 ${
                  libraryTab === "community"
                    ? "bg-compositor-config/15 text-compositor-config"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {COMPOSITOR_LABEL_COMUNIDAD}
              </button>
            </div>
          </div>
        ) : null}

        <div
          data-tool-vertical-scroll=""
          className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4 lg:px-6 lg:py-5"
        >
          {listenOpen ? (
            <CompositorListenView
              piece={piece}
              activeTrackId={activeTrackId}
              selectedEventId={selectedEventId}
              bpm={bpm}
              tonalidadComposicion={tonalidadComposicion}
              isPlaying={isPlaying}
              cycleProgress={cycleProgress}
              onSetBpm={setBpm}
              onSetTonalidadComposicion={setTonalidadComposicion}
              onToggleTrack={toggleTrack}
              onStart={() => void start()}
              onStop={stop}
            />
          ) : editorOpen ? (
            <CompositorEditor
              piece={piece}
              activeTrackId={activeTrackId}
              activeDrumPatternId={activeDrumPatternId}
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
              cyclesNotice={cyclesNotice}
              editorNotice={editorNotice}
              suggestCycleName={suggestCycleName}
              onSetActiveTrackId={setActiveTrackId}
              onSetSelectedEventId={setSelectedEventId}
              onToggleTrack={toggleTrack}
              onSetBpm={setBpm}
              onSetCycleGolpes={setCycleGolpes}
              onSetCycleBeatDurationAtSlot={setCycleBeatDurationAtSlot}
              onSetTonalidadComposicion={setTonalidadComposicion}
              onPlaceTrackEvent={placeTrackEvent}
              onUpdateTrackEvent={updateTrackEvent}
              onRemoveTrackEvent={removeTrackEvent}
              onTapTempo={tapTempo}
              onStart={() => void start()}
              onPreviewActiveTrack={() => void previewActiveTrack()}
              onStop={stop}
              onReset={resetPiece}
              onApplyDrumPattern={applyDrumPattern}
              onSaveCurrentCycle={saveCurrentCycle}
              onUpdateActiveCycle={updateActiveCycle}
              onDiscardChanges={discardCycleChanges}
              isLoggedIn={isLoggedIn}
              online={online}
              onSetCyclePublic={setCyclePublic}
              onDeleteCycle={deleteCycle}
              onCycleDeleted={() => {
                setEditorOpen(false);
              }}
            />
          ) : inMidiReview && midiImport.reviewSession ? (
            <CompositorMidiReview
              session={midiImport.reviewSession}
              focusTarget={midiImport.focusTarget}
              canSave={midiImport.canSave}
              cyclesBusy={cyclesBusy || midiImport.loading}
              suggestCycleName={suggestCycleName}
              onSetTrackAssignment={midiImport.setTrackAssignment}
              onSetTonalidad={midiImport.setTonalidad}
              onUpdateDraftEvent={midiImport.updateDraftEvent}
              onRemoveDraftEvent={midiImport.removeDraftEvent}
              onFocusConflict={midiImport.focusConflict}
              onSetFocusTarget={midiImport.setFocusTarget}
              isPreviewingTrack={isPreviewingTrack}
              previewLoading={samplesLoading}
              cycleProgress={cycleProgress}
              onPreviewLayer={(instrumentId) =>
                void handlePreviewMidiReviewLayer(instrumentId)
              }
              onStopPreview={stop}
              onBackToCrop={midiImport.backToCrop}
              onCancel={() => setCancelMidiConfirmOpen(true)}
              onSave={handleMidiSave}
            />
          ) : inMidiCrop && midiImport.fileSession ? (
            <CompositorMidiCropStep
              fileSession={midiImport.fileSession}
              busy={cyclesBusy || midiImport.loading}
              isPreviewing={isPreviewingCrop}
              previewLoading={samplesLoading}
              previewProgress={isPreviewingCrop ? cycleProgress : null}
              onSetCropLayers={midiImport.setCropLayers}
              onSetCropWindow={midiImport.setCropWindow}
              onPreview={handlePreviewCrop}
              onStopPreview={stop}
              onConfirmCrop={handleConfirmCrop}
              onCancel={() => {
                stop();
                setCancelMidiConfirmOpen(true);
              }}
            />
          ) : libraryTab === "mine" ? (
            <CompositorCyclesLibrary
              isLoggedIn={isLoggedIn}
              online={online}
              savedCycles={savedCycles}
              cyclesLoading={cyclesLoading}
              cyclesBusy={cyclesBusy || midiImport.loading}
              cyclesError={cyclesError ?? midiImport.error}
              onRefreshCycles={refreshCycles}
              onBeginNewCycle={beginNewCycleSession}
              onImportMidiFile={handleImportMidiFile}
              onListenCycle={openListenCycleSession}
              onEditCycle={openEditCycleSession}
            />
          ) : (
            <CompositorCommunityLibrary
              isLoggedIn={isLoggedIn}
              online={online}
              communityCycles={communityCycles}
              communityLoading={communityLoading}
              communityError={communityError}
              cyclesBusy={cyclesBusy}
              onRefreshCommunityCycles={refreshCommunityCycles}
              onImportCycle={importCommunityCycle}
            />
          )}
        </div>
    </ToolPresentationRoot>
  );
}
