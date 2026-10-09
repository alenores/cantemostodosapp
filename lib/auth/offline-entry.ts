import type { AppSnapshotRecord } from "@/lib/offline/offline-db";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import type { Sala, UsuarioActivo } from "@/types";
import type { Session } from "@supabase/supabase-js";

export const OFFLINE_GUEST_USUARIO: UsuarioActivo = {
  id: "offline-guest",
  nombre: "Invitado",
  email: "",
  avatar_url: null,
};

export type OfflineSalasPayload = {
  salas: Pick<Sala, "id" | "nombre" | "descripcion" | "avatar_url">[];
  usuario: UsuarioActivo;
  errorMessage: string | null;
  avisoInicial: string | null;
};

export function resolveOfflineSalasPayload(
  snapshot: AppSnapshotRecord | null,
  session: Session | null,
  avisoInicial: string | null,
): OfflineSalasPayload {
  if (!session?.user) {
    return {
      salas: [],
      usuario: OFFLINE_GUEST_USUARIO,
      errorMessage: null,
      avisoInicial,
    };
  }

  const usuario = snapshot?.usuario ?? mapUserToUsuarioActivo(session.user);

  return {
    salas: snapshot?.salas ?? [],
    usuario,
    errorMessage: null,
    avisoInicial,
  };
}
