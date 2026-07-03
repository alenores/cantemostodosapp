import CancioneroHubPageClient from "@/components/cancionero/CancioneroHubPageClient";
import AppTopHeader from "@/components/ui/AppTopHeader";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { countCancionesCancionero } from "@/lib/cancionero";
import { createClient } from "@/lib/supabase/server";
import { mapUserToUsuarioActivo } from "@/lib/usuario";

export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const usuario = user
    ? mapUserToUsuarioActivo(user)
    : OFFLINE_GUEST_USUARIO;

  const globalCount = await countCancionesCancionero(supabase).catch(() => 0);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <AppTopHeader usuario={usuario} />
      <CancioneroHubPageClient
        usuario={usuario}
        globalCountInicial={globalCount}
      />
    </div>
  );
}
