"use client";

import {
  TOOL_MODAL_MOBILE_GUTTER_CLASS,
  ToolModalMobileBleed,
  ToolPracticeSection,
} from "@/components/ui/ToolModalSections";
import PlayingEqIndicator from "@/components/ui/PlayingEqIndicator";
import { PlayCircleButton } from "@/components/ui/PlayCircleButton";
import { RitmoConfigSection } from "@/components/ui/ToolRitmoConfig";
import { MetronomoPcShell } from "@/components/ui/metronomo/MetronomoPcShell";
import {
  MetronomoMicDetectionPanel,
  MetronomoPracticePlaybackSummary,
} from "@/components/ui/metronomo/MetronomoPracticePanels";
import {
  getBeatDurationPatternSummary,
  type MetronomeBeatDuration,
  type MetronomeBeatDurationPattern,
  type MetronomeBeatLevel,
  type MetronomeBeatMarker,
  type MetronomeBeatPattern,
  type MetronomeHit,
} from "@/lib/metronomo";
import { ToolModalHeader } from "@/components/ui/ToolModalHeader";
import { ToolPresentationRoot } from "@/components/ui/ToolPresentationRoot";
import type { ToolPresentation } from "@/lib/tool-presentation";
import { isToolPagePresentation } from "@/lib/tool-presentation";
import {
  MetronomoConfigHelpButton,
  MetronomoConfigHelpModal,
} from "@/components/ui/MetronomoConfigHelpModal";
import { formatRitmoConfigSummary } from "@/lib/ritmo-terminologia";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useState } from "react";

type MetronomoModalProps = {
  open: boolean;
  onClose: () => void;
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
  onSetBeatLevelAtSlot: (
    slotIndex: number,
    level: MetronomeBeatLevel,
  ) => void;
  onCycleBeatPatternSlot: (slotIndex: number) => void;
  onTapTempo: () => void;
  onToggleMic: () => void;
  onRequestMic: () => void;
  presentation?: ToolPresentation;
};

export default function MetronomoModal({
  open,
  onClose,
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
  onSetBeatLevelAtSlot,
  onCycleBeatPatternSlot,
  onTapTempo,
  onToggleMic,
  onRequestMic,
  presentation = "modal",
}: MetronomoModalProps) {
  const [configHelpOpen, setConfigHelpOpen] = useState(false);
  const isPage = isToolPagePresentation(presentation);
  const isDesktop = useIsDesktop();

  const configSummary = formatRitmoConfigSummary(
    patternLength,
    getBeatDurationPatternSummary(beatDurations, patternLength),
    bpm,
  );

  return (
    <ToolPresentationRoot
      presentation={presentation}
      open={open}
      onClose={onClose}
      closeAriaLabel="Cerrar metrónomo"
      panelClassName={
        isPage
          ? ""
          : "relative z-10 tool-modal-panel-wide flex h-[min(92vh,780px)] flex-col overflow-hidden rounded-amplio border border-border bg-bg-cola-sheet shadow-xl"
      }
      trailing={
        <MetronomoConfigHelpModal
          open={configHelpOpen}
          onClose={() => setConfigHelpOpen(false)}
        />
      }
    >
      <ToolModalHeader
        titleId="metronomo-titulo"
        title={isDesktop ? undefined : "Metrónomo"}
        accentVar="--accent-metronomo"
        headerContent={
          isDesktop ? (
            <div className="flex min-w-0 items-center gap-2">
              <h2
                id="metronomo-titulo"
                className="min-w-0 truncate text-lg font-extrabold text-inherit"
              >
                Metrónomo
              </h2>
              <MetronomoConfigHelpButton
                onClick={() => setConfigHelpOpen(true)}
              />
            </div>
          ) : undefined
        }
        closeAriaLabel="Cerrar metrónomo"
        onClose={onClose}
        showClose={!isPage}
        isPage={isPage}
      />

      <div
        className={`flex min-h-0 flex-1 flex-col metronomo-ui ${
          isDesktop
            ? "overflow-hidden px-4 py-4 lg:px-6 lg:py-5"
            : `touch-pan-y overflow-y-auto overscroll-y-contain ${TOOL_MODAL_MOBILE_GUTTER_CLASS} py-4`
        }`}
        style={{
          ["--tool-practice-section-bg" as string]: "var(--bg-app)",
          ["--bg-cola-sheet" as string]: "var(--bg-app)",
          ["--tool-practice" as string]: "var(--accent-metronomo)",
          ["--tool-practice-dim" as string]: "var(--accent-metronomo-dim)",
          ["--voz-config" as string]: "var(--accent-metronomo)",
          ["--voz-config-dim" as string]: "var(--accent-metronomo-dim)",
          ["--ritmo-inactive-bar-bg" as string]: "var(--bg-darker)",
          ["--ritmo-inactive-bar-border" as string]: "1px solid var(--border)",
          ["--ritmo-active-bar-bg" as string]: "var(--accent-metronomo)",
          ["--ritmo-active-bar-border" as string]: "1px solid var(--accent-metronomo)",
        }}
      >
        {isDesktop ? (
          <MetronomoPcShell
            bpm={bpm}
            isPlaying={isPlaying}
            beatPattern={beatPattern}
            patternLength={patternLength}
            beatDurations={beatDurations}
            currentBeat={currentBeat}
            micActivo={micActivo}
            micPermissionGranted={micPermissionGranted}
            micError={micError}
            micReady={micReady}
            micStarting={micStarting}
            hits={hits}
            beatMarkers={beatMarkers}
            tapTempoTapCount={tapTempoTapCount}
            onStart={onStart}
            onStop={onStop}
            onSetBpm={onSetBpm}
            onSetPatternLength={onSetPatternLength}
            onSetBeatDurationAtSlot={onSetBeatDurationAtSlot}
            onCycleBeatPatternSlot={onCycleBeatPatternSlot}
            onTapTempo={onTapTempo}
            onToggleMic={onToggleMic}
            onRequestMic={onRequestMic}
          />
        ) : (
          <div className="space-y-3">
            <ToolModalMobileBleed>
              <RitmoConfigSection
                compasLayout="flat"
                collapsedSummary={configSummary}
                hideCompasHelp
                configHeaderAction={
                  <MetronomoConfigHelpButton
                    onClick={() => setConfigHelpOpen(true)}
                  />
                }
                beatPattern={beatPattern}
                patternLength={patternLength}
                beatDurations={beatDurations}
                bpm={bpm}
                isPlaying={isPlaying}
                tapTempoTapCount={tapTempoTapCount}
                patternLengthInputId="metronomo-pattern-length"
                accentVar="--accent-metronomo"
                onSetPatternLength={onSetPatternLength}
                onSetBeatDurationAtSlot={onSetBeatDurationAtSlot}
                onSetBeatLevelAtSlot={onSetBeatLevelAtSlot}
                onSetBpm={onSetBpm}
                onTapTempo={onTapTempo}
              />
            </ToolModalMobileBleed>

            <ToolModalMobileBleed className="pb-1 pt-3">
            <ToolPracticeSection>
              {isPlaying ? (
                <div className="flex items-center justify-end">
                  <PlayingEqIndicator
                    color="var(--tool-practice)"
                    ariaLabel="Metrónomo sonando"
                  />
                </div>
              ) : null}

              <MetronomoPracticePlaybackSummary
                bpm={bpm}
                beatPattern={beatPattern}
                patternLength={patternLength}
                beatDurations={beatDurations}
                currentBeat={currentBeat}
                isPlaying={isPlaying}
              />

              <div className="flex justify-center">
                <PlayCircleButton
                  isPlaying={isPlaying}
                  onClick={isPlaying ? onStop : onStart}
                  playAriaLabel="Iniciar metrónomo"
                  stopAriaLabel="Detener metrónomo"
                  className="text-[var(--accent-metronomo)] border-[var(--accent-metronomo)] bg-bg-card shadow-[0_0_12px_color-mix(in_srgb,var(--accent-metronomo)_25%,transparent)]"
                />
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
                onToggleMic={onToggleMic}
                onRequestMic={onRequestMic}
              />
            </ToolPracticeSection>
            </ToolModalMobileBleed>
          </div>
        )}
      </div>
    </ToolPresentationRoot>
  );
}
