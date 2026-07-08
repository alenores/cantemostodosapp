"use client";

import type { CompositorPiece } from "@/lib/compositor";
import {
  computeLineCompasMarkersPx,
  getLineContentEndOffset,
  resolveCharOffsetPx,
  type AcordePos,
  type BarraCompas,
  type CompasMarker,
  type TipoCompas,
} from "@/lib/cifrado";
import { getBarraBeatCount } from "@/lib/cifrado-barra-cycles";
import { getBarraIntensidad } from "@/lib/cifrado-intensidad";
import {
  formatAcordeNotacion,
  type NotacionAcordes,
} from "@/lib/notacion-acordes";
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import type { PreviewPlaybackAnchor } from "@/lib/cifrado-preview-play";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export const COMPAS_EXTENSION_SLOTS = 24;

export function getCompasExtensionStart(textLength: number): number {
  return textLength === 0 ? 1 : textLength;
}

export function splitLyricsLines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split("\n");
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
};

function CompasMarkersRow({
  markers,
  highlightMeasureLeftPx = null,
  activeBeatLeftPx = null,
  playbackHighlight = false,
  showMeasureStem = false,
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

  return (
    <div
      className={`relative ${showMeasureStem ? "mt-1 min-h-4" : "h-4"}`}
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
          return (
            <span
              key={`compas-measure-${index}`}
              className="absolute bottom-0"
              style={{ left: marker.leftPx }}
            >
              {showMeasureStem && (
                <span
                  className="absolute bottom-full left-0 w-px bg-text-muted/75"
                  style={{ height: "2.75rem" }}
                />
              )}
              <span
                className={`absolute bottom-0 left-0 rounded-full transition-all duration-75 ${
                  isDraggingMeasure || isActiveBeat
                    ? activeMeasureClass
                    : "bg-text-muted/90"
                } ${isActiveBeat && playbackHighlight ? "z-10 w-2" : "w-1.5"}`}
                style={{
                  height: isActiveBeat && playbackHighlight ? "1rem" : "0.75rem",
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
              width: isActiveBeat && playbackHighlight ? "0.75rem" : "0.625rem",
              height: isActiveBeat && playbackHighlight ? "0.625rem" : "0.25rem",
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
  activeBeatAnchors?: PreviewPlaybackAnchor[];
  onMarkersReady?: (lineIndex: number, markers: CompasMarker[]) => void;
  compact?: boolean;
  letraSheet?: boolean;
  isPlaybackActiveLine?: boolean;
  notacion?: NotacionAcordes;
  cyclePiecesById?: ReadonlyMap<string, CompositorPiece>;
};

export function CifradoLyricsLine({
  lineIndex,
  text,
  acordes,
  barras = [],
  tipoCompas = "4-4",
  intensidadPlantilla = [],
  showCompas = false,
  activeBeatAnchors = [],
  onMarkersReady,
  compact = false,
  letraSheet = false,
  isPlaybackActiveLine = false,
  notacion = "es",
  cyclePiecesById,
}: CifradoLyricsLineProps) {
  const textLaneRef = useRef<HTMLDivElement>(null);
  const [charPositions, setCharPositions] = useState<CharPosition[]>([]);
  const characters = [...text];
  const extensionStart = getCompasExtensionStart(characters.length);
  const compasConfigForLine = useMemo(
    () => ({
      tipoCompas,
      intensidadPlantilla,
      bpm: 0,
      barras: [] as BarraCompas[],
    }),
    [intensidadPlantilla, tipoCompas],
  );
  const activeBeatLeftPx =
    activeBeatAnchors.find((anchor) => anchor.lineIndex === lineIndex)?.leftPx ??
    null;

  const measurePositions = useCallback(() => {
    const container = textLaneRef.current;

    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
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
  }, []);

  useLayoutEffect(() => {
    measurePositions();
  }, [measurePositions, text, showCompas]);

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

  const compasMarkers = useMemo(
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
      showCompas,
    ],
  );

  useEffect(() => {
    onMarkersReady?.(lineIndex, compasMarkers);
  }, [compasMarkers, lineIndex, onMarkersReady]);

  return (
    <div
      ref={textLaneRef}
      className={`relative overflow-hidden text-letra-text ${
        letraSheet
          ? "mb-3"
          : `font-mono ${compact ? "mb-2 text-xs" : "mb-4 text-sm"}`
      }`}
      style={
        letraSheet
          ? {
              fontSize: "var(--letra-size)",
              lineHeight: "var(--letra-line-height)",
              fontWeight: "var(--letra-weight)",
            }
          : undefined
      }
    >
      {isPlaybackActiveLine && (
        <span
          className="pointer-events-none absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-blue-500/55"
          aria-hidden="true"
        />
      )}
      <div className="pointer-events-none relative flex w-full items-baseline pt-5">
        <span className="inline shrink-0">
          {characters.length === 0 ? (
            <span data-char-index={0}> </span>
          ) : (
            characters.map((char, charIndex) => (
              <span key={charIndex} data-char-index={charIndex}>
                {char}
              </span>
            ))
          )}
        </span>

        {showCompas && (
          <span
            className={`ml-1 inline-flex min-h-[1.25rem] min-w-[10ch] flex-1 border-l border-dashed pl-0.5 ${
              letraSheet
                ? "border-black/15"
                : "border-accent/30 bg-accent/[0.04] opacity-70"
            }`}
            aria-hidden="true"
          >
            {Array.from({ length: COMPAS_EXTENSION_SLOTS }).map((_, slot) => (
              <span
                key={`preview-ext-${slot}`}
                data-char-index={extensionStart + slot}
                className="inline-block min-w-[1ch] flex-1"
              >
                {" "}
              </span>
            ))}
          </span>
        )}
      </div>

      {acordes.map((acorde) => {
        const position = charPositions[acorde.charOffset];

        if (!position) {
          return null;
        }

        const dotTop = position.bottom + 2;
        const stemTop = compact ? 14 : 18;
        const stemHeight = Math.max(4, dotTop - stemTop);

        return (
          <div
            key={`cifrado-acorde-${lineIndex}-${acorde.charOffset}`}
            className="pointer-events-none absolute top-0"
            style={{ left: position.center }}
          >
            <span
              className={`absolute -translate-x-1/2 whitespace-nowrap rounded px-0.5 font-bold text-accent ${
                letraSheet ? "text-[length:var(--letra-size)]" : compact ? "text-[10px]" : "text-xs"
              }`}
              style={{ top: letraSheet ? 2 : compact ? 4 : 6, left: 0 }}
            >
              {formatAcordeNotacion(acorde.noteIndex, acorde.modifier, notacion)}
            </span>
            <span
              className="absolute w-px -translate-x-1/2 bg-accent/50"
              style={{ top: stemTop, left: 0, height: stemHeight }}
              aria-hidden="true"
            />
            <span
              className="absolute size-1 -translate-x-1/2 rounded-full bg-accent"
              style={{ top: dotTop, left: 0 }}
              aria-hidden="true"
            />
          </div>
        );
      })}

      {compasMarkers.length > 0 && (
        <div className="mt-1.5">
          <CompasMarkersRow
            markers={compasMarkers}
            activeBeatLeftPx={activeBeatLeftPx}
            playbackHighlight={activeBeatLeftPx !== null}
            showMeasureStem={false}
          />
        </div>
      )}
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
  activeBeatAnchors?: PreviewPlaybackAnchor[];
  onMarkersReady?: (lineIndex: number, markers: CompasMarker[]) => void;
  onLineRef?: (lineIndex: number, element: HTMLDivElement | null) => void;
  activePlaybackLineIndex?: number | null;
  compact?: boolean;
  letraSheet?: boolean;
  className?: string;
  notacion?: NotacionAcordes;
  cyclePiecesById?: ReadonlyMap<string, CompositorPiece>;
};

export function CifradoLyricsBlock({
  letra,
  acordes,
  barras = [],
  tipoCompas = "4-4",
  intensidadPlantilla = [],
  showCompas = false,
  activeBeatAnchors = [],
  onMarkersReady,
  onLineRef,
  activePlaybackLineIndex = null,
  compact = false,
  letraSheet = false,
  className = "",
  notacion = "es",
  cyclePiecesById,
}: CifradoLyricsBlockProps) {
  const lines = useMemo(() => splitLyricsLines(letra), [letra]);

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
            tipoCompas={tipoCompas}
            intensidadPlantilla={intensidadPlantilla}
            showCompas={showCompas}
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
          />
        </div>
      ))}
    </div>
  );
}
