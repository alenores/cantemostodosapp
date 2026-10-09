import RecordarEntrada from "@/components/auth/RecordarEntrada";
import UsuariosPageClient from "@/components/herramientas/UsuariosPageClient";
import {
  categoriaDeEstaEntrada,
  leerUsuarioDeLaSesion,
} from "@/lib/auth/usuario-servidor";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function InicioUsuariosPage() {
  const { supabase, user } = await leerUsuarioDeLaSesion();
  if (!user) redirect("/");
  const categoria = await categoriaDeEstaEntrada(supabase, user.id);
  if (categoria !== "dueno") redirect("/");
  return (
    <>
      <RecordarEntrada userId={user.id} categoria={categoria} />
      <UsuariosPageClient />
    </>
  );
}
