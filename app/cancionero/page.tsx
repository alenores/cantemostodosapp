import CancioneroPageClient from "@/components/cancionero/CancioneroPageClient";
import { fetchCancionesCancionero } from "@/lib/cancionero";
import { createClient } from "@/lib/supabase/server";
import type { CancionCancionero } from "@/types";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function CancioneroPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  let canciones: CancionCancionero[] = [];
  let errorMessage: string | null = null;

  try {
    canciones = await fetchCancionesCancionero(supabase);
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Error al cargar canciones";
  }

  const { data: salas, error: salasError } = await supabase
    .from("salas")
    .select("id, nombre, descripcion")
    .eq("visible", true)
    .order("nombre");

  if (salasError && !errorMessage) {
    errorMessage = salasError.message;
  }

  return (
    <CancioneroPageClient
      cancionesIniciales={canciones}
      salas={salas ?? []}
      errorMessage={errorMessage}
    />
  );
}
