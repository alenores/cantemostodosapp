import type { ColaItem } from "@/types";
import type { OrdenUpdate } from "@/lib/cola-logic";

export type { OrdenUpdate };

export function avanzarCancionLocalState(
  items: ColaItem[],
  nuevoItemId: number,
): ColaItem[] {
  const target = items.find((item) => item.id === nuevoItemId);

  if (!target || target.estado !== "pendiente") {
    return items;
  }

  return items.map((item) => {
    if (item.estado === "activa") {
      return { ...item, estado: "tocada" as const };
    }

    if (item.id === nuevoItemId) {
      return { ...item, estado: "activa" as const };
    }

    return item;
  });
}

export function finalizarCancionActivaLocalState(items: ColaItem[]): ColaItem[] {
  return items.map((item) =>
    item.estado === "activa" ? { ...item, estado: "tocada" as const } : item,
  );
}

export function deleteColaItemLocalState(
  items: ColaItem[],
  itemId: number,
): ColaItem[] {
  return items.filter((item) => item.id !== itemId);
}

export { applyOrdenUpdates } from "@/lib/cola-logic";
