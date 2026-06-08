import type { ColaItem } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DropResult } from "@hello-pangea/dnd";

export type ColaVariant = "tocada" | "activa" | "proxima" | "pendiente";

export type OrdenUpdate = {
  id: number;
  orden: number;
};

export function getColaVariant(
  item: ColaItem,
  items: ColaItem[],
): ColaVariant {
  if (item.estado === "tocada") {
    return "tocada";
  }

  if (item.estado === "activa") {
    return "activa";
  }

  const firstPendiente = items.find((colaItem) => colaItem.estado === "pendiente");
  if (firstPendiente?.id === item.id) {
    return "proxima";
  }

  return "pendiente";
}

export function getFirstPendienteIndex(items: ColaItem[]): number {
  return items.findIndex((item) => item.estado === "pendiente");
}

export function buildReorderUpdates(
  items: ColaItem[],
  result: DropResult,
): OrdenUpdate[] | null {
  const { source, destination, draggableId } = result;

  if (!destination) {
    return null;
  }

  if (source.index === destination.index) {
    return null;
  }

  const sourceItem = items.find((item) => String(item.id) === draggableId);

  if (!sourceItem || sourceItem.estado !== "pendiente") {
    return null;
  }

  const firstPendienteIndex = getFirstPendienteIndex(items);

  if (firstPendienteIndex === -1) {
    return null;
  }

  if (destination.index < firstPendienteIndex) {
    return null;
  }

  const pendientes = items.filter((item) => item.estado === "pendiente");
  const sourcePendienteIndex = pendientes.findIndex(
    (item) => item.id === sourceItem.id,
  );
  const destinationPendienteIndex = destination.index - firstPendienteIndex;

  if (sourcePendienteIndex === -1) {
    return null;
  }

  const reordered = [...pendientes];
  const [moved] = reordered.splice(sourcePendienteIndex, 1);
  reordered.splice(destinationPendienteIndex, 0, moved);

  const anchorOrden = Math.max(
    0,
    ...items
      .filter((item) => item.estado !== "pendiente")
      .map((item) => item.orden),
  );

  return reordered.map((item, index) => ({
    id: item.id,
    orden: anchorOrden + index + 1,
  }));
}

export async function persistColaOrden(
  supabase: SupabaseClient,
  updates: OrdenUpdate[],
): Promise<void> {
  await Promise.all(
    updates.map(({ id, orden }) =>
      supabase.from("cola_juntada").update({ orden }).eq("id", id),
    ),
  );
}

export async function deleteColaItem(
  supabase: SupabaseClient,
  itemId: number,
): Promise<void> {
  const { error } = await supabase
    .from("cola_juntada")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw error;
  }
}

export async function deleteColaCompleta(
  supabase: SupabaseClient,
  salaId: number,
): Promise<void> {
  const { error } = await supabase
    .from("cola_juntada")
    .delete()
    .eq("sala_id", salaId);

  if (error) {
    throw error;
  }
}
