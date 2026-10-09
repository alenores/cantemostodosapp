import type { CancionCancionero, CancionCifradoDetalle } from "@/types";
import { agregarACola } from "@/lib/cola-logic";
import {
  ajustarLetraAAcordes,
  DEFAULT_BPM,
  DEFAULT_TONALIDAD,
  createEmptyCifrado,
  normalizeNotaIndex,
  type CifradoData,
  type CompasConfig,
  type NotaIndex,
} from "@/lib/cifrado";
import {
  DEFAULT_MODO_TONAL,
  normalizeModoTonal,
  type ModoTonal,
} from "@/lib/cifrado-escala";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumnError } from "@/lib/supabase/errors";
import {
  artistaCoincideBusqueda,
  getAliasBusqueda,
  type AliasBusqueda,
} from "@/lib/artistas-alias-busqueda";

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

/** Menos de esto no se busca en la letra: una letra suelta coincidiría con casi todo. */
const BUSQUEDA_LETRA_MIN = 3;

export function filterCancionesCancionero(
  canciones: CancionCancionero[],
  query: string,
  alias: AliasBusqueda = getAliasBusqueda(),
): CancionCancionero[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return canciones;
  }

  const buscarLetra = normalized.length >= BUSQUEDA_LETRA_MIN;
  const ranked: { cancion: CancionCancionero; score: number; index: number }[] = [];

  for (let index = 0; index < canciones.length; index += 1) {
    const cancion = canciones[index]!;
    const titleHit =
      cancion.nombre.toLowerCase().includes(normalized) ||
      artistaCoincideBusqueda(null, normalized, alias, cancion.nombre);
    if (titleHit) {
      ranked.push({ cancion, score: 3, index });
      continue;
    }
    if (artistaCoincideBusqueda(cancion.artista, normalized, alias)) {
      ranked.push({ cancion, score: 2, index });
      continue;
    }
    if (buscarLetra && cancion.letra?.toLowerCase().includes(normalized)) {
      ranked.push({ cancion, score: 1, index });
    }
  }

  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.map((item) => item.cancion);
}

export async function countCancionesCancionero(
  supabase: SupabaseClient,
): Promise<number> {
  const { count, error } = await supabase
    .from("canciones_guardadas")
    .select("id", { count: "exact", head: true })
    .is("sala_id", null)
    .not("letra", "is", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function fetchCancionesCancionero(
  supabase: SupabaseClient,
): Promise<CancionCancionero[]> {
  const pageSize = 500;
  const canciones: CancionCancionero[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("canciones_guardadas")
      .select("id, nombre, artista, artista_id, agregado_nombre, agregado_avatar_url, letra, tiene_cifrado_avanzado, user_id, created_at")
      .is("sala_id", null)
      .not("letra", "is", null)
      .order("nombre", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    const page = data ?? [];
    canciones.push(
      ...page.map((row) => ({
        id: row.id,
        nombre: row.nombre,
        artista: row.artista,
        artista_id: row.artista_id,
        agregado_nombre: row.agregado_nombre,
        agregado_avatar_url: row.agregado_avatar_url,
        letra: row.letra,
        tiene_cifrado_avanzado: row.tiene_cifrado_avanzado ?? false,
        user_id: row.user_id ?? null,
        created_at: row.created_at ?? null,
      })),
    );

    if (page.length < pageSize) {
      break;
    }
  }

  return canciones;
}

/** Solo el día de alta, sin bajar letras de nuevo. */
export async function fetchFechasAltaCancionero(
  supabase: SupabaseClient,
): Promise<Array<{ id: number; created_at: string }>> {
  const pageSize = 1000;
  const fechas: Array<{ id: number; created_at: string }> = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("canciones_guardadas")
      .select("id, created_at")
      .is("sala_id", null)
      .not("letra", "is", null)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      if (row.created_at) {
        fechas.push({ id: row.id, created_at: row.created_at });
      }
    }

    if ((data ?? []).length < pageSize) {
      break;
    }
  }

  return fechas;
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
  const selectWithModo =
    "id, nombre, artista, letra, cifrado, compas_config, tonalidad_default, modo_tonal_default, bpm_default, youtube_url, tiene_cifrado_avanzado";
  const selectBase =
    "id, nombre, artista, letra, cifrado, compas_config, tonalidad_default, bpm_default, tiene_cifrado_avanzado";

  const primary = await supabase
    .from("canciones_guardadas")
    .select(selectWithModo)
    .eq("id", id)
    .is("sala_id", null)
    .maybeSingle();

  const fallback =
    primary.error && isMissingColumnError(primary.error)
      ? await supabase
          .from("canciones_guardadas")
          .select(selectBase)
          .eq("id", id)
          .is("sala_id", null)
          .maybeSingle()
      : null;

  const { data, error } = fallback ?? primary;

  if (error) {
    throw error;
  }

  if (!data?.tiene_cifrado_avanzado) {
    return null;
  }

  const cifrado = parseCifradoData(data.cifrado) ?? createEmptyCifrado();
  const row = data as typeof data & {
    modo_tonal_default?: string | null;
    youtube_url?: string | null;
  };

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
    modo_tonal_default: normalizeModoTonal(
      row.modo_tonal_default ?? DEFAULT_MODO_TONAL,
    ),
    bpm_default: Math.max(
      40,
      Math.min(240, data.bpm_default ?? DEFAULT_BPM),
    ),
    youtube_url: row.youtube_url ?? null,
    tiene_cifrado_avanzado: true,
  };
}

export async function insertCancionCancionero(
  supabase: SupabaseClient,
  form: CancioneroFormData,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Se requiere sesión activa para agregar al cancionero");
  }

  const { error } = await supabase.from("canciones_guardadas").insert({
    sala_id: null,
    user_id: userId,
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
    artista_id?: string | null;
    letra: string;
    cifrado: CifradoData;
    compas_config: CompasConfig | null;
    tonalidad_default: NotaIndex;
    modo_tonal_default: ModoTonal;
    bpm_default: number;
    youtube_url?: string | null;
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
        ...(payload.artista_id !== undefined ? { artista_id: payload.artista_id } : {}),
        letra: ajustarLetraAAcordes(payload.letra, payload.cifrado.acordes),
        cifrado: payload.cifrado,
        compas_config: payload.compas_config,
        tonalidad_default: payload.tonalidad_default,
        modo_tonal_default: normalizeModoTonal(payload.modo_tonal_default),
        bpm_default: clampedBpm,
        ...(payload.youtube_url !== undefined ? { youtube_url: payload.youtube_url } : {}),
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
    throw new Error("No tenés permiso para editar esta canción.");
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
  const { error, count } = await supabase
    .from("canciones_guardadas")
    .update({
      nombre: data.nombre.trim(),
      artista: data.artista.trim(),
    }, { count: "exact" })
    .eq("id", id)
    .is("sala_id", null);

  if (error) {
    throw error;
  }
  if (count === 0) throw new Error("No tenés permiso para editar esta canción.");
}

export async function updateCancionCancionero(
  supabase: SupabaseClient,
  id: number,
  form: CancioneroFormData,
): Promise<void> {
  const { error, count } = await supabase
    .from("canciones_guardadas")
    .update({
      nombre: form.nombre.trim(),
      artista: form.artista.trim(),
      letra: form.letra.trim(),
    }, { count: "exact" })
    .eq("id", id)
    .is("sala_id", null);

  if (error) {
    throw error;
  }
  if (count === 0) throw new Error("No tenés permiso para editar esta canción.");
}

export async function deleteCancionCancionero(
  supabase: SupabaseClient,
  id: number,
): Promise<void> {
  const { error, count } = await supabase
    .from("canciones_guardadas")
    .delete({ count: "exact" })
    .eq("id", id)
    .is("sala_id", null);

  if (error) {
    throw error;
  }
  if (count === 0) throw new Error("No tenés permiso para eliminar esta canción.");
}

export async function guardarLinkEnCancionero(
  supabase: SupabaseClient,
  data: {
    nombre: string;
    artista: string | null;
    url_letra: string;
  },
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id ?? null;

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
    user_id: userId,
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
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id ?? null;

  const trimmedLetra = data.letra.trim();
  const urlLetra = data.url_letra?.trim() ?? "";

  const { data: existing, error: existingError } = await supabase
    .from("canciones_guardadas")
    .select("id, user_id")
    .is("sala_id", null)
    .eq("nombre", data.nombre.trim())
    .eq("url_letra", urlLetra)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    if (existing.user_id !== userId) return;

    const { error, count } = await supabase
      .from("canciones_guardadas")
      .update({
        artista: data.artista?.trim() || null,
        letra: trimmedLetra,
      }, { count: "exact" })
      .eq("id", existing.id);

    if (error) {
      throw error;
    }
    if (count === 0) throw new Error("No tenés permiso para editar esta canción.");

    return;
  }

  const { error } = await supabase.from("canciones_guardadas").insert({
    sala_id: null,
    user_id: userId,
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
