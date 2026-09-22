import {
  getCancioneroLocalAll,
  getCancioneroLocalMeta,
  mergeCancioneroLocalUpdates,
  type CancioneroLocalRecord,
} from "@/lib/offline/cancionero-store";
import type { SupabaseClient } from "@supabase/supabase-js";

/** 3: exige acordes reales en canciones avanzadas (antes null contaba como “completo”). */
const CONTENT_VERSION = 3;
const PAGE_SIZE = 500;
const DOWNLOAD_BATCH_SIZE = 100;
const SONG_COLUMNS =
  "id, nombre, artista, letra, url_letra, updated_at, tiene_cifrado_avanzado, user_id, cifrado, compas_config, tonalidad_default, modo_tonal_default, bpm_default";

type RemoteSnapshot = { maxUpdatedAt: string | null; count: number };
type RemoteVersion = { id: number; updated_at: string };
export type CancioneroUpdate = RemoteVersion & {
  nombre: string;
  artista: string | null;
  kind: "new" | "updated";
};
export type CancioneroUpdatePlan = {
  snapshot: RemoteSnapshot;
  songs: CancioneroUpdate[];
};

function timestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? null : time.toISOString();
}

function needsDownload(remote: RemoteVersion, local?: CancioneroLocalRecord) {
  return !local || timestamp(remote.updated_at) !== timestamp(local.updated_at) ||
    !hasCompleteContent(local);
}

/** Las copias antiguas pueden tener la fecha correcta pero solo la letra. */
function hasCompleteContent(local: CancioneroLocalRecord): boolean {
  if (typeof local.tiene_cifrado_avanzado !== "boolean") return false;
  if (local.cifrado === undefined || local.compas_config === undefined) return false;
  if (!local.tiene_cifrado_avanzado) return true;
  // Edición avanzada: hace falta el objeto de acordes (puede estar vacío, no null).
  return local.cifrado !== null && Array.isArray(local.cifrado.acordes);
}

async function fetchSnapshot(supabase: SupabaseClient): Promise<RemoteSnapshot> {
  const [count, latest] = await Promise.all([
    supabase.from("canciones_guardadas").select("id", { count: "exact", head: true }).is("sala_id", null),
    supabase.from("canciones_guardadas").select("updated_at").is("sala_id", null)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (count.error) throw count.error;
  if (latest.error) throw latest.error;
  if (count.count === null) throw new Error("No se pudo comprobar el Cancionero.");
  return { count: count.count, maxUpdatedAt: timestamp(latest.data?.updated_at) };
}

/** Solo consulta versiones y títulos. Nunca descarga letras ni modifica la copia local. */
export async function checkCancioneroUpdates(
  supabase: SupabaseClient,
): Promise<CancioneroUpdatePlan> {
  const [snapshot, meta, local] = await Promise.all([
    fetchSnapshot(supabase), getCancioneroLocalMeta(), getCancioneroLocalAll(),
  ]);
  if (meta.syncedAt && meta.contentVersion === CONTENT_VERSION &&
      meta.lastRemoteCount === snapshot.count && local.length === snapshot.count &&
      timestamp(meta.lastRemoteUpdatedAt) === snapshot.maxUpdatedAt && local.every(hasCompleteContent)) {
    return { snapshot, songs: [] };
  }

  const versions: RemoteVersion[] = [];
  for (let from = 0; from < snapshot.count; from += PAGE_SIZE) {
    const { data, error } = await supabase.from("canciones_guardadas")
      .select("id, updated_at").is("sala_id", null)
      .order("id", { ascending: true }).range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    versions.push(...(data ?? []));
  }
  if (versions.length !== snapshot.count || new Set(versions.map((row) => row.id)).size !== snapshot.count) {
    throw new Error("El Cancionero cambió durante la consulta. Volvé a comprobar las novedades.");
  }

  const localById = new Map(local.map((row) => [row.id, row]));
  const pending = versions.filter((row) => needsDownload(row, localById.get(row.id)));
  const songs: CancioneroUpdate[] = [];
  for (let from = 0; from < pending.length; from += DOWNLOAD_BATCH_SIZE) {
    const ids = pending.slice(from, from + DOWNLOAD_BATCH_SIZE).map((row) => row.id);
    const { data, error } = await supabase.from("canciones_guardadas")
      .select("id, nombre, artista, updated_at").is("sala_id", null).in("id", ids);
    if (error) throw error;
    if (data?.length !== ids.length) {
      throw new Error("El Cancionero cambió durante la consulta. Volvé a comprobar las novedades.");
    }
    songs.push(...data.map((row) => ({
      ...row, kind: localById.has(row.id) ? "updated" as const : "new" as const,
    })));
  }
  return { snapshot, songs: songs.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")) };
}

/** Única entrada para descargar: recibe el listado que el usuario acaba de aceptar. */
export async function downloadCancioneroUpdates(
  supabase: SupabaseClient,
  plan: CancioneroUpdatePlan,
  onProgress?: (completed: number, total: number) => void,
): Promise<number> {
  const localById = new Map((await getCancioneroLocalAll()).map((row) => [row.id, row]));
  // Otra pestaña puede haber descargado estas versiones mientras se mostraba el listado.
  const pending = plan.songs.filter((row) => needsDownload(row, localById.get(row.id)));
  const records: CancioneroLocalRecord[] = [];
  onProgress?.(0, pending.length);

  for (let from = 0; from < pending.length; from += DOWNLOAD_BATCH_SIZE) {
    const ids = pending.slice(from, from + DOWNLOAD_BATCH_SIZE).map((row) => row.id);
    const { data, error } = await supabase.from("canciones_guardadas")
      .select(SONG_COLUMNS).is("sala_id", null).in("id", ids);
    if (error) throw error;
    if (data?.length !== ids.length || new Set(data.map((row) => row.id)).size !== ids.length ||
        data.some((row) => !ids.includes(row.id) || !timestamp(row.updated_at) || !hasCompleteContent(row))) {
      throw new Error("La descarga quedó incompleta. Tu Cancionero anterior sigue disponible.");
    }
    records.push(...data.map((row) => ({
      ...row, url_letra: row.url_letra ?? "", updated_at: timestamp(row.updated_at)!,
    })));
    onProgress?.(records.length, pending.length);
  }

  // Una transacción: ningún cambio parcial y ningún borrado del Cancionero anterior.
  await mergeCancioneroLocalUpdates(records, {
    lastRemoteUpdatedAt: plan.snapshot.maxUpdatedAt,
    lastRemoteCount: plan.snapshot.count,
    syncedAt: new Date().toISOString(),
    contentVersion: CONTENT_VERSION,
  });
  return records.length;
}
