"use client";

import MetronomoModal from "@/components/ui/MetronomoModal";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { useMetronomo } from "@/hooks/useMetronomo";
import { useCallback, useEffect } from "react";

export default function MetronomoPageClient() {
  const navigateWithProgress = useNavigateWithProgress();
  const {
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
    start,
    stop,
    setBpm,
    setPatternLength,
    setBeatDurationAtSlot,
    setBeatLevelAtSlot,
    cycleBeatPatternSlot,
    tapTempo,
    tapTempoTapCount,
    toggleMic,
    requestMic,
  } = useMetronomo();

  const handleClose = useCallback(() => {
    stop();
    navigateWithProgress("/practica");
  }, [stop, navigateWithProgress]);

  useHardwareBack(true, handleClose);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <MetronomoModal
        open
        presentation="page"
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
        onStart={start}
        onStop={stop}
        onSetBpm={setBpm}
        onSetPatternLength={setPatternLength}
        onSetBeatDurationAtSlot={setBeatDurationAtSlot}
        onSetBeatLevelAtSlot={setBeatLevelAtSlot}
        onCycleBeatPatternSlot={cycleBeatPatternSlot}
        onTapTempo={tapTempo}
        onToggleMic={toggleMic}
        onRequestMic={() => void requestMic()}
        onClose={handleClose}
      />
    </div>
  );
}
