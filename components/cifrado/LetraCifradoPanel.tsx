"use client";

import { CifradoLyricsBlock } from "@/components/cifrado/CifradoLyricsView";
import { type AcordePos, type CompasMarker } from "@/lib/cifrado";
import { getIntensidadPlantilla } from "@/lib/cifrado-intensidad";
import type { PreviewPlaybackAnchor } from "@/lib/cifrado-preview-play";
import type { NotacionAcordes } from "@/lib/notacion-acordes";
import {
  getLetraModoLecturaHorizontalPadding,
  getLetraModoLecturaHorizontalPaddingRight,
} from "@/lib/sala-layout";
import type { CancionCifradoDetalle } from "@/types";

type LetraCifradoPanelProps = {
  detalle: CancionCifradoDetalle;
  modoLectura?: boolean;
  scrollEndPadding?: string;
  cifradoAcordes?: AcordePos[];
  notacion?: NotacionAcordes;
  activeBeatAnchors?: PreviewPlaybackAnchor[];
  activePlaybackLineIndex?: number | null;
  onMarkersReady?: (lineIndex: number, markers: CompasMarker[]) => void;
  onLineRef?: (lineIndex: number, element: HTMLDivElement | null) => void;
};

export default function LetraCifradoPanel({
  detalle,
  modoLectura = false,
  scrollEndPadding,
  cifradoAcordes,
  notacion = "es",
  activeBeatAnchors = [],
  activePlaybackLineIndex = null,
  onMarkersReady,
  onLineRef,
}: LetraCifradoPanelProps) {
  const letra = detalle.letra?.trim() ?? "";
  const compasConfig = detalle.compas_config;
  const tipoCompas = compasConfig?.tipoCompas ?? "4-4";
  const showCompasMarcadores = Boolean(compasConfig?.barras?.length);
  const acordes = cifradoAcordes ?? detalle.cifrado.acordes;

  const horizontalPaddingStyle = modoLectura
    ? {
        paddingLeft: getLetraModoLecturaHorizontalPadding(),
        paddingRight: getLetraModoLecturaHorizontalPaddingRight(),
      }
    : undefined;

  return (
    <div
      className={`relative min-h-full w-full shrink-0 bg-letra-bg py-5 ${
        modoLectura ? "" : "px-[18px]"
      }`}
      style={{ paddingBottom: scrollEndPadding }}
    >
      <div style={horizontalPaddingStyle}>
        <CifradoLyricsBlock
          letra={letra}
          acordes={acordes}
          barras={compasConfig?.barras ?? []}
          lineTerminalOffsets={compasConfig?.lineTerminalOffsets}
          tipoCompas={tipoCompas}
          intensidadPlantilla={
            compasConfig ? getIntensidadPlantilla(compasConfig) : []
          }
          showCompas={showCompasMarcadores}
          activeBeatAnchors={activeBeatAnchors}
          activePlaybackLineIndex={activePlaybackLineIndex}
          onMarkersReady={onMarkersReady}
          onLineRef={onLineRef}
          letraSheet
          notacion={notacion}
        />
      </div>
    </div>
  );
}
