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
    /** Renglones de solo acordes (introducción, puentes, final). */
    chordOnlyLines: number;
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

/**
 * El acorde queda en la columna donde venía, haya letra debajo o no.
 *
 * Pasado el final del texto (o en un renglón sin letra, como la introducción) la posición cae en
 * las casillas libres del renglón (`getLineLaneStart` en `lib/cifrado.ts`), las mismas donde se
 * coloca un acorde a mano. Antes se ajustaba a la última letra y todos los acordes de la
 * introducción quedaban apilados al principio (2026-09-28).
 */
function charOffsetEnColumnaOriginal(column: number): number {
  return Math.max(0, column);
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
      charOffset: charOffsetEnColumnaOriginal(start),
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

/** Renglón que separa estrofas en letras copiadas de internet ("–", "-", "—"). */
const SEPARADOR_ESTROFA_PATTERN = /^[–—-]+$/;

/**
 * Muchas letras de internet vienen "a doble espacio": un renglón vacío después de cada renglón.
 * Así el renglón de acordes queda separado de su letra y se pegaba al renglón vacío.
 * Se considera doble espacio cuando la mayoría de los renglones con texto van seguidos de
 * exactamente un renglón vacío y luego más texto.
 */
function esTextoDobleEspacio(lines: readonly string[]): boolean {
  let conTexto = 0;
  let seguidosDeUnVacio = 0;

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index]?.trim()) {
      continue;
    }

    const next = lines[index + 1];
    const afterNext = lines[index + 2];

    if (next === undefined || afterNext === undefined) {
      continue;
    }

    conTexto += 1;

    if (!next.trim() && afterNext.trim()) {
      seguidosDeUnVacio += 1;
    }
  }

  return conTexto >= 4 && seguidosDeUnVacio / conTexto >= 0.7;
}

/**
 * Deja la letra a espacio simple: en textos a doble espacio se saca el renglón vacío entre
 * renglones; en todos, un separador ("–") o varios vacíos seguidos pasan a un solo renglón vacío
 * (corte de estrofa).
 */
function normalizarEspaciosLetra(lines: readonly string[]): string[] {
  const dobleEspacio = esTextoDobleEspacio(lines);
  const result: string[] = [];
  let vacios = 0;

  const pushCorte = () => {
    if (result.length > 0 && result[result.length - 1]?.trim()) {
      result.push("");
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      vacios += 1;
      continue;
    }

    if (SEPARADOR_ESTROFA_PATTERN.test(trimmed)) {
      vacios = 0;
      pushCorte();
      continue;
    }

    if (vacios > 0 && (!dobleEspacio || vacios >= 2)) {
      pushCorte();
    }

    vacios = 0;
    result.push(line);
  }

  return result;
}

/**
 * Separa letra y acordes de un texto tradicional (acordes en el renglón de arriba).
 *
 * - Acordes con letra abajo → los acordes van sobre esa letra.
 * - Acordes sin letra abajo (introducción, puentes instrumentales, final) → renglón de solo
 *   acordes, en su lugar. Antes se descartaban (2026-10-04).
 */
export function parseLetraTradicional(text: string): CifradoImportResult {
  const rawLines = normalizarEspaciosLetra(text.replace(/\r\n/g, "\n").split("\n"));
  const lyricLines: string[] = [];
  const acordes: AcordePos[] = [];
  const warnings: string[] = [];
  let chordOnlyLines = 0;

  for (let index = 0; index < rawLines.length; index += 1) {
    const line = rawLines[index] ?? "";
    const nextLine = rawLines[index + 1];

    if (!isChordLine(line)) {
      lyricLines.push(line);
      continue;
    }

    const tieneLetraAbajo =
      nextLine !== undefined &&
      nextLine.trim().length > 0 &&
      !isChordLine(nextLine) &&
      !isLikelySectionLine(nextLine);

    const lyricLineIndex = lyricLines.length;
    lyricLines.push(tieneLetraAbajo ? nextLine : "");
    const parsed = parseChordLinePair(line, lyricLines[lyricLineIndex] ?? "", lyricLineIndex);
    acordes.push(...parsed.acordes);
    warnings.push(...parsed.warnings);

    if (tieneLetraAbajo) {
      index += 1;
    } else {
      chordOnlyLines += 1;
    }
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
      chordOnlyLines,
    },
  };
}

export function puedeUsarAdicionAvanzada(letra: string | null | undefined): boolean {
  return Boolean(letra?.trim());
}
