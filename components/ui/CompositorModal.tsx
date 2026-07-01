"use client";

import { CompositorEditor } from "@/components/ui/compositor/CompositorEditor";
import { COMPOSITOR_TAGLINE } from "@/lib/herramientas-product";
import type { UseCompositorResult } from "@/hooks/useCompositor";
import { X } from "lucide-react";
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
  selectedEventId,
  cycleGolpes,
  cycleBeatDurations,
  bpm,
  isPlaying,
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
  stop,
  resetPiece,
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
        className="relative z-10 flex h-[min(92vh,780px)] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      >
        <header className="shrink-0 border-b border-border bg-bg-dark px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2
                id="compositor-titulo"
                className="text-lg font-extrabold text-compositor-config"
              >
                Compositor
              </h2>
              <p className="mt-1 text-xs leading-snug text-text-muted">
                {COMPOSITOR_TAGLINE}
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar compositor"
              onClick={handleClose}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              <X className="size-5 text-text-primary" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
          <CompositorEditor
            piece={piece}
            activeTrackId={activeTrackId}
            selectedEventId={selectedEventId}
            cycleGolpes={cycleGolpes}
            cycleBeatDurations={cycleBeatDurations}
            bpm={bpm}
            isPlaying={isPlaying}
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
            onStop={stop}
            onReset={resetPiece}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
