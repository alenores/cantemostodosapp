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
  COMPOSITOR_PRESETS,
  formatCompositorCycleSummary,
  getCompositorTrack,
  getInstrumentLabel,
  type CompositorInstrumentId,
  type CompositorPiece,
  type CompositorPresetId,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import { getCompositorCycleDurationSeconds } from "@/lib/compositor-timeline";
import {
  COMPOSITOR_CONFIRM_LOAD_PRESET_MESSAGE,
  COMPOSITOR_CONFIRM_RESET_MESSAGE,
  COMPOSITOR_LABEL_CICLO_COMPARTIDO,
  COMPOSITOR_LABEL_CAPAS_INSTRUMENTOS,
  COMPOSITOR_LABEL_PLANTILLAS,
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
  activePresetId: CompositorPresetId | null;
  isPieceModifiedFromBaseline: boolean;
  selectedEventId: string | null;
  cycleGolpes: number;
  cycleBeatDurations: MetronomeBeatDurationPattern;
  bpm: number;
  isPlaying: boolean;
  isPreviewingTrack: boolean;
  cycleProgress: number | null;
  tapTempoTapCount: number;
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
  onApplyPreset: (presetId: CompositorPresetId) => void;
};

export function CompositorEditor({
  piece,
  activeTrackId,
  activePresetId,
  isPieceModifiedFromBaseline,
  selectedEventId,
  cycleGolpes,
  cycleBeatDurations,
  bpm,
  isPlaying,
  isPreviewingTrack,
  cycleProgress,
  tapTempoTapCount,
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
  onApplyPreset,
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
  const [presetConfirmOpen, setPresetConfirmOpen] = useState(false);
  const [pendingPresetId, setPendingPresetId] = useState<CompositorPresetId | null>(
    null,
  );
  const [hoveredPresetId, setHoveredPresetId] = useState<CompositorPresetId | null>(
    null,
  );

  const pendingPreset = pendingPresetId
    ? COMPOSITOR_PRESETS.find((preset) => preset.id === pendingPresetId)
    : null;
  const hoveredPreset = hoveredPresetId
    ? COMPOSITOR_PRESETS.find((preset) => preset.id === hoveredPresetId)
    : null;

  function handlePresetClick(presetId: CompositorPresetId) {
    if (configLocked) {
      return;
    }

    if (isPieceModifiedFromBaseline) {
      setPendingPresetId(presetId);
      setPresetConfirmOpen(true);
      return;
    }

    onApplyPreset(presetId);
  }

  return (
    <div className="space-y-3">
      <CompositorConfigSection
        collapsible
        collapsedSummary={configSummary}
      >
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <p className="w-[4.75rem] shrink-0 text-[10px] font-bold uppercase leading-none tracking-wide text-compositor-config">
              {COMPOSITOR_LABEL_PLANTILLAS}
            </p>
            <div
              className="flex min-w-0 flex-1 gap-0.5 rounded-full border border-border bg-bg-darker p-0.5"
              role="group"
              aria-label={COMPOSITOR_LABEL_PLANTILLAS}
            >
              {COMPOSITOR_PRESETS.map((preset) => {
                const isActive = activePresetId === preset.id;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={configLocked}
                    aria-pressed={isActive}
                    title={preset.descripcion}
                    onClick={() => handlePresetClick(preset.id)}
                    onMouseEnter={() => setHoveredPresetId(preset.id)}
                    onMouseLeave={() =>
                      setHoveredPresetId((current) =>
                        current === preset.id ? null : current,
                      )
                    }
                    onFocus={() => setHoveredPresetId(preset.id)}
                    onBlur={() =>
                      setHoveredPresetId((current) =>
                        current === preset.id ? null : current,
                      )
                    }
                    className={`min-w-0 flex-1 rounded-full px-1 py-1 text-[10px] font-bold leading-none transition-colors disabled:opacity-50 ${
                      isActive
                        ? "bg-[#454545] text-white"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
          {hoveredPreset?.descripcion ? (
            <p className="mt-1 truncate pl-[5.25rem] text-[10px] leading-tight text-text-muted">
              {hoveredPreset.descripcion}
            </p>
          ) : null}
        </div>

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
            octaveExact={true}
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
              disabled={configLocked}
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
            octaveExact={true}
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
        open={presetConfirmOpen}
        message={
          pendingPreset
            ? COMPOSITOR_CONFIRM_LOAD_PRESET_MESSAGE(pendingPreset.label)
            : ""
        }
        confirmLabel="Sí, cargar"
        cancelLabel="Cancelar"
        deleteConfirm
        zIndex={60}
        onConfirm={() => {
          if (pendingPresetId) {
            onApplyPreset(pendingPresetId);
          }

          setPresetConfirmOpen(false);
          setPendingPresetId(null);
        }}
        onCancel={() => {
          setPresetConfirmOpen(false);
          setPendingPresetId(null);
        }}
      />

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
