import type { CancionInput } from "@/lib/cola-logic";
import {
  deleteMiCancionLocal,
  getMisCancionesLocal,
  putMiCancionLocal,
  replaceMisCancionesLocal,
} from "@/lib/offline/mis-canciones-store";
import type { CancionCancionero, UsuarioCancion } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveUserId } from "@/lib/auth/offline-user";

export async function countMisCanciones(
  supabase: SupabaseClient,
): Promise<number> {
  const { count, error } = await supabase
    .from("usuarios_canciones")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getMisCanciones(
  supabase: SupabaseClient,
): Promise<UsuarioCancion[]> {
  const userId = await getActiveUserId(supabase);

  if (!userId) {
    return [];
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return getMisCancionesLocal(userId);
  }

  const { data, error } = await supabase
    .from("usuarios_canciones")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) {
    const local = await getMisCancionesLocal(userId);
    if (local.length > 0) return local;
    throw error;
  }

  const canciones = data ?? [];
  await replaceMisCancionesLocal(userId, canciones);
  return canciones;
}

export function yaExisteEnMisCanciones(
  canciones: UsuarioCancion[],
  cancionGuardadaId: number,
): boolean {
  return canciones.some(
    (item) => item.cancion_guardada_id === cancionGuardadaId,
  );
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
    throw new Error("Se requiere sesión activa para guardar en Favoritas");
  }

  const { data, error } = await supabase
    .from("usuarios_canciones")
    .insert({
      user_id: userId,
      nombre: item.nombre.trim(),
      artista: item.artista?.trim() || null,
      cancion_guardada_id: item.cancion_guardada_id ?? null,
      url_letra: item.url_letra ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  if (data) {
    await putMiCancionLocal(userId, data);
  }
}

export async function eliminarDeMisCanciones(
  supabase: SupabaseClient,
  id: number,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  const { error } = await supabase
    .from("usuarios_canciones")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  if (userId) {
    await deleteMiCancionLocal(userId, id);
  }
}

export function usuarioCancionToCancionInput(
  cancion: UsuarioCancion,
  letraTexto?: string | null,
): CancionInput {
  if (cancion.cancion_guardada_id !== null) {
    return {
      nombre: cancion.nombre.trim(),
      artista: cancion.artista?.trim() || null,
      url_letra: `cancionero://${cancion.cancion_guardada_id}`,
      letra_texto: letraTexto?.trim() || null,
    };
  }

  return {
    nombre: cancion.nombre.trim(),
    artista: cancion.artista?.trim() || null,
    url_letra: cancion.url_letra?.trim() ?? "",
    letra_texto: letraTexto?.trim() || null,
  };
}

export type MisCancionCarouselEntry = {
  usuarioCancion: UsuarioCancion;
  cancion: CancionCancionero;
};
