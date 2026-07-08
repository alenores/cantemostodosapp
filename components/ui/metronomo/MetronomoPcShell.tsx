"use client";

import { CompositorDesktopCicloBar } from "@/components/ui/compositor/CompositorDesktopCicloBar";
import { CompositorDesktopTempoBar } from "@/components/ui/compositor/CompositorDesktopTempoBar";
import { VozPcConfigCard } from "@/components/ui/entrenador-vocal/pc/VozPcShellLayout";
import {
  MetronomoMicDetectionPanel,
  MetronomoPracticePlaybackSummary,
} from "@/components/ui/metronomo/MetronomoPracticePanels";
import PlayingEqIndicator from "@/components/ui/PlayingEqIndicator";
import { PlayCircleButton } from "@/components/ui/PlayCircleButton";
import { BeatPatternEditor } from "@/components/ui/ToolRitmoConfig";
import type {
  MetronomeBeatDuration,
  MetronomeBeatDurationPattern,
  MetronomeBeatMarker,
  MetronomeBeatPattern,
  MetronomeHit,
} from "@/lib/metronomo";

export type MetronomoPcShellProps = {
  bpm: number;
  isPlaying: boolean;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  currentBeat: number | null;
  micActivo: boolean;
  micPermissionGranted: boolean;
  micError: string | null;
  micReady: boolean;
  micStarting: boolean;
  hits: MetronomeHit[];
  beatMarkers: MetronomeBeatMarker[];
  tapTempoTapCount: number;
  onStart: () => void;
  onStop: () => void;
  onSetBpm: (value: number) => void;
  onSetPatternLength: (value: number) => void;
  onSetBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  onCycleBeatPatternSlot: (slotIndex: number) => void;
  onTapTempo: () => void;
  onToggleMic: () => void;
  onRequestMic: () => void;
};

export function MetronomoPcShell({
  bpm,
  isPlaying,
  beatPattern,
  patternLength,
  beatDurations,
  currentBeat,
  micActivo,
  micPermissionGranted,
  micError,
  micReady,
  micStarting,
  hits,
  beatMarkers,
  tapTempoTapCount,
  onStart,
  onStop,
  onSetBpm,
  onSetPatternLength,
  onSetBeatDurationAtSlot,
  onCycleBeatPatternSlot,
  onTapTempo,
  onToggleMic,
  onRequestMic,
}: MetronomoPcShellProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden rounded-[12px] border border-border bg-bg-card">
      <aside className="flex min-h-0 w-[min(100%,20rem)] min-w-0 shrink-0 flex-col border-r border-border/80 bg-[color-mix(in_srgb,var(--voz-config)_5%,var(--bg-card))]">
        <div
          data-tool-vertical-scroll=""
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain p-3 touch-pan-y"
        >
          <VozPcConfigCard>
            <CompositorDesktopCicloBar
              cycleGolpes={patternLength}
              cycleBeatDurations={beatDurations}
              disabled={false}
              size="compact"
              accent="voz"
              onSetCycleGolpes={onSetPatternLength}
              onSetCycleBeatDurationAtSlot={onSetBeatDurationAtSlot}
            />
          </VozPcConfigCard>

          <VozPcConfigCard>
            <BeatPatternEditor
              pattern={beatPattern}
              patternLength={patternLength}
              variant="config"
              slotDensity="compact"
              embedded
              desktopEmbedded
              accent="voz"
              onCycleSlot={onCycleBeatPatternSlot}
            />
          </VozPcConfigCard>

          <VozPcConfigCard className="w-fit">
            <CompositorDesktopTempoBar
              bpm={bpm}
              isPlaying={isPlaying}
              tapTempoTapCount={tapTempoTapCount}
              accent="voz"
              onSetBpm={onSetBpm}
              onTapTempo={onTapTempo}
            />
          </VozPcConfigCard>
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--tool-practice-section-bg)]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-tool-practice/20 px-5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-tool-practice">
            Practicar
          </p>
          {isPlaying ? (
            <PlayingEqIndicator
              color="var(--tool-practice)"
              ariaLabel="Metrónomo sonando"
            />
          ) : null}
        </div>

        <div
          data-tool-vertical-scroll=""
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain p-5 touch-pan-y"
        >
          <div className="flex flex-wrap items-center gap-4">
            <MetronomoPracticePlaybackSummary
              bpm={bpm}
              beatPattern={beatPattern}
              patternLength={patternLength}
              currentBeat={currentBeat}
              isPlaying={isPlaying}
              compact
            />

            <div className="flex flex-1 justify-center sm:justify-end">
              <PlayCircleButton
                isPlaying={isPlaying}
                onClick={isPlaying ? onStop : onStart}
                playAriaLabel="Iniciar metrónomo"
                stopAriaLabel="Detener metrónomo"
              />
            </div>
          </div>

          <MetronomoMicDetectionPanel
            micActivo={micActivo}
            micReady={micReady}
            micPermissionGranted={micPermissionGranted}
            micError={micError}
            micStarting={micStarting}
            hits={hits}
            beatMarkers={beatMarkers}
            isPlaying={isPlaying}
            bpm={bpm}
            beatPattern={beatPattern}
            patternLength={patternLength}
            beatDurations={beatDurations}
            layout="desktop"
            onToggleMic={onToggleMic}
            onRequestMic={onRequestMic}
          />
        </div>
      </section>
    </div>
  );
}
