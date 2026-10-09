import CancioneroHubPageClient from "@/components/cancionero/CancioneroHubPageClient";
import RecordarEntrada from "@/components/auth/RecordarEntrada";
import DesktopHomeRedirect from "@/components/home/DesktopHomeRedirect";
import AppTopHeader from "@/components/ui/AppTopHeader";
import {
  categoriaDeEstaEntrada,
  leerUsuarioDeLaSesion,
} from "@/lib/auth/usuario-servidor";

export const revalidate = 0;

type HomePageProps = {
  searchParams: Promise<{ aviso?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { aviso = null } = await searchParams;
  const { supabase, user, usuario } = await leerUsuarioDeLaSesion();
  const categoria = user ? await categoriaDeEstaEntrada(supabase, user.id) : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <RecordarEntrada userId={user?.id ?? null} categoria={categoria} />
      <DesktopHomeRedirect />
      <AppTopHeader usuario={usuario} mostrarQr />
      <CancioneroHubPageClient
        usuario={usuario}
        avisoInicial={aviso}
        isOwner={categoria === "dueno"}
      />
    </div>
  );
}
