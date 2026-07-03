"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CompositorEventEditor } from "@/components/ui/compositor/CompositorEventEditor";
import { CompositorSharedCycleSummary } from "@/components/ui/compositor/CompositorSharedCycleSummary";
import {
  CompositorMultiTrackTimeline,
  CompositorTrackTimeline,
} from "@/components/ui/compositor/CompositorTrackTimeline";
import {
  ToolRitmoCompasPanel,
  ToolRitmoTempoPanel,
} from "@/components/ui/ToolRitmoConfig";
import {
  CompositorConfigSection,
  ToolPracticeSection,
} from "@/components/ui/ToolModalSections";
import { PlayCircleButton } from "@/components/ui/PlayCircleButton";
import { TapButton } from "@/components/ui/TapFeedback";
import { COMPOSITOR_DUMMY_BEAT_PATTERN } from "@/hooks/useCompositor";
import {
  formatCompositorCycleSummary,
  getCompositorTrack,
  getInstrumentLabel,
  type CompositorInstrumentId,
  type CompositorPiece,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import { getCompositorCycleDurationSeconds } from "@/lib/compositor-timeline";
import {
  COMPOSITOR_CONFIRM_RESET_MESSAGE,
  COMPOSITOR_LABEL_CICLO_COMPARTIDO,
  COMPOSITOR_LABEL_CAPAS_INSTRUMENTOS,
  COMPOSITOR_LABEL_RESET_ZONA,
} from "@/lib/ritmo-terminologia";
import type {
  MetronomeBeatDuration,
  MetronomeBeatDurationPattern,
} from "@/lib/metronomo";
import { RotateCcw } from "lucide-react";
import { useState } from "react";

type CompositorEditorProps = {
  piece: CompositorPiece;
  activeTrackId: CompositorInstrumentId;
  selectedEventId: string | null;
  cycleGolpes: number;
  cycleBeatDurations: MetronomeBeatDurationPattern;
  bpm: number;
  isPlaying: boolean;
  isPreviewingTrack: boolean;
  cycleProgress: number | null;
  tapTempoTapCount: number;
  octaveExact: boolean;
  onSetOctaveExact: (value: boolean) => void;
  onSetActiveTrackId: (instrumentId: CompositorInstrumentId) => void;
  onSetSelectedEventId: (eventId: string | null) => void;
  onToggleTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
  onSetBpm: (value: number) => void;
  onSetCycleGolpes: (value: number) => void;
  onSetCycleBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  onAddTrackEvent: () => void;
  onUpdateTrackEvent: (
    eventId: string,
    patch: Partial<CompositorTrackEvent>,
  ) => void;
  onRemoveTrackEvent: (eventId: string) => void;
  onTapTempo: () => void;
  onStart: () => void;
  onPreviewActiveTrack: () => void;
  onStop: () => void;
  onReset: () => void;
};

export function CompositorEditor({
  piece,
  activeTrackId,
  selectedEventId,
  cycleGolpes,
  cycleBeatDurations,
  bpm,
  isPlaying,
  isPreviewingTrack,
  cycleProgress,
  tapTempoTapCount,
  octaveExact,
  onSetOctaveExact,
  onSetActiveTrackId,
  onSetSelectedEventId,
  onToggleTrack,
  onSetBpm,
  onSetCycleGolpes,
  onSetCycleBeatDurationAtSlot,
  onAddTrackEvent,
  onUpdateTrackEvent,
  onRemoveTrackEvent,
  onTapTempo,
  onStart,
  onPreviewActiveTrack,
  onStop,
  onReset,
}: CompositorEditorProps) {
  const activeTrack = getCompositorTrack(piece, activeTrackId);
  const selectedEvent =
    selectedEventId == null
      ? null
      : activeTrack.events.find((event) => event.id === selectedEventId) ?? null;
  const enabledLayerCount = piece.tracks.filter((track) => track.enabled).length;
  const cycleSeconds = getCompositorCycleDurationSeconds(piece);
  const configSummary = `${formatCompositorCycleSummary(piece)} · ${getInstrumentLabel(activeTrackId)}`;
  const practiceSummary = isPlaying
    ? `Reproduciendo · ${cycleSeconds.toFixed(1)} s · ${enabledLayerCount} capa${enabledLayerCount === 1 ? "" : "s"}`
    : `Escuchá tu pieza · ${cycleSeconds.toFixed(1)} s · ${enabledLayerCount} capa${enabledLayerCount === 1 ? "" : "s"}`;

  const configLocked = isPlaying || isPreviewingTrack;
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  return (
    <div className="space-y-3">
      <CompositorConfigSection
        collapsible
        collapsedSummary={configSummary}
      >
        <ToolRitmoCompasPanel
          beatPattern={COMPOSITOR_DUMMY_BEAT_PATTERN}
          patternLength={cycleGolpes}
          beatDurations={cycleBeatDurations}
          disabled={configLocked}
          variant="compositor"
          scope="cycle"
          layout="flat"
          sectionLabel={COMPOSITOR_LABEL_CICLO_COMPARTIDO}
          sectionLabelNormalCase
          patternLengthInputId="compositor-cycle-golpes"
          onSetPatternLength={onSetCycleGolpes}
          onSetBeatDurationAtSlot={onSetCycleBeatDurationAtSlot}
          onSetBeatLevelAtSlot={() => {}}
        />

        <ToolRitmoTempoPanel
          bpm={bpm}
          isPlaying={isPlaying}
          tapTempoTapCount={tapTempoTapCount}
          onSetBpm={onSetBpm}
          onTapTempo={onTapTempo}
        />

        <CompositorSharedCycleSummary piece={piece} />

        <div className="space-y-3 border-t-2 border-compositor-config-border pt-4">
          <CompositorTrackTimeline
            piece={piece}
            instrumentId={activeTrackId}
            events={activeTrack.events}
            selectedEventId={selectedEventId}
            cycleProgress={isPreviewingTrack ? cycleProgress : null}
            octaveExact={octaveExact}
            disabled={configLocked}
            isPreviewingTrack={isPreviewingTrack}
            previewDisabled={isPlaying}
            onSelectTrack={onSetActiveTrackId}
            onSelectEvent={onSetSelectedEventId}
            onUpdateEvent={(eventId, patch) =>
              onUpdateTrackEvent(eventId, patch)
            }
            onAddEvent={onAddTrackEvent}
            onRemoveEvent={onRemoveTrackEvent}
            onPreviewTrack={() => void onPreviewActiveTrack()}
          />

          {selectedEvent ? (
            <CompositorEventEditor
              piece={piece}
              instrumentId={activeTrackId}
              event={selectedEvent}
              octaveExact={octaveExact}
              disabled={configLocked}
              onSetOctaveExact={onSetOctaveExact}
              onUpdateEvent={(patch) =>
                onUpdateTrackEvent(selectedEvent.id, patch)
              }
            />
          ) : null}
        </div>

        <div className="border-t-2 border-dashed border-border/90 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
            {COMPOSITOR_LABEL_RESET_ZONA}
          </p>
          <TapButton
            type="button"
            disabled={configLocked}
            onClick={() => setResetConfirmOpen(true)}
            aria-label="Restablecer todo el compositor"
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-dark py-2.5 text-xs font-semibold text-text-muted disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset
          </TapButton>
        </div>
      </CompositorConfigSection>

      <ToolPracticeSection
        collapsible
        collapsedSummary={practiceSummary}
      >
        <div
          className={`rounded-[10px] border bg-bg-card px-3 py-3 transition-[box-shadow,opacity] ${
            isPlaying ? "border-border/80 ring-1 ring-inset ring-border/25" : "border-border"
          }`}
        >
          <p
            className={`mb-2 text-xs font-bold tracking-wide normal-case transition-opacity ${
              isPlaying ? "text-tool-practice/50" : "text-tool-practice"
            }`}
          >
            {COMPOSITOR_LABEL_CAPAS_INSTRUMENTOS}
          </p>
          <CompositorMultiTrackTimeline
            piece={piece}
            selectedEventId={selectedEventId}
            activeTrackId={activeTrackId}
            cycleProgress={isPlaying ? cycleProgress : null}
            octaveExact={octaveExact}
            togglesDisabled={isPlaying}
            onToggleTrack={onToggleTrack}
          />
        </div>

        <div className="flex justify-center">
          <PlayCircleButton
            isPlaying={isPlaying}
            onClick={isPlaying ? onStop : onStart}
            playAriaLabel="Reproducir composición"
            stopAriaLabel="Detener reproducción"
          />
        </div>
      </ToolPracticeSection>

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

    </div>
  );
}
