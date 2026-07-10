import HubSectionPageClient from "@/components/cancionero/HubSectionPageClient";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { createClient } from "@/lib/supabase/server";
import { mapUserToUsuarioActivo } from "@/lib/usuario";

export const revalidate = 0;

export default async function PracticaHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const usuario = user
    ? mapUserToUsuarioActivo(user)
    : OFFLINE_GUEST_USUARIO;

  return <HubSectionPageClient usuario={usuario} section="practica" />;
}
