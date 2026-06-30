"use client";

import { VozModeSlides } from "@/components/ui/entrenador-vocal/VozModeSlides";
import { TapButton } from "@/components/ui/TapFeedback";
import type { NoteDetection } from "@/lib/afinador";
import {
  formatTargetLabel,
  type VozAccuracy,
  type VozHistorySample,
  type VozInstantAttempt,
  type VozTarget,
} from "@/lib/voz";
import type {
  VozRitmoBeatMarker,
  VozRitmoVoiceSample,
} from "@/lib/voz-ritmo";
import { Mic, X } from "lucide-react";
import { useEffect, useState } from "react";

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
  celebrationKey: number;
  ritmoPlaying: boolean;
  onToggleRitmoPlaying: () => void;
  onStopRitmo: () => void;
  ritmoBpm: number;
  onSetRitmoBpm: (value: number) => void;
  singBeats: number;
  onSetSingBeats: (value: number) => void;
  restBeats: number;
  onSetRestBeats: (value: number) => void;
  beatMarkers: VozRitmoBeatMarker[];
  ritmoVoiceSamples: VozRitmoVoiceSample[];
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
  celebrationKey,
  ritmoPlaying,
  onToggleRitmoPlaying,
  onStopRitmo,
  ritmoBpm,
  onSetRitmoBpm,
  singBeats,
  onSetSingBeats,
  restBeats,
  onSetRestBeats,
  beatMarkers,
  ritmoVoiceSamples,
}: EntrenadorVocalModalProps) {
  const [activeModeIndex, setActiveModeIndex] = useState(0);
  const [ritmoEvaluarTono, setRitmoEvaluarTono] = useState(false);

  useEffect(() => {
    if (!open) {
      setActiveModeIndex(0);
      setRitmoEvaluarTono(false);
    }
  }, [open]);

  useEffect(() => {
    if (activeModeIndex < 2) {
      onStopRitmo();
    }
  }, [activeModeIndex, onStopRitmo]);

  if (!open) {
    return null;
  }

  const objectiveLabel =
    referenceLabel ?? formatTargetLabel(target, octaveExact);

  return (
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
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      >
        <header className="shrink-0 border-b border-border bg-bg-dark px-4 py-3">
          <div className="flex items-center gap-3">
            <h2
              id="entrenador-vocal-titulo"
              className="min-w-0 flex-1 text-lg font-extrabold text-accent"
            >
              Entrenador Vocal
            </h2>
            <button
              type="button"
              aria-label="Cerrar entrenador vocal"
              onClick={onClose}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              <X className="size-5 text-text-primary" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-5">
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
              celebrationKey={celebrationKey}
              ritmoPlaying={ritmoPlaying}
              onToggleRitmoPlaying={onToggleRitmoPlaying}
              ritmoBpm={ritmoBpm}
              onSetRitmoBpm={onSetRitmoBpm}
              singBeats={singBeats}
              onSetSingBeats={onSetSingBeats}
              restBeats={restBeats}
              onSetRestBeats={onSetRestBeats}
              beatMarkers={beatMarkers}
              ritmoVoiceSamples={ritmoVoiceSamples}
              ritmoEvaluarTono={ritmoEvaluarTono}
              onSetRitmoEvaluarTono={setRitmoEvaluarTono}
            />
          )}
        </div>
      </div>
    </div>
  );
}
