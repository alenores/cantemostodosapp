import type { ColaIndividualItem } from "@/types";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

function throwColaIndividualError(
  error: PostgrestError,
  action: string,
): never {
  const hint =
    error.code === "42501"
      ? " Falta GRANT en Supabase: ejecutá supabase/cola-individual-grants.sql"
      : "";
  throw new Error(`${action}: ${error.message}${hint}`);
}

export async function getColaIndividual(
  supabase: SupabaseClient,
): Promise<ColaIndividualItem[]> {
  const { data, error } = await supabase
    .from("cola_individual")
    .select("*")
    .order("orden", { ascending: true });

  if (error) {
    throwColaIndividualError(error, "No se pudo leer cola_individual");
  }

  return data ?? [];
}

export async function agregarAColaIndividual(
  supabase: SupabaseClient,
  item: {
    nombre: string;
    artista?: string | null;
    url_letra?: string | null;
    letra_texto?: string | null;
  },
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Se requiere sesión activa para agregar a la cola individual");
  }

  const { data: maxRow, error: maxError } = await supabase
    .from("cola_individual")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    throw maxError;
  }

  const nextOrden = (maxRow?.orden ?? -1) + 1;

  const { error } = await supabase.from("cola_individual").insert({
    user_id: userId,
    nombre: item.nombre.trim(),
    artista: item.artista?.trim() || null,
    url_letra: item.url_letra ?? null,
    letra_texto: item.letra_texto ?? null,
    orden: nextOrden,
  });

  if (error) {
    throw error;
  }
}

export async function eliminarDeColaIndividual(
  supabase: SupabaseClient,
  itemId: number,
): Promise<void> {
  const { error } = await supabase
    .from("cola_individual")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw error;
  }
}

export async function persistirOrdenColaIndividual(
  supabase: SupabaseClient,
  items: ColaIndividualItem[],
): Promise<void> {
  await Promise.all(
    items.map(async (item, index) => {
      const { error } = await supabase
        .from("cola_individual")
        .update({ orden: index })
        .eq("id", item.id);

      if (error) {
        throw error;
      }
    }),
  );
}

export async function vaciarColaIndividual(
  supabase: SupabaseClient,
): Promise<void> {
  const { error } = await supabase.from("cola_individual").delete();

  if (error) {
    throw error;
  }
}
