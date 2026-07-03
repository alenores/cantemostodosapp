"use client";

import { VozModeSlides } from "@/components/ui/entrenador-vocal/VozModeSlides";
import { TapButton } from "@/components/ui/TapFeedback";
import type { NoteDetection } from "@/lib/afinador";
import type { RitmoToneEvaluation } from "@/hooks/useVoz";
import {
  formatTargetLabel,
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
import type { VozDinamicaVoiceSample } from "@/lib/voz-dinamica";
import { ToolModalHeader } from "@/components/ui/ToolModalHeader";
import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type EntrenadorVocalModalProps = {
  open: boolean;
  onClose: () => void;
  onRequestMic: () => void;
  tonePracticeActive: boolean;
  onToggleTonePractice: () => void;
  onStopTonePractice: () => void;
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
  onSetDynamicsEvaluation: (value: boolean) => void;
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
  dinamicaVoiceSamples: VozDinamicaVoiceSample[];
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
  onStopTonePractice,
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
  onSetDynamicsEvaluation,
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
  dinamicaVoiceSamples,
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
}: EntrenadorVocalModalProps) {
  const [activeModeIndex, setActiveModeIndex] = useState(0);
  const prevSlideIndexRef = useRef(activeModeIndex);

  useEffect(() => {
    if (!open) {
      setActiveModeIndex(0);
      prevSlideIndexRef.current = 0;
      onStopRhythm();
      onStopTonePractice();
      return;
    }

    onClearInstantAttempts();
  }, [open, onStopRhythm, onStopTonePractice, onClearInstantAttempts]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (prevSlideIndexRef.current !== activeModeIndex) {
      onStopRhythm();
      onStopTonePractice();
      onClearInstantAttempts();
      prevSlideIndexRef.current = activeModeIndex;
    }
  }, [
    activeModeIndex,
    open,
    onStopRhythm,
    onStopTonePractice,
    onClearInstantAttempts,
  ]);

  if (!open) {
    return null;
  }

  const objectiveLabel =
    referenceLabel ?? formatTargetLabel(target);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6">
      <button
        type="button"
        aria-label="Cerrar entrenador vocal"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="entrenador-vocal-titulo"
        className="relative z-10 flex h-[min(92vh,780px)] w-full max-w-lg flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      >
        <ToolModalHeader
          titleId="entrenador-vocal-titulo"
          title="Entrenador Vocal"
          closeAriaLabel="Cerrar entrenador vocal"
          onClose={onClose}
        />

        <div className="flex min-h-0 flex-1 flex-col items-stretch touch-pan-y overflow-y-auto overscroll-y-contain px-3 py-4">
          {!micPermissionGranted || micError ? (
            <MicPermissionPanel
              micError={micError}
              micStarting={micStarting}
              onRequestMic={onRequestMic}
            />
          ) : (
            <>
              {micStarting ? <MicConnectingPanel /> : null}
              <VozModeSlides
                activeIndex={activeModeIndex}
                onChangeIndex={setActiveModeIndex}
                onSetRitmoToneEvaluation={onSetRitmoToneEvaluation}
                onSetDynamicsEvaluation={onSetDynamicsEvaluation}
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
                dinamicaVoiceSamples={dinamicaVoiceSamples}
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
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
