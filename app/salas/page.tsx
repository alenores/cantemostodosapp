import SalasPageClient from "@/components/salas/SalasPageClient";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function SalasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: salas, error: salasError } = await supabase
    .from("salas")
    .select("id, nombre, descripcion")
    .eq("visible", true)
    .order("nombre");

  return (
    <SalasPageClient
      salas={salas ?? []}
      errorMessage={salasError?.message ?? null}
      usuario={mapUserToUsuarioActivo(user)}
    />
  );
}
