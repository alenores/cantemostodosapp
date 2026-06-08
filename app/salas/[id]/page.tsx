import SalaPageShell from "@/components/salas/SalaPageShell";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

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
    .eq("visible", true)
    .single();

  return {
    title: sala?.nombre
      ? `${sala.nombre} | CantemosTodosApp`
      : "Sala no encontrada | CantemosTodosApp",
  };
}

export default async function SalaPage({ params }: SalasPageProps) {
  const { id } = await params;
  const salaId = Number(id);

  if (Number.isNaN(salaId)) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: sala, error } = await supabase
    .from("salas")
    .select("id, nombre")
    .eq("id", salaId)
    .eq("visible", true)
    .single();

  if (error || !sala) {
    notFound();
  }

  return <SalaPageShell salaNombre={sala.nombre} />;
}
