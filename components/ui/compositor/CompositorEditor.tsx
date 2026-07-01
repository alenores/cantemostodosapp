"use client";

import {
  CompositorCapasStrip,
  CompositorPlaybackCapasStrip,
} from "@/components/ui/compositor/CompositorCapasStrip";
import { CompositorEventEditor } from "@/components/ui/compositor/CompositorEventEditor";
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
  RITMO_LABEL_CICLO,
  RITMO_LABEL_TEMPO,
} from "@/lib/ritmo-terminologia";
import type {
  MetronomeBeatDuration,
  MetronomeBeatDurationPattern,
} from "@/lib/metronomo";
import { Play, RotateCcw, Square } from "lucide-react";

type CompositorEditorProps = {
  piece: CompositorPiece;
  activeTrackId: CompositorInstrumentId;
  selectedEventId: string | null;
  cycleGolpes: number;
  cycleBeatDurations: MetronomeBeatDurationPattern;
  bpm: number;
  isPlaying: boolean;
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
  onStop,
  onReset,
}: CompositorEditorProps) {
  const activeTrack = getCompositorTrack(piece, activeTrackId);
  const selectedEvent =
    activeTrack.events.find((event) => event.id === selectedEventId) ??
    activeTrack.events[0] ??
    null;
  const enabledLayerCount = piece.tracks.filter((track) => track.enabled).length;
  const cycleSeconds = getCompositorCycleDurationSeconds(piece);
  const configSummary = `${formatCompositorCycleSummary(piece)} · ${getInstrumentLabel(activeTrackId)}`;
  const practiceSummary = isPlaying
    ? `Reproduciendo · ${cycleSeconds.toFixed(1)} s · ${enabledLayerCount} capa${enabledLayerCount === 1 ? "" : "s"}`
    : `Escuchá tu pieza · ${cycleSeconds.toFixed(1)} s · ${enabledLayerCount} capa${enabledLayerCount === 1 ? "" : "s"}`;

  return (
    <div className="space-y-3">
      <CompositorConfigSection
        collapsible
        collapsedSummary={configSummary}
        autoCollapseWhen={isPlaying}
      >
        <div className="rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-compositor-config">
            {RITMO_LABEL_CICLO} compartido
          </p>
          <ToolRitmoCompasPanel
            beatPattern={COMPOSITOR_DUMMY_BEAT_PATTERN}
            patternLength={cycleGolpes}
            beatDurations={cycleBeatDurations}
            disabled={isPlaying}
            variant="compositor"
            scope="cycle"
            patternLengthInputId="compositor-cycle-golpes"
            onSetPatternLength={onSetCycleGolpes}
            onSetBeatDurationAtSlot={onSetCycleBeatDurationAtSlot}
            onSetBeatLevelAtSlot={() => {}}
          />
        </div>

        <div className="rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3">
          <CompositorCapasStrip
            activeTrackId={activeTrackId}
            disabled={isPlaying}
            onSelectTrack={onSetActiveTrackId}
          />

          <div className="mt-3 space-y-3">
            <CompositorTrackTimeline
              piece={piece}
              instrumentId={activeTrackId}
              events={activeTrack.events}
              selectedEventId={selectedEvent?.id ?? null}
              cycleProgress={isPlaying ? cycleProgress : null}
              disabled={isPlaying}
              onSelectEvent={onSetSelectedEventId}
              onAddEvent={onAddTrackEvent}
              onRemoveEvent={onRemoveTrackEvent}
            />

            {selectedEvent ? (
              <CompositorEventEditor
                piece={piece}
                instrumentId={activeTrackId}
                event={selectedEvent}
                disabled={isPlaying}
                onUpdateEvent={(patch) =>
                  onUpdateTrackEvent(selectedEvent.id, patch)
                }
              />
            ) : (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-text-muted">
                Agregá un sonido en la línea de tiempo de esta capa.
              </p>
            )}
          </div>
        </div>

        <ToolRitmoTempoPanel
          bpm={bpm}
          isPlaying={isPlaying}
          tapTempoTapCount={tapTempoTapCount}
          onSetBpm={onSetBpm}
          onTapTempo={onTapTempo}
        />
      </CompositorConfigSection>

      <ToolPracticeSection
        collapsible
        collapsedSummary={practiceSummary}
        subtitle="Todas las capas suenan juntas en el mismo ciclo, cada una con sus momentos."
      >
        <CompositorPlaybackCapasStrip
          piece={piece}
          disabled={isPlaying}
          onToggleTrack={onToggleTrack}
        />

        <div className="rounded-[10px] border border-border bg-bg-card px-3 py-3">
          <div className="flex items-end gap-3">
            <div className="shrink-0 text-center" aria-live="polite">
              <p className="text-3xl font-extrabold leading-none text-text-primary">
                {bpm}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                {RITMO_LABEL_TEMPO}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <CompositorMultiTrackTimeline
                piece={piece}
                selectedEventId={selectedEventId}
                activeTrackId={activeTrackId}
                cycleProgress={isPlaying ? cycleProgress : null}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <TapButton
            type="button"
            aria-label={
              isPlaying ? "Detener reproducción" : "Reproducir composición"
            }
            onClick={isPlaying ? onStop : onStart}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold ${
              isPlaying
                ? "bg-bg-cola-sheet text-text-primary"
                : "bg-compositor-config text-white"
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="size-4" aria-hidden="true" />
                Detener
              </>
            ) : (
              <>
                <Play className="size-4" aria-hidden="true" />
                Reproducir
              </>
            )}
          </TapButton>
          <TapButton
            type="button"
            aria-label="Restablecer composición"
            disabled={isPlaying}
            onClick={onReset}
            className="flex items-center justify-center gap-1 rounded-lg border border-border bg-bg-card px-3 py-3 text-xs font-semibold text-text-muted disabled:opacity-50"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </TapButton>
        </div>
      </ToolPracticeSection>

      <p className="text-center text-[10px] text-text-muted">
        {configSummary} · Se guarda automáticamente en este dispositivo
      </p>
    </div>
  );
}
