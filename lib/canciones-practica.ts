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
import { parseAnotaciones, type Anotacion } from "@/lib/anotaciones-practica";
import { dispatchCancionesPracticaLocalChange } from "@/lib/offline/canciones-practica-events";
import {
  createCancionPracticaTempId,
  deleteCancionPracticaLocalRecord,
  getCancionPracticaLocalRecord,
  getCancionesPracticaLocalRecords,
  mergeCancionesPracticaRemoteSnapshot,
  practicaLocalKey,
  putCancionPracticaLocalRecord,
} from "@/lib/offline/canciones-practica-store";
import type { CancionPracticaLocalRecord } from "@/lib/offline/offline-db";
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
  anotaciones: Anotacion[];
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
  anotaciones?: Anotacion[];
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

export function mapCancionPracticaRow(row: Record<string, unknown>): CancionPractica {
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

function localRecordToCancion(record: CancionPracticaLocalRecord): CancionPractica {
  return {
    id: record.local_id,
    user_id: record.owner_user_id,
    origen_cancion_id: record.origen_cancion_id,
    nombre: record.nombre,
    artista: record.artista,
    letra: record.letra,
    cifrado: record.cifrado,
    compas_config: record.compas_config,
    tonalidad_default: record.tonalidad_default,
    modo_tonal_default: record.modo_tonal_default,
    bpm_default: record.bpm_default,
    tiene_cifrado_avanzado: record.tiene_cifrado_avanzado,
    nota_general: record.nota_general,
    anotaciones: record.anotaciones,
    dominio: record.dominio,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function cancionToLocalRecord(
  cancion: CancionPractica,
  options?: {
    localId?: number;
    remoteId?: number | null;
    syncState?: CancionPracticaLocalRecord["sync_state"];
    remoteUpdatedAt?: string | null;
  },
): CancionPracticaLocalRecord {
  const localId = options?.localId ?? cancion.id;
  const remoteId = options?.remoteId === undefined ? cancion.id : options.remoteId;
  return {
    local_key: practicaLocalKey(cancion.user_id, localId),
    local_id: localId,
    remote_id: remoteId,
    owner_user_id: cancion.user_id,
    origen_cancion_id: cancion.origen_cancion_id,
    nombre: cancion.nombre,
    artista: cancion.artista,
    letra: cancion.letra,
    cifrado: cancion.cifrado,
    compas_config: cancion.compas_config,
    tonalidad_default: cancion.tonalidad_default,
    modo_tonal_default: cancion.modo_tonal_default,
    bpm_default: cancion.bpm_default,
    tiene_cifrado_avanzado: cancion.tiene_cifrado_avanzado,
    nota_general: cancion.nota_general,
    anotaciones: cancion.anotaciones,
    dominio: cancion.dominio,
    created_at: cancion.created_at,
    updated_at: cancion.updated_at,
    remote_updated_at: options?.remoteUpdatedAt ?? cancion.updated_at,
    sync_state: options?.syncState ?? "synced",
  };
}

function payloadFromLocal(record: CancionPracticaLocalRecord) {
  return {
    origen_cancion_id: record.origen_cancion_id,
    nombre: record.nombre,
    artista: record.artista,
    letra: record.letra,
    cifrado: record.cifrado,
    compas_config: record.compas_config,
    tonalidad_default: record.tonalidad_default,
    modo_tonal_default: record.modo_tonal_default,
    bpm_default: record.bpm_default,
    tiene_cifrado_avanzado: record.tiene_cifrado_avanzado,
    nota_general: record.nota_general,
    anotaciones: record.anotaciones,
    dominio: record.dominio,
  };
}

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
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
  options?: { skipSync?: boolean },
): Promise<CancionPracticaListItem[]> {
  const userId = await requireUserId(supabase);
  if (isOnline() && !options?.skipSync) {
    try {
      await syncCancionesPractica(supabase);
    } catch {
      // La copia local sigue disponible; el runner volverá a intentar.
    }
  }
  return (await getCancionesPracticaLocalRecords(userId)).map((row) => ({
    id: row.local_id,
    nombre: row.nombre,
    artista: row.artista,
    tiene_cifrado_avanzado: row.tiene_cifrado_avanzado,
    origen_cancion_id: row.origen_cancion_id,
    dominio: row.dominio,
    updated_at: row.updated_at,
  }));
}

export async function getCancionPractica(
  supabase: SupabaseClient,
  id: number,
): Promise<CancionPractica | null> {
  const userId = await requireUserId(supabase);
  let local = await getCancionPracticaLocalRecord(userId, id);
  if (!local && isOnline()) {
    await syncCancionesPractica(supabase);
    local = await getCancionPracticaLocalRecord(userId, id);
  }
  return local && local.sync_state !== "pending-delete"
    ? localRecordToCancion(local)
    : null;
}

export async function findCancionPracticaByOrigen(
  supabase: SupabaseClient,
  origenCancionId: number,
): Promise<CancionPracticaListItem | null> {
  const userId = await requireUserId(supabase);
  if (isOnline()) {
    try {
      await syncCancionesPractica(supabase);
    } catch {
      // Buscar en la copia local si la red falla.
    }
  }
  const row = (await getCancionesPracticaLocalRecords(userId)).find(
    (item) => item.origen_cancion_id === origenCancionId,
  );
  return row
    ? {
        id: row.local_id,
        nombre: row.nombre,
        artista: row.artista,
        tiene_cifrado_avanzado: row.tiene_cifrado_avanzado,
        origen_cancion_id: row.origen_cancion_id,
        dominio: row.dominio,
        updated_at: row.updated_at,
      }
    : null;
}

export async function insertCancionPractica(
  supabase: SupabaseClient,
  payload: CancionPracticaSavePayload,
): Promise<number> {
  const userId = await requireUserId(supabase);
  const clampedBpm = Math.max(40, Math.min(240, payload.bpm_default));
  const now = new Date().toISOString();
  const localId = await createCancionPracticaTempId(userId);
  const record: CancionPracticaLocalRecord = {
    local_key: practicaLocalKey(userId, localId),
    local_id: localId,
    remote_id: null,
    owner_user_id: userId,
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
    anotaciones: payload.anotaciones ?? [],
    dominio: null,
    created_at: now,
    updated_at: now,
    remote_updated_at: null,
    sync_state: "pending-upsert",
  };
  await putCancionPracticaLocalRecord(record);
  dispatchCancionesPracticaLocalChange();
  if (isOnline()) {
    try {
      await syncCancionesPractica(supabase);
    } catch {
      // Ya quedó guardada localmente y se enviará al recuperar conexión.
    }
  }
  return localId;
}

export async function updateCancionPractica(
  supabase: SupabaseClient,
  id: number,
  payload: CancionPracticaSavePayload,
): Promise<void> {
  const userId = await requireUserId(supabase);
  const current = await getCancionPracticaLocalRecord(userId, id);
  if (!current) throw new Error("No se encontró la canción de práctica.");
  await putCancionPracticaLocalRecord({
    ...current,
    nombre: payload.nombre.trim(),
    artista: payload.artista?.trim() || null,
    letra: payload.letra,
    cifrado: payload.cifrado,
    compas_config: payload.compas_config,
    tonalidad_default: payload.tonalidad_default,
    modo_tonal_default: normalizeModoTonal(payload.modo_tonal_default),
    bpm_default: Math.max(40, Math.min(240, payload.bpm_default)),
    tiene_cifrado_avanzado: true,
    anotaciones: payload.anotaciones ?? [],
    updated_at: new Date().toISOString(),
    sync_state: "pending-upsert",
  });
  dispatchCancionesPracticaLocalChange();
  if (isOnline()) {
    try {
      await syncCancionesPractica(supabase);
    } catch {
      // El cambio local queda pendiente de sincronización.
    }
  }
}

/** Guarda solo la nota general (no toca cifrado/compases). */
export async function updateCancionPracticaNota(
  supabase: SupabaseClient,
  id: number,
  nota: string,
): Promise<void> {
  const userId = await requireUserId(supabase);
  const current = await getCancionPracticaLocalRecord(userId, id);
  if (!current) throw new Error("No se encontró la canción de práctica.");
  await putCancionPracticaLocalRecord({
    ...current,
    nota_general: nota.trim() || null,
    updated_at: new Date().toISOString(),
    sync_state: "pending-upsert",
  });
  dispatchCancionesPracticaLocalChange();
  if (isOnline()) {
    try {
      await syncCancionesPractica(supabase);
    } catch {
      // La nota local queda pendiente de sincronización.
    }
  }
}

export async function deleteCancionPractica(
  supabase: SupabaseClient,
  id: number,
): Promise<void> {
  const userId = await requireUserId(supabase);
  const current = await getCancionPracticaLocalRecord(userId, id);
  if (!current) return;
  if (current.remote_id == null) {
    await deleteCancionPracticaLocalRecord(userId, id);
  } else {
    await putCancionPracticaLocalRecord({
      ...current,
      updated_at: new Date().toISOString(),
      sync_state: "pending-delete",
    });
  }
  dispatchCancionesPracticaLocalChange();
  if (isOnline()) {
    try {
      await syncCancionesPractica(supabase);
    } catch {
      // La eliminación local queda pendiente de sincronización.
    }
  }
}

const syncPromises = new Map<string, Promise<void>>();

async function runCancionesPracticaSync(supabase: SupabaseClient): Promise<void> {
  const userId = await requireUserId(supabase);
  if (!isOnline()) return;
  const pending = await getCancionesPracticaLocalRecords(userId, { includeDeleted: true });

  for (const local of pending.filter((row) => row.sync_state !== "synced")) {
    if (local.sync_state === "pending-delete") {
      if (local.remote_id != null) {
        const { error } = await supabase
          .from("canciones_practica")
          .delete()
          .eq("id", local.remote_id);
        if (error) throw error;
      }
      await deleteCancionPracticaLocalRecord(userId, local.local_id);
      continue;
    }

    const values = { user_id: userId, ...payloadFromLocal(local) };
    const request = local.remote_id == null
      ? supabase.from("canciones_practica").insert(values)
      : supabase.from("canciones_practica").update(values).eq("id", local.remote_id);
    const { data, error } = await request.select("*").single();
    if (error) throw error;
    const remote = mapCancionPracticaRow(data as Record<string, unknown>);
    await putCancionPracticaLocalRecord(
      cancionToLocalRecord(remote, {
        localId: local.local_id,
        remoteId: remote.id,
        syncState: "synced",
        remoteUpdatedAt: remote.updated_at,
      }),
    );
  }

  const { data, error } = await supabase
    .from("canciones_practica")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const remoteRecords = (data ?? []).map((row) => {
    const remote = mapCancionPracticaRow(row as Record<string, unknown>);
    return cancionToLocalRecord(remote);
  });
  await mergeCancionesPracticaRemoteSnapshot(userId, remoteRecords);
  dispatchCancionesPracticaLocalChange();
}

export async function syncCancionesPractica(supabase: SupabaseClient): Promise<void> {
  if (!isOnline()) return;
  const userId = await requireUserId(supabase);
  let promise = syncPromises.get(userId);
  if (!promise) {
    promise = runCancionesPracticaSync(supabase).finally(() => {
      syncPromises.delete(userId);
    });
    syncPromises.set(userId, promise);
  }
  return promise;
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
