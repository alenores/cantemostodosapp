import type { CancionCancionero } from "@/types";
import {
  getOfflineDb,
  isOfflineBrowser,
  type CancioneroLocalMeta,
  type CancioneroLocalRecord,
} from "@/lib/offline/offline-db";

export type { CancioneroLocalMeta, CancioneroLocalRecord };

const DEFAULT_META: CancioneroLocalMeta = {
  lastRemoteUpdatedAt: null,
  lastRemoteCount: 0,
  syncedAt: null,
};

export function toCancionCancionero(
  record: CancioneroLocalRecord,
): CancionCancionero {
  return {
    id: record.id,
    nombre: record.nombre,
    artista: record.artista,
    letra: record.letra,
    tiene_cifrado_avanzado: record.tiene_cifrado_avanzado ?? false,
  };
}

export async function getCancioneroLocalAll(): Promise<CancioneroLocalRecord[]> {
  if (!isOfflineBrowser()) {
    return [];
  }

  const db = await getOfflineDb();
  const rows = await db.getAll("canciones");

  return rows.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );
}

export async function getCancioneroLocalAsCancionero(): Promise<CancionCancionero[]> {
  const rows = await getCancioneroLocalAll();
  return rows.map(toCancionCancionero);
}

export async function getCancioneroLocalMeta(): Promise<CancioneroLocalMeta> {
  if (!isOfflineBrowser()) {
    return { ...DEFAULT_META };
  }

  const db = await getOfflineDb();
  const row = await db.get("meta", "sync");

  if (!row) {
    return { ...DEFAULT_META };
  }

  return {
    lastRemoteUpdatedAt: row.lastRemoteUpdatedAt,
    lastRemoteCount: row.lastRemoteCount,
    syncedAt: row.syncedAt,
  };
}

export async function setCancioneroLocalMeta(
  meta: Partial<CancioneroLocalMeta>,
): Promise<void> {
  if (!isOfflineBrowser()) {
    return;
  }

  const db = await getOfflineDb();
  const current = await getCancioneroLocalMeta();

  await db.put("meta", {
    id: "sync",
    ...current,
    ...meta,
  });
}

export async function replaceCancioneroLocalAll(
  records: CancioneroLocalRecord[],
  meta?: Partial<CancioneroLocalMeta>,
): Promise<void> {
  if (!isOfflineBrowser()) {
    return;
  }

  const db = await getOfflineDb();
  const tx = db.transaction(["canciones", "meta"], "readwrite");
  const cancionesStore = tx.objectStore("canciones");
  const metaStore = tx.objectStore("meta");

  await cancionesStore.clear();

  for (const record of records) {
    await cancionesStore.put(record);
  }

  if (meta) {
    const currentRow = await metaStore.get("sync");
    const current: CancioneroLocalMeta = currentRow
      ? {
          lastRemoteUpdatedAt: currentRow.lastRemoteUpdatedAt,
          lastRemoteCount: currentRow.lastRemoteCount,
          syncedAt: currentRow.syncedAt,
        }
      : { ...DEFAULT_META };

    await metaStore.put({
      id: "sync",
      ...current,
      ...meta,
      syncedAt: meta.syncedAt ?? new Date().toISOString(),
    });
  }

  await tx.done;
}

export async function clearCancioneroLocal(): Promise<void> {
  if (!isOfflineBrowser()) {
    return;
  }

  const db = await getOfflineDb();
  const tx = db.transaction(["canciones", "meta"], "readwrite");

  await tx.objectStore("canciones").clear();
  await tx.objectStore("meta").clear();
  await tx.done;
}

export async function patchCancioneroLocalRecord(
  id: number,
  patch: Partial<
    Pick<
      CancioneroLocalRecord,
      "nombre" | "artista" | "letra" | "tiene_cifrado_avanzado" | "updated_at"
    >
  >,
): Promise<void> {
  if (!isOfflineBrowser()) {
    return;
  }

  const db = await getOfflineDb();
  const existing = await db.get("canciones", id);

  if (!existing) {
    return;
  }

  await db.put("canciones", {
    ...existing,
    ...patch,
    updated_at: patch.updated_at ?? new Date().toISOString(),
  });
}

export function getCancioneroLocalForBusqueda(
  records: CancioneroLocalRecord[],
) {
  return records.map((record) => ({
    id: record.id,
    nombre: record.nombre,
    artista: record.artista,
    letra: record.letra,
    url_letra: record.url_letra,
    tiene_cifrado_avanzado: record.tiene_cifrado_avanzado ?? false,
  }));
}
