import type { CancionCancionero, CancionCifradoDetalle } from "@/types";
import {
  DEFAULT_BPM,
  DEFAULT_TONALIDAD,
  normalizeNotaIndex,
  type CifradoData,
} from "@/lib/cifrado";
import {
  DEFAULT_MODO_TONAL,
  normalizeModoTonal,
} from "@/lib/cifrado-escala";
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
  contentVersion: 0,
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
    user_id: record.user_id ?? null,
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

function parseLocalCifrado(
  value: CancioneroLocalRecord["cifrado"],
): CifradoData | null {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray(value.acordes)
  ) {
    return null;
  }

  return value;
}

export async function getCancioneroLocalCifradoDetalle(
  id: number,
): Promise<CancionCifradoDetalle | null> {
  if (!isOfflineBrowser()) {
    return null;
  }

  const db = await getOfflineDb();
  const record = await db.get("canciones", id);

  if (!record?.tiene_cifrado_avanzado) {
    return null;
  }

  const cifrado = parseLocalCifrado(record.cifrado);
  if (!cifrado) {
    return null;
  }

  return {
    id: record.id,
    nombre: record.nombre,
    artista: record.artista,
    letra: record.letra,
    cifrado,
    compas_config: record.compas_config ?? null,
    tonalidad_default: normalizeNotaIndex(
      record.tonalidad_default ?? DEFAULT_TONALIDAD,
    ),
    modo_tonal_default: normalizeModoTonal(
      record.modo_tonal_default ?? DEFAULT_MODO_TONAL,
    ),
    bpm_default: Math.max(40, Math.min(240, record.bpm_default ?? DEFAULT_BPM)),
    tiene_cifrado_avanzado: true,
  };
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
    contentVersion: row.contentVersion ?? 0,
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

export async function mergeCancioneroLocalUpdates(
  records: CancioneroLocalRecord[],
  meta?: Partial<CancioneroLocalMeta>,
): Promise<void> {
  if (!isOfflineBrowser()) {
    throw new Error("No se pudo guardar el Cancionero en este dispositivo.");
  }

  const db = await getOfflineDb();
  const tx = db.transaction(["canciones", "meta"], "readwrite");
  const cancionesStore = tx.objectStore("canciones");
  const metaStore = tx.objectStore("meta");

  for (const record of records) {
    const existing = await cancionesStore.get(record.id);
    // No sobrescribir una versión más nueva guardada desde otra pestaña.
    if (!existing || new Date(existing.updated_at) <= new Date(record.updated_at)) {
      await cancionesStore.put(record);
    }
  }

  if (meta) {
    const currentRow = await metaStore.get("sync");
    const current: CancioneroLocalMeta = currentRow
      ? {
          lastRemoteUpdatedAt: currentRow.lastRemoteUpdatedAt,
          lastRemoteCount: currentRow.lastRemoteCount,
          syncedAt: currentRow.syncedAt,
          contentVersion: currentRow.contentVersion ?? 0,
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

export async function deleteCancioneroLocalRecord(id: number): Promise<void> {
  if (!isOfflineBrowser()) {
    return;
  }

  const db = await getOfflineDb();
  await db.delete("canciones", id);
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
    user_id: record.user_id ?? null,
  }));
}
