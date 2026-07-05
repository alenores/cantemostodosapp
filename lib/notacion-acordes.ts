import {
  NOTAS_ES,
  normalizeNotaIndex,
  type Modificador,
  type NotaIndex,
} from "@/lib/cifrado";

export type NotacionAcordes = "es" | "en" | "numero";

/** Etiquetas del modo número (jerga musical, 12 semitonos desde Do). */
export const NOTAS_NUMERO = [
  "1era",
  "1era#",
  "2da",
  "2da#",
  "3era",
  "4ta",
  "4ta#",
  "5ta",
  "5ta#",
  "6ta",
  "7ma#",
  "7ma",
] as const;

export const NOTACION_ACORDES_OPTIONS: {
  id: NotacionAcordes;
  label: string;
  description: string;
}[] = [
  {
    id: "es",
    label: "Do / Re / Mi",
    description: "Notación en español",
  },
  {
    id: "en",
    label: "C / D / E",
    description: "Notación internacional",
  },
  {
    id: "numero",
    label: "Números",
    description: "1era, 2da, 3era… 7ma",
  },
];

export const NOTACION_ACORDES_STORAGE_KEY = "cifrado-notacion-preferida";

export const NOTAS_EN = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const MODIFIER_PATTERNS: { pattern: RegExp; modifier: Modificador }[] = [
  { pattern: /^maj7/i, modifier: "maj7" },
  { pattern: /^maj/i, modifier: "maj7" },
  { pattern: /^m7/i, modifier: "m7" },
  { pattern: /^min7/i, modifier: "m7" },
  { pattern: /^min/i, modifier: "m" },
  { pattern: /^m(?!aj)/i, modifier: "m" },
  { pattern: /^sus4/i, modifier: "sus4" },
  { pattern: /^sus2/i, modifier: "sus2" },
  { pattern: /^add9/i, modifier: "add9" },
  { pattern: /^dim/i, modifier: "dim" },
  { pattern: /^6/i, modifier: "6" },
  { pattern: /^7/i, modifier: "7" },
];

type NoteAlias = {
  alias: string;
  index: NotaIndex;
};

const NOTE_ALIASES: NoteAlias[] = [
  { alias: "do#", index: 1 },
  { alias: "c#", index: 1 },
  { alias: "reb", index: 1 },
  { alias: "re#", index: 3 },
  { alias: "d#", index: 3 },
  { alias: "mib", index: 3 },
  { alias: "fa#", index: 6 },
  { alias: "f#", index: 6 },
  { alias: "sol#", index: 8 },
  { alias: "g#", index: 8 },
  { alias: "lab", index: 8 },
  { alias: "la#", index: 10 },
  { alias: "a#", index: 10 },
  { alias: "sib", index: 10 },
  { alias: "bb", index: 10 },
  { alias: "do", index: 0 },
  { alias: "c", index: 0 },
  { alias: "re", index: 2 },
  { alias: "d", index: 2 },
  { alias: "mi", index: 4 },
  { alias: "e", index: 4 },
  { alias: "fa", index: 5 },
  { alias: "f", index: 5 },
  { alias: "sol", index: 7 },
  { alias: "g", index: 7 },
  { alias: "la", index: 9 },
  { alias: "a", index: 9 },
  { alias: "si", index: 11 },
  { alias: "b", index: 11 },
];

NOTE_ALIASES.sort((a, b) => b.alias.length - a.alias.length);

function parseModifierSuffix(raw: string): Modificador | null {
  const rest = raw.trim();

  if (!rest) {
    return "";
  }

  for (const { pattern, modifier } of MODIFIER_PATTERNS) {
    if (pattern.test(rest)) {
      return modifier;
    }
  }

  return null;
}

function matchNoteRoot(token: string): { index: NotaIndex; rest: string } | null {
  const normalized = token.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  for (const { alias, index } of NOTE_ALIASES) {
    if (!normalized.startsWith(alias)) {
      continue;
    }

    const rest = token.slice(alias.length);
    const modifier = parseModifierSuffix(rest);

    if (modifier !== null) {
      return {
        index,
        rest,
      };
    }
  }

  return null;
}

export type ParsedAcorde = {
  noteIndex: NotaIndex;
  modifier: Modificador;
};

export function parseAcordeToken(token: string): ParsedAcorde | null {
  const trimmed = token.trim();

  if (!trimmed || trimmed.length > 16) {
    return null;
  }

  if (/^[^a-zA-Z0-9#b+-]+$/.test(trimmed)) {
    return null;
  }

  const root = matchNoteRoot(trimmed);

  if (!root) {
    return null;
  }

  const modifier = parseModifierSuffix(root.rest);

  if (modifier === null) {
    return null;
  }

  return {
    noteIndex: normalizeNotaIndex(root.index),
    modifier,
  };
}

export function getNotaLabel(
  noteIndex: NotaIndex,
  notacion: NotacionAcordes = "es",
): string {
  const index = normalizeNotaIndex(noteIndex);

  if (notacion === "en") {
    return NOTAS_EN[index];
  }

  if (notacion === "numero") {
    return NOTAS_NUMERO[index];
  }

  return NOTAS_ES[index];
}

export function formatAcordeNotacion(
  noteIndex: NotaIndex,
  modifier: Modificador,
  notacion: NotacionAcordes = "es",
): string {
  return getNotaLabel(noteIndex, notacion) + modifier;
}

export function readNotacionAcordesPreferida(): NotacionAcordes {
  if (typeof window === "undefined") {
    return "es";
  }

  try {
    const stored = localStorage.getItem(NOTACION_ACORDES_STORAGE_KEY);

    if (
      stored === "es" ||
      stored === "en" ||
      stored === "numero"
    ) {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }

  return "es";
}

export function writeNotacionAcordesPreferida(notacion: NotacionAcordes): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(NOTACION_ACORDES_STORAGE_KEY, notacion);
  } catch {
    // localStorage unavailable
  }
}
