import { getOfflineDb } from "./offline-db";
import type { ColaIndividualItem } from "@/types";
import { avanzarGuestCola } from "@/lib/cola-individual-guest";
import { cancionDisponibleOffline } from "@/lib/cola-offline";
import { agregarGuestCola, verAhoraGuestCola } from "@/lib/cola-individual-guest";
import type { CancionInput } from "@/lib/cola-logic";

export async function addColaIndividualLocal(userId: string, cancion: CancionInput, verAhora = false) {
  const db = await getOfflineDb();
  const tx = db.transaction(["cola_individual_snapshot", "canciones"], "readwrite");
  const store = tx.objectStore("cola_individual_snapshot");
  const old = await store.get(userId) ?? { userId, items: [], pending: [] };
  const songs = await tx.objectStore("canciones").getAll();
  const ids = new Set(songs.filter(song => song.letra?.trim()).map(song => song.id));
  if (!cancionDisponibleOffline(cancion, ids)) throw new Error("Esta canción requiere conexión.");
  const transformed = (verAhora ? verAhoraGuestCola : agregarGuestCola)(old.items, cancion);
  const nextId = Math.min(0, ...old.items.map(item => item.id)) - 1;
  const items = transformed.map(item => "user_id" in item ? item as ColaIndividualItem : {
    ...item, id: nextId, user_id: userId, created_at: new Date().toISOString(),
  });
  const pending = new Map(old.pending.map(patch => [patch.id, patch]));
  for (const item of items) {
    const previous = old.items.find(row => row.id === item.id);
    if (!previous || previous.estado !== item.estado || previous.orden !== item.orden) {
      pending.set(item.id, { id: item.id, estado: item.estado, orden: item.orden });
    }
  }
  await store.put({ userId, items, pending: [...pending.values()] });
  await tx.done;
}

export async function remapColaIndividualLocal(userId: string, localId: number, remoteId: number) {
  const db = await getOfflineDb();
  const tx = db.transaction("cola_individual_snapshot", "readwrite");
  const current = await tx.store.get(userId);
  if (current) {
    current.items = current.items.map(item => item.id === localId ? { ...item, id: remoteId } : item);
    current.pending = current.pending.map(item => item.id === localId ? { ...item, id: remoteId } : item);
    await tx.store.put(current);
  }
  await tx.done;
}

export async function readColaIndividual(userId: string) {
  const db = await getOfflineDb();
  return db.get("cola_individual_snapshot", userId);
}

export async function cacheColaIndividual(userId: string, items: ColaIndividualItem[]) {
  const db = await getOfflineDb();
  const tx = db.transaction("cola_individual_snapshot", "readwrite");
  const old = await tx.store.get(userId);
  // Una lectura de red iniciada antes de avanzar no debe pisar el cambio local.
  if (!old?.pending.length) await tx.store.put({ userId, items, pending: [] });
  await tx.done;
}

export async function advanceColaIndividualLocal(userId: string) {
  const db = await getOfflineDb();
  const tx = db.transaction(["cola_individual_snapshot", "canciones"], "readwrite");
  const store = tx.objectStore("cola_individual_snapshot");
  const old = await store.get(userId);
  if (!old) throw new Error("Todavía no hay una copia de tu lista en este celular.");
  const songs = await tx.objectStore("canciones").getAll();
  const ids = new Set(songs.filter(song => song.letra?.trim()).map(song => song.id));
  const items = avanzarGuestCola(old.items, item => cancionDisponibleOffline(item, ids)) as ColaIndividualItem[];
  const patches = new Map(old.pending.map(patch => [patch.id, patch]));
  for (const item of items) {
    const previous = old.items.find(row => row.id === item.id);
    if (previous?.estado !== item.estado || previous?.orden !== item.orden) {
      patches.set(item.id, { id: item.id, estado: item.estado, orden: item.orden });
    }
  }
  await store.put({ userId, items, pending: [...patches.values()] });
  await tx.done;
}

export async function acknowledgeColaPatch(userId: string, patch: { id: number; estado: string; orden: number }) {
  const db = await getOfflineDb();
  const tx = db.transaction("cola_individual_snapshot", "readwrite");
  const current = await tx.store.get(userId);
  if (current) {
    current.pending = current.pending.filter(row =>
      row.id !== patch.id || row.estado !== patch.estado || row.orden !== patch.orden);
    await tx.store.put(current);
  }
  await tx.done;
}
