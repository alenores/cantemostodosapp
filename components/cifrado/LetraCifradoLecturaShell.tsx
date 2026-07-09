"use client";

import CifradoLecturaSidePanel from "@/components/cifrado/CifradoLecturaSidePanel";
import LetraCifradoPanel from "@/components/cifrado/LetraCifradoPanel";
import { useCifradoPlayback } from "@/hooks/useCifradoPlayback";
import type { CancionCifradoDetalle } from "@/types";
import { useEffect, type CSSProperties, type RefObject } from "react";

export type LecturaCompasPlaybackState = {
  hasCompases: boolean;
  playing: boolean;
  canPlay: boolean;
  bpm: number;
  toggle: () => void;
  decreaseBpm: () => void;
  increaseBpm: () => void;
};

type LetraCifradoLecturaShellProps = {
  detalle: CancionCifradoDetalle;
  scrollRef: RefObject<HTMLDivElement | null>;
  scrollEndPadding: string;
  letraZoomStyle?: CSSProperties;
  compasesOcultos?: boolean;
  onToggleCompasesOcultos?: () => void;
  onCompasPlaybackStateChange?: (state: LecturaCompasPlaybackState | null) => void;
};

export default function LetraCifradoLecturaShell({
  detalle,
  scrollRef,
  scrollEndPadding,
  letraZoomStyle,
  compasesOcultos = false,
  onToggleCompasesOcultos,
  onCompasPlaybackStateChange,
}: LetraCifradoLecturaShellProps) {
  const compasConfig = detalle.compas_config;
  const hasCompases = Boolean(compasConfig?.barras?.length);
  const showCompasMarcadores = hasCompases && !compasesOcultos;

  const playback = useCifradoPlayback({
    detalle,
    scrollRef,
    enabled: hasCompases,
  });

  useEffect(() => {
    if (compasesOcultos && playback.playing) {
      playback.handleTogglePlayback();
    }
  }, [compasesOcultos, playback.playing, playback.handleTogglePlayback]);

  useEffect(() => {
    if (!onCompasPlaybackStateChange) {
      return;
    }

    if (!hasCompases) {
      onCompasPlaybackStateChange(null);
      return;
    }

    onCompasPlaybackStateChange({
      hasCompases: true,
      playing: playback.playing,
      canPlay: playback.canPlay,
      bpm: playback.bpm,
      toggle: playback.handleTogglePlayback,
      decreaseBpm: () =>
        playback.handleBpmChange(Math.max(40, playback.bpm - 1)),
      increaseBpm: () =>
        playback.handleBpmChange(Math.min(240, playback.bpm + 1)),
    });
  }, [
    hasCompases,
    onCompasPlaybackStateChange,
    playback.bpm,
    playback.canPlay,
    playback.handleTogglePlayback,
    playback.handleBpmChange,
    playback.playing,
  ]);

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col lg:flex-row">
      <CifradoLecturaSidePanel
        hasCompases={hasCompases}
        compasesOcultos={compasesOcultos}
        playing={playback.playing}
        canPlay={playback.canPlay}
        notacion={playback.notacion}
        tonalidadIndex={playback.tonalidadIndex}
        modoTonal={playback.modoTonal}
        bpm={playback.bpm}
        tapCount={playback.tapCount}
        onTogglePlayback={playback.handleTogglePlayback}
        onToggleCompasesOcultos={onToggleCompasesOcultos}
        onNotacionChange={playback.handleNotacionChange}
        onTonalidadChange={playback.handleTonalidadChange}
        onModoTonalChange={playback.handleModoTonalChange}
        onBpmChange={playback.handleBpmChange}
        onTapTempo={playback.handleTapTempo}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          data-cancionero-letra-scroll=""
          className="min-h-0 flex-1 touch-pan-y overscroll-y-contain overflow-y-auto bg-letra-bg lg:rounded-none lg:rounded-r-[12px]"
          style={letraZoomStyle}
        >
        <LetraCifradoPanel
          detalle={detalle}
          modoLectura
          scrollEndPadding={scrollEndPadding}
          cifradoAcordes={playback.cifradoDisplay?.acordes}
          notacion={playback.notacion}
          activeBeatAnchors={playback.activeBeatAnchors}
          activePlaybackLineIndex={playback.activePlaybackLineIndex}
          showCompas={showCompasMarcadores}
          onMarkersReady={hasCompases ? playback.handleMarkersReady : undefined}
          onLineRef={hasCompases ? playback.handleLineRef : undefined}
        />
        </div>
      </div>
    </div>
  );
}
