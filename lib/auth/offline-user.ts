import { hayConexion } from "@/lib/conexion";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { leerIdDeSesionGuardada, noHayCookieDeSesion } from "@/lib/auth/sesion-vigente";
import {
  getAppSnapshot,
  saveAppSnapshot,
} from "@/lib/offline/app-snapshot-store";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import { parseCookieHeader } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Solo para elegir qué copia privada mostrar. Las acciones comprueban su propia sesión. */
export async function leerIdUsuarioGuardado(): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const cookies = parseCookieHeader(document.cookie);
  const userId = leerIdDeSesionGuardada(cookies);
  if (userId || hayConexion() || !noHayCookieDeSesion(cookies)) return userId;

  const snapshot = await getAppSnapshot();
  const id = snapshot?.usuario.id;
  return id && id !== OFFLINE_GUEST_USUARIO.id ? id : null;
}

export async function getActiveUserId(
  supabase: SupabaseClient,
): Promise<string | null> {
  if (!hayConexion()) {
    const userId = await leerIdUsuarioGuardado();
    if (userId) return userId;
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user?.id) return session.user.id;
  return hayConexion() ? null : leerIdUsuarioGuardado();
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
