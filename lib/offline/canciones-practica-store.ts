import {
  getOfflineDb,
  isOfflineBrowser,
  type CancionPracticaLocalRecord,
} from "@/lib/offline/offline-db";

export function practicaLocalKey(userId: string, localId: number): string {
  return `${userId}:${localId}`;
}

export async function getCancionesPracticaLocalRecords(
  userId: string,
  options?: { includeDeleted?: boolean },
): Promise<CancionPracticaLocalRecord[]> {
  if (!isOfflineBrowser()) return [];
  const db = await getOfflineDb();
  const rows = await db.getAllFromIndex("canciones_practica", "by-user", userId);
  return rows
    .filter((row) => options?.includeDeleted || row.sync_state !== "pending-delete")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getCancionPracticaLocalRecord(
  userId: string,
  localId: number,
): Promise<CancionPracticaLocalRecord | null> {
  if (!isOfflineBrowser()) return null;
  const db = await getOfflineDb();
  return (await db.get("canciones_practica", practicaLocalKey(userId, localId))) ?? null;
}

export async function putCancionPracticaLocalRecord(
  record: CancionPracticaLocalRecord,
): Promise<void> {
  const db = await getOfflineDb();
  await db.put("canciones_practica", record);
}

export async function deleteCancionPracticaLocalRecord(
  userId: string,
  localId: number,
): Promise<void> {
  if (!isOfflineBrowser()) return;
  const db = await getOfflineDb();
  await db.delete("canciones_practica", practicaLocalKey(userId, localId));
}

export async function createCancionPracticaTempId(userId: string): Promise<number> {
  let candidate = -Date.now();
  while (await getCancionPracticaLocalRecord(userId, candidate)) candidate -= 1;
  return candidate;
}

/** Integra la nube sin pisar cambios locales todavía pendientes. */
export async function mergeCancionesPracticaRemoteSnapshot(
  userId: string,
  remoteRows: CancionPracticaLocalRecord[],
): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction("canciones_practica", "readwrite");
  const store = tx.objectStore("canciones_practica");
  const existing = await store.index("by-user").getAll(userId);
  const byRemoteId = new Map(
    existing
      .filter((row) => row.remote_id != null)
      .map((row) => [row.remote_id!, row]),
  );
  const remoteIds = new Set(remoteRows.map((row) => row.remote_id));

  for (const remote of remoteRows) {
    const local = remote.remote_id == null ? null : byRemoteId.get(remote.remote_id);
    if (local && local.sync_state !== "synced") continue;
    const localId = local?.local_id ?? remote.local_id;
    await store.put({
      ...remote,
      local_id: localId,
      local_key: practicaLocalKey(userId, localId),
    });
  }

  for (const local of existing) {
    if (
      local.sync_state === "synced" &&
      local.remote_id != null &&
      !remoteIds.has(local.remote_id)
    ) {
      await store.delete(local.local_key);
    }
  }

  await tx.done;
}

