import HubSectionPageClient from "@/components/cancionero/HubSectionPageClient";
import { leerUsuarioDeLaSesion } from "@/lib/auth/usuario-servidor";
import { countCancionesCancionero } from "@/lib/cancionero";
import { countMisCanciones } from "@/lib/mis-canciones";

export const revalidate = 0;

export default async function CancionesHubPage() {
  const { supabase, user, usuario } = await leerUsuarioDeLaSesion();

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
