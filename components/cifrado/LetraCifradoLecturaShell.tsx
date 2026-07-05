"use client";

import CifradoLecturaSidePanel, {
  getLecturaPremiumCompasLabel,
} from "@/components/cifrado/CifradoLecturaSidePanel";
import LetraCifradoPanel from "@/components/cifrado/LetraCifradoPanel";
import { useCifradoPlayback } from "@/hooks/useCifradoPlayback";
import type { CancionCifradoDetalle } from "@/types";
import type { RefObject } from "react";

type LetraCifradoLecturaShellProps = {
  detalle: CancionCifradoDetalle;
  scrollRef: RefObject<HTMLDivElement | null>;
  scrollEndPadding: string;
};

export default function LetraCifradoLecturaShell({
  detalle,
  scrollRef,
  scrollEndPadding,
}: LetraCifradoLecturaShellProps) {
  const compasConfig = detalle.compas_config;
  const tipoCompas = compasConfig?.tipoCompas ?? "4-4";
  const hasCompases = Boolean(compasConfig?.barras?.length);

  const playback = useCifradoPlayback({
    detalle,
    scrollRef,
    enabled: hasCompases,
  });

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col lg:flex-row">
      <CifradoLecturaSidePanel
        compasLabel={getLecturaPremiumCompasLabel(tipoCompas)}
        showCompasMarkers={hasCompases}
        playing={playback.playing}
        canPlay={playback.canPlay}
        notacion={playback.notacion}
        tonalidadIndex={playback.tonalidadIndex}
        bpm={playback.bpm}
        tapCount={playback.tapCount}
        onTogglePlayback={playback.handleTogglePlayback}
        onNotacionChange={playback.handleNotacionChange}
        onTonalidadChange={playback.handleTonalidadChange}
        onBpmChange={playback.handleBpmChange}
        onTapTempo={playback.handleTapTempo}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          data-cancionero-letra-scroll=""
          className="min-h-0 flex-1 touch-pan-y overscroll-y-contain overflow-y-auto bg-letra-bg lg:rounded-none lg:rounded-r-[12px]"
        >
        <LetraCifradoPanel
          detalle={detalle}
          modoLectura
          scrollEndPadding={scrollEndPadding}
          cifradoAcordes={playback.cifradoDisplay?.acordes}
          notacion={playback.notacion}
          activeBeatAnchors={playback.activeBeatAnchors}
          activePlaybackLineIndex={playback.activePlaybackLineIndex}
          onMarkersReady={hasCompases ? playback.handleMarkersReady : undefined}
          onLineRef={hasCompases ? playback.handleLineRef : undefined}
        />
        </div>
      </div>
    </div>
  );
}
