import PerfilPageClient from "@/components/perfil/PerfilPageClient";
import { leerUsuarioDeLaSesion } from "@/lib/auth/usuario-servidor";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function PerfilEditarPage() {
  const { user, usuario } = await leerUsuarioDeLaSesion();

  if (!user) {
    redirect("/auth/login");
  }

  return <PerfilPageClient usuarioInicial={usuario} />;
}
