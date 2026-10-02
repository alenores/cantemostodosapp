import type { Artista } from "@/types";

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
