import type { CancionInput } from "@/lib/cola-logic";
import {
  applyOrdenUpdates,
  avanzarCancionLocalState,
  deleteColaItemLocalState,
  finalizarCancionActivaLocalState,
  type OrdenUpdate,
} from "@/lib/offline/cola-local-logic";
import { getOfflineDb, isOfflineBrowser, type ColaLocalRecord } from "@/lib/offline/offline-db";
import type { ColaItem, EstadoCola } from "@/types";

const LOCAL_ID_START = -1;

async function getNextLocalId(salaId: number): Promise<number> {
  const db = await getOfflineDb();
  const rows = await db.getAllFromIndex("cola_local", "by-sala", salaId);
  const minId = rows.reduce(
    (min, row) => (row.localId < min ? row.localId : min),
    LOCAL_ID_START,
  );

  return minId <= LOCAL_ID_START ? minId - 1 : LOCAL_ID_START;
}

export function colaLocalToColaItem(record: ColaLocalRecord): ColaItem {
  return {
    id: record.localId,
    sala_id: record.salaId,
    nombre: record.nombre,
    artista: record.artista,
    url_letra: record.url_letra,
    letra_texto: record.letra_texto,
    estado: record.estado,
    orden: record.orden,
    created_at: new Date().toISOString(),
  };
}

export function colaItemsToLocalRecords(items: ColaItem[]): ColaLocalRecord[] {
  return items.map((item) => ({
    localId: item.id,
    salaId: item.sala_id,
    nombre: item.nombre,
    artista: item.artista,
    url_letra: item.url_letra,
    letra_texto: item.letra_texto ?? null,
    estado: item.estado,
    orden: item.orden,
  }));
}

export async function getColaLocalItems(salaId: number): Promise<ColaItem[]> {
  if (!isOfflineBrowser()) {
    return [];
  }

  const db = await getOfflineDb();
  const rows = await db.getAllFromIndex("cola_local", "by-sala", salaId);

  return rows
    .sort((a, b) => a.orden - b.orden)
    .map(colaLocalToColaItem);
}

export async function replaceColaLocalItems(
  salaId: number,
  items: ColaItem[],
): Promise<void> {
  if (!isOfflineBrowser()) {
    return;
  }

  const db = await getOfflineDb();
  const tx = db.transaction("cola_local", "readwrite");
  const store = tx.objectStore("cola_local");
  const existing = await store.index("by-sala").getAll(salaId);

  for (const row of existing) {
    await store.delete(row.localId);
  }

  for (const record of colaItemsToLocalRecords(items)) {
    await store.put(record);
  }

  await tx.done;
}

export async function clearColaLocal(salaId: number): Promise<void> {
  if (!isOfflineBrowser()) {
    return;
  }

  const db = await getOfflineDb();
  const tx = db.transaction("cola_local", "readwrite");
  const store = tx.objectStore("cola_local");
  const existing = await store.index("by-sala").getAll(salaId);

  for (const row of existing) {
    await store.delete(row.localId);
  }

  await tx.done;
}

export async function addColaLocalItem(
  salaId: number,
  cancion: CancionInput,
): Promise<ColaItem[]> {
  const current = await getColaLocalItems(salaId);
  const nextOrden =
    current.reduce((max, item) => Math.max(max, item.orden), 0) + 1;
  const localId = await getNextLocalId(salaId);

  const record: ColaLocalRecord = {
    localId,
    salaId,
    nombre: cancion.nombre,
    artista: cancion.artista,
    url_letra: cancion.url_letra,
    letra_texto: cancion.letra_texto?.trim() || null,
    estado: "pendiente" as EstadoCola,
    orden: nextOrden,
  };

  const db = await getOfflineDb();
  await db.put("cola_local", record);

  return getColaLocalItems(salaId);
}

/** Pone la canción como activa; la activa actual pasa a tocada. */
export async function verAhoraColaLocal(
  salaId: number,
  cancion: CancionInput,
): Promise<ColaItem[]> {
  const current = await getColaLocalItems(salaId);
  const activa = current.find((item) => item.estado === "activa");

  if (
    activa &&
    activa.nombre === cancion.nombre.trim() &&
    (activa.url_letra ?? "") === (cancion.url_letra ?? "")
  ) {
    return current;
  }

  const beforeIds = new Set(current.map((item) => item.id));
  await addColaLocalItem(salaId, cancion);
  const after = await getColaLocalItems(salaId);
  const nuevo = after.find((item) => !beforeIds.has(item.id));

  if (!nuevo) {
    return after;
  }

  return avanzarColaLocal(salaId, nuevo.id);
}

export async function persistColaLocalOrden(
  salaId: number,
  items: ColaItem[],
  updates: OrdenUpdate[],
): Promise<ColaItem[]> {
  const nextItems = applyOrdenUpdates(items, updates);
  await replaceColaLocalItems(salaId, nextItems);
  return getColaLocalItems(salaId);
}

export async function avanzarColaLocal(
  salaId: number,
  itemId: number,
): Promise<ColaItem[]> {
  const items = await getColaLocalItems(salaId);
  const nextItems = avanzarCancionLocalState(items, itemId);
  await replaceColaLocalItems(salaId, nextItems);
  return getColaLocalItems(salaId);
}

export async function deleteColaLocalItem(
  salaId: number,
  itemId: number,
): Promise<ColaItem[]> {
  const items = await getColaLocalItems(salaId);
  const nextItems = deleteColaItemLocalState(items, itemId);
  await replaceColaLocalItems(salaId, nextItems);
  return getColaLocalItems(salaId);
}

export async function finalizarColaLocalActiva(
  salaId: number,
): Promise<ColaItem[]> {
  const items = await getColaLocalItems(salaId);
  const nextItems = finalizarCancionActivaLocalState(items);
  await replaceColaLocalItems(salaId, nextItems);
  return getColaLocalItems(salaId);
}

export async function deleteColaLocalCompleta(salaId: number): Promise<void> {
  await clearColaLocal(salaId);
}
