import type { CancionCancionero, CancionCifradoDetalle } from "@/types";
import { agregarACola } from "@/lib/cola-logic";
import {
  DEFAULT_BPM,
  DEFAULT_TONALIDAD,
  createEmptyCifrado,
  normalizeNotaIndex,
  type CifradoData,
  type CompasConfig,
  type NotaIndex,
} from "@/lib/cifrado";
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
    .select("id, nombre, artista, letra, tiene_cifrado_avanzado")
    .is("sala_id", null)
    .order("nombre", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    artista: row.artista,
    letra: row.letra,
    tiene_cifrado_avanzado: row.tiene_cifrado_avanzado ?? false,
  }));
}

function parseCifradoData(value: unknown): CifradoData | null {
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    !("acordes" in value) ||
    !Array.isArray((value as CifradoData).acordes)
  ) {
    return null;
  }

  return value as CifradoData;
}

function parseCompasConfig(value: unknown): CompasConfig | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as CompasConfig;
}

export async function fetchCancionCifradoDetalle(
  supabase: SupabaseClient,
  id: number,
): Promise<CancionCifradoDetalle | null> {
  const { data, error } = await supabase
    .from("canciones_guardadas")
    .select(
      "id, nombre, artista, letra, cifrado, compas_config, tonalidad_default, bpm_default, tiene_cifrado_avanzado",
    )
    .eq("id", id)
    .is("sala_id", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.tiene_cifrado_avanzado) {
    return null;
  }

  const cifrado = parseCifradoData(data.cifrado) ?? createEmptyCifrado();

  return {
    id: data.id,
    nombre: data.nombre,
    artista: data.artista,
    letra: data.letra,
    cifrado,
    compas_config: parseCompasConfig(data.compas_config),
    tonalidad_default: normalizeNotaIndex(
      data.tonalidad_default ?? DEFAULT_TONALIDAD,
    ),
    bpm_default: Math.max(
      40,
      Math.min(240, data.bpm_default ?? DEFAULT_BPM),
    ),
    tiene_cifrado_avanzado: true,
  };
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

export async function updateCancionCifradoAvanzado(
  supabase: SupabaseClient,
  id: number,
  payload: {
    nombre: string;
    artista: string | null;
    letra: string;
    cifrado: CifradoData;
    compas_config: CompasConfig | null;
    tonalidad_default: NotaIndex;
    bpm_default: number;
  },
): Promise<void> {
  const clampedBpm = Math.max(40, Math.min(240, payload.bpm_default));

  const { data: existing, error: fetchError } = await supabase
    .from("canciones_guardadas")
    .select("id")
    .eq("id", id)
    .is("sala_id", null)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!existing) {
    throw new Error("No se encontró la canción para actualizar.");
  }

  const { error, count } = await supabase
    .from("canciones_guardadas")
    .update(
      {
        nombre: payload.nombre.trim(),
        artista: payload.artista?.trim() || null,
        letra: payload.letra.trim(),
        cifrado: payload.cifrado,
        compas_config: payload.compas_config,
        tonalidad_default: payload.tonalidad_default,
        bpm_default: clampedBpm,
        tiene_cifrado_avanzado: true,
      },
      { count: "exact" },
    )
    .eq("id", id)
    .is("sala_id", null);

  if (error) {
    throw error;
  }

  if (count === 0) {
    throw new Error(
      "No se pudo actualizar la canción: faltan permisos UPDATE en Supabase. Ejecutá supabase/cifrado-avanzado.sql en el SQL Editor del proyecto.",
    );
  }
}

export async function updateCancionCancioneroMetadatos(
  supabase: SupabaseClient,
  id: number,
  data: {
    nombre: string;
    artista: string;
  },
): Promise<void> {
  const { error } = await supabase
    .from("canciones_guardadas")
    .update({
      nombre: data.nombre.trim(),
      artista: data.artista.trim(),
    })
    .eq("id", id)
    .is("sala_id", null);

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
