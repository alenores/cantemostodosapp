import PerfilPageClient from "@/components/perfil/PerfilPageClient";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function PerfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <PerfilPageClient usuarioInicial={mapUserToUsuarioActivo(user)} />;
}
