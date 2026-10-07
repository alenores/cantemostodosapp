import type { SupabaseClient } from "@supabase/supabase-js";
import { distanciaEdicion, normalizarNombreArtista } from "@/lib/artistas-match";

/**
 * Otros nombres de artistas para los buscadores (cancionero, Home/Sala, editor):
 * quien escribe "Carlitos" encuentra las canciones de «La Mona Jiménez».
 *
 * Mapa: nombre oficial normalizado → alias normalizados.
 * Se guarda una copia en el teléfono para que funcione sin señal.
 */
export type AliasBusqueda = ReadonlyMap<string, readonly string[]>;

const STORAGE_KEY = "cantemos-artistas-alias-busqueda-v1";
const EVENTO_CAMBIO = "cantemos:artistas-alias-busqueda";

let mapaActual: AliasBusqueda = leerCopiaLocal();

function leerCopiaLocal(): AliasBusqueda {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

function guardarCopiaLocal(mapa: AliasBusqueda) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Object.fromEntries(mapa)),
    );
  } catch {
    // Sin almacenamiento: queda solo en memoria.
  }
}

export function getAliasBusqueda(): AliasBusqueda {
  return mapaActual;
}

export function suscribirAliasBusqueda(callback: () => void): () => void {
  window.addEventListener(EVENTO_CAMBIO, callback);
  return () => window.removeEventListener(EVENTO_CAMBIO, callback);
}

/** Trae los alias de la base y avisa a los buscadores. */
export async function recargarAliasBusqueda(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase
    .from("artistas_alias")
    .select("alias_norm, artistas(nombre)");

  if (error || !data) return;

  const mapa = new Map<string, string[]>();
  for (const row of data as unknown as {
    alias_norm: string;
    artistas: { nombre: string } | { nombre: string }[] | null;
  }[]) {
    const artista = Array.isArray(row.artistas) ? row.artistas[0] : row.artistas;
    if (!artista?.nombre) continue;
    const clave = normalizarNombreArtista(artista.nombre);
    mapa.set(clave, [...(mapa.get(clave) ?? []), row.alias_norm]);
  }

  mapaActual = mapa;
  guardarCopiaLocal(mapa);
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

/** Palabras que no identifican nada al buscar ("los redondos" = "redondos"). */
const PALABRAS_RELLENO = new Set(["los", "las", "la", "el", "lo", "the", "y", "de", "del", "sus"]);

function palabras(texto: string): string[] {
  return normalizarNombreArtista(texto).split(" ").filter(Boolean);
}

function palabrasBuscadas(query: string): string[] {
  const todas = palabras(query);
  const clave = todas.filter((palabra) => !PALABRAS_RELLENO.has(palabra));
  return clave.length > 0 ? clave : todas;
}

/** Errores de tipeo tolerados según el largo de la palabra buscada. */
function toleranciaTipeo(largo: number): number {
  if (largo < 4) return 0;
  if (largo <= 8) return 1;
  return 2;
}

/**
 * La palabra buscada está en la palabra candidata: completa, empezada
 * ("redon" → "redondos") o con un error chico de tipeo ("jimenes" → "jimenez").
 */
function palabraCoincide(buscada: string, candidata: string): boolean {
  if (candidata.startsWith(buscada)) return true;
  const tolerancia = toleranciaTipeo(buscada.length);
  if (tolerancia === 0) return false;
  if (distanciaEdicion(buscada, candidata) <= tolerancia) return true;
  return (
    candidata.length > buscada.length &&
    distanciaEdicion(buscada, candidata.slice(0, buscada.length)) <= tolerancia
  );
}

/**
 * ¿La canción (o el artista) coincide con lo buscado?
 * - Mantiene la búsqueda de siempre (texto contenido en el artista).
 * - Separa lo buscado en palabras, ignora las de relleno y no importa el orden:
 *   cada palabra tiene que estar en el artista, en alguno de sus otros nombres
 *   o en el nombre de la canción (si se pasa), tolerando errores chicos de tipeo.
 */
export function artistaCoincideBusqueda(
  artista: string | null | undefined,
  query: string,
  alias: AliasBusqueda,
  nombreCancion?: string | null,
): boolean {
  const queryTrim = query.trim().toLowerCase();
  if (!queryTrim) return true;
  if (artista?.toLowerCase().includes(queryTrim)) return true;

  const buscadas = palabrasBuscadas(query);
  if (buscadas.length === 0) return false;

  const artistaNorm = artista ? normalizarNombreArtista(artista) : "";
  const candidatas = [
    ...(artistaNorm ? artistaNorm.split(" ") : []),
    ...(alias.get(artistaNorm) ?? []).flatMap((nombre) => nombre.split(" ")),
    ...(nombreCancion ? palabras(nombreCancion) : []),
  ].filter(Boolean);

  if (candidatas.length === 0) return false;

  return buscadas.every((buscada) =>
    candidatas.some((candidata) => palabraCoincide(buscada, candidata)),
  );
}
