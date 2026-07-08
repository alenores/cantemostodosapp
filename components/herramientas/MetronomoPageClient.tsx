"use client";

import MetronomoModal from "@/components/ui/MetronomoModal";
import { useMetronomo } from "@/hooks/useMetronomo";
import { useEffect } from "react";

export default function MetronomoPageClient() {
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
        onClose={() => {}}
      />
    </div>
  );
}
