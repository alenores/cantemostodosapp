import type { CancionInput } from "@/lib/cola-logic";
import type { ColaIndividualItem, EstadoCola } from "@/types";

/** Item de cola en memoria para invitados (sin user_id ni created_at). */
export type GuestColaItem = Omit<
  ColaIndividualItem,
  "user_id" | "created_at"
>;

let nextGuestId = -1;

function nextId(): number {
  nextGuestId -= 1;
  return nextGuestId;
}

function createItem(
  cancion: CancionInput,
  estado: EstadoCola,
  orden: number,
): GuestColaItem {
  return {
    id: nextId(),
    nombre: cancion.nombre.trim(),
    artista: cancion.artista?.trim() || null,
    url_letra: cancion.url_letra ?? null,
    letra_texto: cancion.letra_texto ?? null,
    estado,
    orden,
  };
}

function maxOrden(items: GuestColaItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.orden), -1);
}

function sameCancion(a: GuestColaItem, cancion: CancionInput): boolean {
  return (
    a.nombre === cancion.nombre.trim() &&
    (a.url_letra ?? "") === (cancion.url_letra ?? "")
  );
}

export function colaHasActivaOPendiente(items: GuestColaItem[]): boolean {
  return items.some(
    (item) => item.estado === "activa" || item.estado === "pendiente",
  );
}

export function deriveCancionActivaFromGuestCola(items: GuestColaItem[]) {
  const activa = items.find((item) => item.estado === "activa");

  if (!activa) {
    return null;
  }

  return {
    nombre: activa.nombre,
    artista: activa.artista,
    url_letra: activa.url_letra ?? "",
    letra_texto: activa.letra_texto ?? null,
  };
}

/** Ver ahora: muestra la canción como activa (la activa anterior pasa a tocada). */
export function verAhoraGuestCola(
  items: GuestColaItem[],
  cancion: CancionInput,
): GuestColaItem[] {
  const activa = items.find((item) => item.estado === "activa");

  if (activa && sameCancion(activa, cancion)) {
    return items;
  }

  const demoted = items.map((item) =>
    item.estado === "activa" ? { ...item, estado: "tocada" as const } : item,
  );

  return [...demoted, createItem(cancion, "activa", maxOrden(items) + 1)];
}

/** Agregar a la lista como pendiente (requiere activa o pendiente previa). */
export function agregarGuestCola(
  items: GuestColaItem[],
  cancion: CancionInput,
): GuestColaItem[] {
  if (!colaHasActivaOPendiente(items)) {
    return verAhoraGuestCola(items, cancion);
  }

  const tieneActiva = items.some((item) => item.estado === "activa");
  const estado: EstadoCola = tieneActiva ? "pendiente" : "activa";

  return [...items, createItem(cancion, estado, maxOrden(items) + 1)];
}

export function avanzarGuestCola(items: GuestColaItem[]): GuestColaItem[] {
  const activa = items.find((item) => item.estado === "activa");

  if (!activa) {
    return items;
  }

  const primerPendiente = items
    .filter((item) => item.estado === "pendiente")
    .sort((a, b) => a.orden - b.orden)[0];

  if (!primerPendiente) {
    return items;
  }

  const tocadas = items
    .filter((item) => item.estado === "tocada")
    .sort((a, b) => a.orden - b.orden);

  let next = items.map((item) => {
    if (item.id === activa.id) {
      return { ...item, estado: "tocada" as const };
    }

    if (item.id === primerPendiente.id) {
      return { ...item, estado: "activa" as const };
    }

    return item;
  });

  if (tocadas.length >= 2) {
    const oldest = tocadas[0];
    next = next.map((item) =>
      item.id === oldest.id
        ? { ...item, estado: "pendiente" as const, orden: maxOrden(next) + 1 }
        : item,
    );
  }

  return next;
}

export function activarGuestColaItem(
  items: GuestColaItem[],
  itemId: number,
): GuestColaItem[] {
  const target = items.find((item) => item.id === itemId);

  if (!target || target.estado === "activa") {
    return items;
  }

  const demoted = items.map((item) =>
    item.estado === "activa" ? { ...item, estado: "tocada" as const } : item,
  );

  return demoted.map((item) =>
    item.id === itemId ? { ...item, estado: "activa" as const } : item,
  );
}

export function deleteGuestColaItem(
  items: GuestColaItem[],
  itemId: number,
): GuestColaItem[] {
  return items.filter((item) => item.id !== itemId);
}

export function vaciarGuestCola(): GuestColaItem[] {
  return [];
}

export function volverAPendienteGuestCola(
  items: GuestColaItem[],
  itemId: number,
): GuestColaItem[] {
  const item = items.find((colaItem) => colaItem.id === itemId);

  if (!item || item.estado !== "tocada") {
    return items;
  }

  return items.map((colaItem) =>
    colaItem.id === itemId
      ? {
          ...colaItem,
          estado: "pendiente" as const,
          orden: maxOrden(items) + 1,
        }
      : colaItem,
  );
}

export function reorderGuestColaPendientes(
  items: GuestColaItem[],
  activeId: number,
  overId: number,
): GuestColaItem[] {
  const pendientes = items
    .filter((item) => item.estado === "pendiente")
    .sort((a, b) => a.orden - b.orden);

  const activeIndex = pendientes.findIndex((item) => item.id === activeId);
  const overIndex = pendientes.findIndex((item) => item.id === overId);

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return items;
  }

  const reordered = [...pendientes];
  const [moved] = reordered.splice(activeIndex, 1);
  reordered.splice(overIndex, 0, moved);

  const anchorOrden = Math.max(
    0,
    ...items
      .filter((item) => item.estado !== "pendiente")
      .map((item) => item.orden),
  );

  const ordenMap = new Map(
    reordered.map((item, index) => [item.id, anchorOrden + index + 1]),
  );

  return items.map((item) =>
    ordenMap.has(item.id) ? { ...item, orden: ordenMap.get(item.id)! } : item,
  );
}
