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
import { ToolModalHeader } from "@/components/ui/ToolModalHeader";
import { Mic } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { VOZ_MODE_SLIDES } from "@/components/ui/entrenador-vocal/VozModeSlides";

type EntrenadorVocalModalProps = {
  open: boolean;
  onClose: () => void;
  onRequestMic: () => void;
  detection: NoteDetection | null;
  micError: string | null;
  micPermissionGranted: boolean;
  micReady: boolean;
  micStarting: boolean;
  target: VozTarget;
  onSetTarget: (target: VozTarget) => void;
  octaveExact: boolean;
  onSetOctaveExact: (value: boolean) => void;
  targetFrequency: number | null;
  referenceLabel: string | null;
  centsFromTarget: number | null;
  accuracy: VozAccuracy;
  feedbackLabel: string;
  historySamples: VozHistorySample[];
  instantAttempts: VozInstantAttempt[];
  holdTargetSeconds: number;
  onSetHoldTargetSeconds: (value: number) => void;
  holdCalibre: VozCalibre;
  onSetHoldCalibre: (value: VozCalibre) => void;
  celebrationKey: number;
  effectiveTarget: VozTarget;
  onSetRitmoToneEvaluation: (mode: RitmoToneEvaluation) => void;
  ritmoPlaying: boolean;
  onToggleRitmoPlaying: () => void;
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
  melodiaPlaying: boolean;
  onToggleMelodiaPlaying: () => void;
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
    <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-border bg-bg-card">
        <Mic className="size-8 text-accent" aria-hidden="true" />
      </div>
      <p className="text-sm text-text-muted">Conectando micrófono...</p>
    </div>
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
    <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-border bg-bg-card">
        <Mic className="size-8 text-accent" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <p className="text-base font-semibold text-text-primary">
          Acceso al micrófono
        </p>
        <p className="text-sm text-text-muted">
          Para escuchar tu voz y compararla con la nota objetivo, necesitamos
          el micrófono. Tocá el botón y aceptá el permiso cuando el navegador
          te lo pida.
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

const RHYTHM_SLIDE_IDS = new Set([
  "melodia",
  "ritmo",
  "ritmo-nota",
  "combo",
]);

export default function EntrenadorVocalModal({
  open,
  onClose,
  onRequestMic,
  detection,
  micError,
  micPermissionGranted,
  micReady,
  micStarting,
  target,
  onSetTarget,
  octaveExact,
  onSetOctaveExact,
  targetFrequency,
  referenceLabel,
  centsFromTarget,
  accuracy,
  feedbackLabel,
  historySamples,
  instantAttempts,
  holdTargetSeconds,
  onSetHoldTargetSeconds,
  holdCalibre,
  onSetHoldCalibre,
  celebrationKey,
  effectiveTarget,
  onSetRitmoToneEvaluation,
  ritmoPlaying,
  onToggleRitmoPlaying,
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
  melodiaPlaying,
  onToggleMelodiaPlaying,
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

  useEffect(() => {
    if (!open) {
      setActiveModeIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const slideId = VOZ_MODE_SLIDES[activeModeIndex]?.id;

    if (!slideId || !RHYTHM_SLIDE_IDS.has(slideId)) {
      onStopRhythm();
    }
  }, [activeModeIndex, onStopRhythm]);

  if (!open) {
    return null;
  }

  const objectiveLabel =
    referenceLabel ?? formatTargetLabel(target, octaveExact);

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
        className="relative z-10 flex h-[min(92vh,780px)] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      >
        <ToolModalHeader
          titleId="entrenador-vocal-titulo"
          title="Entrenador Vocal"
          closeAriaLabel="Cerrar entrenador vocal"
          onClose={onClose}
        />

        <div className="flex min-h-0 flex-1 flex-col items-center touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-5">
          {!micReady ? (
            !micPermissionGranted || micError ? (
              <MicPermissionPanel
                micError={micError}
                micStarting={micStarting}
                onRequestMic={onRequestMic}
              />
            ) : (
              <MicConnectingPanel />
            )
          ) : (
            <VozModeSlides
              activeIndex={activeModeIndex}
              onChangeIndex={setActiveModeIndex}
              onSetRitmoToneEvaluation={onSetRitmoToneEvaluation}
              effectiveTarget={effectiveTarget}
              targetPicker={{
                target,
                onSetTarget,
                octaveExact,
                onSetOctaveExact,
              }}
              detection={detection}
              objectiveLabel={objectiveLabel}
              targetFrequency={targetFrequency}
              octaveExact={octaveExact}
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
              celebrationKey={celebrationKey}
              ritmoPlaying={ritmoPlaying}
              onToggleRitmoPlaying={onToggleRitmoPlaying}
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
              melodiaPlaying={melodiaPlaying}
              onToggleMelodiaPlaying={onToggleMelodiaPlaying}
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
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
