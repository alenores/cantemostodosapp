import CancioneroHubPageClient from "@/components/cancionero/CancioneroHubPageClient";
import DesktopHomeRedirect from "@/components/home/DesktopHomeRedirect";
import AppTopHeader from "@/components/ui/AppTopHeader";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
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

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <DesktopHomeRedirect />
      <AppTopHeader usuario={usuario} />
      <CancioneroHubPageClient usuario={usuario} avisoInicial={aviso} />
    </div>
  );
}
