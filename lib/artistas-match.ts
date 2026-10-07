import type { Artista, ArtistaAlias } from "@/types";

/**
 * Buscador de artistas del editor: compara un nombre que viene de la web,
 * de un texto pegado o tipeado contra la tabla `artistas` (+ `artistas_alias`)
 * para no crear el mismo artista dos veces con nombres parecidos.
 *
 * - Normaliza (minúsculas, sin tildes ni signos, "&" = "y").
 * - Compara por palabras sin importar el orden ("García Charly" = "Charly García").
 * - Tolera errores chicos de tipeo en palabras de 4+ letras.
 * - Un apellido solo no alcanza: "Sosa" da varias opciones dudosas, nunca una segura.
 */

/** Desde este puntaje el artista se vincula solo (si no hay otro cerca). */
export const ARTISTA_MATCH_SEGURO = 0.9;
/** Margen mínimo con el segundo candidato para considerarlo seguro. */
export const ARTISTA_MATCH_MARGEN = 0.1;
/** Desde este puntaje el artista se muestra como «¿Es este?». */
export const ARTISTA_MATCH_DUDOSO = 0.5;
/** Parecido mínimo entre dos palabras para tomarlas como la misma. */
const PALABRA_SIMILITUD_MIN = 0.8;
const MAX_CANDIDATOS = 4;

/** Palabras de relleno que no identifican al artista. */
const PALABRAS_RELLENO = new Set([
  "los",
  "las",
  "la",
  "el",
  "the",
  "y",
  "de",
  "del",
  "sus",
]);

/** Separadores de colaboraciones: se compara también solo el artista principal. */
const COLABORACION_REGEX = /\s+(?:ft\.?|feat\.?|featuring)\s+/i;

export function normalizarNombreArtista(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " y ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function palabrasClave(normalizado: string): string[] {
  const todas = normalizado.split(" ").filter(Boolean);
  const clave = todas.filter((palabra) => !PALABRAS_RELLENO.has(palabra));
  return clave.length > 0 ? clave : todas;
}

function distanciaEdicion(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previa = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      actual[j] = Math.min(
        previa[j]! + 1,
        actual[j - 1]! + 1,
        previa[j - 1]! + costo,
      );
    }
    previa = actual;
  }

  return previa[b.length]!;
}

function similitudPalabra(a: string, b: string): number {
  if (a === b) return 1;
  // Palabras cortas ("25", "xxi", "jaf") solo cuentan si son idénticas.
  if (a.length < 4 || b.length < 4) return 0;
  const similitud = 1 - distanciaEdicion(a, b) / Math.max(a.length, b.length);
  return similitud >= PALABRA_SIMILITUD_MIN ? similitud : 0;
}

/** Puntaje 0–1 entre dos nombres ya normalizados (coeficiente de Dice por palabras). */
function puntajeNombres(entrada: string, candidato: string): number {
  if (!entrada || !candidato) return 0;
  if (entrada === candidato) return 1;
  // Mismo nombre con las palabras pegadas ("supermerk2" / "super merk2").
  if (entrada.replace(/ /g, "") === candidato.replace(/ /g, "")) return 1;

  const palabrasEntrada = palabrasClave(entrada);
  const palabrasCandidato = palabrasClave(candidato);
  const usadas = new Set<number>();
  let coincidencia = 0;

  for (const palabra of palabrasEntrada) {
    let mejor = 0;
    let mejorIndex = -1;
    palabrasCandidato.forEach((otra, index) => {
      if (usadas.has(index)) return;
      const similitud = similitudPalabra(palabra, otra);
      if (similitud > mejor) {
        mejor = similitud;
        mejorIndex = index;
      }
    });
    if (mejorIndex >= 0) {
      usadas.add(mejorIndex);
      coincidencia += mejor;
    }
  }

  return (2 * coincidencia) / (palabrasEntrada.length + palabrasCandidato.length);
}

export type ArtistaCandidato = {
  artista: Artista;
  puntaje: number;
  /** El nombre que coincidió (el oficial o un alias guardado). */
  coincideCon: string;
};

export type ArtistaMatchResultado =
  | { tipo: "vacio" }
  | { tipo: "seguro"; artista: Artista; candidatos: ArtistaCandidato[] }
  | { tipo: "dudoso"; candidatos: ArtistaCandidato[] }
  | { tipo: "nuevo" };

export function buscarArtistaCandidatos(
  texto: string,
  artistas: Artista[],
  alias: ArtistaAlias[] = [],
): ArtistaCandidato[] {
  const entradaCompleta = normalizarNombreArtista(texto);
  if (!entradaCompleta) return [];

  const principal = normalizarNombreArtista(texto.split(COLABORACION_REGEX)[0] ?? "");
  const entradas =
    principal && principal !== entradaCompleta
      ? [entradaCompleta, principal]
      : [entradaCompleta];

  const nombresPorArtista = new Map<string, string[]>();
  for (const artista of artistas) {
    nombresPorArtista.set(artista.id, [artista.nombre]);
  }
  for (const item of alias) {
    nombresPorArtista.get(item.artista_id)?.push(item.alias);
  }

  const candidatos: ArtistaCandidato[] = [];

  for (const artista of artistas) {
    let mejor = 0;
    let coincideCon = artista.nombre;

    for (const nombre of nombresPorArtista.get(artista.id) ?? []) {
      const normalizado = normalizarNombreArtista(nombre);
      for (const entrada of entradas) {
        const puntaje = puntajeNombres(entrada, normalizado);
        if (puntaje > mejor) {
          mejor = puntaje;
          coincideCon = nombre;
        }
      }
    }

    if (mejor >= ARTISTA_MATCH_DUDOSO) {
      candidatos.push({ artista, puntaje: mejor, coincideCon });
    }
  }

  return candidatos
    .sort((a, b) => b.puntaje - a.puntaje || a.artista.nombre.localeCompare(b.artista.nombre))
    .slice(0, MAX_CANDIDATOS);
}

export function resolverArtista(
  texto: string,
  artistas: Artista[],
  alias: ArtistaAlias[] = [],
): ArtistaMatchResultado {
  if (!normalizarNombreArtista(texto)) return { tipo: "vacio" };

  const candidatos = buscarArtistaCandidatos(texto, artistas, alias);
  const [primero, segundo] = candidatos;

  if (!primero) return { tipo: "nuevo" };

  const sinCompetencia =
    !segundo || primero.puntaje - segundo.puntaje >= ARTISTA_MATCH_MARGEN;

  if (primero.puntaje >= ARTISTA_MATCH_SEGURO && sinCompetencia) {
    return { tipo: "seguro", artista: primero.artista, candidatos };
  }

  return { tipo: "dudoso", candidatos };
}
