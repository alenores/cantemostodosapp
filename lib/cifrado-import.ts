import {
  createEmptyCifrado,
  type AcordePos,
  type CifradoData,
} from "@/lib/cifrado";
import { parseAcordeToken } from "@/lib/notacion-acordes";

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
    });
  }

  return { acordes, warnings };
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
