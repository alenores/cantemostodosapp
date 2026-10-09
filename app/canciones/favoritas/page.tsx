import MisCancionesPageClient from "@/components/cancionero/MisCancionesPageClient";
import { leerUsuarioDeLaSesion } from "@/lib/auth/usuario-servidor";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function CancionesFavoritasPage() {
  const { user } = await leerUsuarioDeLaSesion();

  if (!user) {
    redirect("/");
  }

  return <MisCancionesPageClient />;
}
