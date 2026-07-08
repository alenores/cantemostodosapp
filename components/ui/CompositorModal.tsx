"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CompositorCommunityLibrary } from "@/components/ui/compositor/CompositorCommunityLibrary";
import { CompositorCyclesLibrary } from "@/components/ui/compositor/CompositorCyclesLibrary";
import { CompositorEditor } from "@/components/ui/compositor/CompositorEditor";
import { CompositorEditorStatusBar } from "@/components/ui/compositor/CompositorEditorStatusBar";
import { CompositorCycleNameField } from "@/components/ui/compositor/CompositorCycleNameField";
import { CompositorMidiCropStep } from "@/components/ui/compositor/CompositorMidiCropStep";
import { CompositorMidiReview } from "@/components/ui/compositor/CompositorMidiReview";
import { ToolModalHeader } from "@/components/ui/ToolModalHeader";
import {
  TOOL_MODAL_MOBILE_GUTTER_CLASS,
} from "@/components/ui/ToolModalSections";
import { ToolPresentationRoot } from "@/components/ui/ToolPresentationRoot";
import type { ToolPresentation } from "@/lib/tool-presentation";
import { isToolPagePresentation } from "@/lib/tool-presentation";
import { useCompositorCommunityCycles } from "@/hooks/useCompositorCommunityCycles";
import type { UseCompositorResult } from "@/hooks/useCompositor";
import { useCompositorMidiImport } from "@/hooks/useCompositorMidiImport";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import {
  formatTrackOverflowDetails,
  pieceHasTrackOverflow,
  type CompositorInstrumentId,
} from "@/lib/compositor";
import { buildCropPreviewPiece } from "@/lib/compositor-midi";
import {
  COMPOSITOR_CONFIRM_CANCELAR_IMPORT_MIDI,
  COMPOSITOR_CONFIRM_LEAVE_EDITOR_MESSAGE,
  COMPOSITOR_LABEL_COMUNIDAD,
  COMPOSITOR_LABEL_COMPOSITOR,
  COMPOSITOR_LABEL_MIS_CICLOS,
  COMPOSITOR_LABEL_REVISION_MIDI,
  COMPOSITOR_LABEL_RECORTE_MIDI,
  COMPOSITOR_NOTICE_TRACK_OVERFLOW_LOAD,
} from "@/lib/ritmo-terminologia";
import { useEffect, useMemo, useState } from "react";

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
  modoTonalComposicion,
  setModoTonalComposicion,
  placeTrackEvent,
  updateTrackEvent,
  removeTrackEvent,
  toggleTrack,
  toggleListenTrack,
  resetListenPlaybackLayers,
  listenMutedTrackIds,
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
  const isDesktop = useIsDesktop();
  const configLocked = isPlaying || isPreviewingTrack;
  const trackOverflowWarning = useMemo(() => {
    if (!pieceHasTrackOverflow(piece)) {
      return null;
    }

    return COMPOSITOR_NOTICE_TRACK_OVERFLOW_LOAD(
      formatTrackOverflowDetails(piece),
    );
  }, [piece]);
  const [libraryTab, setLibraryTab] = useState<CompositorLibraryTab>("mine");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftCycleName, setDraftCycleName] = useState("");
  const [listeningCycleId, setListeningCycleId] = useState<string | null>(null);
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
      setListeningCycleId(null);
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

  useEffect(() => {
    if (!editorOpen) {
      return;
    }

    setDraftCycleName(activeCycle?.nombre ?? "");
  }, [editorOpen, activeCycle?.id, activeCycle?.nombre]);

  useHardwareBack(open && (editorOpen || listeningCycleId !== null || inMidiImport), () => {
    if (inMidiReview) {
      midiImport.backToCrop();
      return;
    }

    if (inMidiCrop) {
      setCancelMidiConfirmOpen(true);
      return;
    }

    if (listeningCycleId !== null) {
      closeListeningSession();
      return;
    }

    requestLeaveEditor();
  });

  if (!open && !isPage) {
    return null;
  }

  function beginNewCycleSession() {
    stop();

    if (listeningCycleId !== null) {
      resetListenPlaybackLayers();
      setListeningCycleId(null);
    }

    clearActiveCycle();
    resetPiece();
    setDraftCycleName("");
    setEditorOpen(true);
  }

  function openEditCycleSession(cycleId: string) {
    stop();
    loadCycle(cycleId);
    closeListeningSession();
    setEditorOpen(true);
  }

  function closeListeningSession() {
    stop();
    resetListenPlaybackLayers();
    clearActiveCycle();
    resetPiece();
    setListeningCycleId(null);
  }

  function toggleListenCycleSession(cycleId: string) {
    if (listeningCycleId === cycleId) {
      closeListeningSession();
      return;
    }

    const cycle = savedCycles.find((entry) => entry.id === cycleId);

    if (!cycle) {
      return;
    }

    stop();
    loadCycle(cycleId);
    setEditorOpen(false);
    setListeningCycleId(cycleId);
  }

  function requestLibraryTabChange(nextTab: CompositorLibraryTab) {
    if (nextTab === libraryTab || editorOpen || listeningCycleId !== null || inMidiImport) {
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

  function handleDiscardCycleChanges() {
    discardCycleChanges();
    setDraftCycleName(activeCycle?.nombre ?? "");
  }

  function confirmLeaveEditor() {
    discardCycleChanges();
    setDraftCycleName("");
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

  const modalTitle = inMidiReview
      ? COMPOSITOR_LABEL_REVISION_MIDI
      : inMidiCrop
        ? COMPOSITOR_LABEL_RECORTE_MIDI
        : COMPOSITOR_LABEL_COMPOSITOR;

  const useEditorHeaderToolbar = editorOpen && isDesktop;

  const editorHeaderContent = editorOpen ? (
    useEditorHeaderToolbar ? (
      <CompositorEditorStatusBar
        variant="header"
        piece={piece}
        disabled={configLocked}
        isLoggedIn={isLoggedIn}
        online={online}
        activeCycle={activeCycle}
        isPieceModifiedFromBaseline={isPieceModifiedFromBaseline}
        cyclesBusy={cyclesBusy}
        cyclesError={cyclesError}
        cyclesNotice={cyclesNotice}
        editorNotice={editorNotice}
        trackOverflowWarning={trackOverflowWarning}
        cycleName={draftCycleName}
        onCycleNameChange={setDraftCycleName}
        onSaveCurrentCycle={saveCurrentCycle}
        onUpdateActiveCycle={updateActiveCycle}
        onDiscardChanges={handleDiscardCycleChanges}
        onSetCyclePublic={setCyclePublic}
        onDeleteCycle={deleteCycle}
        onCycleDeleted={() => {
          setEditorOpen(false);
        }}
        onReset={resetPiece}
      />
    ) : (
      <CompositorCycleNameField
        id="compositor-titulo"
        value={draftCycleName}
        mode={activeCycle ? "edit" : "create"}
        disabled={configLocked}
        onChange={setDraftCycleName}
      />
    )
  ) : null;

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
        title={editorOpen ? undefined : modalTitle}
        headerContent={editorHeaderContent}
        density={editorOpen ? "compact" : "default"}
        closeAriaLabel="Cerrar compositor"
        onClose={requestClose}
        onBack={
          editorOpen
            ? requestLeaveEditor
            : inMidiImport
              ? requestMidiBack
              : undefined
        }
        backAriaLabel={
          inMidiReview
            ? "Volver al recorte"
            : inMidiCrop
              ? "Cancelar importación"
              : "Volver a mis ciclos"
        }
        showClose={!isPage}
      />

        {!editorOpen && !inMidiImport ? (
          <div
            className={`shrink-0 border-b border-border bg-bg-dark pb-3 pt-1 ${TOOL_MODAL_MOBILE_GUTTER_CLASS} lg:px-4`}
          >
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
          data-tool-vertical-scroll={editorOpen && isDesktop ? undefined : ""}
          className={`flex min-h-0 flex-1 flex-col ${
            editorOpen && isDesktop
              ? "overflow-hidden px-4 py-2 lg:px-5 lg:py-2"
              : editorOpen
                ? `overflow-hidden ${TOOL_MODAL_MOBILE_GUTTER_CLASS} py-2`
                : `touch-pan-y overflow-y-auto overscroll-y-contain ${TOOL_MODAL_MOBILE_GUTTER_CLASS} py-4 lg:py-5`
          }`}
        >
          {editorOpen ? (
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
              modoTonalComposicion={modoTonalComposicion}
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
              cycleName={draftCycleName}
              onCycleNameChange={setDraftCycleName}
              onSetActiveTrackId={setActiveTrackId}
              onSetSelectedEventId={setSelectedEventId}
              onToggleTrack={toggleTrack}
              onToggleListenTrack={toggleListenTrack}
              onEnterListen={resetListenPlaybackLayers}
              listenMutedTrackIds={listenMutedTrackIds}
              onSetBpm={setBpm}
              onSetCycleGolpes={setCycleGolpes}
              onSetCycleBeatDurationAtSlot={setCycleBeatDurationAtSlot}
              onSetTonalidadComposicion={setTonalidadComposicion}
              onSetModoTonalComposicion={setModoTonalComposicion}
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
              onDiscardChanges={handleDiscardCycleChanges}
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
              onSetModoTonal={midiImport.setModoTonal}
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
              listeningCycleId={listeningCycleId}
              playbackPiece={piece}
              activeTrackId={activeTrackId}
              selectedEventId={selectedEventId}
              bpm={bpm}
              tonalidadComposicion={tonalidadComposicion}
              modoTonalComposicion={modoTonalComposicion}
              isPlaying={isPlaying}
              cycleProgress={cycleProgress}
              onRefreshCycles={refreshCycles}
              onBeginNewCycle={beginNewCycleSession}
              onImportMidiFile={handleImportMidiFile}
              onToggleListenCycle={toggleListenCycleSession}
              onEditCycle={openEditCycleSession}
              onSetBpm={setBpm}
              onSetTonalidadComposicion={setTonalidadComposicion}
              onSetModoTonalComposicion={setModoTonalComposicion}
              onToggleListenTrack={toggleListenTrack}
              onEnterListen={resetListenPlaybackLayers}
              listenMutedTrackIds={listenMutedTrackIds}
              onStartPlayback={() => void start()}
              onStopPlayback={stop}
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
