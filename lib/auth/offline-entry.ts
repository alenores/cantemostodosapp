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
  salas: Pick<Sala, "id" | "nombre" | "descripcion">[];
  usuario: UsuarioActivo;
  cancioneroTotal: number;
  errorMessage: string | null;
  avisoInicial: string | null;
};

export function resolveOfflineSalasPayload(
  snapshot: AppSnapshotRecord | null,
  session: Session | null,
  avisoInicial: string | null,
): OfflineSalasPayload {
  const usuario =
    snapshot?.usuario ??
    (session?.user
      ? mapUserToUsuarioActivo(session.user)
      : OFFLINE_GUEST_USUARIO);

  return {
    salas: snapshot?.salas ?? [],
    usuario,
    cancioneroTotal: snapshot?.cancioneroTotal ?? 0,
    errorMessage: null,
    avisoInicial,
  };
}
