import type { CancionCancionero, CancionCifradoDetalle } from "@/types";
import {
  DEFAULT_BPM,
  DEFAULT_TONALIDAD,
  normalizeNotaIndex,
  tieneBarrasDeCompas,
  type CifradoData,
} from "@/lib/cifrado";
import {
  DEFAULT_MODO_TONAL,
  normalizeModoTonal,
} from "@/lib/cifrado-escala";
import { filaIndiceCancion, indiceSirve } from "@/lib/offline/cancionero-indice";
import {
  getOfflineDb,
  isOfflineBrowser,
  type CancioneroIndiceRecord,
  type CancioneroLocalMeta,
  type CancioneroLocalRecord,
} from "@/lib/offline/offline-db";

export type { CancioneroLocalMeta, CancioneroLocalRecord };

const DEFAULT_META: CancioneroLocalMeta = {
  lastRemoteUpdatedAt: null,
  lastRemoteCount: 0,
  syncedAt: null,
  contentVersion: 0,
  indiceListo: false,
};

function metaDesdeFila(
  row: (CancioneroLocalMeta & { id?: "sync" }) | undefined,
): CancioneroLocalMeta {
  if (!row) return { ...DEFAULT_META };
  return {
    lastRemoteUpdatedAt: row.lastRemoteUpdatedAt,
    lastRemoteCount: row.lastRemoteCount,
    syncedAt: row.syncedAt,
    contentVersion: row.contentVersion ?? 0,
    indiceListo: row.indiceListo === true,
  };
}

export function toCancionCancionero(
  record: CancioneroLocalRecord,
): CancionCancionero {
  return {
    id: record.id,
    nombre: record.nombre,
    artista: record.artista,
    artista_id: record.artista_id ?? null,
    created_at: record.created_at ?? null,
    letra: record.letra,
    tiene_cifrado_avanzado: record.tiene_cifrado_avanzado ?? false,
    tiene_compases: tieneBarrasDeCompas(record.compas_config),
    user_id: record.user_id ?? null,
    validada_por: record.validada_por ?? null,
    validada_en: record.validada_en ?? null,
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

  return metaDesdeFila(row);
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
    indiceListo: current.indiceListo,
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
  const tx = db.transaction(["canciones", "canciones_indice", "meta"], "readwrite");
  const cancionesStore = tx.objectStore("canciones");
  const indiceStore = tx.objectStore("canciones_indice");
  const metaStore = tx.objectStore("meta");

  for (const record of records) {
    const existing = await cancionesStore.get(record.id);
    // No sobrescribir una versión más nueva guardada desde otra pestaña.
    if (!existing || new Date(existing.updated_at) <= new Date(record.updated_at)) {
      const conservarValidacion =
        record.validada_por === undefined && existing
          ? {
              validada_por: existing.validada_por,
              validada_en: existing.validada_en,
            }
          : null;
      const siguiente = conservarValidacion
        ? { ...record, ...conservarValidacion }
        : record;
      const guardada: CancioneroLocalRecord = {
        ...siguiente,
        created_at: siguiente.created_at ?? existing?.created_at ?? null,
      };
      // Misma transacción: la ficha chica queda con la fecha y el "completa" de esta canción.
      await cancionesStore.put(guardada);
      await indiceStore.put(filaIndiceCancion(guardada));
    } else {
      await indiceStore.put(filaIndiceCancion(existing));
    }
  }

  const listo = (await cancionesStore.count()) === (await indiceStore.count());
  const current = metaDesdeFila(await metaStore.get("sync"));
  if (meta || current.syncedAt || listo) {
    await metaStore.put({
      id: "sync",
      ...current,
      ...meta,
      indiceListo: listo,
      syncedAt: meta ? (meta.syncedAt ?? new Date().toISOString()) : current.syncedAt,
    });
  }

  await tx.done;
}

export async function clearCancioneroLocal(): Promise<void> {
  if (!isOfflineBrowser()) {
    return;
  }

  const db = await getOfflineDb();
  const tx = db.transaction(["canciones", "canciones_indice", "meta"], "readwrite");

  await tx.objectStore("canciones").clear();
  await tx.objectStore("canciones_indice").clear();
  await tx.objectStore("meta").clear();
  await tx.done;
}

export async function aplicarFechasAltaLocales(
  fechas: Array<{ id: number; created_at: string }>,
): Promise<void> {
  if (!isOfflineBrowser() || fechas.length === 0) return;

  const db = await getOfflineDb();
  const porId = new Map(fechas.map((fecha) => [fecha.id, fecha.created_at]));
  const rows = await db.getAll("canciones");
  const tx = db.transaction("canciones", "readwrite");

  for (const row of rows) {
    const created_at = porId.get(row.id);
    if (!created_at || row.created_at === created_at) continue;
    await tx.store.put({ ...row, created_at });
  }

  await tx.done;
}

export async function patchValidacionLocal(
  id: number,
  validacion: {
    validada_por: string | null;
    validada_en: string | null;
  },
): Promise<void> {
  if (!isOfflineBrowser()) return;

  const db = await getOfflineDb();
  const record = await db.get("canciones", id);
  if (!record) return;

  await db.put("canciones", { ...record, ...validacion });
}

export async function aplicarValidacionesLocales(
  activas: Array<{
    id: number;
    validada_por: string | null;
    validada_en: string | null;
  }>,
): Promise<void> {
  if (!isOfflineBrowser()) return;

  const db = await getOfflineDb();
  const rows = await db.getAll("canciones");
  const porId = new Map(activas.map((marca) => [marca.id, marca]));
  const tx = db.transaction("canciones", "readwrite");

  for (const row of rows) {
    const marca = porId.get(row.id);
    const siguiente = marca
      ? {
          validada_por: marca.validada_por,
          validada_en: marca.validada_en,
        }
      : row.validada_por
        ? {
            validada_por: null,
            validada_en: null,
          }
        : null;

    if (!siguiente) continue;
    if (
      row.validada_por === siguiente.validada_por &&
      row.validada_en === siguiente.validada_en
    ) {
      continue;
    }

    await tx.store.put({ ...row, ...siguiente });
  }

  await tx.done;
}

export async function deleteCancioneroLocalRecord(id: number): Promise<void> {
  if (!isOfflineBrowser()) {
    return;
  }

  const db = await getOfflineDb();
  const tx = db.transaction(["canciones", "canciones_indice"], "readwrite");
  await tx.objectStore("canciones").delete(id);
  await tx.objectStore("canciones_indice").delete(id);
  await tx.done;
}

/**
 * Deja lista la ficha chica. Si todavía no existe, la arma una vez leyendo las canciones
 * ya guardadas. No borra nada, no cambia la versión ni las fechas, y no pide una descarga.
 */
export async function prepararRevisionLocal(): Promise<{
  indice: CancioneroIndiceRecord[];
  meta: CancioneroLocalMeta;
  cancionesCount: number;
}> {
  if (!isOfflineBrowser()) {
    return {
      indice: [],
      meta: { ...DEFAULT_META },
      cancionesCount: 0,
    };
  }

  const db = await getOfflineDb();
  let meta = await getCancioneroLocalMeta();
  let indice = await db.getAll("canciones_indice");
  let cancionesCount = await db.count("canciones");

  if (!indiceSirve(meta.indiceListo, indice.length, cancionesCount)) {
    indice = await reconstruirIndiceCancionero();
    meta = await getCancioneroLocalMeta();
    cancionesCount = await db.count("canciones");
  }

  if (!indiceSirve(meta.indiceListo, indice.length, cancionesCount)) {
    throw new Error("No se pudo preparar la revisión del Cancionero.");
  }

  return { indice, meta, cancionesCount };
}

async function reconstruirIndiceCancionero(): Promise<CancioneroIndiceRecord[]> {
  const db = await getOfflineDb();
  const tx = db.transaction(["canciones", "canciones_indice", "meta"], "readwrite");
  const cancionesStore = tx.objectStore("canciones");
  const indiceStore = tx.objectStore("canciones_indice");
  const metaStore = tx.objectStore("meta");
  const songs = await cancionesStore.getAll();

  await indiceStore.clear();
  const filas = songs.map(filaIndiceCancion);
  for (const fila of filas) {
    await indiceStore.put(fila);
  }

  const current = metaDesdeFila(await metaStore.get("sync"));
  await metaStore.put({
    id: "sync",
    ...current,
    indiceListo: true,
  });
  await tx.done;
  return filas;
}

export function getCancioneroLocalForBusqueda(
  records: CancioneroLocalRecord[],
) {
  return records.map((record) => ({
    id: record.id,
    nombre: record.nombre,
    artista: record.artista,
    artista_id: record.artista_id ?? null,
    letra: record.letra,
    url_letra: record.url_letra,
    tiene_cifrado_avanzado: record.tiene_cifrado_avanzado ?? false,
    validada: Boolean(record.validada_por),
    user_id: record.user_id ?? null,
  }));
}
