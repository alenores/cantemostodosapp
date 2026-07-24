"use client";

import { VozModeSlides, VOZ_MODE_SLIDES } from "@/components/ui/entrenador-vocal/VozModeSlides";
import {
  VozModeSelectionGrid,
  VOZ_MODE_CARDS,
} from "@/components/ui/entrenador-vocal/VozModeSelectionGrid";
import type { VozModeSlideId } from "@/components/ui/entrenador-vocal/voz-mode-slides";
import { TapButton } from "@/components/ui/TapFeedback";
import type { NoteDetection } from "@/lib/afinador";
import type { RitmoToneEvaluation } from "@/hooks/useVoz";
import {
  formatTargetLabel,
  stopOctaveReference,
  type VozAccuracy,
  type VozCalibre,
  type VozHistorySample,
  type VozInstantAttempt,
  type VozOctavasPitchMode,
  type VozTarget,
} from "@/lib/voz";
import type {
  MetronomeBeatDuration,
  MetronomeBeatDurationPattern,
  MetronomeBeatLevel,
  MetronomeBeatPattern,
} from "@/lib/metronomo";
import type { VozNotaPattern } from "@/lib/voz-nota-patron";
import type {
  VozRitmoBeatMarker,
  VozRitmoVoiceSample,
} from "@/lib/voz-ritmo";
import type { VozIntensidadVoiceSample } from "@/lib/voz-intensidad";
import { ToolModalHeader } from "@/components/ui/ToolModalHeader";
import { TOOL_MODAL_MOBILE_GUTTER_CLASS } from "@/components/ui/ToolModalSections";
import { ToolPresentationRoot } from "@/components/ui/ToolPresentationRoot";
import type { ToolPresentation } from "@/lib/tool-presentation";
import { isToolPagePresentation } from "@/lib/tool-presentation";
import { Mic } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useIsDesktop } from "@/hooks/useIsDesktop";

type EntrenadorVocalModalProps = {
  open: boolean;
  onClose: () => void;
  onRequestMic: () => void;
  tonePracticeActive: boolean;
  onToggleTonePractice: () => void;
  onDeactivatePracticeMic: () => void;
  detection: NoteDetection | null;
  micError: string | null;
  micPermissionGranted: boolean;
  micStarting: boolean;
  target: VozTarget;
  onSetTarget: (target: VozTarget) => void;
  targetFrequency: number | null;
  referenceLabel: string | null;
  centsFromTarget: number | null;
  accuracy: VozAccuracy;
  feedbackLabel: string;
  historySamples: VozHistorySample[];
  holdHistorySamples: VozHistorySample[];
  instantAttempts: VozInstantAttempt[];
  onClearInstantAttempts: () => void;
  holdTargetSeconds: number;
  onSetHoldTargetSeconds: (value: number) => void;
  holdCalibre: VozCalibre;
  onSetHoldCalibre: (value: VozCalibre) => void;
  octavasNoteDurationSeconds: number;
  onSetOctavasNoteDurationSeconds: (value: number) => void;
  octavasPitchMode: VozOctavasPitchMode;
  onSetOctavasPitchMode: (mode: VozOctavasPitchMode) => void;
  octavasScaleRepetitions: number;
  onSetOctavasScaleRepetitions: (value: number) => void;
  celebrationKey: number;
  effectiveTarget: VozTarget;
  onSetRitmoToneEvaluation: (mode: RitmoToneEvaluation) => void;
  onSetIntensidadEvaluation: (value: boolean) => void;
  ritmoPlaying: boolean;
  onToggleRitmoPlaying: () => void;
  ritmoMicActive: boolean;
  onToggleRitmoMic: () => void;
  onStopRhythm: () => void;
  ritmoBpm: number;
  onSetRitmoBpm: (value: number) => void;
  ritmoBeatPattern: MetronomeBeatPattern;
  ritmoPatternLength: number;
  ritmoBeatDurations: MetronomeBeatDurationPattern;
  onSetRitmoPatternLength: (value: number) => void;
  onSetRitmoBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  onSetRitmoBeatLevelAtSlot: (
    slotIndex: number,
    level: MetronomeBeatLevel,
  ) => void;
  ritmoTapTempoTapCount: number;
  onTapRitmoTempo: () => void;
  beatMarkers: VozRitmoBeatMarker[];
  ritmoVoiceSamples: VozRitmoVoiceSample[];
  intensidadVoiceSamples: VozIntensidadVoiceSample[];
  voiceRms: number;
  melodiaPlaying: boolean;
  onToggleMelodiaPlaying: () => void;
  melodiaMicActive: boolean;
  onToggleMelodiaMic: () => void;
  melodiaBpm: number;
  onSetMelodiaBpm: (value: number) => void;
  melodiaPatternLength: number;
  onSetMelodiaPatternLength: (value: number) => void;
  melodiaBeatDuration: MetronomeBeatDuration;
  onSetMelodiaBeatDuration: (value: MetronomeBeatDuration) => void;
  melodiaNotePattern: VozNotaPattern;
  onSetMelodiaNoteAtSlot: (slotIndex: number, target: VozTarget) => void;
  melodiaTapTempoTapCount: number;
  onTapMelodiaTempo: () => void;
  comboNotePattern: VozNotaPattern;
  onSetComboNoteAtSlot: (slotIndex: number, target: VozTarget) => void;
  presentation?: ToolPresentation;
};

function MicConnectingPanel() {
  return (
    <p className="py-2 text-center text-sm text-text-muted">
      Conectando micrófono...
    </p>
  );
}

function MicPermissionPanel({
  micError,
  micStarting,
  onRequestMic,
}: {
  micError: string | null;
  micStarting: boolean;
  onRequestMic: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-border bg-bg-card">
        <Mic className="size-8 text-accent" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <p className="text-base font-semibold text-text-primary">
          Acceso al micrófono
        </p>
        <p className="text-sm text-text-muted">
          Para practicar con tu voz necesitamos el micrófono. Tocá el botón y
          aceptá el permiso cuando el navegador te lo pida. Después activá el
          micrófono en cada modo para empezar a practicar.
        </p>
      </div>
      {micError ? (
        <p className="text-sm text-accent" role="alert">
          {micError}
        </p>
      ) : null}
      <TapButton
        type="button"
        disabled={micStarting}
        onClick={onRequestMic}
        className="w-full rounded-[12px] bg-accent px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {micStarting
          ? "Solicitando permiso..."
          : micError
            ? "Reintentar"
            : "Permitir micrófono"}
      </TapButton>
    </div>
  );
}

export default function EntrenadorVocalModal({
  open,
  onClose,
  onRequestMic,
  tonePracticeActive,
  onToggleTonePractice,
  onDeactivatePracticeMic,
  detection,
  micError,
  micPermissionGranted,
  micStarting,
  target,
  onSetTarget,
  targetFrequency,
  referenceLabel,
  centsFromTarget,
  accuracy,
  feedbackLabel,
  historySamples,
  holdHistorySamples,
  instantAttempts,
  onClearInstantAttempts,
  holdTargetSeconds,
  onSetHoldTargetSeconds,
  holdCalibre,
  onSetHoldCalibre,
  octavasNoteDurationSeconds,
  onSetOctavasNoteDurationSeconds,
  octavasPitchMode,
  onSetOctavasPitchMode,
  octavasScaleRepetitions,
  onSetOctavasScaleRepetitions,
  celebrationKey,
  effectiveTarget,
  onSetRitmoToneEvaluation,
  onSetIntensidadEvaluation,
  ritmoPlaying,
  onToggleRitmoPlaying,
  ritmoMicActive,
  onToggleRitmoMic,
  onStopRhythm,
  ritmoBpm,
  onSetRitmoBpm,
  ritmoBeatPattern,
  ritmoPatternLength,
  ritmoBeatDurations,
  onSetRitmoPatternLength,
  onSetRitmoBeatDurationAtSlot,
  onSetRitmoBeatLevelAtSlot,
  ritmoTapTempoTapCount,
  onTapRitmoTempo,
  beatMarkers,
  ritmoVoiceSamples,
  intensidadVoiceSamples,
  voiceRms,
  melodiaPlaying,
  onToggleMelodiaPlaying,
  melodiaMicActive,
  onToggleMelodiaMic,
  melodiaBpm,
  onSetMelodiaBpm,
  melodiaPatternLength,
  onSetMelodiaPatternLength,
  melodiaBeatDuration,
  onSetMelodiaBeatDuration,
  melodiaNotePattern,
  onSetMelodiaNoteAtSlot,
  melodiaTapTempoTapCount,
  onTapMelodiaTempo,
  comboNotePattern,
  onSetComboNoteAtSlot,
  presentation = "modal",
}: EntrenadorVocalModalProps) {
  const [selectedModeId, setSelectedModeId] = useState<VozModeSlideId | null>(null);
  const [activeModeIndex, setActiveModeIndex] = useState(0);
  const [desktopHelpAction, setDesktopHelpAction] = useState<ReactNode>(null);
  const prevSlideIndexRef = useRef(activeModeIndex);
  const isPage = isToolPagePresentation(presentation);
  const isDesktop = useIsDesktop();

  const handleReturnToGrid = () => {
    onStopRhythm();
    stopOctaveReference();
    onDeactivatePracticeMic();
    onClearInstantAttempts();
    setSelectedModeId(null);
  };

  useEffect(() => {
    if (!open) {
      setSelectedModeId(null);
      setActiveModeIndex(0);
      prevSlideIndexRef.current = 0;
      onStopRhythm();
      stopOctaveReference();
      onDeactivatePracticeMic();
      return;
    }

    onClearInstantAttempts();
  }, [
    open,
    onStopRhythm,
    onDeactivatePracticeMic,
    onClearInstantAttempts,
  ]);

  useEffect(() => {
    if (selectedModeId !== null && isPage) {
      document.body.dataset.hideAppHeader = "true";
    } else {
      delete document.body.dataset.hideAppHeader;
    }
    return () => {
      delete document.body.dataset.hideAppHeader;
    };
  }, [selectedModeId, isPage]);

  useEffect(() => {
    if (!open || selectedModeId === null) {
      return;
    }

    const newIndex = VOZ_MODE_SLIDES.findIndex((s) => s.id === selectedModeId);
    if (newIndex >= 0 && newIndex !== activeModeIndex) {
      setActiveModeIndex(newIndex);
    }
  }, [selectedModeId, open, activeModeIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (prevSlideIndexRef.current !== activeModeIndex) {
      onStopRhythm();
      stopOctaveReference();
      onDeactivatePracticeMic();
      onClearInstantAttempts();
      prevSlideIndexRef.current = activeModeIndex;
    }
  }, [
    activeModeIndex,
    open,
    onStopRhythm,
    onDeactivatePracticeMic,
    onClearInstantAttempts,
  ]);

  if (!open && !isPage) {
    return null;
  }

  const objectiveLabel =
    referenceLabel ?? formatTargetLabel(target);

  const activeCard = selectedModeId
    ? VOZ_MODE_CARDS.find((c) => c.id === selectedModeId)
    : null;
  const showPortada =
    Boolean(micPermissionGranted) && !micError && selectedModeId === null;
  const bodyScrollClass =
    !micPermissionGranted || micError || showPortada || !isDesktop
      ? "touch-pan-y overflow-y-auto overscroll-y-contain"
      : "overflow-hidden";
  const bodyPadClass = isDesktop
    ? "px-4 py-4 lg:px-6 lg:py-5"
    : isPage
      ? `${TOOL_MODAL_MOBILE_GUTTER_CLASS} pb-24 pt-1.5`
      : `${TOOL_MODAL_MOBILE_GUTTER_CLASS} py-4`;

  return (
    <ToolPresentationRoot
      presentation={presentation}
      open={open}
      onClose={onClose}
      closeAriaLabel="Cerrar entrenador vocal"
      panelClassName={
        isPage
          ? ""
          : "relative z-10 tool-modal-panel-wide flex h-[min(92vh,780px)] flex-col overflow-hidden rounded-amplio border border-border bg-bg-cola-sheet shadow-xl"
      }
    >
      <ToolModalHeader
        titleId="entrenador-vocal-titulo"
        title={
          isDesktop
            ? undefined
            : selectedModeId && activeCard
              ? activeCard.label
              : "Entrenador Vocal"
        }
        density="default"
        accentVar="--accent-vocal"
        onBack={selectedModeId ? handleReturnToGrid : isPage ? onClose : undefined}
        backAriaLabel={selectedModeId ? "Volver a los modos" : "Volver a Herramientas"}
        headerContent={
          <div className="flex min-w-0 items-center gap-2">
            <h2
              id="entrenador-vocal-titulo"
              className="min-w-0 truncate text-lg font-extrabold text-inherit"
            >
              {selectedModeId && activeCard ? activeCard.label : "Entrenador Vocal"}
            </h2>
            {desktopHelpAction}
          </div>
        }
        closeAriaLabel="Cerrar entrenador vocal"
        onClose={onClose}
        showClose={!isPage}
        isPage={isPage}
      />

      <div
        className={`flex min-h-0 flex-1 flex-col vocal-ui ${bodyScrollClass} ${bodyPadClass}`}
        style={{
          ["--tool-practice-section-bg" as string]: "var(--bg-app)",
          ["--bg-cola-sheet" as string]: "var(--bg-app)",
          ["--tool-practice" as string]: "var(--accent-vocal)",
          ["--tool-practice-dim" as string]: "var(--accent-vocal-dim)",
          ["--voz-config" as string]: "var(--accent-vocal)",
          ["--voz-config-dim" as string]: "var(--accent-vocal-dim)",
          ["--ritmo-inactive-bar-bg" as string]: "var(--bg-darker)",
          ["--ritmo-inactive-bar-border" as string]: "1px solid var(--border)",
          ["--ritmo-active-bar-bg" as string]: "var(--accent-vocal)",
          ["--ritmo-active-bar-border" as string]: "1px solid var(--accent-vocal)",
        }}
      >
        {!micPermissionGranted || micError ? (
          <MicPermissionPanel
            micError={micError}
            micStarting={micStarting}
            onRequestMic={onRequestMic}
          />
        ) : showPortada ? (
          <div className="px-1">
            <VozModeSelectionGrid
              onSelectMode={(modeId) => setSelectedModeId(modeId)}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {micStarting ? <MicConnectingPanel /> : null}
            <VozModeSlides
              activeIndex={activeModeIndex}
              onChangeIndex={setActiveModeIndex}
              hideSwipeNav
              onDesktopHelpActionChange={setDesktopHelpAction}
              onHelpActionChange={setDesktopHelpAction}
              onSetRitmoToneEvaluation={onSetRitmoToneEvaluation}
              onSetIntensidadEvaluation={onSetIntensidadEvaluation}
              effectiveTarget={effectiveTarget}
              targetPicker={{
                target,
                onSetTarget,
              }}
              detection={detection}
              objectiveLabel={objectiveLabel}
              targetFrequency={targetFrequency}
              targetNote={target.note}
              centsFromTarget={centsFromTarget ?? 0}
              accuracy={accuracy}
              feedbackLabel={feedbackLabel}
              instantAttempts={instantAttempts}
              historySamples={historySamples}
              holdHistorySamples={holdHistorySamples}
              holdTargetSeconds={holdTargetSeconds}
              onSetHoldTargetSeconds={onSetHoldTargetSeconds}
              holdCalibre={holdCalibre}
              onSetHoldCalibre={onSetHoldCalibre}
              octavasNoteDurationSeconds={octavasNoteDurationSeconds}
              onSetOctavasNoteDurationSeconds={onSetOctavasNoteDurationSeconds}
              octavasPitchMode={octavasPitchMode}
              onSetOctavasPitchMode={onSetOctavasPitchMode}
              octavasScaleRepetitions={octavasScaleRepetitions}
              onSetOctavasScaleRepetitions={onSetOctavasScaleRepetitions}
              celebrationKey={celebrationKey}
              tonePracticeActive={tonePracticeActive}
              onToggleTonePractice={onToggleTonePractice}
              micStarting={micStarting}
              ritmoPlaying={ritmoPlaying}
              onToggleRitmoPlaying={onToggleRitmoPlaying}
              ritmoMicActive={ritmoMicActive}
              onToggleRitmoMic={onToggleRitmoMic}
              ritmoBpm={ritmoBpm}
              onSetRitmoBpm={onSetRitmoBpm}
              ritmoBeatPattern={ritmoBeatPattern}
              ritmoPatternLength={ritmoPatternLength}
              onSetRitmoPatternLength={onSetRitmoPatternLength}
              ritmoBeatDurations={ritmoBeatDurations}
              onSetRitmoBeatDurationAtSlot={onSetRitmoBeatDurationAtSlot}
              onSetRitmoBeatLevelAtSlot={onSetRitmoBeatLevelAtSlot}
              ritmoTapTempoTapCount={ritmoTapTempoTapCount}
              onTapRitmoTempo={onTapRitmoTempo}
              beatMarkers={beatMarkers}
              ritmoVoiceSamples={ritmoVoiceSamples}
              intensidadVoiceSamples={intensidadVoiceSamples}
              voiceRms={voiceRms}
              melodiaPlaying={melodiaPlaying}
              onToggleMelodiaPlaying={onToggleMelodiaPlaying}
              melodiaMicActive={melodiaMicActive}
              onToggleMelodiaMic={onToggleMelodiaMic}
              melodiaBpm={melodiaBpm}
              onSetMelodiaBpm={onSetMelodiaBpm}
              melodiaPatternLength={melodiaPatternLength}
              onSetMelodiaPatternLength={onSetMelodiaPatternLength}
              melodiaBeatDuration={melodiaBeatDuration}
              onSetMelodiaBeatDuration={onSetMelodiaBeatDuration}
              melodiaNotePattern={melodiaNotePattern}
              onSetMelodiaNoteAtSlot={onSetMelodiaNoteAtSlot}
              melodiaTapTempoTapCount={melodiaTapTempoTapCount}
              onTapMelodiaTempo={onTapMelodiaTempo}
              comboNotePattern={comboNotePattern}
              onSetComboNoteAtSlot={onSetComboNoteAtSlot}
            />
          </div>
        )}
      </div>
    </ToolPresentationRoot>
  );
}
