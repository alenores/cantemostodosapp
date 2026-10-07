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

/** Cambios de letras entre dos palabras; dos letras invertidas cuentan como uno. */
export function distanciaEdicion(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let anterior: number[] = [];
  let previa = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      let valor = Math.min(
        previa[j]! + 1,
        actual[j - 1]! + 1,
        previa[j - 1]! + costo,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        valor = Math.min(valor, anterior[j - 2]! + 1);
      }
      actual[j] = valor;
    }
    anterior = previa;
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

// ---------------------------------------------------------------------------
// Comparación por clave (gestor de artistas y lista de artistas): evita crear
// un artista que ya existe escrito de otra forma.
// ---------------------------------------------------------------------------

/** Palabras que no cuentan al comparar nombres de artistas. */
const ARTICULOS = new Set(["el", "la", "los", "las", "lo", "the"]);

/**
 * Palabras del nombre listas para comparar: minúsculas, sin tildes ni signos,
 * "&" = "y", sin artículos y ordenadas (el orden no importa).
 */
export function palabrasArtista(nombre: string): string[] {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!limpio) return [];

  const todas = limpio.split(" ");
  const sinArticulos = todas.filter((palabra) => !ARTICULOS.has(palabra));
  return (sinArticulos.length > 0 ? sinArticulos : todas).sort();
}

/** Clave única del artista: dos nombres con la misma clave son el mismo artista. */
export function claveArtista(nombre: string): string {
  return palabrasArtista(nombre).join(" ");
}

function distanciaLetras(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const actual = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + costo);
    }
    previa = actual;
  }
  return previa[b.length];
}

/** Errores de tipeo tolerados según el largo del texto. */
function toleranciaTipeo(largo: number): number {
  if (largo <= 3) return 0;
  if (largo <= 8) return 1;
  return 2;
}

function palabrasParecidas(a: string, b: string): boolean {
  return distanciaLetras(a, b) <= toleranciaTipeo(Math.min(a.length, b.length));
}

/** Todas las palabras de `chicas` aparecen (con tolerancia de tipeo) en `grandes`. */
function contenidas(chicas: string[], grandes: string[]): boolean {
  const libres = [...grandes];
  return chicas.every((palabra) => {
    const indice = libres.findIndex((otra) => palabrasParecidas(palabra, otra));
    if (indice === -1) return false;
    libres.splice(indice, 1);
    return true;
  });
}

function sonParecidos(a: string[], b: string[]): boolean {
  const claveA = a.join(" ");
  const claveB = b.join(" ");
  if (distanciaLetras(claveA, claveB) <= toleranciaTipeo(Math.min(claveA.length, claveB.length))) {
    return true;
  }

  const [chicas, grandes] = a.length <= b.length ? [a, b] : [b, a];
  // Una palabra corta suelta es demasiado amplia ("Bueno" no sugiere a todos los Bueno).
  if (chicas.length < 2 && grandes.length > 1 && chicas[0].length < 6) return false;
  return contenidas(chicas, grandes);
}

export type CoincidenciaArtista = {
  /** Artista con la misma clave: es el mismo, se puede asignar solo. */
  exacto: Artista | null;
  /** Artistas parecidos: se sugieren, no se asignan solos. */
  parecidos: Artista[];
};

export function buscarArtistaCoincidente(
  nombre: string,
  artistas: Artista[],
  opciones?: { excluirId?: string | null; maxParecidos?: number },
): CoincidenciaArtista {
  const palabras = palabrasArtista(nombre);
  if (palabras.length === 0) return { exacto: null, parecidos: [] };

  const clave = palabras.join(" ");
  let exacto: Artista | null = null;
  const parecidos: Artista[] = [];

  for (const artista of artistas) {
    if (artista.id === opciones?.excluirId) continue;
    const otras = palabrasArtista(artista.nombre);
    if (otras.length === 0) continue;

    if (otras.join(" ") === clave) {
      if (!exacto || artista.nombre === nombre.trim()) exacto = artista;
    } else if (sonParecidos(palabras, otras)) {
      parecidos.push(artista);
    }
  }

  return {
    exacto,
    parecidos: exacto ? [] : parecidos.slice(0, opciones?.maxParecidos ?? 3),
  };
}

/**
 * Vínculo a guardar para el texto del artista.
 * `undefined` = no se pudo comparar (lista sin cargar): no tocar el vínculo guardado.
 */
export function resolverArtistaId(
  texto: string,
  artistaIdElegido: string | null,
  artistas: Artista[],
): string | null | undefined {
  if (!texto.trim()) return null;
  if (artistas.length === 0) return undefined;

  const elegido = artistaIdElegido
    ? artistas.find((artista) => artista.id === artistaIdElegido)
    : undefined;
  if (elegido && claveArtista(elegido.nombre) === claveArtista(texto)) {
    return elegido.id;
  }

  return buscarArtistaCoincidente(texto, artistas).exacto?.id ?? null;
}
