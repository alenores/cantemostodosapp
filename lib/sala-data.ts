import type { SesionSala } from "@/types";
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
  const { data, error, count } = await supabase
    .from("cola_juntada")
    .select("nombre", { count: "exact" })
    .eq("sala_id", salaId)
    .eq("estado", "pendiente")
    .order("orden", { ascending: true });

  if (error) {
    return { pendientes: 0, proximaNombre: null };
  }

  return {
    pendientes: count ?? 0,
    proximaNombre: data?.[0]?.nombre ?? null,
  };
}

export function getColaItemIdFromSesion(payload: SesionSala): number | null {
  return payload.cola_item_id;
}
