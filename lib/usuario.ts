import type { User } from "@supabase/supabase-js";
import type { UsuarioActivo } from "@/types";

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
