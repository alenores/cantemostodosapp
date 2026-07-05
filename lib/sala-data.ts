import {
  getCancioneroLocalAll,
  getCancioneroLocalForBusqueda,
} from "@/lib/offline/cancionero-store";
import type { ColaItem, SesionSala } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CancionBusquedaLocal = {
  id: number;
  nombre: string;
  artista: string | null;
  letra: string | null;
  url_letra: string;
  tiene_cifrado_avanzado?: boolean;
};

const PESO_NOMBRE = 10;
const PESO_ARTISTA = 5;
const PESO_LETRA = 1;

export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function scoreCampo(campo: string, query: string, peso: number): number {
  if (!campo || !query) {
    return 0;
  }

  if (campo === query) {
    return peso * 100;
  }

  if (campo.startsWith(query)) {
    return peso * 50 + query.length * 2;
  }

  if (campo.includes(query)) {
    return peso * 20 + query.length;
  }

  return 0;
}

function scoreCancionLocal(
  query: string,
  cancion: CancionBusquedaLocal,
): number {
  const normalizedQuery = normalizeForSearch(query);
  const nombre = normalizeForSearch(cancion.nombre);
  const artista = normalizeForSearch(cancion.artista ?? "");
  const letra = normalizeForSearch(cancion.letra ?? "");

  return (
    scoreCampo(nombre, normalizedQuery, PESO_NOMBRE) +
    scoreCampo(artista, normalizedQuery, PESO_ARTISTA) +
    scoreCampo(letra, normalizedQuery, PESO_LETRA)
  );
}

export type BuscarEnCancioneroOptions = {
  /** Solo canciones con letra guardada (Paso 1). */
  conLetra?: boolean;
  /** Solo links guardados sin letra (Paso 2). */
  soloLink?: boolean;
};

export function buscarEnCancionero(
  query: string,
  canciones: CancionBusquedaLocal[],
  options: BuscarEnCancioneroOptions = {},
): CancionBusquedaLocal[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  let filtered = canciones;

  if (options.conLetra) {
    filtered = filtered.filter((cancion) => Boolean(cancion.letra?.trim()));
  }

  if (options.soloLink) {
    filtered = filtered.filter(
      (cancion) =>
        Boolean(cancion.url_letra?.trim()) && !cancion.letra?.trim(),
    );
  }

  return filtered
    .map((cancion) => ({
      cancion,
      score: scoreCancionLocal(trimmed, cancion),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.cancion);
}

export async function fetchCancioneroBusqueda(
  supabase: SupabaseClient,
): Promise<CancionBusquedaLocal[]> {
  const { data, error } = await supabase
    .from("canciones_guardadas")
    .select("id, nombre, artista, letra, url_letra, tiene_cifrado_avanzado")
    .is("sala_id", null);

  if (error) {
    throw error;
  }

  return data ?? [];
}

/** Copia local primero (como la pantalla de canciones guardadas); Supabase si no hay cache. */
export async function loadCancionesParaBusqueda(
  supabase?: SupabaseClient,
): Promise<CancionBusquedaLocal[]> {
  const records = await getCancioneroLocalAll();
  const local = getCancioneroLocalForBusqueda(records);

  if (local.length > 0) {
    return local;
  }

  if (!supabase) {
    return [];
  }

  return fetchCancioneroBusqueda(supabase);
}

export type CancionActivaData = {
  nombre: string;
  artista: string | null;
  url_letra: string;
  /** Texto de letra propio (manual). Si existe, se muestra en hoja blanca. */
  letra_texto?: string | null;
};

export type ColaResumen = {
  pendientes: number;
  proximaNombre: string | null;
};

export function buildGuardadaKey(nombre: string, urlLetra: string): string {
  return `${nombre}::${urlLetra}`;
}

export function deriveColaResumen(items: ColaItem[]): ColaResumen {
  const pendientes = items.filter((item) => item.estado === "pendiente");

  return {
    pendientes: pendientes.length,
    proximaNombre: pendientes[0]?.nombre ?? null,
  };
}

export function deriveCancionActivaFromCola(
  items: ColaItem[],
): CancionActivaData | null {
  const activa = items.find((item) => item.estado === "activa");

  if (!activa) {
    return null;
  }

  return {
    nombre: activa.nombre,
    artista: activa.artista,
    url_letra: activa.url_letra,
    letra_texto: activa.letra_texto ?? null,
  };
}

export async function fetchColaCompleta(
  supabase: SupabaseClient,
  salaId: number,
): Promise<ColaItem[]> {
  const { data, error } = await supabase
    .from("cola_juntada")
    .select("*")
    .eq("sala_id", salaId)
    .order("orden", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function fetchGuardadasKeys(
  supabase: SupabaseClient,
  salaId: number,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("canciones_guardadas")
    .select("nombre, url_letra")
    .eq("sala_id", salaId);

  if (error || !data) {
    return new Set();
  }

  return new Set(
    data.map((item) => buildGuardadaKey(item.nombre, item.url_letra)),
  );
}

export async function fetchColaItemById(
  supabase: SupabaseClient,
  colaItemId: number,
): Promise<CancionActivaData | null> {
  const { data, error } = await supabase
    .from("cola_juntada")
    .select("nombre, artista, url_letra, letra_texto")
    .eq("id", colaItemId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function fetchCancionActiva(
  supabase: SupabaseClient,
  salaId: number,
): Promise<CancionActivaData | null> {
  const { data: sesion, error: sesionError } = await supabase
    .from("sesion_sala")
    .select("cola_item_id")
    .eq("sala_id", salaId)
    .maybeSingle();

  if (sesionError || !sesion?.cola_item_id) {
    return null;
  }

  return fetchColaItemById(supabase, sesion.cola_item_id);
}

export async function fetchColaResumen(
  supabase: SupabaseClient,
  salaId: number,
): Promise<ColaResumen> {
  const items = await fetchColaCompleta(supabase, salaId);
  return deriveColaResumen(items);
}

export function getColaItemIdFromSesion(payload: SesionSala): number | null {
  return payload.cola_item_id;
}
