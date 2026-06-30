"use client";

import { CompositorPlaybackCapasStrip } from "@/components/ui/compositor/CompositorCapasStrip";
import {
  BeatPatternEditor,
  ToolRitmoCompasPanel,
  ToolRitmoTempoPanel,
} from "@/components/ui/ToolRitmoConfig";
import {
  CompositorConfigSection,
  ToolPracticeSection,
} from "@/components/ui/ToolModalSections";
import { TapButton } from "@/components/ui/TapFeedback";
import {
  getCompositorTrack,
  getInstrumentLabel,
  type CompositorDrumSound,
  type CompositorGuitarArticulation,
  type CompositorInstrumentId,
  type CompositorPiece,
  type CompositorSlotNote,
} from "@/lib/compositor";
import { getBeatDurationPatternSummary } from "@/lib/metronomo";
import {
  formatRitmoConfigSummary,
  RITMO_LABEL_TEMPO,
} from "@/lib/ritmo-terminologia";
import type {
  MetronomeBeatDuration,
  MetronomeBeatDurationPattern,
  MetronomeBeatLevel,
  MetronomeBeatPattern,
} from "@/lib/metronomo";
import { Play, RotateCcw, Square } from "lucide-react";

type CompositorEditorProps = {
  piece: CompositorPiece;
  activeTrackId: CompositorInstrumentId;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  bpm: number;
  isPlaying: boolean;
  currentBeat: number | null;
  tapTempoTapCount: number;
  onSetActiveTrackId: (instrumentId: CompositorInstrumentId) => void;
  onToggleTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
  onSetBpm: (value: number) => void;
  onSetPatternLength: (value: number) => void;
  onSetBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  onSetBeatLevelAtSlot: (
    slotIndex: number,
    level: MetronomeBeatLevel,
  ) => void;
  onSetNoteAtSlot: (slotIndex: number, note: CompositorSlotNote) => void;
  onSetDrumSoundAtSlot: (slotIndex: number, sound: CompositorDrumSound) => void;
  onSetGuitarArticulationAtSlot: (
    slotIndex: number,
    articulation: CompositorGuitarArticulation,
  ) => void;
  onTapTempo: () => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
};

export function CompositorEditor({
  piece,
  activeTrackId,
  beatPattern,
  patternLength,
  beatDurations,
  bpm,
  isPlaying,
  currentBeat,
  tapTempoTapCount,
  onSetActiveTrackId,
  onToggleTrack,
  onSetBpm,
  onSetPatternLength,
  onSetBeatDurationAtSlot,
  onSetBeatLevelAtSlot,
  onSetNoteAtSlot,
  onSetDrumSoundAtSlot,
  onSetGuitarArticulationAtSlot,
  onTapTempo,
  onStart,
  onStop,
  onReset,
}: CompositorEditorProps) {
  const activeTrack = getCompositorTrack(piece, activeTrackId);
  const practiceVisualTrack =
    piece.tracks.find((track) => track.enabled) ?? piece.tracks[0]!;
  const enabledLayerCount = piece.tracks.filter((track) => track.enabled).length;
  const durationSummary = getBeatDurationPatternSummary(
    beatDurations,
    patternLength,
  );
  const configSummary = `${formatRitmoConfigSummary(patternLength, durationSummary, bpm)} · ${getInstrumentLabel(activeTrackId)}`;
  const practiceSummary = isPlaying
    ? `Reproduciendo · ${bpm} BPM · ${enabledLayerCount} capa${enabledLayerCount === 1 ? "" : "s"}`
    : `Escuchá tu pieza · ${bpm} BPM · ${enabledLayerCount} capa${enabledLayerCount === 1 ? "" : "s"}`;

  return (
    <div className="space-y-3">
      <CompositorConfigSection
        collapsible
        collapsedSummary={configSummary}
        autoCollapseWhen={isPlaying}
      >
        <ToolRitmoCompasPanel
          beatPattern={beatPattern}
          patternLength={patternLength}
          beatDurations={beatDurations}
          disabled={isPlaying}
          variant="compositor"
          patternLengthInputId="compositor-pattern-length"
          onSetPatternLength={onSetPatternLength}
          onSetBeatDurationAtSlot={onSetBeatDurationAtSlot}
          onSetBeatLevelAtSlot={onSetBeatLevelAtSlot}
          capas={{
            activeTrackId,
            onSelectTrack: onSetActiveTrackId,
          }}
          contenido={{
            instrumentId: activeTrackId,
            notes: activeTrack.notes,
            drumSounds: activeTrack.drumSounds,
            guitarArticulations: activeTrack.guitarArticulations,
            onSetNoteAtSlot: onSetNoteAtSlot,
            onSetDrumSoundAtSlot: onSetDrumSoundAtSlot,
            onSetGuitarArticulationAtSlot: onSetGuitarArticulationAtSlot,
          }}
        />
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
        subtitle="Elegí qué capas suenan y seguí el ciclo en tiempo real."
      >
        <CompositorPlaybackCapasStrip
          piece={piece}
          disabled={isPlaying}
          onToggleTrack={onToggleTrack}
        />

        <div className="flex items-end gap-3 rounded-[10px] border border-border bg-bg-card px-3 py-3">
          <div className="shrink-0 text-center" aria-live="polite">
            <p className="text-3xl font-extrabold leading-none text-text-primary">
              {bpm}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              {RITMO_LABEL_TEMPO}
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <BeatPatternEditor
              pattern={practiceVisualTrack.levels}
              patternLength={patternLength}
              variant="practice"
              currentBeat={isPlaying ? currentBeat : null}
            />
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
