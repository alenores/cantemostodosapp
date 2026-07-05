import { normalizeNotaIndex, type Modificador, type NotaIndex } from "@/lib/cifrado";

/**
 * Notas de la escala en numeración cromática 1–13 desde la tónica
 * (1era, 2da, 3era…; la 13 es la octava y coincide con la 1).
 */
export const ESCALA_NUMEROS_DESDE_TONICA = [1, 3, 5, 6, 8, 10, 12] as const;

/** Semitonos desde la tónica que pertenecen a la escala. */
export const ESCALA_SEMITONOS_DESDE_TONICA = [0, 2, 4, 5, 7, 9, 11] as const;

/**
 * Modificador sugerido al elegir una nota, según número cromático 1–12 desde la tónica.
 * `null` = sin sugerencia (el usuario elige manualmente).
 */
const MODIFICADOR_POR_NUMERO_CROMATICO: (Modificador | null)[] = [
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
): Modificador | null {
  const numero = getNumeroCromaticoDesdeTonica(noteIndex, tonalidadIndex);
  return MODIFICADOR_POR_NUMERO_CROMATICO[numero - 1] ?? null;
}

export function isNotaEnEscala(
  noteIndex: NotaIndex,
  tonalidadIndex: NotaIndex,
): boolean {
  const semitonoRelativo = normalizeNotaIndex(noteIndex - tonalidadIndex);
  return (ESCALA_SEMITONOS_DESDE_TONICA as readonly number[]).includes(
    semitonoRelativo,
  );
}
