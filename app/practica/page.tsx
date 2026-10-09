import HubSectionPageClient from "@/components/cancionero/HubSectionPageClient";
import RecordarEntrada from "@/components/auth/RecordarEntrada";
import {
  categoriaDeEstaEntrada,
  leerUsuarioDeLaSesion,
} from "@/lib/auth/usuario-servidor";

export const revalidate = 0;

export default async function PracticaHubPage() {
  const { supabase, user, usuario } = await leerUsuarioDeLaSesion();
  const categoria = user ? await categoriaDeEstaEntrada(supabase, user.id) : null;

  return (
    <>
      <RecordarEntrada userId={user?.id ?? null} categoria={categoria} />
      <HubSectionPageClient
        usuario={usuario}
        section="practica"
        isOwner={categoria === "dueno"}
      />
    </>
  );
}
