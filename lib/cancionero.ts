import type { CancionCancionero } from "@/types";
import { fetchColaAgregadoSnapshot } from "@/lib/usuario";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CancioneroFormData = {
  nombre: string;
  artista: string;
  letra: string;
};

export function filterCancionesCancionero(
  canciones: CancionCancionero[],
  query: string,
): CancionCancionero[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return canciones;
  }

  return canciones.filter((cancion) => {
    const matchesNombre = cancion.nombre.toLowerCase().includes(normalized);
    const matchesArtista = cancion.artista?.toLowerCase().includes(normalized);

    return matchesNombre || Boolean(matchesArtista);
  });
}

export async function countCancionesCancionero(
  supabase: SupabaseClient,
): Promise<number> {
  const { count, error } = await supabase
    .from("canciones_guardadas")
    .select("id", { count: "exact", head: true })
    .is("sala_id", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function fetchCancionesCancionero(
  supabase: SupabaseClient,
): Promise<CancionCancionero[]> {
  const { data, error } = await supabase
    .from("canciones_guardadas")
    .select("id, nombre, artista, letra")
    .is("sala_id", null)
    .order("nombre", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function insertCancionCancionero(
  supabase: SupabaseClient,
  form: CancioneroFormData,
): Promise<void> {
  const { error } = await supabase.from("canciones_guardadas").insert({
    sala_id: null,
    nombre: form.nombre.trim(),
    artista: form.artista.trim(),
    letra: form.letra.trim(),
    url_letra: "",
  });

  if (error) {
    throw error;
  }
}

export async function updateCancionCancionero(
  supabase: SupabaseClient,
  id: number,
  form: CancioneroFormData,
): Promise<void> {
  const { error } = await supabase
    .from("canciones_guardadas")
    .update({
      nombre: form.nombre.trim(),
      artista: form.artista.trim(),
      letra: form.letra.trim(),
    })
    .eq("id", id)
    .is("sala_id", null);

  if (error) {
    throw error;
  }
}

export async function deleteCancionCancionero(
  supabase: SupabaseClient,
  id: number,
): Promise<void> {
  const { error } = await supabase
    .from("canciones_guardadas")
    .delete()
    .eq("id", id)
    .is("sala_id", null);

  if (error) {
    throw error;
  }
}

export async function agregarCancioneroACola(
  supabase: SupabaseClient,
  salaId: number,
  cancion: CancionCancionero,
): Promise<void> {
  const { data: lastItem, error: lastError } = await supabase
    .from("cola_juntada")
    .select("orden")
    .eq("sala_id", salaId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError) {
    throw lastError;
  }

  const nextOrden = (lastItem?.orden ?? 0) + 1;
  const letraTexto = cancion.letra?.trim() || null;
  const agregado = await fetchColaAgregadoSnapshot(supabase);

  const { error } = await supabase.from("cola_juntada").insert({
    sala_id: salaId,
    nombre: cancion.nombre,
    artista: cancion.artista,
    url_letra: "",
    letra_texto: letraTexto,
    estado: "pendiente",
    orden: nextOrden,
    ...(agregado ?? {}),
  });

  if (error) {
    throw error;
  }
}
