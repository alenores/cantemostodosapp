"use client";

import EntrenadorVocalModal from "@/components/ui/EntrenadorVocalModal";
import { useVoz } from "@/hooks/useVoz";
import { useEffect } from "react";

export default function EntrenadorVocalPageClient() {
  const voz = useVoz();

  const { stop } = voz;

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <EntrenadorVocalModal
        open
        presentation="page"
        detection={voz.detection}
        micError={voz.micError}
        micPermissionGranted={voz.micPermissionGranted}
        micStarting={voz.micStarting}
        target={voz.target}
        onSetTarget={voz.setTarget}
        targetFrequency={voz.targetFrequency}
        referenceLabel={voz.referenceLabel}
        centsFromTarget={voz.centsFromTarget}
        accuracy={voz.accuracy}
        feedbackLabel={voz.feedbackLabel}
        historySamples={voz.historySamples}
        holdHistorySamples={voz.holdHistorySamples}
        instantAttempts={voz.instantAttempts}
        onClearInstantAttempts={voz.clearInstantAttempts}
        holdTargetSeconds={voz.holdTargetSeconds}
        onSetHoldTargetSeconds={voz.setHoldTargetSeconds}
        holdCalibre={voz.holdCalibre}
        onSetHoldCalibre={voz.setHoldCalibre}
        octavasNoteDurationSeconds={voz.octavasNoteDurationSeconds}
        onSetOctavasNoteDurationSeconds={voz.setOctavasNoteDurationSeconds}
        octavasPitchMode={voz.octavasPitchMode}
        onSetOctavasPitchMode={voz.setOctavasPitchMode}
        octavasScaleRepetitions={voz.octavasScaleRepetitions}
        onSetOctavasScaleRepetitions={voz.setOctavasScaleRepetitions}
        celebrationKey={voz.celebrationKey}
        effectiveTarget={voz.effectiveTarget}
        onSetRitmoToneEvaluation={voz.setRitmoToneEvaluation}
        onSetIntensidadEvaluation={voz.setIntensidadEvaluation}
        ritmoPlaying={voz.ritmoPlaying}
        onToggleRitmoPlaying={voz.toggleRitmoPlaying}
        ritmoMicActive={voz.ritmoMicActive}
        onToggleRitmoMic={voz.toggleRitmoMic}
        onStopRhythm={voz.stopRitmo}
        ritmoBpm={voz.ritmoBpm}
        onSetRitmoBpm={voz.setRitmoBpm}
        ritmoBeatPattern={voz.ritmoBeatPattern}
        ritmoPatternLength={voz.ritmoPatternLength}
        ritmoBeatDurations={voz.ritmoBeatDurations}
        onSetRitmoPatternLength={voz.setRitmoPatternLength}
        onSetRitmoBeatDurationAtSlot={voz.setRitmoBeatDurationAtSlot}
        onSetRitmoBeatLevelAtSlot={voz.setRitmoBeatLevelAtSlot}
        ritmoTapTempoTapCount={voz.ritmoTapTempoTapCount}
        onTapRitmoTempo={voz.tapRitmoTempo}
        beatMarkers={voz.beatMarkers}
        ritmoVoiceSamples={voz.ritmoVoiceSamples}
        intensidadVoiceSamples={voz.intensidadVoiceSamples}
        voiceRms={voz.voiceRms}
        melodiaPlaying={voz.melodiaPlaying}
        onToggleMelodiaPlaying={voz.toggleMelodiaPlaying}
        melodiaMicActive={voz.melodiaMicActive}
        onToggleMelodiaMic={voz.toggleMelodiaMic}
        melodiaBpm={voz.melodiaBpm}
        onSetMelodiaBpm={voz.setMelodiaBpm}
        melodiaPatternLength={voz.melodiaPatternLength}
        onSetMelodiaPatternLength={voz.setMelodiaPatternLength}
        melodiaBeatDuration={voz.melodiaBeatDuration}
        onSetMelodiaBeatDuration={voz.setMelodiaBeatDuration}
        melodiaNotePattern={voz.melodiaNotePattern}
        onSetMelodiaNoteAtSlot={voz.setMelodiaNoteAtSlot}
        melodiaTapTempoTapCount={voz.melodiaTapTempoTapCount}
        onTapMelodiaTempo={voz.tapMelodiaTempo}
        comboNotePattern={voz.comboNotePattern}
        onSetComboNoteAtSlot={voz.setComboNoteAtSlot}
        onRequestMic={() => void voz.requestPermission()}
        tonePracticeActive={voz.tonePracticeActive}
        onToggleTonePractice={voz.toggleTonePractice}
        onDeactivatePracticeMic={voz.deactivatePracticeMic}
        onClose={() => {
          voz.stop();
        }}
      />
    </div>
  );
}
