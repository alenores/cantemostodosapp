import { createDefaultIntensidadPlantilla } from "@/lib/cifrado-intensidad";
import { formatAcordeNotacion, type NotacionAcordes } from "@/lib/notacion-acordes";
import {
  BEATS_PER_MEASURE_MAX,
  BEATS_PER_MEASURE_MIN,
  type MetronomeBeatLevel,
} from "@/lib/metronomo";

export type { NotacionAcordes };
export const NOTAS_ES = [
  "Do",
  "Do#",
  "Re",
  "Re#",
  "Mi",
  "Fa",
  "Fa#",
  "Sol",
  "Sol#",
  "La",
  "La#",
  "Si",
] as const;

export type NotaIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const DEFAULT_TONALIDAD: NotaIndex = 7;
export const DEFAULT_BPM = 120;

// Modificadores de acorde disponibles
export const MODIFICADORES = [
  { id: "", label: "Mayor" },
  { id: "m", label: "Menor" },
  { id: "7", label: "7" },
  { id: "m7", label: "m7" },
  { id: "maj7", label: "maj7" },
  { id: "sus2", label: "sus2" },
  { id: "sus4", label: "sus4" },
  { id: "dim", label: "dim" },
  { id: "6", label: "6" },
  { id: "add9", label: "add9" },
] as const;

export type Modificador = (typeof MODIFICADORES)[number]["id"];

export type TipoCompas = "4-4" | "3-4" | "6-8";

export const COMPAS_LABELS: Record<TipoCompas, string> = {
  "4-4": "4/4",
  "3-4": "3/4",
  "6-8": "6/8",
};

export const TIPO_COMPAS_ORDER: readonly TipoCompas[] = ["4-4", "3-4", "6-8"];

export function getTipoCompasDenominator(tipo: TipoCompas): 4 | 8 {
  return tipo === "6-8" ? 8 : 4;
}

export function cycleTipoCompas(tipo: TipoCompas, delta: -1 | 1): TipoCompas {
  const index = TIPO_COMPAS_ORDER.indexOf(tipo);
  const next = Math.min(
    TIPO_COMPAS_ORDER.length - 1,
    Math.max(0, index + delta),
  );

  return TIPO_COMPAS_ORDER[next];
}

export function tipoCompasFromBeatCount(beats: number): TipoCompas | null {
  switch (beats) {
    case 3:
      return "3-4";
    case 4:
      return "4-4";
    case 6:
      return "6-8";
    default:
      return null;
  }
}

// Un acorde posicionado
export type AcordePos = {
  lineIndex: number;
  charOffset: number;
  noteIndex: NotaIndex;
  modifier: Modificador;
  /** Nota del bajo (derecha del /). Sin modificador propio. */
  bassNoteIndex?: NotaIndex;
};

// Una barra de compás posicionada (solo modo avanzado)
export type BarraCompas = {
  lineIndex: number;
  charOffset: number;
  compasNumero: number;
  /** Tipo de compás de este ciclo. Si falta, usa el de la plantilla al cargar. */
  tipoCompas?: TipoCompas;
  /** Intensidad por golpe de este compás (hasta el siguiente). Si falta, usa la plantilla. */
  intensidad?: MetronomeBeatLevel[];
  /** Ciclo guardado del Compositor para la batería de este compás. */
  cycleId?: string | null;
};

// Datos completos de cifrado (se guarda en columna `cifrado`)
export type CifradoData = {
  version: 1;
  acordes: AcordePos[];
};

// Configuración rítmica (se guarda en columna `compas_config`)
export type CompasConfig = {
  tipoCompas: TipoCompas;
  /** Golpes del ciclo al componer (1–10). Si falta, se infiere de tipoCompas. */
  cycleGolpes?: number;
  bpm: number;
  barras: BarraCompas[];
  /** Modelo de intensidad al colocar compases nuevos. */
  intensidadPlantilla?: MetronomeBeatLevel[];
  compositorPresetId?: TipoCompas;
  /** 2 = cada barra marca el inicio de un compás (movible). Ausente/1 = formato legacy. */
  barrasVersion?: 1 | 2;
  /** Cierre fijo del último compás por renglón (decisión del usuario). */
  lineTerminalOffsets?: LineTerminalOffset[];
};

export type LineTerminalOffset = {
  lineIndex: number;
  charOffset: number;
};

/** Mínimo charOffset de compás: inicio del renglón (primer carácter). */
export function clampCompasCharOffset(charOffset: number): number {
  return Math.max(0, Math.round(charOffset));
}

/** Máximo de ciclos al colocar compases de una vez en un renglón. */
export const MAX_COMPAS_PLACEMENT_CYCLE_COUNT = 128;

/** Ancho aproximado de cada casilla horizontal del renglón (px). */
export const LINE_LANE_SLOT_WIDTH_PX = 8;

/** Mínimo de casillas en el carril libre de un renglón. */
export const LINE_LANE_MIN_SLOT_COUNT = 80;

/** Primera casilla del carril libre a la derecha de la letra (o 0 si no hay texto). */
export function getLineLaneStart(textLength: number): number {
  return textLength > 0 ? textLength : 0;
}

/** Casillas del carril libre según el ancho visible del renglón. */
export function computeLineLaneSlotCount(
  containerWidthPx: number,
  textLength: number,
): number {
  const totalSlots = Math.max(
    LINE_LANE_MIN_SLOT_COUNT,
    Math.floor(containerWidthPx / LINE_LANE_SLOT_WIDTH_PX),
  );

  if (textLength <= 0) {
    return totalSlots;
  }

  return Math.max(8, totalSlots - textLength);
}

/** Última casilla válida del renglón (letra + carril libre). */
export function getLineMaxCharOffset(
  textLength: number,
  laneSlotCount: number,
): number {
  return Math.max(0, getLineLaneStart(textLength) + laneSlotCount - 1);
}

export function clampCompasCharOffsetToLane(
  charOffset: number,
  textLength: number,
  laneSlotCount: number,
): number {
  const maxOffset = getLineMaxCharOffset(textLength, laneSlotCount);

  return Math.min(Math.max(0, Math.round(charOffset)), maxOffset);
}

export function getLineTerminalOffset(
  config: CompasConfig,
  lineIndex: number,
): number | undefined {
  return config.lineTerminalOffsets?.find(
    (entry) => entry.lineIndex === lineIndex,
  )?.charOffset;
}

export function setLineTerminalOffset(
  config: CompasConfig,
  lineIndex: number,
  charOffset: number,
): CompasConfig {
  const clamped = clampCompasCharOffset(charOffset);
  const rest = (config.lineTerminalOffsets ?? []).filter(
    (entry) => entry.lineIndex !== lineIndex,
  );

  return {
    ...config,
    lineTerminalOffsets: [...rest, { lineIndex, charOffset: clamped }].sort(
      (a, b) => a.lineIndex - b.lineIndex,
    ),
  };
}

export function removeLineTerminalOffset(
  config: CompasConfig,
  lineIndex: number,
): CompasConfig {
  const rest = (config.lineTerminalOffsets ?? []).filter(
    (entry) => entry.lineIndex !== lineIndex,
  );

  if (rest.length === (config.lineTerminalOffsets?.length ?? 0)) {
    return config;
  }

  return {
    ...config,
    lineTerminalOffsets: rest.length > 0 ? rest : undefined,
  };
}

export function computeDefaultLineTerminalCharOffset(
  lineBarras: ReadonlyArray<BarraCompas>,
  contentEndOffset: number,
  textLength: number,
): number {
  if (lineBarras.length === 0) {
    return contentEndOffset;
  }

  const sorted = [...lineBarras].sort((a, b) => a.charOffset - b.charOffset);

  return resolveCompasSegmentEndCharOffset(
    sorted,
    sorted.length - 1,
    contentEndOffset,
    textLength,
  );
}

export function resolveLineTerminalCharOffset(
  config: CompasConfig,
  lineIndex: number,
  lineBarras: ReadonlyArray<BarraCompas>,
  contentEndOffset: number,
  textLength: number,
): number | undefined {
  if (lineBarras.length === 0) {
    return undefined;
  }

  const stored = getLineTerminalOffset(config, lineIndex);

  if (stored !== undefined) {
    return stored;
  }

  return undefined;
}

export function ensureLineTerminalOffset(
  config: CompasConfig,
  _lineIndex: number,
  _contentEndOffset: number,
  _textLength: number,
): CompasConfig {
  return config;
}

export function resetLineTerminalOffset(
  config: CompasConfig,
  lineIndex: number,
  contentEndOffset: number,
  textLength: number,
): CompasConfig {
  const lineBarras = config.barras.filter((barra) => barra.lineIndex === lineIndex);

  if (lineBarras.length === 0) {
    return removeLineTerminalOffset(config, lineIndex);
  }

  const defaultTerminal = computeDefaultLineTerminalCharOffset(
    lineBarras,
    contentEndOffset,
    textLength,
  );

  return setLineTerminalOffset(config, lineIndex, defaultTerminal);
}

export function initializeMissingLineTerminalOffsets(
  config: CompasConfig,
  _lines: readonly string[],
  _cifrado: CifradoData,
): CompasConfig {
  return config;
}

export function moveLineTerminalOffset(
  config: CompasConfig,
  lineIndex: number,
  toOffset: number,
): CompasConfig {
  const lineBarras = config.barras
    .filter((barra) => barra.lineIndex === lineIndex)
    .sort((a, b) => a.charOffset - b.charOffset);
  const lastBarra = lineBarras[lineBarras.length - 1];
  const minOffset = lastBarra ? lastBarra.charOffset + 1 : 0;

  return setLineTerminalOffset(
    config,
    lineIndex,
    Math.max(minOffset, clampCompasCharOffset(toOffset)),
  );
}

/** Fin del tramo visual de un compás cuando no hay otra barra a la derecha. */
export function resolveCompasSegmentEndCharOffset(
  sortedBarras: ReadonlyArray<BarraCompas>,
  barraIndex: number,
  contentEndOffset: number,
  textLength: number,
  terminalCharOffset?: number,
): number {
  const barra = sortedBarras[barraIndex]!;

  if (barraIndex + 1 < sortedBarras.length) {
    return sortedBarras[barraIndex + 1]!.charOffset;
  }

  if (terminalCharOffset !== undefined) {
    return clampCompasCharOffset(terminalCharOffset);
  }

  return Math.max(contentEndOffset, barra.charOffset);
}

/** Fin horizontal del tramo visual; el último ciclo replica el ancho en px del anterior. */
export function resolveCompasSegmentEndPx(
  sortedBarras: ReadonlyArray<BarraCompas>,
  barraIndex: number,
  getOffsetPx: (charOffset: number) => number | undefined,
  contentEndOffset: number | undefined,
  textLength: number,
  terminalCharOffset?: number,
): number | undefined {
  const barra = sortedBarras[barraIndex]!;
  const startPx = getOffsetPx(barra.charOffset);

  if (startPx === undefined) {
    return undefined;
  }

  const nextBarra = sortedBarras[barraIndex + 1];

  if (nextBarra) {
    return getOffsetPx(nextBarra.charOffset);
  }

  if (terminalCharOffset !== undefined) {
    const terminalPx = getOffsetPx(terminalCharOffset);

    if (terminalPx !== undefined && terminalPx > startPx) {
      return terminalPx;
    }
  }

  if (sortedBarras.length > 1 && barraIndex > 0) {
    const prevBarra = sortedBarras[barraIndex - 1]!;
    const prevStartPx = getOffsetPx(prevBarra.charOffset);
    const prevEndPx = getOffsetPx(barra.charOffset);

    if (
      prevStartPx !== undefined &&
      prevEndPx !== undefined &&
      prevEndPx > prevStartPx
    ) {
      return startPx + (prevEndPx - prevStartPx);
    }
  }

  if (contentEndOffset === undefined) {
    return undefined;
  }

  const endOffset = resolveCompasSegmentEndCharOffset(
    sortedBarras,
    barraIndex,
    contentEndOffset,
    textLength,
    terminalCharOffset,
  );

  return getOffsetPx(endOffset);
}

/** True si el offset cae estrictamente entre dos inicios de ciclo consecutivos. */
export function isCharOffsetInsideCompasCycle(
  lineBarras: ReadonlyArray<BarraCompas>,
  charOffset: number,
  excludeCharOffset?: number,
): boolean {
  const sorted = [...lineBarras]
    .filter((barra) => barra.charOffset !== excludeCharOffset)
    .sort((a, b) => a.charOffset - b.charOffset);

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index]!.charOffset;
    const nextStart = sorted[index + 1]!.charOffset;

    if (charOffset > start && charOffset < nextStart) {
      return true;
    }
  }

  return false;
}

/** Última posición horizontal con letra, acorde o compás en un renglón. */
export function getLineContentEndOffset(
  textLength: number,
  acordes: ReadonlyArray<{ charOffset: number }>,
  barras: ReadonlyArray<{ charOffset: number }>,
): number {
  let end = textLength > 0 ? textLength - 1 : 0;

  for (const acorde of acordes) {
    end = Math.max(end, acorde.charOffset);
  }

  for (const barra of barras) {
    end = Math.max(end, barra.charOffset);
  }

  return end;
}

/** Posición donde empieza el contenido al pegar otro renglón a la derecha. */
export function getLineMergeAttachOffset(
  textLength: number,
  acordes: ReadonlyArray<{ charOffset: number }>,
  barras: ReadonlyArray<{ charOffset: number }>,
): number {
  return getLineContentEndOffset(textLength, acordes, barras) + 1;
}

export type LineMergePreview = {
  destLineIndex: number;
  sourceLineIndex: number;
  mergedText: string;
  attachOffset: number;
  destSegment: string;
  sourceSegment: string;
  /** Índice en mergedText donde empieza el texto pegado (letra). */
  sourceTextStart: number;
};

/** Vista previa al pegar un renglón en otro (sin mutar datos). */
export function computeLineMergePreview(
  lines: string[],
  sourceLineIndex: number,
  destLineIndex: number,
  destAcordes: ReadonlyArray<{ charOffset: number }>,
  destBarras: ReadonlyArray<{ charOffset: number }>,
): LineMergePreview | null {
  if (
    sourceLineIndex === destLineIndex ||
    sourceLineIndex < 0 ||
    destLineIndex < 0 ||
    sourceLineIndex >= lines.length ||
    destLineIndex >= lines.length
  ) {
    return null;
  }

  const destText = lines[destLineIndex] ?? "";
  const sourceText = lines[sourceLineIndex] ?? "";
  const attachOffset = getLineMergeAttachOffset(
    destText.length,
    destAcordes,
    destBarras,
  );

  return {
    destLineIndex,
    sourceLineIndex,
    mergedText: destText + sourceText,
    attachOffset,
    destSegment: destText,
    sourceSegment: sourceText,
    sourceTextStart: destText.length,
  };
}

/** Reparte offsets de compás de forma uniforme sobre el contenido útil del renglón. */
export function computeEvenCompasPlacementOffsets(
  cycleCount: number,
  startOffset: number,
  contentEndOffset: number,
): number[] {
  const count = Math.min(
    MAX_COMPAS_PLACEMENT_CYCLE_COUNT,
    Math.max(1, Math.floor(cycleCount)),
  );
  const normalizedStart = clampCompasCharOffset(startOffset);
  const rangeEnd = Math.max(normalizedStart, contentEndOffset);

  if (count === 1) {
    return [normalizedStart];
  }

  const offsets: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const offset = Math.round(
      normalizedStart + (index * (rangeEnd - normalizedStart)) / (count - 1),
    );
    offsets.push(clampCompasCharOffset(offset));
  }

  const unique: number[] = [];

  for (const offset of offsets) {
    if (unique.length === 0 || unique[unique.length - 1] !== offset) {
      unique.push(offset);
    }
  }

  return unique;
}

export type PlaceCompasBarrasOnLineOptions = {
  replaceExisting?: boolean;
};

/** Coloca varias barras de compás en un renglón y renumerá los compases de esa línea. */
export function placeCompasBarrasOnLine(
  config: CompasConfig,
  lineIndex: number,
  offsets: number[],
  barraTemplate: Omit<BarraCompas, "lineIndex" | "charOffset" | "compasNumero">,
  options: PlaceCompasBarrasOnLineOptions = {},
): CompasConfig {
  let next = config;

  if (options.replaceExisting) {
    next = {
      ...next,
      barras: next.barras.filter((barra) => barra.lineIndex !== lineIndex),
    };
  }

  for (const charOffset of offsets) {
    next = upsertBarraCompas(next, {
      ...barraTemplate,
      lineIndex,
      charOffset,
      compasNumero: 1,
    });
  }

  return renumberLineBarrasCompas(next, lineIndex);
}

/** Remapea charOffset al pegar acordes en un renglón con distinta longitud de letra. */
export function remapCharOffsetForLineCopy(
  charOffset: number,
  sourceTextLength: number,
  targetTextLength: number,
  sourceLaneSlotCount = LINE_LANE_MIN_SLOT_COUNT,
  targetLaneSlotCount = LINE_LANE_MIN_SLOT_COUNT,
): number {
  const sourceMax = getLineMaxCharOffset(sourceTextLength, sourceLaneSlotCount);
  const targetMax = getLineMaxCharOffset(targetTextLength, targetLaneSlotCount);

  if (sourceMax <= 0) {
    return 0;
  }

  if (sourceMax === targetMax) {
    return clampCompasCharOffset(charOffset);
  }

  const ratio = charOffset / sourceMax;

  return clampCompasCharOffset(Math.round(ratio * targetMax));
}

/** Remapea barras de compás preservando el espaciado relativo del patrón en el renglón. */
export function remapCompasPatternForLineCopy(
  template: BarraCompas[],
  sourceTextLength: number,
  targetTextLength: number,
  sourceLaneSlotCount = LINE_LANE_MIN_SLOT_COUNT,
  targetLaneSlotCount = LINE_LANE_MIN_SLOT_COUNT,
): number[] {
  if (template.length === 0) {
    return [];
  }

  const sorted = [...template].sort((a, b) => a.charOffset - b.charOffset);
  const firstOffset = sorted[0].charOffset;
  const lastOffset = sorted[sorted.length - 1].charOffset;

  if (sorted.length === 1) {
    return [
      remapCharOffsetForLineCopy(
        firstOffset,
        sourceTextLength,
        targetTextLength,
        sourceLaneSlotCount,
        targetLaneSlotCount,
      ),
    ];
  }

  const targetFirstOffset =
    firstOffset === 0
      ? 0
      : remapCharOffsetForLineCopy(
          firstOffset,
          sourceTextLength,
          targetTextLength,
          sourceLaneSlotCount,
          targetLaneSlotCount,
        );
  const targetLastOffset = remapCharOffsetForLineCopy(
    lastOffset,
    sourceTextLength,
    targetTextLength,
    sourceLaneSlotCount,
    targetLaneSlotCount,
  );
  const clampedLastOffset = Math.max(targetFirstOffset, targetLastOffset);
  const targetMax = getLineMaxCharOffset(targetTextLength, targetLaneSlotCount);

  const sourceSpan = lastOffset - firstOffset;
  const targetSpan = clampedLastOffset - targetFirstOffset;

  if (sourceSpan === 0) {
    return sorted.map(() => targetFirstOffset);
  }

  const usedOffsets = new Set<number>();

  return sorted.map((barra) => {
    const relative = (barra.charOffset - firstOffset) / sourceSpan;
    let nextOffset = clampCompasCharOffset(
      Math.round(targetFirstOffset + relative * targetSpan),
    );
    nextOffset = Math.min(nextOffset, targetMax);

    while (usedOffsets.has(nextOffset) && nextOffset < targetMax) {
      nextOffset += 1;
    }

    usedOffsets.add(nextOffset);

    return nextOffset;
  });
}

export function getBeatCountForCompas(tipo: TipoCompas): number {
  switch (tipo) {
    case "3-4":
      return 3;
    case "6-8":
      return 6;
    default:
      return 4;
  }
}

export function clampCompasCycleGolpes(golpes: number): number {
  return Math.min(
    BEATS_PER_MEASURE_MAX,
    Math.max(BEATS_PER_MEASURE_MIN, Math.round(golpes)),
  );
}

export function getCompasCycleGolpes(config: CompasConfig): number {
  if (
    typeof config.cycleGolpes === "number" &&
    Number.isFinite(config.cycleGolpes)
  ) {
    return clampCompasCycleGolpes(config.cycleGolpes);
  }

  return getBeatCountForCompas(config.tipoCompas);
}

export function computeBeatTickCenters(
  segmentStartPx: number,
  segmentEndPx: number,
  beatCount: number,
): number[] {
  const width = segmentEndPx - segmentStartPx;

  if (width <= 0 || beatCount <= 0) {
    return [];
  }

  const step = width / beatCount;
  const centers: number[] = [];

  for (let beat = 0; beat < beatCount; beat += 1) {
    centers.push(segmentStartPx + step * (beat + 0.5));
  }

  return centers;
}

export type ComputeLineCompasMarkersOptions = {
  contentEndOffset: number;
  textLength: number;
  /** Cierre fijo del último compás (charOffset). */
  lineTerminalCharOffset?: number;
  /** Agrega una barra de cierre ficticia al final del renglón (solo visual). */
  appendTerminalMeasure?: boolean;
  /** Intensidad opcional para la barra de cierre ficticia. */
  terminalIntensidad?: MetronomeBeatLevel;
};

export function computeLineBeatTicks(
  barras: BarraCompas[],
  getOffsetPx: (charOffset: number) => number | undefined,
  getBeatCount: (barra: BarraCompas) => number,
  options: ComputeLineCompasMarkersOptions,
): number[] {
  if (barras.length === 0) {
    return [];
  }

  const sorted = [...barras].sort((a, b) => a.charOffset - b.charOffset);
  const ticks: number[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const barra = sorted[index]!;
    const beatCount = getBeatCount(barra);

    if (beatCount <= 0) {
      continue;
    }

    const startPx = getOffsetPx(barra.charOffset);

    if (startPx === undefined) {
      continue;
    }

    const nextBarra = sorted[index + 1];
    const endPx = nextBarra ? getOffsetPx(nextBarra.charOffset) : undefined;

    if (endPx === undefined || endPx <= startPx) {
      continue;
    }

    ticks.push(...computeBeatTickCenters(startPx, endPx, beatCount));
  }

  return ticks;
}

export type CompasMarkerKind = "measure" | "beat";

export type CompasMarker = {
  kind: CompasMarkerKind;
  leftPx: number;
  intensidad?: MetronomeBeatLevel;
  cycleId?: string | null;
  /** Índice del golpe dentro del compás (0 = primer golpe). */
  cycleStepIndex?: number;
  /** Número de ciclo/compás en el renglón (solo en inicios de ciclo reales). */
  compasNumero?: number;
};

/** Espacio entre el renglón de letra y la fila de compás en previsualización (`mt-1.5`). */
export const PREVIEW_COMPAS_ROW_GAP_PX = 6;

/** Altura de la fila de golpes en previsualización (`h-4`). */
export const PREVIEW_COMPAS_ROW_HEIGHT_PX = 16;

/** Desplazamiento vertical del puntito del acorde respecto al baseline medido. */
export const PREVIEW_CHORD_DOT_OFFSET_PX = 2;

/** Diámetro del puntito del acorde en previsualización (`size-1`). */
export const PREVIEW_CHORD_DOT_SIZE_PX = 4;

/** Altura del puntito de inicio de compás en previsualización (`0.375rem`). */
export const PREVIEW_MEASURE_MARKER_DOT_HEIGHT_PX = 6;

/** Ajuste fino para que el tallo de compás toque el puntito del acorde. */
export const PREVIEW_MEASURE_STEM_JOIN_NUDGE_PX = 2;

export type PreviewCharPosition = {
  bottom: number;
};

export function resolvePreviewChordDotJoinY(
  charPositions: ReadonlyArray<PreviewCharPosition | undefined>,
  acordes: ReadonlyArray<Pick<AcordePos, "charOffset">>,
  textLength: number,
): number {
  const lyricBottoms = charPositions
    .slice(0, Math.max(textLength, 1))
    .map((position) => position?.bottom)
    .filter((bottom): bottom is number => bottom !== undefined);

  const textRowBottom =
    lyricBottoms.length > 0 ? Math.max(...lyricBottoms) : 0;

  const chordDotTops = acordes
    .map((acorde) => charPositions[acorde.charOffset]?.bottom)
    .filter((bottom): bottom is number => bottom !== undefined)
    .map((bottom) => bottom + PREVIEW_CHORD_DOT_OFFSET_PX);

  const chordDotTop =
    chordDotTops.length > 0
      ? Math.max(...chordDotTops)
      : textRowBottom + PREVIEW_CHORD_DOT_OFFSET_PX;

  return chordDotTop - PREVIEW_MEASURE_STEM_JOIN_NUDGE_PX;
}

export function computePreviewMeasureStemHeightPx(
  charPositions: ReadonlyArray<PreviewCharPosition | undefined>,
  acordes: ReadonlyArray<Pick<AcordePos, "charOffset">>,
  textLength: number,
  compasRowBottomPx?: number,
): number {
  const lyricBottoms = charPositions
    .slice(0, Math.max(textLength, 1))
    .map((position) => position?.bottom)
    .filter((bottom): bottom is number => bottom !== undefined);

  const textRowBottom =
    lyricBottoms.length > 0 ? Math.max(...lyricBottoms) : 0;

  const chordDotJoinY = resolvePreviewChordDotJoinY(
    charPositions,
    acordes,
    textLength,
  );

  const compasMarkerBottom =
    compasRowBottomPx ??
    textRowBottom + PREVIEW_COMPAS_ROW_GAP_PX + PREVIEW_COMPAS_ROW_HEIGHT_PX;

  return Math.ceil(
    Math.max(
      4,
      compasMarkerBottom -
        PREVIEW_MEASURE_MARKER_DOT_HEIGHT_PX -
        chordDotJoinY,
    ),
  );
}

export function computeLineCompasMarkersPx(
  barras: BarraCompas[],
  getBeatCount: (barra: BarraCompas) => number,
  getOffsetPx: (charOffset: number) => number | undefined,
  resolveIntensidad?: (
    barra: BarraCompas,
    beatIndexInMeasure: number,
  ) => MetronomeBeatLevel,
  options?: ComputeLineCompasMarkersOptions,
): CompasMarker[] {
  if (barras.length === 0) {
    return [];
  }

  const sorted = [...barras].sort((a, b) => a.charOffset - b.charOffset);
  const markers: CompasMarker[] = [];
  void options;

  for (let index = 0; index < sorted.length; index += 1) {
    const barra = sorted[index]!;
    const beatCount = getBeatCount(barra);

    if (beatCount <= 0) {
      continue;
    }

    const startOffset = barra.charOffset;
    const startPx = getOffsetPx(startOffset);

    if (startPx === undefined) {
      continue;
    }

    const nextBarra = sorted[index + 1];
    const endPx = nextBarra ? getOffsetPx(nextBarra.charOffset) : undefined;

    markers.push({
      kind: "measure",
      leftPx: startPx,
      intensidad: resolveIntensidad?.(barra, 0),
      cycleId: barra.cycleId ?? null,
      cycleStepIndex: 0,
      // Solo hay ciclo real si existe un cierre (siguiente línea a la derecha)
      compasNumero: nextBarra ? barra.compasNumero : undefined,
    });

    if (endPx === undefined || endPx <= startPx) {
      continue;
    }

    const width = endPx - startPx;
    const step = width / beatCount;

    for (let beat = 1; beat < beatCount; beat += 1) {
      markers.push({
        kind: "beat",
        leftPx: startPx + step * beat,
        intensidad: resolveIntensidad?.(barra, beat),
        cycleId: barra.cycleId ?? null,
        cycleStepIndex: beat,
      });
    }
  }

  return markers;
}

/** @deprecated Usar computeLineCompasMarkersPx para distribución homogénea en pantalla. */
export function computeLineCompasMarkers(
  barras: BarraCompas[],
  beatCount: number,
): Array<{ kind: CompasMarkerKind; charOffset: number }> {
  if (barras.length === 0 || beatCount <= 0) {
    return [];
  }

  const sorted = [...barras].sort((a, b) => a.charOffset - b.charOffset);
  const markers: Array<{ kind: CompasMarkerKind; charOffset: number }> = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const start = sorted[index].charOffset;
    const end = sorted[index + 1]?.charOffset;

    markers.push({ charOffset: start, kind: "measure" });

    if (end === undefined || end <= start) {
      continue;
    }

    const width = end - start;
    const step = width / beatCount;

    for (let beat = 1; beat < beatCount; beat += 1) {
      markers.push({
        charOffset: start + step * beat,
        kind: "beat",
      });
    }
  }

  return markers;
}

export function charOffsetToPx(
  charOffset: number,
  positions: Array<{ left: number } | undefined>,
): number | undefined {
  const floor = Math.floor(charOffset);
  const ceil = Math.ceil(charOffset);
  const floorPos = positions[floor];

  if (!floorPos) {
    return undefined;
  }

  if (floor === ceil) {
    return floorPos.left;
  }

  const ceilPos = positions[ceil];

  if (!ceilPos) {
    return floorPos.left;
  }

  const fraction = charOffset - floor;

  return floorPos.left + (ceilPos.left - floorPos.left) * fraction;
}

/** Resuelve posición horizontal; offsets negativos se muestran en el inicio del renglón. */
export function resolveCharOffsetPx(
  charOffset: number,
  positions: Array<{ left: number } | undefined>,
): number | undefined {
  if (charOffset < 0) {
    return positions[0]?.left ?? 0;
  }

  return charOffsetToPx(charOffset, positions);
}

export function normalizeNotaIndex(value: number): NotaIndex {
  return (((value % 12) + 12) % 12) as NotaIndex;
}

export function transponerCifrado(
  cifrado: CifradoData,
  semitonos: number,
): CifradoData {
  return {
    ...cifrado,
    acordes: cifrado.acordes.map((acorde) => ({
      ...acorde,
      noteIndex: normalizeNotaIndex(acorde.noteIndex + semitonos),
      ...(acorde.bassNoteIndex !== undefined
        ? {
            bassNoteIndex: normalizeNotaIndex(
              acorde.bassNoteIndex + semitonos,
            ),
          }
        : {}),
    })),
  };
}

export function formatAcorde(
  noteIndex: NotaIndex,
  modifier: Modificador,
  notacion: NotacionAcordes = "es",
  bassNoteIndex?: NotaIndex,
): string {
  const root = formatAcordeNotacion(noteIndex, modifier, notacion);

  if (bassNoteIndex === undefined) {
    return root;
  }

  return `${root}/${formatAcordeNotacion(bassNoteIndex, "", notacion)}`;
}

export function createEmptyCifrado(): CifradoData {
  return { version: 1, acordes: [] };
}

export function createDefaultCompasConfig(): CompasConfig {
  const tipoCompas: TipoCompas = "4-4";
  const cycleGolpes = 4;

  return {
    tipoCompas,
    cycleGolpes,
    bpm: DEFAULT_BPM,
    barras: [],
    barrasVersion: 2,
    intensidadPlantilla: createDefaultIntensidadPlantilla(cycleGolpes),
  };
}

export function renumberLineBarrasCompas(
  config: CompasConfig,
  lineIndex: number,
): CompasConfig {
  const lineBarras = config.barras
    .filter((barra) => barra.lineIndex === lineIndex)
    .sort((a, b) => a.charOffset - b.charOffset);
  const otherBarras = config.barras.filter(
    (barra) => barra.lineIndex !== lineIndex,
  );
  const renumbered = lineBarras.map((barra, index) => ({
    ...barra,
    compasNumero: index + 1,
  }));

  return {
    ...config,
    barras: [...otherBarras, ...renumbered].sort((a, b) => {
      if (a.lineIndex !== b.lineIndex) {
        return a.lineIndex - b.lineIndex;
      }

      return a.charOffset - b.charOffset;
    }),
  };
}

/** Convierte barras legacy (compás 1 implícito en 0) al formato con inicio movible. */
export function migrateCompasConfigToMeasureStarts(
  config: CompasConfig,
  lineCount: number,
): CompasConfig {
  if (config.barrasVersion === 2) {
    return config;
  }

  let next: CompasConfig = { ...config, barras: [...config.barras] };

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const lineBarras = next.barras
      .filter((barra) => barra.lineIndex === lineIndex)
      .sort((a, b) => a.charOffset - b.charOffset);

    if (lineBarras.length === 0) {
      continue;
    }

    if (lineBarras.some((barra) => barra.charOffset === 0)) {
      continue;
    }

    next = {
      ...next,
      barras: [
        ...next.barras.filter((barra) => barra.lineIndex !== lineIndex),
        { lineIndex, charOffset: 0, compasNumero: 1 },
        ...lineBarras.map((barra, index) => ({
          ...barra,
          compasNumero: index + 2,
        })),
      ],
    };
  }

  let migrated: CompasConfig = { ...next, barrasVersion: 2 };

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    migrated = renumberLineBarrasCompas(migrated, lineIndex);
  }

  return migrated;
}

export function findAcordeAt(
  acordes: AcordePos[],
  lineIndex: number,
  charOffset: number,
): AcordePos | undefined {
  return acordes.find(
    (acorde) =>
      acorde.lineIndex === lineIndex && acorde.charOffset === charOffset,
  );
}

export function upsertAcorde(
  cifrado: CifradoData,
  acorde: AcordePos,
): CifradoData {
  const rest = cifrado.acordes.filter(
    (item) =>
      !(
        item.lineIndex === acorde.lineIndex &&
        item.charOffset === acorde.charOffset
      ),
  );

  return {
    ...cifrado,
    acordes: [...rest, acorde].sort((a, b) => {
      if (a.lineIndex !== b.lineIndex) {
        return a.lineIndex - b.lineIndex;
      }

      return a.charOffset - b.charOffset;
    }),
  };
}

export function removeAcordeAt(
  cifrado: CifradoData,
  lineIndex: number,
  charOffset: number,
): CifradoData {
  return {
    ...cifrado,
    acordes: cifrado.acordes.filter(
      (acorde) =>
        !(acorde.lineIndex === lineIndex && acorde.charOffset === charOffset),
    ),
  };
}

export function moveAcorde(
  cifrado: CifradoData,
  lineIndex: number,
  fromOffset: number,
  toOffset: number,
): CifradoData {
  if (fromOffset === toOffset) {
    return cifrado;
  }

  const acorde = cifrado.acordes.find(
    (item) =>
      item.lineIndex === lineIndex && item.charOffset === fromOffset,
  );

  if (!acorde) {
    return cifrado;
  }

  let next = removeAcordeAt(cifrado, lineIndex, fromOffset);
  next = removeAcordeAt(next, lineIndex, toOffset);

  return upsertAcorde(next, {
    ...acorde,
    charOffset: toOffset,
  });
}

/**
 * Mueve un acorde; si el destino ya tiene otro, los intercambia
 * (no borra el que estaba).
 */
export function moveAcordeSwap(
  cifrado: CifradoData,
  lineIndex: number,
  fromOffset: number,
  toOffset: number,
): CifradoData {
  if (fromOffset === toOffset) {
    return cifrado;
  }

  const moving = findAcordeAt(cifrado.acordes, lineIndex, fromOffset);

  if (!moving) {
    return cifrado;
  }

  const occupant = findAcordeAt(cifrado.acordes, lineIndex, toOffset);
  let next = removeAcordeAt(cifrado, lineIndex, fromOffset);

  if (occupant) {
    next = removeAcordeAt(next, lineIndex, toOffset);
    next = upsertAcorde(next, {
      ...occupant,
      charOffset: fromOffset,
    });
  }

  return upsertAcorde(next, {
    ...moving,
    charOffset: toOffset,
  });
}

export function getNextCompasNumero(barras: BarraCompas[]): number {
  if (barras.length === 0) {
    return 1;
  }

  return Math.max(...barras.map((barra) => barra.compasNumero)) + 1;
}

export function upsertBarraCompas(
  config: CompasConfig,
  barra: BarraCompas,
): CompasConfig {
  const normalizedBarra = {
    ...barra,
    charOffset: clampCompasCharOffset(barra.charOffset),
  };
  const rest = config.barras.filter(
    (item) =>
      !(
        item.lineIndex === normalizedBarra.lineIndex &&
        item.charOffset === normalizedBarra.charOffset
      ),
  );

  return {
    ...config,
    barras: [...rest, normalizedBarra].sort((a, b) => {
      if (a.lineIndex !== b.lineIndex) {
        return a.lineIndex - b.lineIndex;
      }

      return a.charOffset - b.charOffset;
    }),
  };
}

export function removeBarraCompasAt(
  config: CompasConfig,
  lineIndex: number,
  charOffset: number,
): CompasConfig {
  return {
    ...config,
    barras: config.barras.filter(
      (barra) =>
        !(barra.lineIndex === lineIndex && barra.charOffset === charOffset),
    ),
  };
}

export function moveBarraCompas(
  config: CompasConfig,
  lineIndex: number,
  fromOffset: number,
  toOffset: number,
): CompasConfig {
  const clampedTo = clampCompasCharOffset(toOffset);

  if (fromOffset === clampedTo) {
    return config;
  }

  const barra = config.barras.find(
    (item) =>
      item.lineIndex === lineIndex && item.charOffset === fromOffset,
  );

  if (!barra) {
    return config;
  }

  let next = removeBarraCompasAt(config, lineIndex, fromOffset);
  next = removeBarraCompasAt(next, lineIndex, clampedTo);

  return upsertBarraCompas(next, {
    ...barra,
    charOffset: clampedTo,
  });
}

export function deleteCifradoLine(
  cifrado: CifradoData,
  lineIndex: number,
): CifradoData {
  return {
    ...cifrado,
    acordes: cifrado.acordes
      .filter((acorde) => acorde.lineIndex !== lineIndex)
      .map((acorde) =>
        acorde.lineIndex > lineIndex
          ? { ...acorde, lineIndex: acorde.lineIndex - 1 }
          : acorde,
      ),
  };
}

export function deleteCompasLine(
  config: CompasConfig,
  lineIndex: number,
): CompasConfig {
  return {
    ...config,
    barras: config.barras
      .filter((barra) => barra.lineIndex !== lineIndex)
      .map((barra) =>
        barra.lineIndex > lineIndex
          ? { ...barra, lineIndex: barra.lineIndex - 1 }
          : barra,
      ),
    lineTerminalOffsets: (config.lineTerminalOffsets ?? [])
      .filter((entry) => entry.lineIndex !== lineIndex)
      .map((entry) =>
        entry.lineIndex > lineIndex
          ? { ...entry, lineIndex: entry.lineIndex - 1 }
          : entry,
      ),
  };
}

export function clearAcordesOnLine(
  cifrado: CifradoData,
  lineIndex: number,
): CifradoData {
  return {
    ...cifrado,
    acordes: cifrado.acordes.filter((acorde) => acorde.lineIndex !== lineIndex),
  };
}

export function clearBarrasOnLine(
  config: CompasConfig,
  lineIndex: number,
): CompasConfig {
  return removeLineTerminalOffset(
    {
      ...config,
      barras: config.barras.filter((barra) => barra.lineIndex !== lineIndex),
    },
    lineIndex,
  );
}

export function insertCifradoLineBelow(
  cifrado: CifradoData,
  lineIndex: number,
): CifradoData {
  return {
    ...cifrado,
    acordes: cifrado.acordes.map((acorde) =>
      acorde.lineIndex > lineIndex
        ? { ...acorde, lineIndex: acorde.lineIndex + 1 }
        : acorde,
    ),
  };
}

export function insertCompasLineBelow(
  config: CompasConfig,
  lineIndex: number,
): CompasConfig {
  return {
    ...config,
    barras: config.barras.map((barra) =>
      barra.lineIndex > lineIndex
        ? { ...barra, lineIndex: barra.lineIndex + 1 }
        : barra,
    ),
    lineTerminalOffsets: (config.lineTerminalOffsets ?? []).map((entry) =>
      entry.lineIndex > lineIndex
        ? { ...entry, lineIndex: entry.lineIndex + 1 }
        : entry,
    ),
  };
}

export function mergeLyricsLineInto(
  lines: string[],
  sourceLineIndex: number,
  destLineIndex: number,
): string[] {
  if (
    sourceLineIndex === destLineIndex ||
    sourceLineIndex < 0 ||
    destLineIndex < 0 ||
    sourceLineIndex >= lines.length ||
    destLineIndex >= lines.length
  ) {
    return lines;
  }

  const next = [...lines];
  next[destLineIndex] = (next[destLineIndex] ?? "") + (next[sourceLineIndex] ?? "");
  next.splice(sourceLineIndex, 1);

  return next;
}

export function mergeCifradoLineInto(
  cifrado: CifradoData,
  sourceLineIndex: number,
  destLineIndex: number,
  attachOffset: number,
): CifradoData {
  if (sourceLineIndex === destLineIndex) {
    return cifrado;
  }

  const acordes: AcordePos[] = [];

  for (const acorde of cifrado.acordes) {
    if (acorde.lineIndex === sourceLineIndex) {
      acordes.push({
        ...acorde,
        lineIndex: destLineIndex,
        charOffset: clampCompasCharOffset(acorde.charOffset + attachOffset),
      });
      continue;
    }

    let lineIndex = acorde.lineIndex;

    if (lineIndex === destLineIndex) {
      acordes.push(acorde);
      continue;
    }

    if (sourceLineIndex < lineIndex) {
      lineIndex -= 1;
    }

    acordes.push({ ...acorde, lineIndex });
  }

  return {
    ...cifrado,
    acordes: acordes.sort((a, b) => {
      if (a.lineIndex !== b.lineIndex) {
        return a.lineIndex - b.lineIndex;
      }

      return a.charOffset - b.charOffset;
    }),
  };
}

export function mergeCompasLineInto(
  config: CompasConfig,
  sourceLineIndex: number,
  destLineIndex: number,
  attachOffset: number,
): CompasConfig {
  if (sourceLineIndex === destLineIndex) {
    return config;
  }

  const barras: BarraCompas[] = [];

  for (const barra of config.barras) {
    if (barra.lineIndex === sourceLineIndex) {
      barras.push({
        ...barra,
        lineIndex: destLineIndex,
        charOffset: clampCompasCharOffset(barra.charOffset + attachOffset),
      });
      continue;
    }

    let lineIndex = barra.lineIndex;

    if (lineIndex === destLineIndex) {
      barras.push(barra);
      continue;
    }

    if (sourceLineIndex < lineIndex) {
      lineIndex -= 1;
    }

    barras.push({ ...barra, lineIndex });
  }

  return renumberLineBarrasCompas(
    {
      ...config,
      barras: barras.sort((a, b) => {
        if (a.lineIndex !== b.lineIndex) {
          return a.lineIndex - b.lineIndex;
        }

        return a.charOffset - b.charOffset;
      }),
      lineTerminalOffsets: (config.lineTerminalOffsets ?? [])
        .filter((entry) => entry.lineIndex !== sourceLineIndex)
        .map((entry) => {
          if (entry.lineIndex === destLineIndex) {
            return entry;
          }

          if (entry.lineIndex > sourceLineIndex) {
            return { ...entry, lineIndex: entry.lineIndex - 1 };
          }

          return entry;
        }),
    },
    destLineIndex,
  );
}

export type LineCopyKind = "acordes" | "compas" | "both";

export function applyLineCopyAcordes(
  cifrado: CifradoData,
  targetLineIndex: number,
  template: AcordePos[],
  sourceTextLength: number,
  targetTextLength: number,
): CifradoData {
  const rest = cifrado.acordes.filter(
    (acorde) => acorde.lineIndex !== targetLineIndex,
  );
  const copied = template.map((acorde) => ({
    ...acorde,
    lineIndex: targetLineIndex,
    charOffset: remapCharOffsetForLineCopy(
      acorde.charOffset,
      sourceTextLength,
      targetTextLength,
    ),
  }));

  return {
    ...cifrado,
    acordes: [...rest, ...copied].sort((a, b) => {
      if (a.lineIndex !== b.lineIndex) {
        return a.lineIndex - b.lineIndex;
      }

      return a.charOffset - b.charOffset;
    }),
  };
}

export function applyLineCopyCompas(
  config: CompasConfig,
  targetLineIndex: number,
  template: BarraCompas[],
  sourceTextLength: number,
  targetTextLength: number,
  sourceTerminalCharOffset?: number,
): CompasConfig {
  const rest = config.barras.filter(
    (barra) => barra.lineIndex !== targetLineIndex,
  );
  const sortedTemplate = [...template].sort(
    (a, b) => a.charOffset - b.charOffset,
  );
  const remappedOffsets = remapCompasPatternForLineCopy(
    sortedTemplate,
    sourceTextLength,
    targetTextLength,
  );
  const copied = sortedTemplate.map((barra, index) => ({
    ...barra,
    lineIndex: targetLineIndex,
    charOffset: remappedOffsets[index],
  }));

  let next = renumberLineBarrasCompas(
    {
      ...config,
      barras: [...rest, ...copied].sort((a, b) => {
        if (a.lineIndex !== b.lineIndex) {
          return a.lineIndex - b.lineIndex;
        }

        return a.charOffset - b.charOffset;
      }),
    },
    targetLineIndex,
  );

  if (sourceTerminalCharOffset !== undefined) {
    next = setLineTerminalOffset(
      next,
      targetLineIndex,
      remapCharOffsetForLineCopy(
        sourceTerminalCharOffset,
        sourceTextLength,
        targetTextLength,
      ),
    );
  }

  return next;
}

export function findNearestCharOffset(
  positions: Array<{ left: number } | undefined>,
  pointerX: number,
  containerLeft: number,
): number {
  const relativeX = pointerX - containerLeft;

  let nearestOffset = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let found = false;

  for (const key of Object.keys(positions)) {
    const offset = Number(key);
    const position = positions[offset];

    if (!position || Number.isNaN(offset)) {
      continue;
    }

    const distance = Math.abs(position.left - relativeX);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestOffset = offset;
      found = true;
    }
  }

  return found ? nearestOffset : 0;
}

export function clampBpm(value: number): number {
  return Math.min(240, Math.max(40, Math.round(value)));
}

export function computeTapBpm(
  timestamps: number[],
  now = performance.now(),
): number | null {
  const recentTaps = timestamps.filter((timestamp) => now - timestamp < 3000);

  if (recentTaps.length < 2) {
    return null;
  }

  const intervals: number[] = [];

  for (let index = 1; index < recentTaps.length; index += 1) {
    intervals.push(recentTaps[index] - recentTaps[index - 1]);
  }

  const lastIntervals = intervals.slice(-4);
  const averageInterval =
    lastIntervals.reduce((sum, interval) => sum + interval, 0) /
    lastIntervals.length;

  return clampBpm(60000 / averageInterval);
}
