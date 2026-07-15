"use client";

import { CifradoLyricsBlock } from "@/components/cifrado/CifradoLyricsView";
import type {
  Anotacion,
  AnotacionVisibility,
} from "@/lib/anotaciones-practica";
import { type AcordePos, type CompasMarker } from "@/lib/cifrado";
import { getIntensidadPlantilla } from "@/lib/cifrado-intensidad";
import type { PreviewPlaybackAnchor } from "@/lib/cifrado-preview-play";
import type { NotacionAcordes } from "@/lib/notacion-acordes";
import {
  getLecturaLetraScrollStartPaddingCss,
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
  showCompas?: boolean;
  showAcordes?: boolean;
  onMarkersReady?: (lineIndex: number, markers: CompasMarker[]) => void;
  onLineRef?: (lineIndex: number, element: HTMLDivElement | null) => void;
  anotaciones?: Anotacion[];
  anotacionesVisibility?: AnotacionVisibility;
  onOpenNota?: (anotacion: Anotacion) => void;
};

export default function LetraCifradoPanel({
  detalle,
  modoLectura = false,
  scrollEndPadding,
  cifradoAcordes,
  notacion = "es",
  activeBeatAnchors = [],
  activePlaybackLineIndex = null,
  showCompas,
  showAcordes = true,
  onMarkersReady,
  onLineRef,
  anotaciones,
  anotacionesVisibility,
  onOpenNota,
}: LetraCifradoPanelProps) {
  const letra = detalle.letra?.trim() ?? "";
  const compasConfig = detalle.compas_config;
  const tipoCompas = compasConfig?.tipoCompas ?? "4-4";
  const showCompasMarcadores =
    showCompas ?? Boolean(compasConfig?.barras?.length);
  const acordes = cifradoAcordes ?? detalle.cifrado.acordes;

  const horizontalPaddingStyle = modoLectura
    ? {
        paddingLeft: getLetraModoLecturaHorizontalPadding(),
        paddingRight: getLetraModoLecturaHorizontalPaddingRight(),
      }
    : undefined;

  return (
    <div
      className={`relative min-h-full w-full shrink-0 bg-letra-bg ${
        modoLectura ? "pb-5 pt-0 lg:pt-5" : "py-5"
      } ${modoLectura ? "" : "px-[18px]"}`}
      style={{ paddingBottom: scrollEndPadding }}
    >
      {modoLectura ? (
        <div
          aria-hidden
          className="shrink-0 lg:hidden"
          style={{ height: getLecturaLetraScrollStartPaddingCss() }}
        />
      ) : null}
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
          showAcordes={showAcordes}
          activeBeatAnchors={activeBeatAnchors}
          activePlaybackLineIndex={activePlaybackLineIndex}
          onMarkersReady={onMarkersReady}
          onLineRef={onLineRef}
          letraSheet
          notacion={notacion}
          anotaciones={anotaciones}
          anotacionesVisibility={anotacionesVisibility}
          onOpenNota={onOpenNota}
        />
      </div>
    </div>
  );
}
