import { getOfflineDb } from "./offline-db";
import type { ColaIndividualItem } from "@/types";
import { avanzarGuestCola } from "@/lib/cola-individual-guest";

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
  const tx = db.transaction("cola_individual_snapshot", "readwrite");
  const old = await tx.store.get(userId);
  if (!old) throw new Error("Todavía no hay una copia de tu lista en este celular.");
  const items = avanzarGuestCola(old.items) as ColaIndividualItem[];
  const patches = new Map(old.pending.map(patch => [patch.id, patch]));
  for (const item of items) {
    const previous = old.items.find(row => row.id === item.id);
    if (previous?.estado !== item.estado || previous?.orden !== item.orden) {
      patches.set(item.id, { id: item.id, estado: item.estado, orden: item.orden });
    }
  }
  await tx.store.put({ userId, items, pending: [...patches.values()] });
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
