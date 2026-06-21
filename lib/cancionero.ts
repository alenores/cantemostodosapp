import type { CancionCancionero } from "@/types";
import { agregarACola } from "@/lib/cola-logic";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CancioneroFormData = {
  nombre: string;
  artista: string;
  letra: string;
};

export type DuplicadoCancioneroNivel = "ninguno" | "nombre" | "nombre-artista";

export function normalizeCancioneroText(value: string): string {
  return value.trim().toLowerCase();
}

export function getDuplicadoCancioneroNivel(
  canciones: Pick<CancionCancionero, "id" | "nombre" | "artista">[],
  nombre: string,
  artista: string,
  excludeId?: number,
): DuplicadoCancioneroNivel {
  const nombreNorm = normalizeCancioneroText(nombre);

  if (!nombreNorm) {
    return "ninguno";
  }

  const artistaNorm = normalizeCancioneroText(artista);
  const candidatas =
    excludeId != null
      ? canciones.filter((cancion) => cancion.id !== excludeId)
      : canciones;

  const coincideNombre = candidatas.some(
    (cancion) => normalizeCancioneroText(cancion.nombre) === nombreNorm,
  );

  if (!coincideNombre) {
    return "ninguno";
  }

  if (artistaNorm) {
    const coincideAmbos = candidatas.some(
      (cancion) =>
        normalizeCancioneroText(cancion.nombre) === nombreNorm &&
        normalizeCancioneroText(cancion.artista ?? "") === artistaNorm,
    );

    if (coincideAmbos) {
      return "nombre-artista";
    }
  }

  return "nombre";
}

export function filterCancionesCancionero(
  canciones: CancionCancionero[],
  query: string,
): CancionCancionero[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return canciones;
  }

  return canciones.filter((cancion) => {
    const matchesNombre = cancion.nombre.toLowerCase().includes(normalized);
    const matchesArtista = cancion.artista?.toLowerCase().includes(normalized);

    return matchesNombre || Boolean(matchesArtista);
  });
}

export async function countCancionesCancionero(
  supabase: SupabaseClient,
): Promise<number> {
  const { count, error } = await supabase
    .from("canciones_guardadas")
    .select("id", { count: "exact", head: true })
    .is("sala_id", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function fetchCancionesCancionero(
  supabase: SupabaseClient,
): Promise<CancionCancionero[]> {
  const { data, error } = await supabase
    .from("canciones_guardadas")
    .select("id, nombre, artista, letra")
    .is("sala_id", null)
    .order("nombre", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function insertCancionCancionero(
  supabase: SupabaseClient,
  form: CancioneroFormData,
): Promise<void> {
  const { error } = await supabase.from("canciones_guardadas").insert({
    sala_id: null,
    nombre: form.nombre.trim(),
    artista: form.artista.trim(),
    letra: form.letra.trim(),
    url_letra: "",
  });

  if (error) {
    throw error;
  }
}

export async function updateCancionCancionero(
  supabase: SupabaseClient,
  id: number,
  form: CancioneroFormData,
): Promise<void> {
  const { error } = await supabase
    .from("canciones_guardadas")
    .update({
      nombre: form.nombre.trim(),
      artista: form.artista.trim(),
      letra: form.letra.trim(),
    })
    .eq("id", id)
    .is("sala_id", null);

  if (error) {
    throw error;
  }
}

export async function deleteCancionCancionero(
  supabase: SupabaseClient,
  id: number,
): Promise<void> {
  const { error } = await supabase
    .from("canciones_guardadas")
    .delete()
    .eq("id", id)
    .is("sala_id", null);

  if (error) {
    throw error;
  }
}

export async function guardarLinkEnCancionero(
  supabase: SupabaseClient,
  data: {
    nombre: string;
    artista: string | null;
    url_letra: string;
  },
): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from("canciones_guardadas")
    .select("id")
    .is("sala_id", null)
    .eq("url_letra", data.url_letra)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return;
  }

  const { error } = await supabase.from("canciones_guardadas").insert({
    sala_id: null,
    nombre: data.nombre.trim(),
    artista: data.artista?.trim() || null,
    letra: null,
    url_letra: data.url_letra,
  });

  if (error) {
    throw error;
  }
}

export async function guardarLetraEnCancionero(
  supabase: SupabaseClient,
  data: {
    nombre: string;
    artista: string | null;
    letra: string;
    url_letra?: string;
  },
): Promise<void> {
  const trimmedLetra = data.letra.trim();
  const urlLetra = data.url_letra?.trim() ?? "";

  const { data: existing, error: existingError } = await supabase
    .from("canciones_guardadas")
    .select("id")
    .is("sala_id", null)
    .eq("nombre", data.nombre.trim())
    .eq("url_letra", urlLetra)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    const { error } = await supabase
      .from("canciones_guardadas")
      .update({
        artista: data.artista?.trim() || null,
        letra: trimmedLetra,
      })
      .eq("id", existing.id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("canciones_guardadas").insert({
    sala_id: null,
    nombre: data.nombre.trim(),
    artista: data.artista?.trim() || null,
    letra: trimmedLetra,
    url_letra: urlLetra,
  });

  if (error) {
    throw error;
  }
}

export async function agregarCancioneroACola(
  supabase: SupabaseClient,
  salaId: number,
  cancion: CancionCancionero,
): Promise<void> {
  await agregarACola(supabase, salaId, {
    nombre: cancion.nombre,
    artista: cancion.artista,
    url_letra: `cancionero://${cancion.id}`,
    letra_texto: cancion.letra,
  });
}
