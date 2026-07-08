import { normalizeNotaIndex, type Modificador, type NotaIndex } from "@/lib/cifrado";

export type ModoTonal = "mayor" | "menor";

export const DEFAULT_MODO_TONAL: ModoTonal = "mayor";

export const MODOS_TONALES = [
  { id: "mayor" as const, label: "Mayor" },
  { id: "menor" as const, label: "Menor" },
] as const;

/**
 * Notas de la escala en numeración cromática 1–13 desde la tónica
 * (1era, 2da, 3era…; la 13 es la octava y coincide con la 1).
 */
export const ESCALA_NUMEROS_DESDE_TONICA = [1, 3, 5, 6, 8, 10, 12] as const;

/** Semitonos desde la tónica que pertenecen a la escala mayor. */
export const ESCALA_SEMITONOS_DESDE_TONICA = [0, 2, 4, 5, 7, 9, 11] as const;

/** Semitonos desde la tónica que pertenecen a la escala menor natural. */
export const ESCALA_MENOR_SEMITONOS_DESDE_TONICA = [0, 2, 3, 5, 7, 8, 10] as const;

/**
 * Modificador sugerido al elegir una nota, según número cromático 1–12 desde la tónica.
 * `null` = sin sugerencia (el usuario elige manualmente).
 */
const MODIFICADOR_POR_NUMERO_CROMATICO_MAYOR: (Modificador | null)[] = [
  "", // 1 — mayor
  null, // 2
  "m", // 3 — menor
  "7", // 4
  "m", // 5 — menor
  "", // 6 — mayor
  null, // 7
  "", // 8 — mayor
  null, // 9
  "m", // 10 — menor
  null, // 11
  "dim", // 12 (8va)
];

const MODIFICADOR_POR_NUMERO_CROMATICO_MENOR: (Modificador | null)[] = [
  "m", // 1 — tónica menor
  null, // 2
  "dim", // 3 — ii°
  "", // 4 — III
  null, // 5
  "m", // 6 — iv
  null, // 7
  "m", // 8 — v
  "", // 9 — VI
  null, // 10
  "7", // 11 — VII
  null, // 12
];

export function normalizeModoTonal(value: unknown): ModoTonal {
  return value === "menor" ? "menor" : "mayor";
}

function getEscalaSemitonos(modo: ModoTonal): readonly number[] {
  return modo === "menor"
    ? ESCALA_MENOR_SEMITONOS_DESDE_TONICA
    : ESCALA_SEMITONOS_DESDE_TONICA;
}

function getModificadoresPorNumeroCromatico(
  modo: ModoTonal,
): readonly (Modificador | null)[] {
  return modo === "menor"
    ? MODIFICADOR_POR_NUMERO_CROMATICO_MENOR
    : MODIFICADOR_POR_NUMERO_CROMATICO_MAYOR;
}

/** Número cromático 1–12 desde la tónica (1era = 1 … 8va = 12). */
export function getNumeroCromaticoDesdeTonica(
  noteIndex: NotaIndex,
  tonalidadIndex: NotaIndex,
): number {
  return normalizeNotaIndex(noteIndex - tonalidadIndex) + 1;
}

export function getModificadorPorDefecto(
  noteIndex: NotaIndex,
  tonalidadIndex: NotaIndex,
  modo: ModoTonal = DEFAULT_MODO_TONAL,
): Modificador | null {
  const numero = getNumeroCromaticoDesdeTonica(noteIndex, tonalidadIndex);
  return getModificadoresPorNumeroCromatico(modo)[numero - 1] ?? null;
}

export function isNotaEnEscala(
  noteIndex: NotaIndex,
  tonalidadIndex: NotaIndex,
  modo: ModoTonal = DEFAULT_MODO_TONAL,
): boolean {
  const semitonoRelativo = normalizeNotaIndex(noteIndex - tonalidadIndex);
  return getEscalaSemitonos(modo).includes(semitonoRelativo);
}
