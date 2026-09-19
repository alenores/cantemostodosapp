import {
  getCancioneroLocalMeta,
  replaceCancioneroLocalAll,
  type CancioneroLocalRecord,
} from "@/lib/offline/cancionero-store";
import type { SupabaseClient } from "@supabase/supabase-js";

export const CANCIONERO_OFFLINE_CONTENT_VERSION = 2;
const CANCIONERO_PAGE_SIZE = 500;

export type CancioneroRemoteSnapshot = {
  maxUpdatedAt: string | null;
  count: number;
};

export type CancioneroSyncResult =
  | { status: "skipped"; reason: "offline" | "unchanged" }
  | { status: "synced"; count: number }
  | { status: "error"; message: string };

function normalizeTimestamp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export function needsCancioneroSync(
  remote: CancioneroRemoteSnapshot,
  local: Awaited<ReturnType<typeof getCancioneroLocalMeta>>,
): boolean {
  if (local.syncedAt === null) {
    return true;
  }

  if (local.contentVersion !== CANCIONERO_OFFLINE_CONTENT_VERSION) {
    return true;
  }

  const remoteMax = normalizeTimestamp(remote.maxUpdatedAt);
  const localMax = normalizeTimestamp(local.lastRemoteUpdatedAt);

  if (remote.count !== local.lastRemoteCount) {
    return true;
  }

  if (remoteMax !== localMax) {
    return true;
  }

  return false;
}

export async function fetchCancioneroRemoteSnapshot(
  supabase: SupabaseClient,
): Promise<CancioneroRemoteSnapshot> {
  const [countResult, latestResult] = await Promise.all([
    supabase
      .from("canciones_guardadas")
      .select("id", { count: "exact", head: true })
      .is("sala_id", null),
    supabase
      .from("canciones_guardadas")
      .select("updated_at")
      .is("sala_id", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (countResult.error) {
    throw countResult.error;
  }

  if (latestResult.error) {
    throw latestResult.error;
  }

  const count = countResult.count ?? 0;

  return {
    count,
    maxUpdatedAt:
      count > 0 ? normalizeTimestamp(latestResult.data?.updated_at ?? null) : null,
  };
}

export async function fetchCancioneroRemoteAll(
  supabase: SupabaseClient,
): Promise<CancioneroLocalRecord[]> {
  const records: CancioneroLocalRecord[] = [];

  for (let from = 0; ; from += CANCIONERO_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("canciones_guardadas")
      .select(
        "id, nombre, artista, letra, url_letra, updated_at, tiene_cifrado_avanzado, user_id, cifrado, compas_config, tonalidad_default, modo_tonal_default, bpm_default",
      )
      .is("sala_id", null)
      .order("id", { ascending: true })
      .range(from, from + CANCIONERO_PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const page = data ?? [];

    records.push(
      ...page.map((row) => ({
        id: row.id,
        nombre: row.nombre,
        artista: row.artista,
        letra: row.letra,
        url_letra: row.url_letra ?? "",
        updated_at:
          normalizeTimestamp(row.updated_at) ?? new Date().toISOString(),
        tiene_cifrado_avanzado: row.tiene_cifrado_avanzado ?? false,
        user_id: row.user_id ?? null,
        cifrado: row.cifrado ?? null,
        compas_config: row.compas_config ?? null,
        tonalidad_default: row.tonalidad_default ?? null,
        modo_tonal_default: row.modo_tonal_default ?? null,
        bpm_default: row.bpm_default ?? null,
      })),
    );

    if (page.length < CANCIONERO_PAGE_SIZE) {
      break;
    }
  }

  return records;
}

export async function syncCancioneroLocal(
  supabase: SupabaseClient,
  options?: { force?: boolean },
): Promise<CancioneroSyncResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { status: "skipped", reason: "offline" };
  }

  const [remoteSnapshot, localMeta] = await Promise.all([
    fetchCancioneroRemoteSnapshot(supabase),
    getCancioneroLocalMeta(),
  ]);

  if (!options?.force && !needsCancioneroSync(remoteSnapshot, localMeta)) {
    return { status: "skipped", reason: "unchanged" };
  }

  const records = await fetchCancioneroRemoteAll(supabase);

  if (records.length !== remoteSnapshot.count) {
    throw new Error(
      `La descarga del cancionero quedó incompleta (${records.length}/${remoteSnapshot.count}).`,
    );
  }

  await replaceCancioneroLocalAll(records, {
    lastRemoteUpdatedAt: remoteSnapshot.maxUpdatedAt,
    lastRemoteCount: remoteSnapshot.count,
    syncedAt: new Date().toISOString(),
    contentVersion: CANCIONERO_OFFLINE_CONTENT_VERSION,
  });

  return { status: "synced", count: records.length };
}
