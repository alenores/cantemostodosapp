import type { ColaIndividualItem, EstadoCola } from "@/types";
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

async function getUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Se requiere sesión activa para operar la cola individual");
  }

  return userId;
}

async function getMaxOrden(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data: maxRow, error } = await supabase
    .from("cola_individual")
    .select("orden")
    .eq("user_id", userId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return maxRow?.orden ?? -1;
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
  const userId = await getUserId(supabase);

  const { count, error: countError } = await supabase
    .from("cola_individual")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    throw countError;
  }

  let estado: EstadoCola = "pendiente";

  if ((count ?? 0) === 0) {
    estado = "activa";
  } else {
    const { data: activa, error: activaError } = await supabase
      .from("cola_individual")
      .select("id")
      .eq("user_id", userId)
      .eq("estado", "activa")
      .maybeSingle();

    if (activaError) {
      throw activaError;
    }

    if (!activa) {
      estado = "activa";
    }
  }

  const nextOrden = (await getMaxOrden(supabase, userId)) + 1;

  const { error } = await supabase.from("cola_individual").insert({
    user_id: userId,
    nombre: item.nombre.trim(),
    artista: item.artista?.trim() || null,
    url_letra: item.url_letra ?? null,
    letra_texto: item.letra_texto ?? null,
    orden: nextOrden,
    estado,
  });

  if (error) {
    throw error;
  }
}

export async function avanzarColaIndividual(
  supabase: SupabaseClient,
): Promise<void> {
  const userId = await getUserId(supabase);

  const { data: activa, error: activaError } = await supabase
    .from("cola_individual")
    .select("id")
    .eq("user_id", userId)
    .eq("estado", "activa")
    .maybeSingle();

  if (activaError) {
    throw activaError;
  }

  if (!activa) {
    return;
  }

  const { data: tocadas, error: tocadasError } = await supabase
    .from("cola_individual")
    .select("id, orden")
    .eq("user_id", userId)
    .eq("estado", "tocada")
    .order("orden", { ascending: true });

  if (tocadasError) {
    throw tocadasError;
  }

  const maxOrden = await getMaxOrden(supabase, userId);

  if (tocadas && tocadas.length >= 2) {
    const oldest = tocadas[0];
    const { error: recycleError } = await supabase
      .from("cola_individual")
      .update({ estado: "pendiente", orden: maxOrden + 1 })
      .eq("id", oldest.id);

    if (recycleError) {
      throw recycleError;
    }
  }

  const { error: tocadaError } = await supabase
    .from("cola_individual")
    .update({ estado: "tocada" })
    .eq("id", activa.id);

  if (tocadaError) {
    throw tocadaError;
  }

  const { data: primerPendiente, error: pendienteError } = await supabase
    .from("cola_individual")
    .select("id")
    .eq("user_id", userId)
    .eq("estado", "pendiente")
    .order("orden", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pendienteError) {
    throw pendienteError;
  }

  if (!primerPendiente) {
    return;
  }

  const { error: promoteError } = await supabase
    .from("cola_individual")
    .update({ estado: "activa" })
    .eq("id", primerPendiente.id);

  if (promoteError) {
    throw promoteError;
  }
}

export async function volverAPendienteIndividual(
  supabase: SupabaseClient,
  itemId: number,
): Promise<void> {
  const userId = await getUserId(supabase);
  const nextOrden = (await getMaxOrden(supabase, userId)) + 1;

  const { error } = await supabase
    .from("cola_individual")
    .update({ estado: "pendiente", orden: nextOrden })
    .eq("id", itemId);

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
    items.map(async (item) => {
      const { error } = await supabase
        .from("cola_individual")
        .update({ orden: item.orden })
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
