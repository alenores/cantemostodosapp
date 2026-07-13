import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
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

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // RLS: solo miembros ven la fila. Si no hay fila → no pertenece.
  const { data: sala } = await supabase
    .from("salas")
    .select("id, nombre")
    .eq("id", salaId)
    .maybeSingle();

  if (!sala) {
    redirect("/salas?aviso=sin-acceso-sala");
  }

  return null;
}
