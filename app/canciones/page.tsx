import HubSectionPageClient from "@/components/cancionero/HubSectionPageClient";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { countCancionesCancionero } from "@/lib/cancionero";
import { countMisCanciones } from "@/lib/mis-canciones";
import { createClient } from "@/lib/supabase/server";
import { mapUserToUsuarioActivo } from "@/lib/usuario";

export const revalidate = 0;

export default async function CancionesHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const usuario = user
    ? mapUserToUsuarioActivo(user)
    : OFFLINE_GUEST_USUARIO;

  const [globalCount, favoritasCount] = await Promise.all([
    countCancionesCancionero(supabase).catch(() => 0),
    user ? countMisCanciones(supabase).catch(() => 0) : Promise.resolve(0),
  ]);

  return (
    <HubSectionPageClient
      usuario={usuario}
      section="canciones"
      globalCountInicial={globalCount}
      favoritasCountInicial={favoritasCount}
    />
  );
}
