import CancioneroHubPageClient from "@/components/cancionero/CancioneroHubPageClient";
import AppTopHeader from "@/components/ui/AppTopHeader";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { countCancionesCancionero } from "@/lib/cancionero";
import { countMisCanciones } from "@/lib/mis-canciones";
import { createClient } from "@/lib/supabase/server";
import { mapUserToUsuarioActivo } from "@/lib/usuario";

export const revalidate = 0;

type HomePageProps = {
  searchParams: Promise<{ aviso?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { aviso = null } = await searchParams;
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
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <AppTopHeader usuario={usuario} />
      <CancioneroHubPageClient
        usuario={usuario}
        globalCountInicial={globalCount}
        favoritasCountInicial={favoritasCount}
        avisoInicial={aviso}
      />
    </div>
  );
}
