import { leerUsuarioDeLaSesion } from "@/lib/auth/usuario-servidor";
import { usuarioEstaEnSala } from "@/lib/sala-miembros";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const revalidate = 0;

type SalasPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: SalasPageProps): Promise<Metadata> {
  const { id } = await params;
  const salaId = Number(id);

  if (Number.isNaN(salaId)) {
    return { title: "Sala no encontrada | CantemosTodosApp" };
  }

  const { supabase, user } = await leerUsuarioDeLaSesion();

  if (!user || !(await usuarioEstaEnSala(supabase, salaId, user.id))) {
    return { title: "Sala | CantemosTodosApp" };
  }

  const { data: sala } = await supabase
    .from("salas")
    .select("nombre")
    .eq("id", salaId)
    .maybeSingle();

  return {
    title: sala?.nombre
      ? `${sala.nombre} | CantemosTodosApp`
      : "Sala | CantemosTodosApp",
  };
}

export default async function SalaPage({ params }: SalasPageProps) {
  const { id } = await params;
  const salaId = Number(id);

  if (Number.isNaN(salaId)) {
    redirect("/salas?aviso=sin-acceso-sala");
  }

  const { supabase, user } = await leerUsuarioDeLaSesion();

  if (!user) {
    redirect("/auth/login");
  }

  const esta = await usuarioEstaEnSala(supabase, salaId, user.id);

  if (!esta) {
    redirect("/salas?aviso=sin-acceso-sala");
  }

  return null;
}
