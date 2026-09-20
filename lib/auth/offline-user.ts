import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import {
  getAppSnapshot,
  saveAppSnapshot,
} from "@/lib/offline/app-snapshot-store";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getActiveUserId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user?.id) return session.user.id;
  if (typeof navigator === "undefined" || navigator.onLine) return null;

  const snapshot = await getAppSnapshot();
  const userId = snapshot?.usuario.id;
  return userId && userId !== OFFLINE_GUEST_USUARIO.id ? userId : null;
}

export async function rememberActiveUserForOffline(
  supabase: SupabaseClient,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return;

  const usuario = mapUserToUsuarioActivo(session.user);
  const previous = await getAppSnapshot();
  await saveAppSnapshot({
    usuario,
    salas: previous?.usuario.id === usuario.id ? previous.salas : [],
    cancioneroTotal:
      previous?.usuario.id === usuario.id ? previous.cancioneroTotal : undefined,
  });
}
