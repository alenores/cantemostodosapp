import {
  DEFAULT_BPM,
  DEFAULT_TONALIDAD,
  createEmptyCifrado,
  type CifradoData,
  type CompasConfig,
  type NotaIndex,
  normalizeNotaIndex,
} from "@/lib/cifrado";
import {
  DEFAULT_MODO_TONAL,
  normalizeModoTonal,
  type ModoTonal,
} from "@/lib/cifrado-escala";
import { normalizeCompasConfig } from "@/lib/cifrado-intensidad";
import { buildCifradoEditorSession } from "@/lib/cifrado-editor-session";
import type { CancionCancionero, CancionCifradoDetalle } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DominioPractica = "no_visto" | "practicando" | "dominado";

export type CancionPractica = {
  id: number;
  user_id: string;
  origen_cancion_id: number | null;
  nombre: string;
  artista: string | null;
  letra: string | null;
  cifrado: CifradoData | null;
  compas_config: CompasConfig | null;
  tonalidad_default: NotaIndex | null;
  modo_tonal_default: ModoTonal;
  bpm_default: number | null;
  tiene_cifrado_avanzado: boolean;
  nota_general: string | null;
  anotaciones: unknown[];
  dominio: DominioPractica | null;
  created_at: string;
  updated_at: string;
};

export type CancionPracticaListItem = Pick<
  CancionPractica,
  | "id"
  | "nombre"
  | "artista"
  | "tiene_cifrado_avanzado"
  | "origen_cancion_id"
  | "dominio"
  | "updated_at"
>;

export type CancionPracticaSavePayload = {
  nombre: string;
  artista: string | null;
  letra: string;
  cifrado: CifradoData;
  compas_config: CompasConfig | null;
  tonalidad_default: NotaIndex;
  modo_tonal_default: ModoTonal;
  bpm_default: number;
  origen_cancion_id?: number | null;
  nota_general?: string | null;
};

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

  try {
    return normalizeCompasConfig(value as CompasConfig);
  } catch {
    return null;
  }
}

function parseAnotaciones(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseDominio(value: unknown): DominioPractica | null {
  if (
    value === "no_visto" ||
    value === "practicando" ||
    value === "dominado"
  ) {
    return value;
  }

  return null;
}

function mapRow(row: Record<string, unknown>): CancionPractica {
  return {
    id: Number(row.id),
    user_id: String(row.user_id),
    origen_cancion_id:
      row.origen_cancion_id == null ? null : Number(row.origen_cancion_id),
    nombre: String(row.nombre),
    artista: (row.artista as string | null) ?? null,
    letra: (row.letra as string | null) ?? null,
    cifrado: parseCifradoData(row.cifrado),
    compas_config: parseCompasConfig(row.compas_config),
    tonalidad_default:
      row.tonalidad_default == null
        ? null
        : normalizeNotaIndex(Number(row.tonalidad_default)),
    modo_tonal_default: normalizeModoTonal(
      (row.modo_tonal_default as string | null) ?? DEFAULT_MODO_TONAL,
    ),
    bpm_default:
      row.bpm_default == null
        ? null
        : Math.max(40, Math.min(240, Number(row.bpm_default))),
    tiene_cifrado_avanzado: Boolean(row.tiene_cifrado_avanzado),
    nota_general: (row.nota_general as string | null) ?? null,
    anotaciones: parseAnotaciones(row.anotaciones),
    dominio: parseDominio(row.dominio),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Se requiere sesión activa para el Entrenador de canciones");
  }

  return userId;
}

export async function listCancionesPractica(
  supabase: SupabaseClient,
): Promise<CancionPracticaListItem[]> {
  await requireUserId(supabase);

  const { data, error } = await supabase
    .from("canciones_practica")
    .select(
      "id, nombre, artista, tiene_cifrado_avanzado, origen_cancion_id, dominio, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: Number(row.id),
    nombre: row.nombre,
    artista: row.artista,
    tiene_cifrado_avanzado: row.tiene_cifrado_avanzado ?? false,
    origen_cancion_id: row.origen_cancion_id,
    dominio: parseDominio(row.dominio),
    updated_at: row.updated_at,
  }));
}

export async function getCancionPractica(
  supabase: SupabaseClient,
  id: number,
): Promise<CancionPractica | null> {
  await requireUserId(supabase);

  const { data, error } = await supabase
    .from("canciones_practica")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapRow(data as Record<string, unknown>);
}

export async function findCancionPracticaByOrigen(
  supabase: SupabaseClient,
  origenCancionId: number,
): Promise<CancionPracticaListItem | null> {
  await requireUserId(supabase);

  const { data, error } = await supabase
    .from("canciones_practica")
    .select(
      "id, nombre, artista, tiene_cifrado_avanzado, origen_cancion_id, dominio, updated_at",
    )
    .eq("origen_cancion_id", origenCancionId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: Number(data.id),
    nombre: data.nombre,
    artista: data.artista,
    tiene_cifrado_avanzado: data.tiene_cifrado_avanzado ?? false,
    origen_cancion_id: data.origen_cancion_id,
    dominio: parseDominio(data.dominio),
    updated_at: data.updated_at,
  };
}

export async function insertCancionPractica(
  supabase: SupabaseClient,
  payload: CancionPracticaSavePayload,
): Promise<number> {
  const userId = await requireUserId(supabase);
  const clampedBpm = Math.max(40, Math.min(240, payload.bpm_default));

  const { data, error } = await supabase
    .from("canciones_practica")
    .insert({
      user_id: userId,
      origen_cancion_id: payload.origen_cancion_id ?? null,
      nombre: payload.nombre.trim(),
      artista: payload.artista?.trim() || null,
      letra: payload.letra,
      cifrado: payload.cifrado,
      compas_config: payload.compas_config,
      tonalidad_default: payload.tonalidad_default,
      modo_tonal_default: normalizeModoTonal(payload.modo_tonal_default),
      bpm_default: clampedBpm,
      tiene_cifrado_avanzado: true,
      nota_general: payload.nota_general?.trim() || null,
      anotaciones: [],
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return Number(data.id);
}

export async function updateCancionPractica(
  supabase: SupabaseClient,
  id: number,
  payload: CancionPracticaSavePayload,
): Promise<void> {
  await requireUserId(supabase);
  const clampedBpm = Math.max(40, Math.min(240, payload.bpm_default));

  const { error, count } = await supabase
    .from("canciones_practica")
    .update(
      {
        nombre: payload.nombre.trim(),
        artista: payload.artista?.trim() || null,
        letra: payload.letra,
        cifrado: payload.cifrado,
        compas_config: payload.compas_config,
        tonalidad_default: payload.tonalidad_default,
        modo_tonal_default: normalizeModoTonal(payload.modo_tonal_default),
        bpm_default: clampedBpm,
        tiene_cifrado_avanzado: true,
      },
      { count: "exact" },
    )
    .eq("id", id);

  if (error) {
    throw error;
  }

  if (count === 0) {
    throw new Error(
      "No se pudo actualizar la canción de práctica. Ejecutá supabase/canciones-practica.sql en el SQL Editor.",
    );
  }
}

/** Guarda solo la nota general (no toca cifrado/compases). */
export async function updateCancionPracticaNota(
  supabase: SupabaseClient,
  id: number,
  nota: string,
): Promise<void> {
  await requireUserId(supabase);

  const { error, count } = await supabase
    .from("canciones_practica")
    .update({ nota_general: nota.trim() || null }, { count: "exact" })
    .eq("id", id);

  if (error) {
    throw error;
  }

  if (count === 0) {
    throw new Error(
      "No se pudo guardar la nota. Ejecutá supabase/canciones-practica-nota-general.sql en el SQL Editor.",
    );
  }
}

export async function deleteCancionPractica(
  supabase: SupabaseClient,
  id: number,
): Promise<void> {
  await requireUserId(supabase);

  const { error } = await supabase
    .from("canciones_practica")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

/** Clona desde detalle avanzado del Cancionero Global. No modifica el original. */
export async function cloneCancioneroDetalleToPractica(
  supabase: SupabaseClient,
  detalle: CancionCifradoDetalle,
  origenCancionId: number,
): Promise<number> {
  const existing = await findCancionPracticaByOrigen(supabase, origenCancionId);

  if (existing) {
    return existing.id;
  }

  const cifrado = detalle.cifrado ?? createEmptyCifrado();
  const bpm = detalle.bpm_default ?? DEFAULT_BPM;
  const compasConfig = detalle.compas_config
    ? normalizeCompasConfig({
        ...detalle.compas_config,
        bpm,
      })
    : null;

  return insertCancionPractica(supabase, {
    nombre: detalle.nombre,
    artista: detalle.artista,
    letra: detalle.letra ?? "",
    cifrado,
    compas_config: compasConfig,
    tonalidad_default: detalle.tonalidad_default ?? DEFAULT_TONALIDAD,
    modo_tonal_default: detalle.modo_tonal_default ?? DEFAULT_MODO_TONAL,
    bpm_default: bpm,
    origen_cancion_id: origenCancionId,
  });
}

/**
 * Clona desde una fila del Cancionero (avanzada o tradicional).
 * Si ya hay copia con ese origen, reabre esa. No modifica el original.
 */
export async function cloneCancioneroToPractica(
  supabase: SupabaseClient,
  cancion: Pick<
    CancionCancionero,
    "id" | "nombre" | "artista" | "letra" | "tiene_cifrado_avanzado"
  >,
  detalle?: CancionCifradoDetalle | null,
): Promise<number> {
  const existing = await findCancionPracticaByOrigen(supabase, cancion.id);

  if (existing) {
    return existing.id;
  }

  if (detalle) {
    return cloneCancioneroDetalleToPractica(supabase, detalle, cancion.id);
  }

  const session = buildCifradoEditorSession({
    cancionId: cancion.id,
    nombre: cancion.nombre,
    artista: cancion.artista ?? "",
    letra: cancion.letra ?? "",
    esAvanzada: false,
  });

  return insertCancionPractica(supabase, {
    nombre: session.nombre,
    artista: session.artista || null,
    letra: session.letra,
    cifrado: session.cifrado ?? createEmptyCifrado(),
    compas_config: session.compas_config ?? null,
    tonalidad_default: session.tonalidad_default ?? DEFAULT_TONALIDAD,
    modo_tonal_default: session.modo_tonal_default ?? DEFAULT_MODO_TONAL,
    bpm_default: session.bpm_default ?? DEFAULT_BPM,
    origen_cancion_id: cancion.id,
  });
}

/** Adapta una canción de práctica al shape que consume el modo lectura. */
export function cancionPracticaToDetalle(
  cancion: CancionPractica,
): CancionCifradoDetalle {
  return {
    id: cancion.id,
    nombre: cancion.nombre,
    artista: cancion.artista,
    letra: cancion.letra ?? "",
    cifrado: cancion.cifrado ?? createEmptyCifrado(),
    compas_config: cancion.compas_config,
    tonalidad_default: cancion.tonalidad_default ?? DEFAULT_TONALIDAD,
    modo_tonal_default: cancion.modo_tonal_default,
    bpm_default: cancion.bpm_default ?? DEFAULT_BPM,
    tiene_cifrado_avanzado: true,
  };
}

export function cancionPracticaToEditorSession(cancion: CancionPractica) {
  return {
    cancionId: cancion.id,
    nombre: cancion.nombre,
    artista: cancion.artista ?? "",
    letra: cancion.letra ?? "",
    cifrado: cancion.cifrado ?? createEmptyCifrado(),
    compas_config: cancion.compas_config,
    tonalidad_default: cancion.tonalidad_default ?? DEFAULT_TONALIDAD,
    modo_tonal_default: cancion.modo_tonal_default,
    bpm_default: cancion.bpm_default ?? DEFAULT_BPM,
    skipIngreso: true,
  };
}
