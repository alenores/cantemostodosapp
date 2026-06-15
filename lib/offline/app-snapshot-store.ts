import {
  getOfflineDb,
  isOfflineBrowser,
  type AppSnapshotRecord,
} from "@/lib/offline/offline-db";
import type { Sala, UsuarioActivo } from "@/types";

export type AppSnapshotPayload = {
  usuario: UsuarioActivo;
  salas: Pick<Sala, "id" | "nombre" | "descripcion">[];
  cancioneroTotal: number;
};

export async function saveAppSnapshot(
  payload: AppSnapshotPayload,
): Promise<void> {
  if (!isOfflineBrowser()) {
    return;
  }

  const db = await getOfflineDb();
  const record: AppSnapshotRecord = {
    id: "current",
    ...payload,
    savedAt: new Date().toISOString(),
  };

  await db.put("app_snapshot", record);
}

export async function getAppSnapshot(): Promise<AppSnapshotRecord | null> {
  if (!isOfflineBrowser()) {
    return null;
  }

  const db = await getOfflineDb();
  return (await db.get("app_snapshot", "current")) ?? null;
}
