import {
  createEmptyCifrado,
  NOTAS_ES,
  type AcordePos,
  type CifradoData,
  type NotaIndex,
} from "@/lib/cifrado";
import {
  MODOS_TONALES,
  type ModoTonal,
} from "@/lib/cifrado-escala";
import { parseAcordeToken } from "@/lib/notacion-acordes";

export type TonalidadLineDetectResult = {
  tonalidadIndex: NotaIndex;
  modoTonal: ModoTonal;
};

/** Prefijos: Tono/Key/tonalidad (separador opcional); ono:/no: (separador requerido). */
const TONALIDAD_LABEL_PREFIX_PATTERN =
  /^(?:(?:tono|tonalidad|clave|key)\s*[:\-–]?|(?:ono|no)\s*[:\-–])\s*/i;

const MODO_MENOR_WORDS = /\b(menor|minor|min)\b/i;
const MODO_MAYOR_WORDS = /\b(mayor|major|maj)\b/i;

export type CifradoImportResult = {
  letra: string;
  cifrado: CifradoData;
  warnings: string[];
  stats: {
    lyricLines: number;
    acordesParsed: number;
    chordLinesSkipped: number;
  };
};

const SECTION_LINE_PATTERN =
  /^(intro|estribillo|coro|verso|puente|final|outro|solo|pre\s*-?\s*coro)\b/i;

function isLikelySectionLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  if (SECTION_LINE_PATTERN.test(trimmed)) {
    return true;
  }

  if (/:$/.test(trimmed) && !parseAcordeToken(trimmed.replace(/:$/, ""))) {
    return true;
  }

  return false;
}

function tokenizeChordLine(line: string): { token: string; start: number }[] {
  const matches: { token: string; start: number }[] = [];
  const pattern = /\S+/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    matches.push({
      token: match[0],
      start: match.index,
    });
  }

  return matches;
}

export function isChordLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  if (isLikelySectionLine(trimmed)) {
    return false;
  }

  const tokens = tokenizeChordLine(trimmed);

  if (tokens.length === 0) {
    return false;
  }

  const parsedCount = tokens.filter((item) =>
    Boolean(parseAcordeToken(item.token)),
  ).length;

  return parsedCount > 0 && parsedCount / tokens.length >= 0.6;
}

function clampCharOffset(charOffset: number, lyricLine: string): number {
  if (lyricLine.length === 0) {
    return 0;
  }

  return Math.max(0, Math.min(charOffset, lyricLine.length - 1));
}

function parseChordLinePair(
  chordLine: string,
  lyricLine: string,
  lineIndex: number,
): { acordes: AcordePos[]; warnings: string[] } {
  const acordes: AcordePos[] = [];
  const warnings: string[] = [];

  for (const { token, start } of tokenizeChordLine(chordLine)) {
    const parsed = parseAcordeToken(token);

    if (!parsed) {
      warnings.push(`Acorde no reconocido: "${token}"`);
      continue;
    }

    acordes.push({
      lineIndex,
      charOffset: clampCharOffset(start, lyricLine),
      noteIndex: parsed.noteIndex,
      modifier: parsed.modifier,
      ...(parsed.bassNoteIndex !== undefined
        ? { bassNoteIndex: parsed.bassNoteIndex }
        : {}),
    });
  }

  return { acordes, warnings };
}

function parseTonalidadFromSingleToken(
  token: string,
): { tonalidadIndex: NotaIndex; modoTonal: ModoTonal } | null {
  const trimmed = token.trim();

  if (!trimmed || trimmed.length > 16) {
    return null;
  }

  const parsed = parseAcordeToken(trimmed);

  if (!parsed) {
    return null;
  }

  const isMinor = parsed.modifier === "m" || parsed.modifier === "m7";

  if (!isMinor && parsed.modifier !== "") {
    return null;
  }

  return {
    tonalidadIndex: parsed.noteIndex,
    modoTonal: isMinor ? "menor" : "mayor",
  };
}

function inferModoFromTrailingText(text: string): ModoTonal | null {
  const trimmed = text.trim();

  if (!trimmed || /^m\.?$/i.test(trimmed)) {
    return "menor";
  }

  if (MODO_MENOR_WORDS.test(trimmed)) {
    return "menor";
  }

  if (MODO_MAYOR_WORDS.test(trimmed)) {
    return "mayor";
  }

  return null;
}

export function formatTonalidadDetectLabel(
  tonalidad: TonalidadLineDetectResult,
): string {
  const modoLabel =
    MODOS_TONALES.find((item) => item.id === tonalidad.modoTonal)?.label ??
    "Mayor";

  return `${NOTAS_ES[tonalidad.tonalidadIndex]} ${modoLabel.toLowerCase()}`;
}

export function formatTonalidadDetectLabelTitle(
  tonalidad: TonalidadLineDetectResult,
): string {
  const modoLabel =
    MODOS_TONALES.find((item) => item.id === tonalidad.modoTonal)?.label ??
    "Mayor";

  return `${NOTAS_ES[tonalidad.tonalidadIndex]} ${modoLabel}`;
}

export function parseTonalidadLine(line: string): TonalidadLineDetectResult | null {
  const trimmed = line.trim();

  if (!trimmed || trimmed.length > 40) {
    return null;
  }

  if (isChordLine(trimmed)) {
    return null;
  }

  const withoutPrefix = trimmed
    .replace(TONALIDAD_LABEL_PREFIX_PATTERN, "")
    .trim();

  if (!withoutPrefix) {
    return null;
  }

  const singleToken = parseTonalidadFromSingleToken(withoutPrefix);

  if (singleToken) {
    return singleToken;
  }

  const words = withoutPrefix.split(/\s+/);

  if (words.length < 2 || words.length > 4) {
    return null;
  }

  const noteToken = words[0] ?? "";
  const noteParsed = parseTonalidadFromSingleToken(noteToken);

  if (!noteParsed) {
    return null;
  }

  const trailingText = words.slice(1).join(" ");
  const inferredModo = inferModoFromTrailingText(trailingText);

  if (!inferredModo) {
    return null;
  }

  return {
    tonalidadIndex: noteParsed.tonalidadIndex,
    modoTonal: noteParsed.modoTonal === "menor" ? "menor" : inferredModo,
  };
}

type FirstChordLocation = {
  lineIndex: number;
  charStart: number;
};

function isTonalidadLabelLine(line: string): boolean {
  return parseTonalidadLine(line.trim()) !== null;
}

function findFirstChordInLines(rawLines: string[]): FirstChordLocation | null {
  for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex += 1) {
    const line = rawLines[lineIndex] ?? "";
    const trimmed = line.trim();

    if (!trimmed || isTonalidadLabelLine(trimmed)) {
      continue;
    }

    for (const { token, start } of tokenizeChordLine(line)) {
      if (parseAcordeToken(token)) {
        return {
          lineIndex,
          charStart: start,
        };
      }
    }
  }

  return null;
}

function buildStrippedText(
  rawLines: string[],
  removeLinesBefore: number,
  stripCharsOnLine?: number,
): string {
  if (removeLinesBefore >= rawLines.length) {
    return "";
  }

  const kept = rawLines.slice(removeLinesBefore);

  if (stripCharsOnLine !== undefined && kept.length > 0) {
    kept[0] = (kept[0] ?? "").slice(stripCharsOnLine).trimStart();
  }

  return kept.join("\n").trimEnd();
}

export function getPrimerAcordeOrdenado(
  acordes: readonly AcordePos[],
): AcordePos | null {
  if (acordes.length === 0) {
    return null;
  }

  return [...acordes].sort(
    (a, b) => a.lineIndex - b.lineIndex || a.charOffset - b.charOffset,
  )[0] ?? null;
}

export type PasteIngresoAnalysis = {
  tonalidadFromLine: TonalidadLineDetectResult | null;
  suggestedNombre: string;
  suggestedArtista: string;
  textToEliminate: string;
  textKeptIfEliminate: string;
  hasMetadataProposal: boolean;
};

type TonalidadAnchor = {
  tonalidad: TonalidadLineDetectResult;
  keepFromLine: number;
  stripCharsOnKeepLine?: number;
  /** Líneas antes de la etiqueta de tono (candidatos título/artista). */
  preambleEndExclusive: number;
};

function findTonalidadAnchor(rawLines: string[]): TonalidadAnchor | null {
  const firstNonEmptyIndex = rawLines.findIndex((line) => line.trim().length > 0);

  if (firstNonEmptyIndex >= 0) {
    const firstLine = rawLines[firstNonEmptyIndex] ?? "";
    const tonalidad = parseTonalidadLine(firstLine);

    if (tonalidad) {
      return {
        tonalidad,
        keepFromLine: firstNonEmptyIndex + 1,
        preambleEndExclusive: firstNonEmptyIndex,
      };
    }
  }

  const chordLocation = findFirstChordInLines(rawLines);
  const scanBeforeLine = chordLocation?.lineIndex ?? rawLines.length;

  for (let lineIndex = 0; lineIndex < scanBeforeLine; lineIndex += 1) {
    const tonalidad = parseTonalidadLine(rawLines[lineIndex] ?? "");

    if (tonalidad) {
      return {
        tonalidad,
        keepFromLine: lineIndex + 1,
        preambleEndExclusive: lineIndex,
      };
    }
  }

  if (!chordLocation) {
    return null;
  }

  const chordLine = rawLines[chordLocation.lineIndex] ?? "";
  const prefix = chordLine.slice(0, chordLocation.charStart).trim();
  const tonalidadFromPrefix = parseTonalidadLine(prefix);

  if (!tonalidadFromPrefix) {
    return null;
  }

  return {
    tonalidad: tonalidadFromPrefix,
    keepFromLine: chordLocation.lineIndex,
    stripCharsOnKeepLine: chordLocation.charStart,
    preambleEndExclusive: chordLocation.lineIndex,
  };
}

function collectTitleArtistCandidates(preambleLines: readonly string[]): {
  nombre: string;
  artista: string;
} {
  const candidates = preambleLines
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) {
        return false;
      }

      if (isTonalidadLabelLine(line) || isChordLine(line) || isLikelySectionLine(line)) {
        return false;
      }

      return true;
    });

  return {
    nombre: candidates[0] ?? "",
    artista: candidates[1] ?? "",
  };
}

function buildEliminateText(
  rawLines: readonly string[],
  keepFromLine: number,
  stripCharsOnKeepLine?: number,
): string {
  const before = rawLines.slice(0, keepFromLine);

  if (stripCharsOnKeepLine === undefined) {
    return before.join("\n").trim();
  }

  const prefix = (rawLines[keepFromLine] ?? "")
    .slice(0, stripCharsOnKeepLine)
    .trimEnd();

  return [...before, prefix].join("\n").trim();
}

/**
 * Analiza un pegado tradicional sin modificar el texto.
 * Propone tono explícito, título/artista y el bloque a eliminar (confirmación aparte).
 */
export function analyzePasteIngreso(text: string): PasteIngresoAnalysis {
  const rawLines = text.replace(/\r\n/g, "\n").split("\n");
  const anchor = findTonalidadAnchor(rawLines);

  if (anchor) {
    const preambleLines = rawLines.slice(0, anchor.preambleEndExclusive);
    const { nombre, artista } = collectTitleArtistCandidates(preambleLines);
    const textToEliminate = buildEliminateText(
      rawLines,
      anchor.keepFromLine,
      anchor.stripCharsOnKeepLine,
    );
    const textKeptIfEliminate = buildStrippedText(
      rawLines,
      anchor.keepFromLine,
      anchor.stripCharsOnKeepLine,
    ).trim();

    return {
      tonalidadFromLine: anchor.tonalidad,
      suggestedNombre: nombre,
      suggestedArtista: artista,
      textToEliminate,
      textKeptIfEliminate,
      hasMetadataProposal: Boolean(
        textToEliminate || nombre || artista || anchor.tonalidad,
      ),
    };
  }

  const chordLocation = findFirstChordInLines(rawLines);

  if (!chordLocation) {
    return {
      tonalidadFromLine: null,
      suggestedNombre: "",
      suggestedArtista: "",
      textToEliminate: "",
      textKeptIfEliminate: text,
      hasMetadataProposal: false,
    };
  }

  const preambleLines = rawLines.slice(0, chordLocation.lineIndex);
  const prefix = (rawLines[chordLocation.lineIndex] ?? "")
    .slice(0, chordLocation.charStart)
    .trim();
  const hasPreamble = preambleLines.some((line) => line.trim().length > 0);
  const stripChars =
    prefix.length > 0 ? chordLocation.charStart : undefined;

  if (!hasPreamble && stripChars === undefined) {
    return {
      tonalidadFromLine: null,
      suggestedNombre: "",
      suggestedArtista: "",
      textToEliminate: "",
      textKeptIfEliminate: text,
      hasMetadataProposal: false,
    };
  }

  const { nombre, artista } = collectTitleArtistCandidates(preambleLines);
  const textToEliminate = buildEliminateText(
    rawLines,
    chordLocation.lineIndex,
    stripChars,
  );
  const textKeptIfEliminate = buildStrippedText(
    rawLines,
    chordLocation.lineIndex,
    stripChars,
  ).trim();

  return {
    tonalidadFromLine: null,
    suggestedNombre: nombre,
    suggestedArtista: artista,
    textToEliminate,
    textKeptIfEliminate,
    hasMetadataProposal: Boolean(textToEliminate || nombre || artista),
  };
}

export function splitTonalidadLineFromText(text: string): {
  textWithoutTonalidadLine: string;
  tonalidad: TonalidadLineDetectResult | null;
} {
  const rawLines = text.replace(/\r\n/g, "\n").split("\n");
  const anchor = findTonalidadAnchor(rawLines);

  if (!anchor) {
    return {
      textWithoutTonalidadLine: text,
      tonalidad: null,
    };
  }

  return {
    textWithoutTonalidadLine: buildStrippedText(
      rawLines,
      anchor.keepFromLine,
      anchor.stripCharsOnKeepLine,
    ),
    tonalidad: anchor.tonalidad,
  };
}

export function parseLetraTradicional(text: string): CifradoImportResult {
  const rawLines = text.replace(/\r\n/g, "\n").split("\n");
  const lyricLines: string[] = [];
  const acordes: AcordePos[] = [];
  const warnings: string[] = [];
  let chordLinesSkipped = 0;

  for (let index = 0; index < rawLines.length; index += 1) {
    const line = rawLines[index] ?? "";
    const nextLine = rawLines[index + 1];

    if (isChordLine(line) && nextLine !== undefined && !isChordLine(nextLine)) {
      const lyricLineIndex = lyricLines.length;
      lyricLines.push(nextLine);
      const parsed = parseChordLinePair(line, nextLine, lyricLineIndex);
      acordes.push(...parsed.acordes);
      warnings.push(...parsed.warnings);
      index += 1;
      continue;
    }

    if (isChordLine(line) && (nextLine === undefined || isChordLine(nextLine))) {
      chordLinesSkipped += 1;
      warnings.push("Renglón de acordes sin letra asociada (omitido).");
      continue;
    }

    lyricLines.push(line);
  }

  const letra = lyricLines.join("\n").trimEnd();

  return {
    letra,
    cifrado: {
      ...createEmptyCifrado(),
      acordes,
    },
    warnings,
    stats: {
      lyricLines: lyricLines.length,
      acordesParsed: acordes.length,
      chordLinesSkipped,
    },
  };
}

export function puedeUsarAdicionAvanzada(letra: string | null | undefined): boolean {
  return Boolean(letra?.trim());
}
