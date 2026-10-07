import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizarNombreArtista } from "@/lib/artistas-match";

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

/**
 * ¿El artista de una canción coincide con lo buscado?
 * Mantiene la búsqueda de siempre (texto contenido) y suma los otros nombres.
 * `query` puede venir en minúsculas o sin normalizar.
 */
export function artistaCoincideBusqueda(
  artista: string | null | undefined,
  query: string,
  alias: AliasBusqueda,
): boolean {
  if (!artista) return false;
  if (artista.toLowerCase().includes(query.trim().toLowerCase())) return true;

  const queryNorm = normalizarNombreArtista(query);
  if (queryNorm.length < 2) return false;

  const artistaNorm = normalizarNombreArtista(artista);
  if (artistaNorm.includes(queryNorm)) return true;

  return (alias.get(artistaNorm) ?? []).some((nombre) => nombre.includes(queryNorm));
}
