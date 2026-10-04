import {
  NOTAS_ES,
  normalizeNotaIndex,
  type Modificador,
  type NotaAgregada,
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
  { alias: "solb", index: 6 },
  { alias: "gb", index: 6 },
  { alias: "db", index: 1 },
  { alias: "eb", index: 3 },
  { alias: "ab", index: 8 },
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

type SufijoAcorde = {
  modifier: Modificador;
  agregada?: NotaAgregada;
};

/** Base del acorde (lo que va antes de la nota sumada), del más largo al más corto. */
const BASE_SUFIJO: { pattern: RegExp; modifier: Modificador }[] = [
  { pattern: /^(?:maj7|maj|ma7)/i, modifier: "maj7" },
  { pattern: /^(?:7M|Δ)/, modifier: "maj7" },
  { pattern: /^(?:m7|min7|-7)/, modifier: "m7" },
  { pattern: /^sus2/i, modifier: "sus2" },
  { pattern: /^(?:sus4|sus)/i, modifier: "sus4" },
  { pattern: /^(?:dim|°|º|o(?=$|7))/, modifier: "dim" },
  { pattern: /^(?:aug|\+5|#5|\+)/i, modifier: "aug" },
  { pattern: /^(?:min|m(?!aj)|-)/, modifier: "m" },
  { pattern: /^7/, modifier: "7" },
];

const AGREGADA_VALIDA = new Set<number>([2, 4, 6, 9, 11, 13]);

/**
 * Lee el sufijo completo de un acorde (lo que sigue a la nota).
 * Reglas acordadas con ale (2026-10-04):
 * - Nota sumada → `agregada` (número chico abajo): add4 → ₄, add9 → ₉, m6 → m₆.
 * - 9 / 11 / 13 solos llevan séptima: DO9 → DO7₉, LAm9 → LAm7₉, maj9 → maj7₉.
 * - "4" y "2" solos reemplazan la tercera: MI4 → MIsus4, RE2 → REsus2.
 * - 5 (quinta) y aug (+) son modificadores propios.
 */
function parseSufijoCompleto(raw: string): SufijoAcorde | null {
  const rest = raw.trim().replace(/[()]/g, "");

  if (!rest) {
    return { modifier: "" };
  }

  if (/^5$/.test(rest)) return { modifier: "5" };
  if (/^4$/.test(rest)) return { modifier: "sus4" };
  if (/^2$/.test(rest)) return { modifier: "sus2" };
  if (/^6$/.test(rest)) return { modifier: "6" };

  const extendida = /^(maj|ma|m|min|-)?(9|11|13)$/i.exec(rest);

  if (extendida) {
    const calidad = extendida[1]?.toLowerCase();
    const modifier: Modificador =
      calidad === "maj" || calidad === "ma"
        ? "maj7"
        : calidad
          ? "m7"
          : "7";
    return { modifier, agregada: Number(extendida[2]) as NotaAgregada };
  }

  if (/^9maj7$|^maj79$/i.test(rest)) {
    return { modifier: "maj7", agregada: 9 };
  }

  let base: Modificador = "";
  let tail = rest;

  for (const { pattern, modifier } of BASE_SUFIJO) {
    const match = pattern.exec(tail);

    if (match) {
      base = modifier;
      tail = tail.slice(match[0].length);
      break;
    }
  }

  if (!tail) {
    return { modifier: base };
  }

  const sumada = /^(?:add|\/)?(2|4|6|9|11|13)$/i.exec(tail);

  if (sumada && AGREGADA_VALIDA.has(Number(sumada[1]))) {
    return { modifier: base, agregada: Number(sumada[1]) as NotaAgregada };
  }

  return null;
}

const MODIFIER_PATTERNS: { pattern: RegExp; modifier: Modificador }[] = [
  { pattern: /^maj7/i, modifier: "maj7" },
  { pattern: /^maj/i, modifier: "maj7" },
  { pattern: /^m7/i, modifier: "m7" },
  { pattern: /^min7/i, modifier: "m7" },
  { pattern: /^min/i, modifier: "m" },
  { pattern: /^m(?!aj)/i, modifier: "m" },
  { pattern: /^sus4/i, modifier: "sus4" },
  { pattern: /^sus2/i, modifier: "sus2" },
  { pattern: /^dim/i, modifier: "dim" },
  { pattern: /^aug/i, modifier: "aug" },
  { pattern: /^6/i, modifier: "6" },
  { pattern: /^7/i, modifier: "7" },
];

/**
 * Primero intenta leer el sufijo completo; si no puede, se queda con el comienzo
 * (comportamiento de siempre: DO7sus4 → DO7), para no perder acordes raros.
 */
function parseModifierSuffix(raw: string): SufijoAcorde | null {
  const completo = parseSufijoCompleto(raw);

  if (completo) {
    return completo;
  }

  const rest = raw.trim();

  for (const { pattern, modifier } of MODIFIER_PATTERNS) {
    if (pattern.test(rest)) {
      return { modifier };
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
  bassNoteIndex?: NotaIndex;
  agregada?: NotaAgregada;
};

/** Solo nota (sin modificador): lado derecho de un acorde con /. */
export function parseBassNoteToken(token: string): NotaIndex | null {
  const trimmed = token.trim();

  if (!trimmed || trimmed.length > 8) {
    return null;
  }

  if (/^[^a-zA-Z0-9#b+-]+$/.test(trimmed)) {
    return null;
  }

  const root = matchNoteRoot(trimmed);

  if (!root) {
    return null;
  }

  const sufijo = parseModifierSuffix(root.rest);

  if (sufijo?.modifier !== "" || sufijo.agregada !== undefined) {
    return null;
  }

  return normalizeNotaIndex(root.index);
}

function parseAcordeCore(token: string): ParsedAcorde | null {
  const trimmed = token.trim();

  if (!trimmed) {
    return null;
  }

  if (/^[^a-zA-Z0-9#b+-]+$/.test(trimmed)) {
    return null;
  }

  const root = matchNoteRoot(trimmed);

  if (!root) {
    return null;
  }

  const sufijo = parseModifierSuffix(root.rest);

  if (sufijo === null) {
    return null;
  }

  return {
    noteIndex: normalizeNotaIndex(root.index),
    modifier: sufijo.modifier,
    ...(sufijo.agregada !== undefined ? { agregada: sufijo.agregada } : {}),
  };
}

export function parseAcordeToken(token: string): ParsedAcorde | null {
  const trimmed = token.trim();

  if (!trimmed || trimmed.length > 24) {
    return null;
  }

  if (/^[^a-zA-Z0-9#b+\/+-]+$/.test(trimmed)) {
    return null;
  }

  const slashIndex = trimmed.indexOf("/");

  if (slashIndex !== -1) {
    const left = trimmed.slice(0, slashIndex);
    const right = trimmed.slice(slashIndex + 1);

    if (!left || !right) {
      return null;
    }

    const chord = parseAcordeCore(left);
    const bassNoteIndex = parseBassNoteToken(right);

    if (!chord || bassNoteIndex === null) {
      return null;
    }

    return {
      ...chord,
      bassNoteIndex,
    };
  }

  return parseAcordeCore(trimmed);
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

const SUBINDICE_DIGITOS = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];

/** Número chico abajo para texto plano (en pantalla se usa `<sub>` en `AcordeLabel`). */
export function formatNotaAgregadaTexto(agregada: number): string {
  return String(agregada)
    .split("")
    .map((digit) => SUBINDICE_DIGITOS[Number(digit)] ?? digit)
    .join("");
}

/**
 * El `add9` viejo se muestra como novena sumada (DO₉), igual que el formato nuevo.
 */
export function getAcordeVisible(
  modifier: Modificador,
  agregada?: NotaAgregada,
): { modifier: Modificador; agregada?: NotaAgregada } {
  if (modifier === "add9") {
    return { modifier: "", agregada: agregada ?? 9 };
  }

  return agregada !== undefined ? { modifier, agregada } : { modifier };
}

export function formatAcordeNotacion(
  noteIndex: NotaIndex,
  modifier: Modificador,
  notacion: NotacionAcordes = "es",
  agregada?: NotaAgregada,
): string {
  const visible = getAcordeVisible(modifier, agregada);
  const sumada =
    visible.agregada !== undefined ? formatNotaAgregadaTexto(visible.agregada) : "";
  return getNotaLabel(noteIndex, notacion) + visible.modifier + sumada;
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
