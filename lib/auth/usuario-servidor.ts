import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { leerUserDeLasCookies } from "@/lib/auth/sesion-vigente";
import {
  CATEGORIA_COOKIE,
  parseCategoriaCookie,
  type CategoriaUsuario,
} from "@/lib/usuarios-categorias";
import { createClient } from "@/lib/supabase/server";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import type { UsuarioActivo } from "@/types";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Lee quién está adentro desde la sesión ya guardada en el celular.
 * No vuelve a preguntarle al servidor en cada pantalla.
 */
export async function leerUsuarioDeLaSesion(): Promise<{
  supabase: SupabaseClient;
  user: User | null;
  usuario: UsuarioActivo;
}> {
  const supabase = await createClient();
  const store = await cookies();
  const guardado = leerUserDeLasCookies(store.getAll());
  const user = guardado ? (guardado as User) : null;

  return {
    supabase,
    user,
    usuario: user ? mapUserToUsuarioActivo(user) : OFFLINE_GUEST_USUARIO,
  };
}

/** Permiso recordado al entrar. Si todavía no está, se mira una sola vez. */
export async function leerCategoriaRecordada(
  userId: string,
): Promise<CategoriaUsuario | null> {
  const store = await cookies();
  return parseCategoriaCookie(store.get(CATEGORIA_COOKIE)?.value, userId);
}

export async function categoriaDeEstaEntrada(
  supabase: SupabaseClient,
  userId: string,
): Promise<CategoriaUsuario | null> {
  const recordada = await leerCategoriaRecordada(userId);
  if (recordada) return recordada;

  const { data, error } = await supabase
    .from("usuarios_categorias")
    .select("categoria")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.categoria) return null;
  return parseCategoriaCookie(`${userId}:${data.categoria}`, userId);
}
