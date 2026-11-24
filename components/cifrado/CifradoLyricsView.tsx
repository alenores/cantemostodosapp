"use client";

import type { CompositorPiece } from "@/lib/compositor";
import {
  computeLineCompasMarkersPx,
  computeLineLaneSlotCount,
  computePreviewMeasureStemHeightPx,
  PREVIEW_MEASURE_MARKER_DOT_HEIGHT_PX,
  getLineContentEndOffset,
  getLineLaneStart,
  LINE_LANE_MIN_SLOT_COUNT,
  LINE_LANE_SLOT_WIDTH_PX,
  resolveCharOffsetPx,
  resolveLineTerminalCharOffset,
  type AcordePos,
  type BarraCompas,
  type CompasConfig,
  type CompasMarker,
  type TipoCompas,
} from "@/lib/cifrado";
import { AcordeLabel } from "@/components/cifrado/AcordeLabel";
import {
  CIFRADO_ACORDE_DOT_CLASS,
  CIFRADO_ACORDE_STEM_CLASS,
  CIFRADO_ACORDE_TEXT_CLASS,
} from "@/components/cifrado/cifrado-controls-ui";
import AnotacionesLineLayer, {
  ANOTACIONES_ARRIBA_BANDA_PX,
} from "@/components/cifrado/AnotacionesLineLayer";
import {
  PunteoMarcasLinea,
  RasgueoMarcasLinea,
} from "@/components/cifrado/CuerdasPanel";
import { colorTramoPorLinea } from "@/lib/cuerdas-practica";
import {
  anotacionVaArriba,
  type Anotacion,
  type AnotacionVisibility,
} from "@/lib/anotaciones-practica";
import {
  CIFRADO_LINE_LANE_CONTAINER_CLASS,
  CIFRADO_LINE_LANE_SLOT_CLASS,
} from "@/components/cifrado/cifrado-controls-ui";
import { getBarraBeatCount } from "@/lib/cifrado-barra-cycles";
import { getBarraIntensidad } from "@/lib/cifrado-intensidad";
import { type NotacionAcordes } from "@/lib/notacion-acordes";
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import type { PreviewPlaybackAnchor } from "@/lib/cifrado-preview-play";
import {
  computeSoftWrapSegments,
  localizeCompasMarkers,
  sameMarkerRows,
  sameWrapSegments,
  sliceAcordes,
  sliceLineAnotaciones,
  type MeasuredChar,
  type SoftWrapSegment,
} from "@/lib/cifrado-soft-wrap";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

export function splitLyricsLines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split("\n");
}

const CELULAR_MAX_WIDTH_PX = 1023;

function useIsCelularWidth(): boolean {
  const [isCelular, setIsCelular] = useState(false);

  useLayoutEffect(() => {
    const media = window.matchMedia(`(max-width: ${CELULAR_MAX_WIDTH_PX}px)`);

    function update() {
      setIsCelular(media.matches);
    }

    update();
    media.addEventListener("change", update);

    return () => {
      media.removeEventListener("change", update);
    };
  }, []);

  return isCelular;
}

function contentBoxWidth(element: HTMLElement): number {
  const style = getComputedStyle(element);
  const padLeft = Number.parseFloat(style.paddingLeft) || 0;
  const padRight = Number.parseFloat(style.paddingRight) || 0;

  return Math.max(0, element.clientWidth - padLeft - padRight);
}

function readMeasureChars(measure: HTMLElement): MeasuredChar[] {
  const origin = measure.getBoundingClientRect();
  const spans = measure.querySelectorAll<HTMLElement>("[data-wrap-measure-index]");
  const positions: MeasuredChar[] = [];

  spans.forEach((span) => {
    const index = Number(span.getAttribute("data-wrap-measure-index"));

    if (Number.isNaN(index)) {
      return;
    }

    const rect = span.getBoundingClientRect();

    positions[index] = {
      left: rect.left - origin.left,
      width: rect.width,
    };
  });

  return positions;
}

function acordeMeasureClass(letraSheet: boolean, compact: boolean): string {
  return `pointer-events-none absolute whitespace-nowrap rounded px-0.5 font-bold leading-none ${CIFRADO_ACORDE_TEXT_CLASS} ${
    letraSheet
      ? "text-[length:var(--letra-size)]"
      : compact
        ? "text-[10px]"
        : "text-xs"
  }`;
}

function LyricMeasureLine({
  text,
  laneSlotCount,
  measureRef,
  acordes = [],
  notacion = "es",
  letraSheet = false,
  compact = false,
  showAcordes = true,
}: {
  text: string;
  laneSlotCount: number;
  measureRef: RefObject<HTMLDivElement | null>;
  acordes?: AcordePos[];
  notacion?: NotacionAcordes;
  letraSheet?: boolean;
  compact?: boolean;
  showAcordes?: boolean;
}) {
  const characters = [...text];
  const laneStart = getLineLaneStart(characters.length);
  const laneSlots =
    laneSlotCount > 0
      ? Array.from({ length: laneSlotCount }).map((_, slot) => (
          <span
            key={slot}
            data-wrap-measure-index={laneStart + slot}
            className={`${CIFRADO_LINE_LANE_SLOT_CLASS} shrink-0`}
          >
            {"\u00a0"}
          </span>
        ))
      : null;

  return (
    <div
      ref={measureRef}
      aria-hidden
      className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
    >
      {characters.length === 0 ? (
        laneSlots ? <span className="inline-flex shrink-0">{laneSlots}</span> : null
      ) : (
        <>
          <span className="inline shrink-0">
            {characters.map((char, index) => (
              <span key={index} data-wrap-measure-index={index}>
                {char}
              </span>
            ))}
          </span>
          {laneSlots ? (
            <span className="inline-flex shrink-0">{laneSlots}</span>
          ) : null}
        </>
      )}
      {showAcordes
        ? acordes.map((acorde) => (
            <span
              key={`measure-acorde-${acorde.charOffset}`}
              data-wrap-chord-offset={acorde.charOffset}
              className={acordeMeasureClass(letraSheet, compact)}
            >
              <AcordeLabel
                noteIndex={acorde.noteIndex}
                modifier={acorde.modifier}
                bassNoteIndex={acorde.bassNoteIndex}
                agregada={acorde.agregada}
                notacion={notacion}
                className={CIFRADO_ACORDE_TEXT_CLASS}
              />
            </span>
          ))
        : null}
    </div>
  );
}

function readChordLabelWidths(measure: HTMLElement): Map<number, number> {
  const widths = new Map<number, number>();
  const spans = measure.querySelectorAll<HTMLElement>("[data-wrap-chord-offset]");

  spans.forEach((span) => {
    const offset = Number(span.getAttribute("data-wrap-chord-offset"));

    if (Number.isNaN(offset)) {
      return;
    }

    widths.set(offset, span.getBoundingClientRect().width);
  });

  return widths;
}

type CharPosition = {
  left: number;
  center: number;
  bottom: number;
};

type CompasMarkersRowProps = {
  markers: CompasMarker[];
  highlightMeasureLeftPx?: number | null;
  activeBeatLeftPx?: number | null;
  playbackHighlight?: boolean;
  showMeasureStem?: boolean;
  measureStemHeightPx?: number;
  hideOpenEndedMeasures?: boolean;
};

function CompasMarkersRow({
  markers,
  highlightMeasureLeftPx = null,
  activeBeatLeftPx = null,
  playbackHighlight = false,
  showMeasureStem = false,
  measureStemHeightPx,
  hideOpenEndedMeasures = false,
}: CompasMarkersRowProps) {
  if (markers.length === 0) {
    return null;
  }

  const activeMeasureClass = playbackHighlight
    ? "bg-blue-900 shadow-[0_0_0_2px_rgba(30,58,138,0.35)]"
    : "bg-accent";
  const activeBeatClass = playbackHighlight
    ? "bg-blue-800 shadow-[0_0_0_2px_rgba(30,64,175,0.4)]"
    : "bg-accent/70";

  const useFixedPreviewStem = measureStemHeightPx !== undefined;

  return (
    <div
      className={`relative ${
        showMeasureStem && !useFixedPreviewStem ? "mt-1 min-h-4" : "h-4"
      }`}
      aria-hidden="true"
    >
      {markers.map((marker, index) => {
        const isDraggingMeasure =
          marker.kind === "measure" &&
          highlightMeasureLeftPx !== null &&
          Math.abs(marker.leftPx - highlightMeasureLeftPx) < 1.5;
        const isActiveBeat =
          activeBeatLeftPx !== null &&
          Math.abs(marker.leftPx - activeBeatLeftPx) < 2;

        if (marker.kind === "measure") {
          if (hideOpenEndedMeasures && marker.compasNumero === undefined) {
            return null;
          }

          return (
            <span
              key={`compas-measure-${index}`}
              className="absolute bottom-0"
              style={{ left: marker.leftPx }}
            >
              {showMeasureStem && (
                <span
                  className={`absolute left-0 w-px bg-text-muted/75 ${
                    useFixedPreviewStem ? "z-0" : "bottom-full"
                  }`}
                  style={{
                    ...(useFixedPreviewStem
                      ? { bottom: `${PREVIEW_MEASURE_MARKER_DOT_HEIGHT_PX}px` }
                      : {}),
                    height: useFixedPreviewStem
                      ? `${measureStemHeightPx}px`
                      : "1.5rem",
                  }}
                />
              )}
              <span
                className={`absolute bottom-0 left-0 rounded-full transition-all duration-75 ${
                  isDraggingMeasure || isActiveBeat
                    ? activeMeasureClass
                    : "bg-text-muted/90"
                } ${isActiveBeat && playbackHighlight ? "z-10 w-1.5" : "w-1.5"}`}
                style={{
                  height: isActiveBeat && playbackHighlight ? "0.5rem" : "0.375rem",
                }}
              />
            </span>
          );
        }

        return (
          <span
            key={`compas-beat-${index}`}
            className={`absolute bottom-0 -translate-x-1/2 rounded-full transition-all duration-75 ${
              isActiveBeat ? activeBeatClass : "bg-text-muted/35"
            } ${isActiveBeat && playbackHighlight ? "z-10" : ""}`}
            style={{
              left: marker.leftPx,
              width: isActiveBeat && playbackHighlight ? "0.5rem" : "0.5rem",
              height: isActiveBeat && playbackHighlight ? "0.375rem" : "0.125rem",
            }}
          />
        );
      })}
    </div>
  );
}

export type CifradoLyricsLineProps = {
  lineIndex: number;
  text: string;
  acordes: AcordePos[];
  barras?: BarraCompas[];
  tipoCompas?: TipoCompas;
  intensidadPlantilla?: MetronomeBeatLevel[];
  showCompas?: boolean;
  showAcordes?: boolean;
  activeBeatAnchors?: PreviewPlaybackAnchor[];
  onMarkersReady?: (lineIndex: number, markers: CompasMarker[]) => void;
  compact?: boolean;
  letraSheet?: boolean;
  isPlaybackActiveLine?: boolean;
  notacion?: NotacionAcordes;
  cyclePiecesById?: ReadonlyMap<string, CompositorPiece>;
  lineTerminalOffsets?: CompasConfig["lineTerminalOffsets"];
  nextLineHasCompas?: boolean;
  anotaciones?: Anotacion[];
  anotacionesVisibility?: AnotacionVisibility;
  onOpenNota?: (anotacion: Anotacion) => void;
  tramoColor?: string | null;
};

function CifradoLyricsRow({
  lineIndex,
  text,
  acordes,
  barras = [],
  tipoCompas = "4-4",
  intensidadPlantilla = [],
  showCompas = false,
  showAcordes = true,
  activeBeatAnchors = [],
  onMarkersReady,
  compact = false,
  letraSheet = false,
  isPlaybackActiveLine = false,
  notacion = "es",
  cyclePiecesById,
  lineTerminalOffsets,
  nextLineHasCompas = false,
  anotaciones = [],
  anotacionesVisibility,
  onOpenNota,
  tramoColor = null,
  suppressChrome = false,
  continuation = false,
  markersOverride = null,
  reportMarkers = true,
  wrapRow = 0,
  showLane = true,
  measureSlot = null,
  laneSlotCountOverride,
}: CifradoLyricsLineProps & {
  /** El renglón de afuera ya pone el margen, el rasgueo y la barra de color. */
  suppressChrome?: boolean;
  /** Este tramo sigue al de arriba: lo partió el celular, no la canción. */
  continuation?: boolean;
  markersOverride?: CompasMarker[] | null;
  reportMarkers?: boolean;
  wrapRow?: number;
  showLane?: boolean;
  measureSlot?: ReactNode;
  /** Casillas vacías de este tramo. Si viene, no se estira el carril entero. */
  laneSlotCountOverride?: number;
}) {
  const textLaneRef = useRef<HTMLDivElement>(null);
  const compasRowRef = useRef<HTMLDivElement>(null);
  const [charPositions, setCharPositions] = useState<CharPosition[]>([]);
  const [compasRowBottomPx, setCompasRowBottomPx] = useState<number | undefined>();
  const [laneSlotCount, setLaneSlotCount] = useState(LINE_LANE_MIN_SLOT_COUNT);
  const renderedLaneSlotCount = laneSlotCountOverride ?? laneSlotCount;
  const laneClassName =
    laneSlotCountOverride === undefined
      ? CIFRADO_LINE_LANE_CONTAINER_CLASS
      : "inline-flex shrink-0";
  const characters = [...text];
  const laneStart = getLineLaneStart(characters.length);
  const compasConfigForLine = useMemo(
    () => ({
      tipoCompas,
      intensidadPlantilla,
      bpm: 0,
      barras: [] as BarraCompas[],
      lineTerminalOffsets,
    }),
    [intensidadPlantilla, lineTerminalOffsets, tipoCompas],
  );
  const lineTerminalCharOffset = useMemo(
    () =>
      barras.length > 0
        ? resolveLineTerminalCharOffset(
            compasConfigForLine,
            lineIndex,
            barras,
            getLineContentEndOffset(characters.length, acordes, barras),
            characters.length,
          )
        : undefined,
    [
      acordes,
      barras,
      characters.length,
      compasConfigForLine,
      lineIndex,
    ],
  );
  const activeBeatLeftPx =
    activeBeatAnchors.find(
      (anchor) =>
        anchor.lineIndex === lineIndex && (anchor.wrapRow ?? 0) === wrapRow,
    )?.leftPx ?? null;

  const measurePositions = useCallback(() => {
    const container = textLaneRef.current;

    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();

    if (laneSlotCountOverride === undefined) {
      const nextLaneSlotCount = computeLineLaneSlotCount(
        containerRect.width,
        text.length,
      );

      setLaneSlotCount((current) =>
        current === nextLaneSlotCount ? current : nextLaneSlotCount,
      );
    }

    const spans = container.querySelectorAll("[data-char-index]");
    const positions: CharPosition[] = [];

    spans.forEach((span) => {
      const index = Number(span.getAttribute("data-char-index"));

      if (Number.isNaN(index)) {
        return;
      }

      const rect = span.getBoundingClientRect();
      const left = rect.left - containerRect.left;

      positions[index] = {
        left,
        center: left + rect.width / 2,
        bottom: rect.bottom - containerRect.top,
      };
    });

    setCharPositions(positions);
  }, [laneSlotCountOverride, text]);

  useLayoutEffect(() => {
    measurePositions();
  }, [laneSlotCount, laneSlotCountOverride, measurePositions, text, showCompas]);

  useEffect(() => {
    const container = textLaneRef.current;

    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      measurePositions();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [measurePositions]);

  const computedCompasMarkers = useMemo(
    () =>
      showCompas && barras.length > 0
        ? computeLineCompasMarkersPx(
            barras,
            (barra) => getBarraBeatCount(barra, compasConfigForLine, cyclePiecesById),
            (offset) => resolveCharOffsetPx(offset, charPositions),
            (barra, beatIndex) =>
              getBarraIntensidad(barra, compasConfigForLine)[beatIndex] ??
              "medio",
            {
              contentEndOffset: getLineContentEndOffset(
                characters.length,
                acordes,
                barras,
              ),
              textLength: characters.length,
              lineTerminalCharOffset,
              appendTerminalMeasure: nextLineHasCompas,
            },
          )
        : [],
    [
      acordes,
      barras,
      charPositions,
      characters.length,
      compasConfigForLine,
      cyclePiecesById,
      lineTerminalCharOffset,
      nextLineHasCompas,
      showCompas,
    ],
  );
  const compasMarkers = markersOverride ?? computedCompasMarkers;

  const previewMeasureStemHeightPx = useMemo(
    () =>
      computePreviewMeasureStemHeightPx(
        charPositions,
        acordes,
        characters.length,
        compasRowBottomPx,
      ),
    [acordes, charPositions, characters.length, compasRowBottomPx],
  );

  useLayoutEffect(() => {
    const lane = textLaneRef.current;
    const compasRow = compasRowRef.current;

    if (!lane || !compasRow) {
      setCompasRowBottomPx(undefined);
      return;
    }

    const laneRect = lane.getBoundingClientRect();
    const rowRect = compasRow.getBoundingClientRect();
    const nextBottom = rowRect.bottom - laneRect.top;

    setCompasRowBottomPx((current) =>
      current === nextBottom ? current : nextBottom,
    );
  }, [charPositions, compasMarkers.length, laneSlotCount, showCompas]);

  useEffect(() => {
    if (!reportMarkers) {
      return;
    }

    onMarkersReady?.(lineIndex, compasMarkers);
  }, [compasMarkers, lineIndex, onMarkersReady, reportMarkers]);

  const anotacionesActivas = Boolean(anotacionesVisibility);
  const hasArribaAnot =
    anotacionesActivas &&
    anotaciones.some(
      (anotacion) =>
        anotacionesVisibility![anotacion.tipo] &&
        anotacionVaArriba(anotacion.tipo),
    );
  const arribaOffset = hasArribaAnot ? ANOTACIONES_ARRIBA_BANDA_PX : 0;

  const letraSheetStyle = letraSheet
    ? {
        fontSize: "var(--letra-size)",
        lineHeight: "var(--letra-line-height)",
        fontWeight: "var(--letra-weight)",
      }
    : undefined;

  const outerClass = suppressChrome
    ? letraSheet
      ? continuation
        ? "mt-1"
        : ""
      : `font-mono ${compact ? "text-xs" : "text-sm"}${continuation ? " mt-1" : ""}`
    : letraSheet
      ? "mb-3"
      : `font-mono ${compact ? "mb-2 text-xs" : "mb-4 text-sm"}`;
  const innerStyle = suppressChrome
    ? letraSheetStyle
    : tramoColor
      ? {
          ...letraSheetStyle,
          boxShadow: `inset 3px 0 0 ${tramoColor}`,
          paddingLeft: 8,
        }
      : letraSheetStyle;

  return (
    <div className={outerClass}>
      {suppressChrome ? null : (
        <RasgueoMarcasLinea
          anotaciones={anotaciones}
          visibility={anotacionesVisibility}
          colapsado
          tipoCompas={tipoCompas}
        />
      )}
      <div
        ref={textLaneRef}
        className="relative isolate overflow-hidden text-letra-text"
        style={innerStyle}
      >
      {measureSlot}
      {!suppressChrome && isPlaybackActiveLine && (
        <span
          className="pointer-events-none absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-blue-500/55"
          aria-hidden="true"
        />
      )}
      {anotacionesActivas ? (
        <AnotacionesLineLayer
          banda="fondo"
          anotaciones={anotaciones}
          charPositions={charPositions}
          visibility={anotacionesVisibility!}
          mode="lectura"
        />
      ) : null}
      {anotacionesActivas ? (
        <AnotacionesLineLayer
          banda="arriba"
          anotaciones={anotaciones}
          charPositions={charPositions}
          visibility={anotacionesVisibility!}
          mode="lectura"
          onOpenNota={onOpenNota}
        />
      ) : null}
      <div
        className={`pointer-events-none relative flex w-full items-baseline ${
          continuation && acordes.length === 0 ? "pt-1" : "pt-5"
        }`}
        style={arribaOffset ? { paddingTop: 20 + arribaOffset } : undefined}
      >
        {characters.length === 0 ? (
          <span
            className={
              laneSlotCountOverride === undefined
                ? `${CIFRADO_LINE_LANE_CONTAINER_CLASS} w-full`
                : laneClassName
            }
          >
            {Array.from({ length: renderedLaneSlotCount }).map((_, slot) => (
              <span
                key={`lyrics-lane-${slot}`}
                data-char-index={slot}
                className={CIFRADO_LINE_LANE_SLOT_CLASS}
              >
                {laneSlotCountOverride === undefined && slot === 0
                  ? " "
                  : "\u00a0"}
              </span>
            ))}
          </span>
        ) : (
          <>
            <span className="inline shrink-0">
              {characters.map((char, charIndex) => (
                <span key={charIndex} data-char-index={charIndex}>
                  {char}
                </span>
              ))}
            </span>
            {showLane ? (
              <span
                className={laneClassName}
                aria-hidden="true"
              >
                {Array.from({ length: renderedLaneSlotCount }).map((_, slot) => (
                  <span
                    key={`lyrics-lane-${slot}`}
                    data-char-index={laneStart + slot}
                    className={CIFRADO_LINE_LANE_SLOT_CLASS}
                  >
                    {"\u00a0"}
                  </span>
                ))}
              </span>
            ) : null}
          </>
        )}
      </div>

      {showAcordes
        ? acordes.map((acorde) => {
            const position = charPositions[acorde.charOffset];

            if (!position) {
              return null;
            }

            const dotTop = position.bottom + 2;
            const stemTop = (compact ? 14 : 18) + arribaOffset;
            const stemHeight = Math.max(4, dotTop - stemTop);

            return (
              <div
                key={`cifrado-acorde-${lineIndex}-${acorde.charOffset}`}
                className="pointer-events-none absolute top-0"
                style={{ left: position.left }}
              >
                <span
                  className={`absolute whitespace-nowrap rounded px-0.5 font-bold leading-none ${CIFRADO_ACORDE_TEXT_CLASS} ${
                    letraSheet
                      ? "text-[length:var(--letra-size)]"
                      : compact
                        ? "text-[10px]"
                        : "text-xs"
                  }`}
                  style={{
                    top: (letraSheet ? 0 : compact ? 2 : 4) + arribaOffset,
                    left: 0,
                  }}
                >
                  <AcordeLabel
                    noteIndex={acorde.noteIndex}
                    modifier={acorde.modifier}
                    bassNoteIndex={acorde.bassNoteIndex}
                    agregada={acorde.agregada}
                    notacion={notacion}
                    className={CIFRADO_ACORDE_TEXT_CLASS}
                  />
                </span>
                <span
                  className={`absolute w-px ${CIFRADO_ACORDE_STEM_CLASS}`}
                  style={{ top: stemTop, left: 0, height: stemHeight }}
                  aria-hidden="true"
                />
                <span
                  className={`absolute z-10 size-1 rounded-full ${CIFRADO_ACORDE_DOT_CLASS}`}
                  style={{ top: dotTop, left: 0 }}
                  aria-hidden="true"
                />
              </div>
            );
          })
        : null}

      {anotacionesActivas ? (
        <AnotacionesLineLayer
          banda="abajo"
          anotaciones={anotaciones}
          charPositions={charPositions}
          visibility={anotacionesVisibility!}
          mode="lectura"
          onOpenNota={onOpenNota}
        />
      ) : null}
      <PunteoMarcasLinea
        anotaciones={anotaciones}
        charPositions={charPositions}
        visibility={anotacionesVisibility}
        colapsado
        tipoCompas={tipoCompas}
      />

      {compasMarkers.length > 0 && (
        <div ref={compasRowRef} className="mt-1.5">
          <CompasMarkersRow
            markers={compasMarkers}
            activeBeatLeftPx={activeBeatLeftPx}
            playbackHighlight={activeBeatLeftPx !== null}
            showMeasureStem
            measureStemHeightPx={previewMeasureStemHeightPx}
            hideOpenEndedMeasures
          />
        </div>
      )}
      </div>
    </div>
  );
}

export function CifradoLyricsLine(props: CifradoLyricsLineProps) {
  const {
    lineIndex,
    text,
    acordes,
    barras = [],
    tipoCompas = "4-4",
    intensidadPlantilla = [],
    showCompas = false,
    showAcordes = true,
    letraSheet = false,
    compact = false,
    notacion = "es",
    tramoColor = null,
    isPlaybackActiveLine = false,
    anotaciones = [],
    anotacionesVisibility,
    nextLineHasCompas = false,
    lineTerminalOffsets,
    cyclePiecesById,
    onMarkersReady,
  } = props;
  const celular = useIsCelularWidth();
  const measureRef = useRef<HTMLDivElement>(null);
  const [laneSlotCount, setLaneSlotCount] = useState(LINE_LANE_MIN_SLOT_COUNT);
  const [wrapSegments, setWrapSegments] = useState<SoftWrapSegment[] | null>(
    null,
  );
  const [segmentMarkers, setSegmentMarkers] = useState<CompasMarker[][] | null>(
    null,
  );
  const layoutKey = JSON.stringify({
    text,
    showCompas,
    tipoCompas,
    barras,
    acordes,
    letraSheet,
    compact,
    tramoColor,
    nextLineHasCompas,
    intensidadPlantilla,
    lineTerminalOffsets,
  });

  useLayoutEffect(() => {
    if (!celular) {
      return;
    }

    const measure = measureRef.current;
    const box = measure?.parentElement;

    if (!measure || !box) {
      return;
    }

    const update = () => {
      const maxWidth = contentBoxWidth(box) - 2;

      if (maxWidth < 8) {
        return;
      }

      const nextLane = computeLineLaneSlotCount(maxWidth, [...text].length);

      if (nextLane !== laneSlotCount) {
        setLaneSlotCount(nextLane);
        return;
      }

      const measured = readMeasureChars(measure);
      const characters = [...text];
      const widths = characters.map((_, index) => measured[index]?.width ?? 0);
      const maxChordOffset = showAcordes
        ? acordes.reduce(
            (max, acorde) => Math.max(max, acorde.charOffset),
            -1,
          )
        : -1;
      const laneFrom = characters.length;
      const laneTo = Math.max(characters.length, maxChordOffset + 1);
      const laneWidths: number[] = [];

      for (let offset = laneFrom; offset < laneTo; offset += 1) {
        const measuredWidth = measured[offset]?.width ?? 0;
        laneWidths.push(
          measuredWidth > 0 ? measuredWidth : LINE_LANE_SLOT_WIDTH_PX,
        );
      }

      const measuredChordWidths = showAcordes
        ? readChordLabelWidths(measure)
        : new Map<number, number>();
      const chordLabelWidths = showAcordes
        ? acordes.map((acorde) => ({
            offset: acorde.charOffset,
            width: measuredChordWidths.get(acorde.charOffset) ?? 0,
          }))
        : [];
      const segments = computeSoftWrapSegments(text, widths, maxWidth, {
        laneWidths,
        chordLabelWidths,
      });
      const wrapped =
        segments.length > 1 || (segments[0]?.start ?? 0) > 0;

      if (!wrapped) {
        setWrapSegments((current) => (current === null ? current : null));
        setSegmentMarkers((current) => (current === null ? current : null));
        return;
      }

      const startLefts: number[] = [];

      for (const segment of segments) {
        const position = measured[segment.start];

        if (!position) {
          return;
        }

        startLefts.push(position.left);
      }

      const compasConfigForLine = {
        tipoCompas,
        intensidadPlantilla,
        bpm: 0,
        barras: [] as BarraCompas[],
        lineTerminalOffsets,
      };
      const lineTerminalCharOffset =
        barras.length > 0
          ? resolveLineTerminalCharOffset(
              compasConfigForLine,
              lineIndex,
              barras,
              getLineContentEndOffset(characters.length, acordes, barras),
              characters.length,
            )
          : undefined;
      const markers =
        showCompas && barras.length > 0
          ? computeLineCompasMarkersPx(
              barras,
              (barra) =>
                getBarraBeatCount(barra, compasConfigForLine, cyclePiecesById),
              (offset) => resolveCharOffsetPx(offset, measured),
              (barra, beatIndex) =>
                getBarraIntensidad(barra, compasConfigForLine)[beatIndex] ??
                "medio",
              {
                contentEndOffset: getLineContentEndOffset(
                  characters.length,
                  acordes,
                  barras,
                ),
                textLength: characters.length,
                lineTerminalCharOffset,
                appendTerminalMeasure: nextLineHasCompas,
              },
            )
          : [];
      const rows = localizeCompasMarkers(markers, startLefts);

      setWrapSegments((current) =>
        sameWrapSegments(current, segments) ? current : segments,
      );
      setSegmentMarkers((current) =>
        sameMarkerRows(current, rows) ? current : rows,
      );
    };

    update();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      update();
    });

    observer.observe(box);
    observer.observe(measure);

    return () => {
      observer.disconnect();
    };
  }, [
    acordes,
    barras,
    celular,
    compact,
    cyclePiecesById,
    intensidadPlantilla,
    laneSlotCount,
    layoutKey,
    letraSheet,
    lineIndex,
    lineTerminalOffsets,
    nextLineHasCompas,
    notacion,
    showAcordes,
    showCompas,
    text,
    tipoCompas,
    tramoColor,
    wrapSegments,
  ]);

  const flatMarkers = useMemo(
    () => (segmentMarkers ? segmentMarkers.flat() : null),
    [segmentMarkers],
  );

  useEffect(() => {
    if (!flatMarkers) {
      return;
    }

    onMarkersReady?.(lineIndex, flatMarkers);
  }, [flatMarkers, lineIndex, onMarkersReady]);

  if (!celular) {
    return <CifradoLyricsRow {...props} />;
  }

  const wrapped = Boolean(
    wrapSegments &&
      (wrapSegments.length > 1 || (wrapSegments[0]?.start ?? 0) > 0),
  );
  const textChars = [...text];
  const farthestChord = showAcordes
    ? acordes.reduce((max, acorde) => Math.max(max, acorde.charOffset), -1)
    : -1;
  const measureLaneCount = Math.max(
    laneSlotCount,
    farthestChord >= textChars.length
      ? farthestChord - textChars.length + 1
      : 0,
  );
  const measureLine = (
    <LyricMeasureLine
      text={text}
      laneSlotCount={measureLaneCount}
      measureRef={measureRef}
      acordes={acordes}
      notacion={notacion}
      letraSheet={letraSheet}
      compact={compact}
      showAcordes={showAcordes}
    />
  );

  if (!wrapped || !wrapSegments || !segmentMarkers) {
    return <CifradoLyricsRow {...props} measureSlot={measureLine} />;
  }

  const letraSheetStyle = letraSheet
    ? {
        fontSize: "var(--letra-size)",
        lineHeight: "var(--letra-line-height)",
        fontWeight: "var(--letra-weight)",
      }
    : undefined;
  const outerClass = letraSheet
    ? "mb-3"
    : `font-mono ${compact ? "mb-2 text-xs" : "mb-4 text-sm"}`;

  return (
    <div className={outerClass} style={letraSheetStyle}>
      <RasgueoMarcasLinea
        anotaciones={anotaciones}
        visibility={anotacionesVisibility}
        colapsado
        tipoCompas={tipoCompas}
      />
      <div
        className="relative overflow-hidden text-letra-text"
        data-cifrado-soft-wrap=""
        style={
          tramoColor
            ? {
                boxShadow: `inset 3px 0 0 ${tramoColor}`,
                paddingLeft: 8,
              }
            : undefined
        }
      >
        {isPlaybackActiveLine ? (
          <span
            className="pointer-events-none absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-blue-500/55"
            aria-hidden="true"
          />
        ) : null}
        <div className="relative">
          {measureLine}
          <span className="sr-only">{text}</span>
          <div aria-hidden>
            {wrapSegments.map((segment, index) => {
              const { start, end } = segment;
              const isLast = index === wrapSegments.length - 1;
              const laneCount = Math.max(
                0,
                end - Math.max(start, textChars.length),
              );
              const segmentText =
                start >= textChars.length
                  ? ""
                  : textChars
                      .slice(start, Math.min(end, textChars.length))
                      .join("");

              return (
                <CifradoLyricsRow
                  key={`${start}-${end}`}
                  {...props}
                  text={segmentText}
                  acordes={sliceAcordes(acordes, start, end, isLast)}
                  barras={[]}
                  anotaciones={sliceLineAnotaciones(anotaciones, start, end, isLast)}
                  suppressChrome
                  continuation={index > 0}
                  markersOverride={segmentMarkers[index] ?? []}
                  reportMarkers={false}
                  wrapRow={index}
                  showLane={laneCount > 0 || isLast}
                  laneSlotCountOverride={
                    laneCount > 0 ? laneCount : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export type CifradoLyricsBlockProps = {
  letra: string;
  acordes: AcordePos[];
  barras?: BarraCompas[];
  tipoCompas?: TipoCompas;
  intensidadPlantilla?: MetronomeBeatLevel[];
  showCompas?: boolean;
  showAcordes?: boolean;
  activeBeatAnchors?: PreviewPlaybackAnchor[];
  onMarkersReady?: (lineIndex: number, markers: CompasMarker[]) => void;
  onLineRef?: (lineIndex: number, element: HTMLDivElement | null) => void;
  activePlaybackLineIndex?: number | null;
  compact?: boolean;
  letraSheet?: boolean;
  className?: string;
  notacion?: NotacionAcordes;
  cyclePiecesById?: ReadonlyMap<string, CompositorPiece>;
  lineTerminalOffsets?: CompasConfig["lineTerminalOffsets"];
  anotaciones?: Anotacion[];
  anotacionesVisibility?: AnotacionVisibility;
  onOpenNota?: (anotacion: Anotacion) => void;
  onOpenCuerda?: (anotacion: Anotacion) => void;
};

export function CifradoLyricsBlock({
  letra,
  acordes,
  barras = [],
  tipoCompas = "4-4",
  intensidadPlantilla = [],
  showCompas = false,
  showAcordes = true,
  activeBeatAnchors = [],
  onMarkersReady,
  onLineRef,
  activePlaybackLineIndex = null,
  compact = false,
  letraSheet = false,
  className = "",
  notacion = "es",
  cyclePiecesById,
  lineTerminalOffsets,
  anotaciones,
  anotacionesVisibility,
  onOpenNota,
}: CifradoLyricsBlockProps) {
  const lines = useMemo(() => splitLyricsLines(letra), [letra]);
  const tramos = useMemo(() => {
    if (anotacionesVisibility && anotacionesVisibility.rasgueo === false) {
      return [];
    }

    return colorTramoPorLinea(anotaciones ?? [], lines.length);
  }, [anotaciones, anotacionesVisibility, lines.length]);

  return (
    <div className={className}>
      {lines.map((line, lineIndex) => (
        <div
          key={lineIndex}
          ref={(element) => onLineRef?.(lineIndex, element)}
        >
          <CifradoLyricsLine
            lineIndex={lineIndex}
            text={line}
            acordes={acordes.filter((acorde) => acorde.lineIndex === lineIndex)}
            barras={barras.filter((barra) => barra.lineIndex === lineIndex)}
            nextLineHasCompas={barras.some(
              (barra) => barra.lineIndex === lineIndex + 1,
            )}
            lineTerminalOffsets={lineTerminalOffsets}
            tipoCompas={tipoCompas}
            intensidadPlantilla={intensidadPlantilla}
            showCompas={showCompas}
            showAcordes={showAcordes}
            activeBeatAnchors={activeBeatAnchors}
            onMarkersReady={onMarkersReady}
            compact={compact}
            letraSheet={letraSheet}
            isPlaybackActiveLine={
              activePlaybackLineIndex !== null &&
              activePlaybackLineIndex === lineIndex
            }
            notacion={notacion}
            cyclePiecesById={cyclePiecesById}
            anotaciones={
              anotaciones
                ? anotaciones.filter(
                    (anotacion) => anotacion.lineIndex === lineIndex,
                  )
                : undefined
            }
            anotacionesVisibility={anotacionesVisibility}
            onOpenNota={onOpenNota}
            tramoColor={tramos[lineIndex] ?? null}
          />
        </div>
      ))}
    </div>
  );
}
