"use client";

import AfinadorLayer from "@/components/ui/AfinadorLayer";
import CifradoEditor from "@/components/ui/CifradoEditor";
import CompositorModal from "@/components/ui/CompositorModal";
import EntrenadorVocalModal from "@/components/ui/EntrenadorVocalModal";
import MetronomoModal from "@/components/ui/MetronomoModal";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useCompositor } from "@/hooks/useCompositor";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useMetronomo } from "@/hooks/useMetronomo";
import { useVoz } from "@/hooks/useVoz";
import { dispatchCancioneroSyncFinished } from "@/lib/offline/cancionero-events";
import { syncCancioneroLocal } from "@/lib/offline/cancionero-sync";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useMemo } from "react";

export type CancioneroHubToolsLayerProps = {
  isLoggedIn: boolean;
  online: boolean;
  afinadorOpen: boolean;
  metronomoOpen: boolean;
  vozOpen: boolean;
  compositorOpen: boolean;
  editorOpen: boolean;
  onAfinadorOpenChange: (open: boolean) => void;
  onMetronomoOpenChange: (open: boolean) => void;
  onVozOpenChange: (open: boolean) => void;
  onCompositorOpenChange: (open: boolean) => void;
  onEditorOpenChange: (open: boolean) => void;
  onGlobalCountRefresh: () => Promise<void>;
};

export default function CancioneroHubToolsLayer({
  isLoggedIn,
  online,
  afinadorOpen,
  metronomoOpen,
  vozOpen,
  compositorOpen,
  editorOpen,
  onAfinadorOpenChange,
  onMetronomoOpenChange,
  onVozOpenChange,
  onCompositorOpenChange,
  onEditorOpenChange,
  onGlobalCountRefresh,
}: CancioneroHubToolsLayerProps) {
  const supabase = useMemo(() => createClient(), []);
  const compositor = useCompositor();
  const {
    bpm: metronomoBpm,
    isPlaying: metronomoIsPlaying,
    beatPattern: metronomoBeatPattern,
    patternLength: metronomoPatternLength,
    beatDurations: metronomoBeatDurations,
    currentBeat: metronomoCurrentBeat,
    micActivo: metronomoMicActivo,
    micPermissionGranted: metronomoMicPermissionGranted,
    micError: metronomoMicError,
    micReady: metronomoMicReady,
    micStarting: metronomoMicStarting,
    hits: metronomoHits,
    beatMarkers: metronomoBeatMarkers,
    start: startMetronomo,
    stop: stopMetronomo,
    setBpm: setMetronomoBpm,
    setPatternLength: setMetronomoPatternLength,
    setBeatDurationAtSlot: setMetronomoBeatDurationAtSlot,
    setBeatLevelAtSlot: setMetronomoBeatLevelAtSlot,
    tapTempo: tapMetronomoTempo,
    tapTempoTapCount: metronomoTapTempoTapCount,
    toggleMic: toggleMetronomoMic,
    requestMic: requestMetronomoMic,
  } = useMetronomo();
  const {
    detection: vozDetection,
    micError: vozMicError,
    micPermissionGranted: vozMicPermissionGranted,
    micStarting: vozMicStarting,
    target: vozTarget,
    setTarget: setVozTarget,
    targetFrequency: vozTargetFrequency,
    referenceLabel: vozReferenceLabel,
    centsFromTarget: vozCentsFromTarget,
    accuracy: vozAccuracy,
    feedbackLabel: vozFeedbackLabel,
    historySamples: vozHistorySamples,
    instantAttempts: vozInstantAttempts,
    clearInstantAttempts: clearVozInstantAttempts,
    holdTargetSeconds: vozHoldTargetSeconds,
    setHoldTargetSeconds: setVozHoldTargetSeconds,
    holdCalibre: vozHoldCalibre,
    setHoldCalibre: setVozHoldCalibre,
    octavasNoteDurationSeconds: vozOctavasNoteDurationSeconds,
    setOctavasNoteDurationSeconds: setVozOctavasNoteDurationSeconds,
    octavasPitchMode: vozOctavasPitchMode,
    setOctavasPitchMode: setVozOctavasPitchMode,
    octavasScaleRepetitions: vozOctavasScaleRepetitions,
    setOctavasScaleRepetitions: setVozOctavasScaleRepetitions,
    celebrationKey: vozCelebrationKey,
    ritmoPlaying: vozRitmoPlaying,
    toggleRitmoPlaying: toggleVozRitmoPlaying,
    ritmoMicActive: vozRitmoMicActive,
    toggleRitmoMic: toggleVozRitmoMic,
    stopRitmo: stopVozRitmo,
    ritmoBpm: vozRitmoBpm,
    setRitmoBpm: setVozRitmoBpm,
    ritmoBeatPattern: vozRitmoBeatPattern,
    ritmoPatternLength: vozRitmoPatternLength,
    ritmoBeatDurations: vozRitmoBeatDurations,
    setRitmoPatternLength: setVozRitmoPatternLength,
    setRitmoBeatDurationAtSlot: setVozRitmoBeatDurationAtSlot,
    setRitmoBeatLevelAtSlot: setVozRitmoBeatLevelAtSlot,
    ritmoTapTempoTapCount: vozRitmoTapTempoTapCount,
    tapRitmoTempo: tapVozRitmoTempo,
    beatMarkers: vozBeatMarkers,
    ritmoVoiceSamples: vozRitmoVoiceSamples,
    dinamicaVoiceSamples: vozDinamicaVoiceSamples,
    voiceRms: vozVoiceRms,
    effectiveTarget: vozEffectiveTarget,
    setRitmoToneEvaluation: setVozRitmoToneEvaluation,
    setDynamicsEvaluation: setVozDynamicsEvaluation,
    melodiaPlaying: vozMelodiaPlaying,
    toggleMelodiaPlaying: toggleVozMelodiaPlaying,
    melodiaMicActive: vozMelodiaMicActive,
    toggleMelodiaMic: toggleVozMelodiaMic,
    melodiaBpm: vozMelodiaBpm,
    setMelodiaBpm: setVozMelodiaBpm,
    melodiaPatternLength: vozMelodiaPatternLength,
    setMelodiaPatternLength: setVozMelodiaPatternLength,
    melodiaBeatDuration: vozMelodiaBeatDuration,
    setMelodiaBeatDuration: setVozMelodiaBeatDuration,
    melodiaNotePattern: vozMelodiaNotePattern,
    setMelodiaNoteAtSlot: setVozMelodiaNoteAtSlot,
    melodiaTapTempoTapCount: vozMelodiaTapTempoTapCount,
    tapMelodiaTempo: tapVozMelodiaTempo,
    comboNotePattern: vozComboNotePattern,
    setComboNoteAtSlot: setVozComboNoteAtSlot,
    requestPermission: requestVozMicPermission,
    tonePracticeActive: vozTonePracticeActive,
    toggleTonePractice: toggleVozTonePractice,
    stopTonePractice: stopVozTonePractice,
    stop: stopVoz,
  } = useVoz();

  const toolModalOpen =
    afinadorOpen || metronomoOpen || vozOpen || compositorOpen || editorOpen;

  useBodyScrollLock(toolModalOpen);

  useHardwareBack(metronomoOpen, () => {
    stopMetronomo();
    onMetronomoOpenChange(false);
  });

  useHardwareBack(vozOpen, () => {
    stopVoz();
    onVozOpenChange(false);
  });

  useHardwareBack(compositorOpen, () => {
    compositor.stop();
    onCompositorOpenChange(false);
  });

  useHardwareBack(editorOpen, () => {
    onEditorOpenChange(false);
  });

  const handleEditorSaved = useCallback(async () => {
    if (online) {
      try {
        await syncCancioneroLocal(supabase, { force: true });
      } catch {
        // El listado se refrescará en la próxima sync automática.
      }
    }

    dispatchCancioneroSyncFinished();
    await onGlobalCountRefresh();
  }, [online, onGlobalCountRefresh, supabase]);

  return (
    <>
      <AfinadorLayer
        open={afinadorOpen}
        onOpenChange={onAfinadorOpenChange}
      />

      <EntrenadorVocalModal
        open={vozOpen}
        detection={vozDetection}
        micError={vozMicError}
        micPermissionGranted={vozMicPermissionGranted}
        micStarting={vozMicStarting}
        target={vozTarget}
        onSetTarget={setVozTarget}
        targetFrequency={vozTargetFrequency}
        referenceLabel={vozReferenceLabel}
        centsFromTarget={vozCentsFromTarget}
        accuracy={vozAccuracy}
        feedbackLabel={vozFeedbackLabel}
        historySamples={vozHistorySamples}
        instantAttempts={vozInstantAttempts}
        onClearInstantAttempts={clearVozInstantAttempts}
        holdTargetSeconds={vozHoldTargetSeconds}
        onSetHoldTargetSeconds={setVozHoldTargetSeconds}
        holdCalibre={vozHoldCalibre}
        onSetHoldCalibre={setVozHoldCalibre}
        octavasNoteDurationSeconds={vozOctavasNoteDurationSeconds}
        onSetOctavasNoteDurationSeconds={setVozOctavasNoteDurationSeconds}
        octavasPitchMode={vozOctavasPitchMode}
        onSetOctavasPitchMode={setVozOctavasPitchMode}
        octavasScaleRepetitions={vozOctavasScaleRepetitions}
        onSetOctavasScaleRepetitions={setVozOctavasScaleRepetitions}
        celebrationKey={vozCelebrationKey}
        effectiveTarget={vozEffectiveTarget}
        onSetRitmoToneEvaluation={setVozRitmoToneEvaluation}
        onSetDynamicsEvaluation={setVozDynamicsEvaluation}
        ritmoPlaying={vozRitmoPlaying}
        onToggleRitmoPlaying={toggleVozRitmoPlaying}
        ritmoMicActive={vozRitmoMicActive}
        onToggleRitmoMic={toggleVozRitmoMic}
        onStopRhythm={stopVozRitmo}
        ritmoBpm={vozRitmoBpm}
        onSetRitmoBpm={setVozRitmoBpm}
        ritmoBeatPattern={vozRitmoBeatPattern}
        ritmoPatternLength={vozRitmoPatternLength}
        ritmoBeatDurations={vozRitmoBeatDurations}
        onSetRitmoPatternLength={setVozRitmoPatternLength}
        onSetRitmoBeatDurationAtSlot={setVozRitmoBeatDurationAtSlot}
        onSetRitmoBeatLevelAtSlot={setVozRitmoBeatLevelAtSlot}
        ritmoTapTempoTapCount={vozRitmoTapTempoTapCount}
        onTapRitmoTempo={tapVozRitmoTempo}
        beatMarkers={vozBeatMarkers}
        ritmoVoiceSamples={vozRitmoVoiceSamples}
        dinamicaVoiceSamples={vozDinamicaVoiceSamples}
        voiceRms={vozVoiceRms}
        melodiaPlaying={vozMelodiaPlaying}
        onToggleMelodiaPlaying={toggleVozMelodiaPlaying}
        melodiaMicActive={vozMelodiaMicActive}
        onToggleMelodiaMic={toggleVozMelodiaMic}
        melodiaBpm={vozMelodiaBpm}
        onSetMelodiaBpm={setVozMelodiaBpm}
        melodiaPatternLength={vozMelodiaPatternLength}
        onSetMelodiaPatternLength={setVozMelodiaPatternLength}
        melodiaBeatDuration={vozMelodiaBeatDuration}
        onSetMelodiaBeatDuration={setVozMelodiaBeatDuration}
        melodiaNotePattern={vozMelodiaNotePattern}
        onSetMelodiaNoteAtSlot={setVozMelodiaNoteAtSlot}
        melodiaTapTempoTapCount={vozMelodiaTapTempoTapCount}
        onTapMelodiaTempo={tapVozMelodiaTempo}
        comboNotePattern={vozComboNotePattern}
        onSetComboNoteAtSlot={setVozComboNoteAtSlot}
        onRequestMic={() => void requestVozMicPermission()}
        tonePracticeActive={vozTonePracticeActive}
        onToggleTonePractice={toggleVozTonePractice}
        onStopTonePractice={stopVozTonePractice}
        onClose={() => {
          stopVoz();
          onVozOpenChange(false);
        }}
      />

      <MetronomoModal
        open={metronomoOpen}
        bpm={metronomoBpm}
        isPlaying={metronomoIsPlaying}
        beatPattern={metronomoBeatPattern}
        patternLength={metronomoPatternLength}
        beatDurations={metronomoBeatDurations}
        currentBeat={metronomoCurrentBeat}
        micActivo={metronomoMicActivo}
        micPermissionGranted={metronomoMicPermissionGranted}
        micError={metronomoMicError}
        micReady={metronomoMicReady}
        micStarting={metronomoMicStarting}
        hits={metronomoHits}
        beatMarkers={metronomoBeatMarkers}
        onStart={startMetronomo}
        onStop={stopMetronomo}
        onSetBpm={setMetronomoBpm}
        onSetPatternLength={setMetronomoPatternLength}
        onSetBeatDurationAtSlot={setMetronomoBeatDurationAtSlot}
        onSetBeatLevelAtSlot={setMetronomoBeatLevelAtSlot}
        onTapTempo={tapMetronomoTempo}
        tapTempoTapCount={metronomoTapTempoTapCount}
        onToggleMic={toggleMetronomoMic}
        onRequestMic={() => void requestMetronomoMic()}
        onClose={() => {
          stopMetronomo();
          onMetronomoOpenChange(false);
        }}
      />

      <CompositorModal
        open={compositorOpen}
        onClose={() => onCompositorOpenChange(false)}
        {...compositor}
      />

      <CifradoEditor
        open={editorOpen}
        isLoggedIn={isLoggedIn}
        onClose={() => onEditorOpenChange(false)}
        onSaved={() => void handleEditorSaved()}
      />
    </>
  );
}
