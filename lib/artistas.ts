import type { SupabaseClient } from "@supabase/supabase-js";
import type { Artista } from "@/types";

export async function getArtistas(supabase: SupabaseClient): Promise<Artista[]> {
  const { data, error } = await supabase
    .from("artistas")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error al obtener artistas:", error);
    return [];
  }

  return data as Artista[];
}

export async function addArtista(
  supabase: SupabaseClient,
  nombre: string,
  avatar_url: string | null
): Promise<Artista | null> {
  const { data, error } = await supabase
    .from("artistas")
    .insert({ nombre, avatar_url })
    .select()
    .single();

  if (error) {
    console.error("Error al agregar artista:", error);
    return null;
  }

  return data as Artista;
}

export async function updateArtista(
  supabase: SupabaseClient,
  id: string,
  nombre: string,
  avatar_url: string | null
): Promise<Artista | null> {
  const { data, error } = await supabase
    .from("artistas")
    .update({ nombre, avatar_url })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error al actualizar artista:", error);
    return null;
  }

  return data as Artista;
}

export async function deleteArtista(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  const { error } = await supabase.from("artistas").delete().eq("id", id);
  if (error) {
    console.error("Error al borrar artista:", error);
    return false;
  }
  return true;
}

export async function uploadAvatar(
  supabase: SupabaseClient,
  file: File,
  artistaId: string
): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${artistaId}-${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from("artistas-avatares")
    .upload(fileName, file, { upsert: true });

  if (error) {
    console.error("Error al subir avatar:", error);
    return null;
  }

  const { data: publicUrlData } = supabase.storage
    .from("artistas-avatares")
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}
