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

  const { data: categoria } = user
    ? await supabase.from("usuarios_categorias").select("categoria").eq("user_id", user.id).maybeSingle()
    : { data: null };

  return <HubSectionPageClient usuario={usuario} section="practica" isOwner={categoria?.categoria === "dueno"} />;
}
