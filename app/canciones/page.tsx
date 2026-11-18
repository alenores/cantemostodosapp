import HubSectionPageClient from "@/components/cancionero/HubSectionPageClient";
import {
  categoriaDeEstaEntrada,
  leerUsuarioDeLaSesion,
} from "@/lib/auth/usuario-servidor";

export const revalidate = 0;

export default async function CancionesHubPage() {
  const { supabase, user, usuario } = await leerUsuarioDeLaSesion();
  const categoria = user ? await categoriaDeEstaEntrada(supabase, user.id) : null;

  return (
    <HubSectionPageClient
      usuario={usuario}
      section="canciones"
      isOwner={categoria === "dueno"}
      categoriaInicial={categoria}
    />
  );
}
