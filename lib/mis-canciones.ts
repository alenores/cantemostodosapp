import type { UsuarioCancion } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getMisCanciones(
  supabase: SupabaseClient,
): Promise<UsuarioCancion[]> {
  const { data, error } = await supabase
    .from("usuarios_canciones")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function agregarAMisCanciones(
  supabase: SupabaseClient,
  item: {
    nombre: string;
    artista?: string | null;
    cancion_guardada_id?: number | null;
    url_letra?: string | null;
  },
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Se requiere sesión activa para guardar en Mis canciones");
  }

  const { error } = await supabase.from("usuarios_canciones").insert({
    user_id: userId,
    nombre: item.nombre.trim(),
    artista: item.artista?.trim() || null,
    cancion_guardada_id: item.cancion_guardada_id ?? null,
    url_letra: item.url_letra ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function eliminarDeMisCanciones(
  supabase: SupabaseClient,
  id: number,
): Promise<void> {
  const { error } = await supabase
    .from("usuarios_canciones")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}
