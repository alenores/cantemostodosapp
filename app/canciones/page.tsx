import HubSectionPageClient from "@/components/cancionero/HubSectionPageClient";
import { leerUsuarioDeLaSesion } from "@/lib/auth/usuario-servidor";

export const revalidate = 0;

export default async function CancionesHubPage() {
  const { usuario } = await leerUsuarioDeLaSesion();

  return (
    <HubSectionPageClient
      usuario={usuario}
      section="canciones"
    />
  );
}
