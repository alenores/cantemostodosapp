import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UsuarioActivo } from "@/types";

export type ColaAgregadoSnapshot = {
  agregado_por: string;
  agregado_nombre: string;
  agregado_avatar_url: string | null;
};

export function mapUserToUsuarioActivo(user: User): UsuarioActivo {
  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    nombre: typeof metadata.nombre === "string" ? metadata.nombre : "",
    email: user.email ?? "",
    avatar_url:
      typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
  };
}

export function getInicialesUsuario(nombre: string, email: string): string {
  const trimmed = nombre.trim();
  if (trimmed) {
    return trimmed.slice(0, 1).toUpperCase();
  }

  return (email[0] ?? "?").toUpperCase();
}

export function usuarioActivoToColaAgregado(
  usuario: UsuarioActivo,
): ColaAgregadoSnapshot {
  return {
    agregado_por: usuario.id,
    agregado_nombre: usuario.nombre.trim() || usuario.email,
    agregado_avatar_url: usuario.avatar_url,
  };
}

export async function fetchColaAgregadoSnapshot(
  supabase: SupabaseClient,
): Promise<ColaAgregadoSnapshot | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;

  if (!user) {
    return null;
  }

  return usuarioActivoToColaAgregado(mapUserToUsuarioActivo(user));
}
