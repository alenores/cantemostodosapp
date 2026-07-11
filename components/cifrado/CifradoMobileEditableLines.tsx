"use client";

import {
  CIFRADO_EDITOR_LINE_BG_CLASS,
  CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS,
  CIFRADO_EDITOR_TOOLBAR_SEGMENTED_CLASS,
  CIFRADO_LINE_LANE_CONTAINER_CLASS,
  cifradoEditorToolbarSegmentedButtonClass,
} from "@/components/cifrado/cifrado-controls-ui";
import { AcordeLabel } from "@/components/cifrado/AcordeLabel";
import { CifradoMobileCompasMarkers } from "@/components/cifrado/CifradoMobileCompasMarkers";
import { CifradoMobileCompasPanel } from "@/components/cifrado/CifradoMobileCompasPanel";
import { splitLyricsLines } from "@/components/cifrado/CifradoLyricsView";
import { TapButton } from "@/components/ui/TapFeedback";
import { getBarraBeatCount } from "@/lib/cifrado-barra-cycles";
import { getBarraIntensidad } from "@/lib/cifrado-intensidad";
import {
  computeLineCompasMarkersPx,
  getLineLaneStart,
  LINE_LANE_SLOT_WIDTH_PX,
  resolveCharOffsetPx,
  type AcordePos,
  type BarraCompas,
  type CompasConfig,
} from "@/lib/cifrado";
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import type { NotacionAcordes } from "@/lib/notacion-acordes";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type MobileModoInsercion = "acordes" | "compas" | "letra";

type CharPosition = {
  left: number;
  center: number;
  bottom: number;
};

type LinePos = { lineIndex: number; charOffset: number };

type CifradoMobileEditableLinesProps = {
  letra: string;
  acordes: AcordePos[];
  notacion?: NotacionAcordes;
  activeLineIndex: number | null;
  modoInsercion: MobileModoInsercion;
  selectedKey?: string | null;
  positionSelectEnabled?: boolean;
  /** Congela medidas del renglón (p. ej. con el sheet de acorde abierto). */
  freezeChordLayout?: boolean;
  /** Acorde en modo arrastre (solo horizontal en su renglón). */
  dragTarget?: LinePos | null;
  /** Posición original del acorde mientras se arrastra (vista previa). */
  dragOrigin?: LinePos | null;
  compasConfig?: CompasConfig | null;
  selectedBarra?: LinePos | null;
  barDragTarget?: LinePos | null;
  barDragOrigin?: LinePos | null;
  onActivateLine: (lineIndex: number) => void;
  onModoInsercionChange: (modo: MobileModoInsercion) => void;
  onSelectPosition: (lineIndex: number, charOffset: number) => void;
  onLineTextChange?: (lineIndex: number, newText: string) => void;
  onDragMove?: (toCharOffset: number) => void;
  onEndDrag?: () => void;
  onCompasTap?: (lineIndex: number, charOffset: number) => void;
  onCycleGolpesChange?: (golpes: number) => void;
  onCycleIntensidadSlot?: (slotIndex: number) => void;
  onClearBarraSelection?: () => void;
  onStartBarDrag?: () => void;
  onRemoveBarra?: () => void;
  onBarDragMove?: (toCharOffset: number) => void;
  onEndBarDrag?: () => void;
  compasCycleGolpes?: number;
  compasIntensidadPattern?: MetronomeBeatLevel[];
  selectedCompasNumero?: number | null;
};

function lineKey(lineIndex: number, charOffset: number): string {
  return `${lineIndex}:${charOffset}`;
}

type MobileLineRowProps = {
  lineIndex: number;
  text: string;
  lineAcordes: AcordePos[];
  lineBarras: BarraCompas[];
  compasConfig: CompasConfig | null;
  notacion: NotacionAcordes;
  isActive: boolean;
  isDimmed: boolean;
  isLetraEdit: boolean;
  freezeChordLayout: boolean;
  selectedKey: string | null;
  selectedBarraOffset: number | null;
  dragCharOffset: number | null;
  dragOriginOffset: number | null;
  barDragCharOffset: number | null;
  barDragOriginOffset: number | null;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onLineTextChange?: (lineIndex: number, newText: string) => void;
  onDragMove?: (toCharOffset: number) => void;
  onBarDragMove?: (toCharOffset: number) => void;
  onSelectBarra?: (charOffset: number) => void;
};

/**
 * Un renglón: letra + acordes con palito y circulito igual que en PC.
 */
function MobileLineRow({
  lineIndex,
  text,
  lineAcordes,
  lineBarras,
  compasConfig,
  notacion,
  isActive,
  isDimmed,
  isLetraEdit,
  freezeChordLayout,
  selectedKey,
  selectedBarraOffset,
  dragCharOffset,
  dragOriginOffset,
  barDragCharOffset,
  barDragOriginOffset,
  onClick,
  onLineTextChange,
  onDragMove,
  onBarDragMove,
  onSelectBarra,
}: MobileLineRowProps) {
  const lineRef = useRef<HTMLElement | null>(null);
  const textLaneRef = useRef<HTMLDivElement>(null);
  const letraInputRef = useRef<HTMLInputElement>(null);
  const [charPositions, setCharPositions] = useState<CharPosition[]>([]);
  const [laneSlotCount, setLaneSlotCount] = useState(8);
  const [letraDraft, setLetraDraft] = useState(text);
  const dragPointerIdRef = useRef<number | null>(null);
  const characters = Array.from(text);
  const laneStart = getLineLaneStart(characters.length);
  const isChordDragMode = dragCharOffset !== null;
  const isBarDragMode = barDragCharOffset !== null;
  const isDragMode = isChordDragMode || isBarDragMode;

  const lineAcordesRef = useRef(lineAcordes);
  const lineBarrasRef = useRef(lineBarras);
  const textRef = useRef(text);
  const dragCharOffsetRef = useRef(dragCharOffset);
  const dragOriginOffsetRef = useRef(dragOriginOffset);
  const barDragCharOffsetRef = useRef(barDragCharOffset);
  const barDragOriginOffsetRef = useRef(barDragOriginOffset);

  lineAcordesRef.current = lineAcordes;
  lineBarrasRef.current = lineBarras;
  textRef.current = text;
  dragCharOffsetRef.current = dragCharOffset;
  dragOriginOffsetRef.current = dragOriginOffset;
  barDragCharOffsetRef.current = barDragCharOffset;
  barDragOriginOffsetRef.current = barDragOriginOffset;

  const measurePositions = useCallback(() => {
    const container = textLaneRef.current;

    if (!container) {
      return;
    }

    const lineAcordesCurrent = lineAcordesRef.current;
    const lineBarrasCurrent = lineBarrasRef.current;
    const textCurrent = textRef.current;
    const dragCharOffsetCurrent = dragCharOffsetRef.current;
    const dragOriginOffsetCurrent = dragOriginOffsetRef.current;
    const barDragCharOffsetCurrent = barDragCharOffsetRef.current;
    const barDragOriginOffsetCurrent = barDragOriginOffsetRef.current;

    const containerRect = container.getBoundingClientRect();
    const textSpan = container.querySelector("[data-mobile-line-text]");
    const textWidthPx = textSpan
      ? textSpan.getBoundingClientRect().width
      : 0;
    const remainingPx = Math.max(0, containerRect.width - textWidthPx);
    const fittedLaneSlotCount = Math.max(
      8,
      Math.floor(
        (textCurrent.length <= 0 ? containerRect.width : remainingPx) /
          LINE_LANE_SLOT_WIDTH_PX,
      ),
    );
    // Si un acorde quedó más allá del carril visible, ampliar casillas
    // para que no “desaparezca” al dejar de medirse esa posición.
    const maxAcordeOffset = Math.max(
      lineAcordesCurrent.reduce(
        (max, acorde) => Math.max(max, acorde.charOffset),
        -1,
      ),
      lineBarrasCurrent.reduce(
        (max, barra) => Math.max(max, barra.charOffset),
        -1,
      ),
      dragCharOffsetCurrent ?? -1,
      dragOriginOffsetCurrent ?? -1,
      barDragCharOffsetCurrent ?? -1,
      barDragOriginOffsetCurrent ?? -1,
    );
    const slotsNeededForChords =
      maxAcordeOffset < 0
        ? 0
        : textCurrent.length <= 0
          ? maxAcordeOffset + 1
          : Math.max(
              0,
              maxAcordeOffset - getLineLaneStart(textCurrent.length) + 1,
            );
    const nextLaneSlotCount = Math.max(
      fittedLaneSlotCount,
      slotsNeededForChords,
    );

    setLaneSlotCount((current) =>
      current === nextLaneSlotCount ? current : nextLaneSlotCount,
    );

    const spans = container.querySelectorAll("[data-char-offset]");
    const positions: CharPosition[] = [];

    spans.forEach((span) => {
      const index = Number((span as HTMLElement).dataset.charOffset);

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

  const lineAcordesSignature = lineAcordes
    .map(
      (acorde) =>
        `${acorde.charOffset}:${acorde.noteIndex}:${acorde.modifier}`,
    )
    .join("|");
  const lineBarrasSignature = lineBarras
    .map((barra) => `${barra.charOffset}:${barra.compasNumero}`)
    .join("|");

  useLayoutEffect(() => {
    if (freezeChordLayout) {
      return;
    }

    measurePositions();
  }, [
    barDragCharOffset,
    barDragOriginOffset,
    dragCharOffset,
    dragOriginOffset,
    freezeChordLayout,
    laneSlotCount,
    lineAcordesSignature,
    lineBarrasSignature,
    measurePositions,
    text,
  ]);

  // Sin ResizeObserver: seleccionar / tabs re-renderizan y no deben remedir.

  useEffect(() => {
    setLetraDraft(text);
  }, [lineIndex, text]);

  useEffect(() => {
    if (!isLetraEdit) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const input = letraInputRef.current;

      if (!input) {
        return;
      }

      input.focus();
      const length = input.value.length;
      input.setSelectionRange(length, length);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isLetraEdit, lineIndex]);

  function commitLetraDraft(nextText: string) {
    const sanitized = nextText.replace(/[\r\n]/g, "");
    setLetraDraft(sanitized);
    onLineTextChange?.(lineIndex, sanitized);
  }

  function nearestOffsetFromClientX(clientX: number): number {
    const container = textLaneRef.current;

    if (!container || charPositions.length === 0) {
      return 0;
    }

    const containerLeft = container.getBoundingClientRect().left;
    const relativeX = clientX - containerLeft;
    let nearestOffset = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    charPositions.forEach((position, offset) => {
      if (!position) {
        return;
      }

      const distance = Math.abs(position.center - relativeX);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestOffset = offset;
      }
    });

    return nearestOffset;
  }

  function resolvePosition(charOffset: number): CharPosition | null {
    const exact = charPositions[charOffset];

    if (exact) {
      return exact;
    }

    let nearest: CharPosition | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    charPositions.forEach((position, offset) => {
      if (!position) {
        return;
      }

      const distance = Math.abs(offset - charOffset);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = position;
      }
    });

    return nearest;
  }

  function handleDragPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragPointerIdRef.current = event.pointerId;
  }

  function handleDragPointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (dragPointerIdRef.current !== event.pointerId) {
      return;
    }

    const nextOffset = nearestOffsetFromClientX(event.clientX);

    if (isBarDragMode && onBarDragMove && barDragCharOffset !== null) {
      if (nextOffset !== barDragCharOffset) {
        onBarDragMove(nextOffset);
      }
      return;
    }

    if (
      !onDragMove ||
      dragCharOffset === null
    ) {
      return;
    }

    if (nextOffset !== dragCharOffset) {
      onDragMove(nextOffset);
    }
  }

  function handleDragPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragPointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragPointerIdRef.current = null;
  }

  function handleDragLineTap(event: MouseEvent<HTMLDivElement>) {
    const moveHandler = isBarDragMode ? onBarDragMove : onDragMove;
    const currentOffset = isBarDragMode ? barDragCharOffset : dragCharOffset;

    if (!moveHandler || currentOffset === null) {
      return;
    }

    // Si el toque fue en el agarre, no tratarlo como tap de posición.
    if ((event.target as HTMLElement).closest("[data-chord-drag-handle]")) {
      return;
    }

    const targets = event.currentTarget.querySelectorAll<HTMLElement>(
      "[data-char-offset]",
    );

    if (targets.length === 0) {
      return;
    }

    let nearestOffset = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    targets.forEach((element) => {
      const offset = Number(element.dataset.charOffset);

      if (Number.isNaN(offset)) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const distance = Math.abs(center - event.clientX);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestOffset = offset;
      }
    });

    if (nearestOffset !== currentOffset) {
      moveHandler(nearestOffset);
    }
  }

  const barrasParaRender = useMemo(() => {
    if (barDragCharOffset === null || barDragOriginOffset === null) {
      return lineBarras;
    }

    return lineBarras.map((barra) =>
      barra.charOffset === barDragOriginOffset
        ? { ...barra, charOffset: barDragCharOffset }
        : barra,
    );
  }, [barDragCharOffset, barDragOriginOffset, lineBarras]);

  const compasMarkers = useMemo(() => {
    if (!compasConfig || barrasParaRender.length === 0) {
      return [];
    }

    return computeLineCompasMarkersPx(
      barrasParaRender,
      (barra) => getBarraBeatCount(barra, compasConfig),
      (offset) => resolveCharOffsetPx(offset, charPositions),
      (barra, beatIndex) =>
        getBarraIntensidad(barra, compasConfig)[beatIndex] ?? "medio",
    );
  }, [barrasParaRender, charPositions, compasConfig]);

  const selectedBarraLeftPx =
    selectedBarraOffset !== null
      ? resolveCharOffsetPx(
          barDragCharOffset !== null &&
            barDragOriginOffset === selectedBarraOffset
            ? barDragCharOffset
            : selectedBarraOffset,
          charPositions,
        ) ?? null
      : null;

  const lineClassName = `block w-full max-w-full overflow-x-hidden pb-5 text-left ${
    isDragMode ? "touch-none select-none" : ""
  } ${
    isActive || isDragMode
      ? `rounded-[12px] border border-accent/70 px-3 pt-1 shadow-[0_0_0_2px_rgba(232,145,90,0.18)] ${CIFRADO_EDITOR_LINE_BG_CLASS}`
      : `rounded-[8px] border border-border/80 px-3 pt-1 ${CIFRADO_EDITOR_LINE_BG_CLASS}`
  } ${isDimmed ? (isDragMode ? "opacity-30" : "opacity-45") : ""}`;

  const lineBody = (
    <>
      <div
        ref={textLaneRef}
        className="relative min-w-0 w-full font-mono text-sm text-letra-text"
      >
        <div className="relative flex w-full min-w-0 items-baseline pt-5 leading-relaxed">
          {characters.length === 0 ? (
            <span className={`${CIFRADO_LINE_LANE_CONTAINER_CLASS} w-full`}>
              {Array.from({ length: laneSlotCount }).map((_, slot) => {
                const charOffset = slot;
                const key = lineKey(lineIndex, charOffset);
                const isSelected = selectedKey === key;

                return (
                  <span
                    key={`lane-${key}`}
                    data-char-offset={charOffset}
                    className={`inline-block min-w-0 flex-1 basis-0 ${
                      isSelected ? "rounded-sm bg-accent/25" : ""
                    }`}
                  >
                    {slot === 0 ? " " : "\u00A0"}
                  </span>
                );
              })}
            </span>
          ) : (
            <>
              <span data-mobile-line-text="" className="inline shrink-0">
                {characters.map((character, charOffset) => {
                  const key = lineKey(lineIndex, charOffset);
                  const isSelected = selectedKey === key;

                  return (
                    <span
                      key={`char-${key}`}
                      data-char-offset={charOffset}
                      className={`inline-block min-w-[1ch] ${
                        isSelected ? "rounded-sm bg-accent/25" : ""
                      }`}
                    >
                      {character === " " ? "\u00A0" : character}
                    </span>
                  );
                })}
              </span>
              <span
                className={CIFRADO_LINE_LANE_CONTAINER_CLASS}
                aria-hidden="true"
              >
                {Array.from({ length: laneSlotCount }).map((_, slot) => {
                  const charOffset = laneStart + slot;
                  const key = lineKey(lineIndex, charOffset);
                  const isSelected = selectedKey === key;

                  return (
                    <span
                      key={`lane-${key}`}
                      data-char-offset={charOffset}
                      className={`inline-block min-w-0 flex-1 basis-0 ${
                        isSelected ? "rounded-sm bg-accent/25" : ""
                      }`}
                    >
                      {"\u00A0"}
                    </span>
                  );
                })}
              </span>
            </>
          )}
        </div>

        {lineAcordes.map((acorde) => {
          const isDraggedChord =
            isDragMode &&
            dragOriginOffset !== null &&
            acorde.charOffset === dragOriginOffset;
          const displayOffset = isDraggedChord
            ? (dragCharOffset as number)
            : acorde.charOffset;
          const position = resolvePosition(displayOffset);

          if (!position) {
            return null;
          }

          const key = lineKey(acorde.lineIndex, acorde.charOffset);
          const isSelected = isDragMode
            ? isDraggedChord
            : selectedKey === lineKey(acorde.lineIndex, displayOffset);
          const hasSelection = selectedKey !== null || isDragMode;
          const isFaded = hasSelection && !isSelected;
          const dotTop = position.bottom + 2;
          const stemTop = 18;
          const stemHeight = Math.max(4, dotTop - stemTop);

          return (
            <div
              key={`acorde-col-${key}`}
              className={`pointer-events-none absolute top-0 transition-opacity ${
                isFaded ? "opacity-35" : "opacity-100"
              }`}
              style={{ left: position.left }}
            >
              <span
                className={`absolute whitespace-nowrap rounded px-0.5 text-xs font-bold leading-none ${
                  isSelected ? "bg-accent text-white" : "text-accent"
                }`}
                style={{ top: 4, left: 0 }}
              >
                <AcordeLabel
                  noteIndex={acorde.noteIndex}
                  modifier={acorde.modifier}
                  bassNoteIndex={acorde.bassNoteIndex}
                  notacion={notacion}
                  className={isSelected ? "text-white" : "text-accent"}
                />
              </span>
              <span
                className={`absolute w-px ${
                  isSelected ? "bg-accent" : "bg-accent/50"
                }`}
                style={{ top: stemTop, left: 0, height: stemHeight }}
                aria-hidden="true"
              />
              <span
                className="absolute z-10 size-1 rounded-full bg-accent"
                style={{ top: dotTop, left: 0 }}
                aria-hidden="true"
              />
            </div>
          );
        })}

        {isChordDragMode && dragCharOffset !== null
          ? (() => {
              const position = resolvePosition(dragCharOffset);

              if (!position) {
                return null;
              }

              return (
                <div
                  data-chord-drag-handle=""
                  role="slider"
                  aria-label="Arrastrar acorde"
                  aria-valuenow={dragCharOffset}
                  tabIndex={0}
                  className="absolute z-20 flex h-11 w-11 -translate-x-1/2 items-center justify-center touch-none"
                  style={{
                    left: position.left,
                    top: 0,
                  }}
                  onPointerDown={handleDragPointerDown}
                  onPointerMove={handleDragPointerMove}
                  onPointerUp={handleDragPointerUp}
                  onPointerCancel={handleDragPointerUp}
                />
              );
            })()
          : null}

        {compasMarkers.length > 0 ? (
          <div className="relative">
            <CifradoMobileCompasMarkers
              markers={compasMarkers}
              selectedLeftPx={selectedBarraLeftPx}
            />
            {!isChordDragMode && !isBarDragMode
              ? lineBarras.map((barra) => {
                  const left =
                    resolveCharOffsetPx(barra.charOffset, charPositions) ?? 0;
                  const isSelected = selectedBarraOffset === barra.charOffset;

                  return (
                    <span
                      key={`bar-hit-${lineIndex}-${barra.charOffset}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Compás ${barra.compasNumero}`}
                      aria-pressed={isSelected}
                      className={`absolute bottom-0 z-30 flex h-8 w-8 -translate-x-1/2 cursor-pointer items-end justify-center ${
                        isSelected
                          ? "ring-2 ring-compositor-config ring-offset-1"
                          : ""
                      }`}
                      style={{ left }}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectBarra?.(barra.charOffset);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          onSelectBarra?.(barra.charOffset);
                        }
                      }}
                    />
                  );
                })
              : null}
            {isBarDragMode && barDragCharOffset !== null
              ? (() => {
                  const position = resolvePosition(barDragCharOffset);

                  if (!position) {
                    return null;
                  }

                  return (
                    <div
                      data-chord-drag-handle=""
                      role="slider"
                      aria-label="Arrastrar compás"
                      aria-valuenow={barDragCharOffset}
                      tabIndex={0}
                      className="absolute z-40 flex h-11 w-11 -translate-x-1/2 items-center justify-center touch-none"
                      style={{
                        left: position.left,
                        bottom: 0,
                      }}
                      onPointerDown={handleDragPointerDown}
                      onPointerMove={handleDragPointerMove}
                      onPointerUp={handleDragPointerUp}
                      onPointerCancel={handleDragPointerUp}
                    />
                  );
                })()
              : null}
          </div>
        ) : null}
      </div>
    </>
  );

  if (isDragMode) {
    return (
      <div
        ref={(element) => {
          lineRef.current = element;
        }}
        role="presentation"
        onClick={handleDragLineTap}
        className={`${lineClassName} select-none`}
      >
        {lineBody}
      </div>
    );
  }

  if (isLetraEdit) {
    return (
      <div
        ref={(element) => {
          lineRef.current = element;
        }}
        className={lineClassName}
      >
        <label className="sr-only" htmlFor={`mobile-letra-line-${lineIndex}`}>
          Letra del renglón
        </label>
        <input
          ref={letraInputRef}
          id={`mobile-letra-line-${lineIndex}`}
          type="text"
          value={letraDraft}
          enterKeyHint="done"
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck
          onChange={(event) => {
            commitLetraDraft(event.target.value);
          }}
          onBlur={() => {
            commitLetraDraft(letraDraft);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className="w-full min-w-0 bg-transparent py-3 font-mono text-base leading-relaxed text-letra-text outline-none placeholder:text-text-muted"
          placeholder="Escribí la letra de este renglón…"
        />
      </div>
    );
  }

  return (
    <button
      ref={(element) => {
        lineRef.current = element;
      }}
      type="button"
      onClick={onClick}
      className={lineClassName}
    >
      {lineBody}
    </button>
  );
}

/**
 * Renglones del editor celular: primero se activa el renglón;
 * con modo Acordes, tocás para poner/editar.
 */
export function CifradoMobileEditableLines({
  letra,
  acordes,
  notacion = "es",
  activeLineIndex,
  modoInsercion,
  selectedKey = null,
  positionSelectEnabled = true,
  freezeChordLayout = false,
  dragTarget = null,
  dragOrigin = null,
  compasConfig = null,
  selectedBarra = null,
  barDragTarget = null,
  barDragOrigin = null,
  onActivateLine,
  onModoInsercionChange,
  onSelectPosition,
  onLineTextChange,
  onDragMove,
  onEndDrag,
  onCompasTap,
  onCycleGolpesChange,
  onCycleIntensidadSlot,
  onClearBarraSelection,
  onStartBarDrag,
  onRemoveBarra,
  onBarDragMove,
  onEndBarDrag,
  compasCycleGolpes = 4,
  compasIntensidadPattern = [],
  selectedCompasNumero = null,
}: CifradoMobileEditableLinesProps) {
  const lines = splitLyricsLines(letra);
  const hasActiveLine = activeLineIndex !== null;
  const isChordDragMode = dragTarget !== null;
  const isBarDragMode = barDragTarget !== null;
  const isDragMode = isChordDragMode || isBarDragMode;

  function resolveCharOffset(event: MouseEvent<HTMLElement>): number {
    const targets = event.currentTarget.querySelectorAll<HTMLElement>(
      "[data-char-offset]",
    );

    if (targets.length === 0) {
      return 0;
    }

    let nearestOffset = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    targets.forEach((element) => {
      const offset = Number(element.dataset.charOffset);

      if (Number.isNaN(offset)) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const distance = Math.abs(center - event.clientX);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestOffset = offset;
      }
    });

    return nearestOffset;
  }

  function handleLineClick(
    event: MouseEvent<HTMLButtonElement>,
    lineIndex: number,
  ) {
    if (isDragMode) {
      return;
    }

    if (activeLineIndex !== lineIndex) {
      onActivateLine(lineIndex);
      return;
    }

    if (modoInsercion === "compas") {
      onCompasTap?.(lineIndex, resolveCharOffset(event));
      return;
    }

    if (!positionSelectEnabled || modoInsercion !== "acordes") {
      return;
    }

    onSelectPosition(lineIndex, resolveCharOffset(event));
  }

  return (
    <div className="relative space-y-2">
      {lines.map((text, lineIndex) => {
        const lineAcordes = acordes.filter(
          (acorde) => acorde.lineIndex === lineIndex,
        );
        const lineBarras =
          compasConfig?.barras.filter(
            (barra) => barra.lineIndex === lineIndex,
          ) ?? [];
        const isActive = activeLineIndex === lineIndex;
        const isChordDragLine = dragTarget?.lineIndex === lineIndex;
        const isBarDragLine = barDragTarget?.lineIndex === lineIndex;
        const isDragLine = isChordDragLine || isBarDragLine;
        const isDimmed = isDragMode
          ? !isDragLine
          : hasActiveLine && !isActive;

        return (
          <div
            key={`mobile-line-wrap-${lineIndex}`}
            className={`space-y-2 ${
              isDragLine
                ? "relative z-10"
                : isDragMode
                  ? "pointer-events-none relative z-0"
                  : ""
            }`}
          >
            <MobileLineRow
              lineIndex={lineIndex}
              text={text}
              lineAcordes={lineAcordes}
              lineBarras={lineBarras}
              compasConfig={compasConfig}
              notacion={notacion}
              isActive={isActive || isDragLine}
              isDimmed={isDimmed}
              isLetraEdit={
                isActive && modoInsercion === "letra" && !isDragMode
              }
              freezeChordLayout={freezeChordLayout}
              selectedKey={selectedKey}
              selectedBarraOffset={
                selectedBarra?.lineIndex === lineIndex
                  ? selectedBarra.charOffset
                  : null
              }
              dragCharOffset={isChordDragLine ? dragTarget.charOffset : null}
              dragOriginOffset={
                isChordDragLine && dragOrigin?.lineIndex === lineIndex
                  ? dragOrigin.charOffset
                  : null
              }
              barDragCharOffset={
                isBarDragLine ? barDragTarget.charOffset : null
              }
              barDragOriginOffset={
                isBarDragLine && barDragOrigin?.lineIndex === lineIndex
                  ? barDragOrigin.charOffset
                  : null
              }
              onClick={(event) => handleLineClick(event, lineIndex)}
              onLineTextChange={onLineTextChange}
              onDragMove={isChordDragLine ? onDragMove : undefined}
              onBarDragMove={isBarDragLine ? onBarDragMove : undefined}
              onSelectBarra={
                isActive && modoInsercion === "compas"
                  ? (charOffset) => onCompasTap?.(lineIndex, charOffset)
                  : undefined
              }
            />

            {isDragLine && (isChordDragLine ? onEndDrag : onEndBarDrag) ? (
              <div className="flex justify-center pt-1">
                <TapButton
                  type="button"
                  onClick={isChordDragLine ? onEndDrag : onEndBarDrag}
                  className={`min-w-[9rem] rounded-full px-6 py-2.5 text-sm font-bold shadow-lg ${CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS}`}
                >
                  Listo
                </TapButton>
              </div>
            ) : null}

            {!isDragMode && isActive ? (
              <div
                className={CIFRADO_EDITOR_TOOLBAR_SEGMENTED_CLASS}
                role="tablist"
                aria-label="Qué editar en el renglón"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={modoInsercion === "acordes"}
                  onClick={() => onModoInsercionChange("acordes")}
                  className={cifradoEditorToolbarSegmentedButtonClass(
                    modoInsercion === "acordes",
                  )}
                >
                  Acordes
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={modoInsercion === "compas"}
                  onClick={() => onModoInsercionChange("compas")}
                  className={cifradoEditorToolbarSegmentedButtonClass(
                    modoInsercion === "compas",
                  )}
                >
                  Compás
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={modoInsercion === "letra"}
                  onClick={() => onModoInsercionChange("letra")}
                  className={cifradoEditorToolbarSegmentedButtonClass(
                    modoInsercion === "letra",
                  )}
                >
                  Letra
                </button>
              </div>
            ) : null}

            {!isDragMode && isActive && modoInsercion === "acordes" ? (
              <p className="px-1 text-xs text-text-muted">
                Tocá un acorde para editarlo, o tocá la letra para poner uno
                nuevo.
              </p>
            ) : null}

            {!isDragMode &&
            isActive &&
            modoInsercion === "compas" &&
            onCycleGolpesChange &&
            onCycleIntensidadSlot &&
            onClearBarraSelection ? (
              <CifradoMobileCompasPanel
                cycleGolpes={compasCycleGolpes}
                onCycleGolpesChange={onCycleGolpesChange}
                intensidadPattern={compasIntensidadPattern}
                onCycleIntensidadSlot={onCycleIntensidadSlot}
                selectedCompasNumero={selectedCompasNumero}
                onClearSelection={onClearBarraSelection}
                onStartDrag={
                  selectedBarra && onStartBarDrag ? onStartBarDrag : undefined
                }
                onRemove={
                  selectedBarra && onRemoveBarra ? onRemoveBarra : undefined
                }
              />
            ) : null}

            {!isDragMode && isActive && modoInsercion === "letra" ? (
              <p className="px-1 text-xs text-text-muted">
                Editá la letra de este renglón. Enter o tocá afuera para listo.
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
