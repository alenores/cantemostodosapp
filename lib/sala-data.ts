import type { ColaItem, SesionSala } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CancionActivaData = {
  nombre: string;
  artista: string | null;
  url_letra: string;
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
    .select("nombre, artista, url_letra")
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
