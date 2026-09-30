import UsuariosPageClient from "@/components/herramientas/UsuariosPageClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function PracticaUsuariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/practica");
  const { data } = await supabase.from("usuarios_categorias").select("categoria").eq("user_id", user.id).maybeSingle();
  if (data?.categoria !== "dueno") redirect("/practica");
  return <UsuariosPageClient />;
}
