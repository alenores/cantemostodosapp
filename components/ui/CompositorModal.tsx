"use client";

import { CompositorEditor } from "@/components/ui/compositor/CompositorEditor";
import { ToolModalHeader } from "@/components/ui/ToolModalHeader";
import type { UseCompositorResult } from "@/hooks/useCompositor";
import { createPortal } from "react-dom";

type CompositorModalProps = {
  open: boolean;
  onClose: () => void;
} & UseCompositorResult;

export default function CompositorModal({
  open,
  onClose,
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
  setActiveTrackId,
  setSelectedEventId,
  setBpm,
  setCycleGolpes,
  setCycleBeatDurationAtSlot,
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
}: CompositorModalProps) {
  if (!open) {
    return null;
  }

  function handleClose() {
    stop();
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6">
      <button
        type="button"
        aria-label="Cerrar compositor"
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compositor-titulo"
        className="relative z-10 tool-modal-panel flex h-[min(92vh,780px)] flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      >
        <ToolModalHeader
          titleId="compositor-titulo"
          title="Compositor"
          closeAriaLabel="Cerrar compositor"
          onClose={handleClose}
        />

        <div className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
          <CompositorEditor
            piece={piece}
            activeTrackId={activeTrackId}
            activePresetId={activePresetId}
            isPieceModifiedFromBaseline={isPieceModifiedFromBaseline}
            selectedEventId={selectedEventId}
            cycleGolpes={cycleGolpes}
            cycleBeatDurations={cycleBeatDurations}
            bpm={bpm}
            isPlaying={isPlaying}
            isPreviewingTrack={isPreviewingTrack}
            cycleProgress={cycleProgress}
            tapTempoTapCount={tapTempoTapCount}
            onSetActiveTrackId={setActiveTrackId}
            onSetSelectedEventId={setSelectedEventId}
            onToggleTrack={toggleTrack}
            onSetBpm={setBpm}
            onSetCycleGolpes={setCycleGolpes}
            onSetCycleBeatDurationAtSlot={setCycleBeatDurationAtSlot}
            onAddTrackEvent={() => addTrackEvent()}
            onUpdateTrackEvent={updateTrackEvent}
            onRemoveTrackEvent={removeTrackEvent}
            onTapTempo={tapTempo}
            onStart={() => void start()}
            onPreviewActiveTrack={() => void previewActiveTrack()}
            onStop={stop}
            onReset={resetPiece}
            onApplyPreset={applyPreset}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
