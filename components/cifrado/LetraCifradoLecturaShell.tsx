"use client";

import CifradoLecturaSidePanel from "@/components/cifrado/CifradoLecturaSidePanel";
import LetraCifradoPanel from "@/components/cifrado/LetraCifradoPanel";
import { useCifradoPlayback } from "@/hooks/useCifradoPlayback";
import type {
  Anotacion,
  AnotacionTipo,
  AnotacionVisibility,
} from "@/lib/anotaciones-practica";
import type { NotaIndex } from "@/lib/cifrado";
import type { NotacionAcordes } from "@/lib/notacion-acordes";
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

export type LecturaTonalidadState = {
  tonalidadIndex: NotaIndex;
  notacion: NotacionAcordes;
  setTonalidad: (next: NotaIndex) => void;
};

type LetraCifradoLecturaShellProps = {
  detalle: CancionCifradoDetalle;
  scrollRef: RefObject<HTMLDivElement | null>;
  scrollEndPadding: string;
  letraZoomStyle?: CSSProperties;
  compasesOcultos?: boolean;
  onToggleCompasesOcultos?: () => void;
  acordesOcultos?: boolean;
  onToggleAcordesOcultos?: () => void;
  onCompasPlaybackStateChange?: (state: LecturaCompasPlaybackState | null) => void;
  onTonalidadStateChange?: (state: LecturaTonalidadState | null) => void;
  anotaciones?: Anotacion[];
  anotacionesVisibility?: AnotacionVisibility;
  onToggleAnotacionTipo?: (tipo: AnotacionTipo) => void;
  onOpenNota?: (anotacion: Anotacion) => void;
  onOpenNotaGeneral?: () => void;
  tieneNotaGeneral?: boolean;
  onEdit?: () => void;
  temaLectura?: "dia" | "sepia" | "escenario";
  onTemaLecturaChange?: (next: "dia" | "sepia" | "escenario") => void;
};

export default function LetraCifradoLecturaShell({
  detalle,
  scrollRef,
  scrollEndPadding,
  letraZoomStyle,
  compasesOcultos = false,
  onToggleCompasesOcultos,
  acordesOcultos = false,
  onToggleAcordesOcultos,
  onCompasPlaybackStateChange,
  onTonalidadStateChange,
  anotaciones,
  anotacionesVisibility,
  onToggleAnotacionTipo,
  onOpenNota,
  onOpenNotaGeneral,
  tieneNotaGeneral = false,
  onEdit,
  temaLectura,
  onTemaLecturaChange,
}: LetraCifradoLecturaShellProps) {
  const compasConfig = detalle.compas_config;
  const hasCompases = Boolean(compasConfig?.barras?.length);
  const showCompasMarcadores = hasCompases && !compasesOcultos;
  const showAcordes = !acordesOcultos;

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

  useEffect(() => {
    if (!onTonalidadStateChange) {
      return;
    }

    onTonalidadStateChange({
      tonalidadIndex: playback.tonalidadIndex,
      notacion: playback.notacion,
      setTonalidad: playback.handleTonalidadChange,
    });
  }, [
    onTonalidadStateChange,
    playback.handleTonalidadChange,
    playback.notacion,
    playback.tonalidadIndex,
  ]);

  useEffect(() => {
    return () => {
      onTonalidadStateChange?.(null);
    };
  }, [onTonalidadStateChange]);

  const anotacionTiposPresentes = anotaciones
    ? Array.from(new Set(anotaciones.map((anotacion) => anotacion.tipo)))
    : [];

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col lg:flex-row">
      <CifradoLecturaSidePanel
        hasCompases={hasCompases}
        compasesOcultos={compasesOcultos}
        acordesOcultos={acordesOcultos}
        anotacionesVisibility={anotacionesVisibility}
        anotacionTiposPresentes={anotacionTiposPresentes}
        onToggleAnotacionTipo={onToggleAnotacionTipo}
        playing={playback.playing}
        canPlay={playback.canPlay}
        notacion={playback.notacion}
        tonalidadIndex={playback.tonalidadIndex}
        modoTonal={playback.modoTonal}
        bpm={playback.bpm}
        tapCount={playback.tapCount}
        onTogglePlayback={playback.handleTogglePlayback}
        onToggleCompasesOcultos={onToggleCompasesOcultos}
        onToggleAcordesOcultos={onToggleAcordesOcultos}
        onNotacionChange={playback.handleNotacionChange}
        onTonalidadChange={playback.handleTonalidadChange}
        onModoTonalChange={playback.handleModoTonalChange}
        onBpmChange={playback.handleBpmChange}
        onTapTempo={playback.handleTapTempo}
        onOpenNotaGeneral={onOpenNotaGeneral}
        tieneNotaGeneral={tieneNotaGeneral}
        onEdit={onEdit}
        temaLectura={temaLectura}
        onTemaLecturaChange={onTemaLecturaChange}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:rounded-r-[12px]">
        <div
          ref={scrollRef}
          data-cancionero-letra-scroll=""
          className="min-h-0 flex-1 touch-pan-y overscroll-y-contain overflow-y-auto bg-letra-bg"
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
          showAcordes={showAcordes}
          onMarkersReady={hasCompases ? playback.handleMarkersReady : undefined}
          onLineRef={hasCompases ? playback.handleLineRef : undefined}
          anotaciones={anotaciones}
          anotacionesVisibility={anotacionesVisibility}
          onOpenNota={onOpenNota}
        />
        </div>
      </div>
    </div>
  );
}
