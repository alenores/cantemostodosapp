import type { SupabaseClient } from "@supabase/supabase-js";

export type ValidacionCancion = {
  validada_por: string | null;
  validada_en: string | null;
  validada_nombre: string | null;
  validada_avatar_url: string | null;
};

const VACIA: ValidacionCancion = {
  validada_por: null,
  validada_en: null,
  validada_nombre: null,
  validada_avatar_url: null,
};

export function validacionVacia(): ValidacionCancion {
  return { ...VACIA };
}

function mensaje(error: unknown, fallback: string): string {
  const crudo =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : "";
  const limpio = crudo.replace(/^ERROR:\s*/i, "").split("\n")[0]?.trim() ?? "";
  if (
    limpio.startsWith("Tenés") ||
    limpio.startsWith("No podés") ||
    limpio.startsWith("No encontramos") ||
    limpio.startsWith("Esta canción") ||
    limpio.startsWith("Solo quien")
  ) {
    return limpio;
  }
  return fallback;
}

export async function fetchValidacionesCancionero(
  supabase: SupabaseClient,
): Promise<Array<ValidacionCancion & { id: number }>> {
  const { data, error } = await supabase
    .from("canciones_guardadas")
    .select("id, validada_por, validada_en, validada_nombre, validada_avatar_url")
    .is("sala_id", null)
    .not("validada_por", "is", null);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    validada_por: row.validada_por,
    validada_en: row.validada_en,
    validada_nombre: row.validada_nombre,
    validada_avatar_url: row.validada_avatar_url,
  }));
}

export async function validarCancionCancionero(
  supabase: SupabaseClient,
  cancionId: number,
): Promise<ValidacionCancion> {
  const { data, error } = await supabase.rpc("validar_cancion_cancionero", {
    p_cancion_id: cancionId,
  });

  if (error) {
    throw new Error(mensaje(error, "No se pudo validar la canción. Probá de nuevo."));
  }

  if (!data || typeof data !== "object") {
    throw new Error("No se pudo validar la canción. Probá de nuevo.");
  }

  const row = data as Partial<ValidacionCancion>;
  return {
    validada_por: row.validada_por ?? null,
    validada_en: row.validada_en ?? null,
    validada_nombre: row.validada_nombre ?? null,
    validada_avatar_url: row.validada_avatar_url ?? null,
  };
}

export async function quitarValidacionCancionCancionero(
  supabase: SupabaseClient,
  cancionId: number,
): Promise<ValidacionCancion> {
  const { error } = await supabase.rpc("quitar_validacion_cancion_cancionero", {
    p_cancion_id: cancionId,
  });

  if (error) {
    throw new Error(mensaje(error, "No se pudo quitar la validación. Probá de nuevo."));
  }

  return validacionVacia();
}
