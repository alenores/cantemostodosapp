import type { ColaItem } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isMissingColumnError,
} from "@/lib/supabase/errors";
import {
  fetchColaAgregadoSnapshot,
  type ColaAgregadoSnapshot,
} from "@/lib/usuario";

export type CancionInput = {
  nombre: string;
  artista: string | null;
  url_letra: string;
  letra_texto?: string | null;
};

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

export function canSelectColaItem(item: ColaItem): boolean {
  return item.estado === "pendiente";
}

export type ColaItemActionId =
  | "activar"
  | "subir"
  | "bajar"
  | "proxima"
  | "fondo"
  | "eliminar";

function getPendientesOrdenados(items: ColaItem[]): ColaItem[] {
  return items.filter((item) => item.estado === "pendiente");
}

function getAnchorOrden(items: ColaItem[]): number {
  return Math.max(
    0,
    ...items
      .filter((item) => item.estado !== "pendiente")
      .map((item) => item.orden),
  );
}

function buildPendientesOrdenUpdates(
  items: ColaItem[],
  reorderedPendientes: ColaItem[],
): OrdenUpdate[] {
  const anchorOrden = getAnchorOrden(items);
  return reorderedPendientes.map((item, index) => ({
    id: item.id,
    orden: anchorOrden + index + 1,
  }));
}

export function applyOrdenUpdates(
  items: ColaItem[],
  updates: OrdenUpdate[],
): ColaItem[] {
  const ordenById = new Map(updates.map((update) => [update.id, update.orden]));

  return [...items]
    .map((item) => {
      const orden = ordenById.get(item.id);
      return orden === undefined ? item : { ...item, orden };
    })
    .sort((a, b) => a.orden - b.orden);
}

function reorderPendienteToIndex(
  items: ColaItem[],
  itemId: number,
  destinationIndex: number,
): OrdenUpdate[] | null {
  const pendientes = getPendientesOrdenados(items);
  const sourceIndex = pendientes.findIndex((item) => item.id === itemId);

  if (sourceIndex === -1 || sourceIndex === destinationIndex) {
    return null;
  }

  const reordered = [...pendientes];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(destinationIndex, 0, moved);

  return buildPendientesOrdenUpdates(items, reordered);
}

export function movePendienteUp(
  items: ColaItem[],
  itemId: number,
): OrdenUpdate[] | null {
  const pendientes = getPendientesOrdenados(items);
  const idx = pendientes.findIndex((item) => item.id === itemId);

  if (idx <= 0) {
    return null;
  }

  return reorderPendienteToIndex(items, itemId, idx - 1);
}

export function movePendienteDown(
  items: ColaItem[],
  itemId: number,
): OrdenUpdate[] | null {
  const pendientes = getPendientesOrdenados(items);
  const idx = pendientes.findIndex((item) => item.id === itemId);

  if (idx === -1 || idx >= pendientes.length - 1) {
    return null;
  }

  return reorderPendienteToIndex(items, itemId, idx + 1);
}

export function movePendienteToProxima(
  items: ColaItem[],
  itemId: number,
): OrdenUpdate[] | null {
  return reorderPendienteToIndex(items, itemId, 0);
}

export function movePendienteToBottom(
  items: ColaItem[],
  itemId: number,
): OrdenUpdate[] | null {
  const pendientes = getPendientesOrdenados(items);

  if (pendientes.length <= 1) {
    return null;
  }

  return reorderPendienteToIndex(items, itemId, pendientes.length - 1);
}

export function getColaItemActions(
  item: ColaItem,
  items: ColaItem[],
): ColaItemActionId[] {
  if (!canSelectColaItem(item)) {
    return [];
  }

  const variant = getColaVariant(item, items);
  const pendientes = getPendientesOrdenados(items);
  const idx = pendientes.findIndex((entry) => entry.id === item.id);
  const isLast = idx === pendientes.length - 1;

  const actions: ColaItemActionId[] = ["activar"];

  if (variant === "pendiente" && idx > 0) {
    actions.push("proxima", "subir");
  }

  if (!isLast) {
    actions.push("bajar", "fondo");
  }

  actions.push("eliminar");

  return actions;
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

export async function avanzarCancion(
  supabase: SupabaseClient,
  salaId: number,
  nuevoItemId: number,
): Promise<void> {
  const { data: nuevoItem, error: nuevoError } = await supabase
    .from("cola_juntada")
    .select("id, estado, sala_id")
    .eq("id", nuevoItemId)
    .single();

  if (
    nuevoError ||
    !nuevoItem ||
    nuevoItem.sala_id !== salaId ||
    nuevoItem.estado !== "pendiente"
  ) {
    throw new Error("La canción seleccionada no está disponible para activar.");
  }

  const { data: activaItems, error: activaError } = await supabase
    .from("cola_juntada")
    .select("id")
    .eq("sala_id", salaId)
    .eq("estado", "activa");

  if (activaError) {
    throw activaError;
  }

  const activa = activaItems?.[0];

  if (activa) {
    const { error } = await supabase
      .from("cola_juntada")
      .update({ estado: "tocada" })
      .eq("id", activa.id);

    if (error) {
      throw error;
    }
  }

  const { data: tocadas, error: tocadasError } = await supabase
    .from("cola_juntada")
    .select("id, orden")
    .eq("sala_id", salaId)
    .eq("estado", "tocada")
    .order("orden", { ascending: true });

  if (tocadasError) {
    throw tocadasError;
  }

  if (tocadas && tocadas.length > 2) {
    const oldest = tocadas[0];
    const { error } = await supabase
      .from("cola_juntada")
      .delete()
      .eq("id", oldest.id);

    if (error) {
      throw error;
    }
  }

  const { error: activarError } = await supabase
    .from("cola_juntada")
    .update({ estado: "activa" })
    .eq("id", nuevoItemId);

  if (activarError) {
    throw activarError;
  }

  // Ensure the newly active item is positioned right after the tocadas.
  // When the user picks a non-sequential song it keeps its original orden,
  // which leaves it visually below the pendientes that were in between.
  const { data: itemsAfterActivation } = await supabase
    .from("cola_juntada")
    .select("id, orden, estado")
    .eq("sala_id", salaId)
    .order("orden", { ascending: true });

  if (itemsAfterActivation && itemsAfterActivation.length > 0) {
    const tocadasFinal = itemsAfterActivation.filter(
      (i) => i.estado === "tocada",
    );
    const activaFinal = itemsAfterActivation.find((i) => i.id === nuevoItemId);
    const pendientesFinal = itemsAfterActivation
      .filter((i) => i.estado === "pendiente")
      .sort((a, b) => a.orden - b.orden);

    const anchorOrden =
      tocadasFinal.length > 0
        ? Math.max(...tocadasFinal.map((i) => i.orden))
        : 0;

    if (activaFinal && activaFinal.orden !== anchorOrden + 1) {
      const reorderUpdates: OrdenUpdate[] = [
        { id: nuevoItemId, orden: anchorOrden + 1 },
      ];
      let nextOrden = anchorOrden + 2;
      for (const item of pendientesFinal) {
        reorderUpdates.push({ id: item.id, orden: nextOrden++ });
      }
      await persistColaOrden(supabase, reorderUpdates);
    }
  }

  const { data: sesion, error: sesionError } = await supabase
    .from("sesion_sala")
    .select("id")
    .eq("sala_id", salaId)
    .maybeSingle();

  if (sesionError) {
    throw sesionError;
  }

  if (sesion) {
    const { error } = await supabase
      .from("sesion_sala")
      .update({
        cola_item_id: nuevoItemId,
        updated_at: new Date().toISOString(),
      })
      .eq("sala_id", salaId);

    if (error) {
      throw error;
    }

    return;
  }

  const { error: insertError } = await supabase.from("sesion_sala").insert({
    sala_id: salaId,
    cola_item_id: nuevoItemId,
  });

  if (insertError) {
    throw insertError;
  }
}

export async function finalizarCancionActiva(
  supabase: SupabaseClient,
  salaId: number,
): Promise<void> {
  const { data: pendiente, error: pendienteError } = await supabase
    .from("cola_juntada")
    .select("id")
    .eq("sala_id", salaId)
    .eq("estado", "pendiente")
    .order("orden", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pendienteError) {
    throw pendienteError;
  }

  if (pendiente) {
    await avanzarCancion(supabase, salaId, pendiente.id);
    return;
  }

  const { data: activaItems, error: activaError } = await supabase
    .from("cola_juntada")
    .select("id")
    .eq("sala_id", salaId)
    .eq("estado", "activa");

  if (activaError) {
    throw activaError;
  }

  const activa = activaItems?.[0];

  if (!activa) {
    return;
  }

  const { error: tocadaError } = await supabase
    .from("cola_juntada")
    .update({ estado: "tocada" })
    .eq("id", activa.id);

  if (tocadaError) {
    throw tocadaError;
  }

  const { data: tocadas, error: tocadasError } = await supabase
    .from("cola_juntada")
    .select("id, orden")
    .eq("sala_id", salaId)
    .eq("estado", "tocada")
    .order("orden", { ascending: true });

  if (tocadasError) {
    throw tocadasError;
  }

  if (tocadas && tocadas.length > 2) {
    const oldest = tocadas[0];
    const { error } = await supabase
      .from("cola_juntada")
      .delete()
      .eq("id", oldest.id);

    if (error) {
      throw error;
    }
  }

  const { data: sesion, error: sesionError } = await supabase
    .from("sesion_sala")
    .select("id")
    .eq("sala_id", salaId)
    .maybeSingle();

  if (sesionError) {
    throw sesionError;
  }

  if (!sesion) {
    return;
  }

  const { error: clearError } = await supabase
    .from("sesion_sala")
    .update({
      cola_item_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("sala_id", salaId);

  if (clearError) {
    throw clearError;
  }
}

type ColaInsertBase = {
  sala_id: number;
  nombre: string;
  artista: string | null;
  url_letra: string;
  estado: "pendiente";
  orden: number;
};

async function insertColaJuntadaRow(
  supabase: SupabaseClient,
  base: ColaInsertBase,
  options: {
    letraTexto: string | null;
    agregado: ColaAgregadoSnapshot | null;
  },
): Promise<void> {
  const variants: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  const pushVariant = (row: Record<string, unknown>) => {
    const cleaned = Object.fromEntries(
      Object.entries(row).filter(([, value]) => value !== undefined),
    );
    const key = JSON.stringify(cleaned);

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    variants.push(cleaned);
  };

  const { letraTexto, agregado } = options;

  if (agregado) {
    pushVariant({
      ...base,
      letra_texto: letraTexto,
      ...agregado,
    });
  }

  pushVariant({
    ...base,
    letra_texto: letraTexto,
  });

  if (agregado) {
    pushVariant({
      ...base,
      ...agregado,
    });
  }

  pushVariant({ ...base });

  let lastSchemaError: { message?: string; code?: string } | null = null;

  for (const row of variants) {
    const { error } = await supabase.from("cola_juntada").insert(row);

    if (!error) {
      return;
    }

    if (isMissingColumnError(error)) {
      lastSchemaError = error;
      continue;
    }

    throw error;
  }

  if (lastSchemaError) {
    throw lastSchemaError;
  }

  throw new Error("No se pudo agregar la canción a la cola.");
}

export async function agregarACola(
  supabase: SupabaseClient,
  salaId: number,
  cancion: CancionInput,
): Promise<void> {
  const urlLetra = cancion.url_letra.trim();

  if (!urlLetra) {
    throw new Error("La canción no tiene un link de letra válido.");
  }

  const { data: lastItem, error: lastError } = await supabase
    .from("cola_juntada")
    .select("orden")
    .eq("sala_id", salaId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError) {
    throw lastError;
  }

  const nextOrden = (lastItem?.orden ?? 0) + 1;
  const agregado = await fetchColaAgregadoSnapshot(supabase);
  const letraTexto = cancion.letra_texto?.trim() || null;

  await insertColaJuntadaRow(
    supabase,
    {
      sala_id: salaId,
      nombre: cancion.nombre.trim(),
      artista: cancion.artista?.trim() || null,
      url_letra: urlLetra,
      estado: "pendiente",
      orden: nextOrden,
    },
    {
      letraTexto,
      agregado,
    },
  );
}

export async function agregarAGuardadas(
  supabase: SupabaseClient,
  salaId: number,
  cancion: CancionInput,
): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from("canciones_guardadas")
    .select("id")
    .eq("sala_id", salaId)
    .eq("nombre", cancion.nombre)
    .eq("url_letra", cancion.url_letra)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return;
  }

  const { error } = await supabase.from("canciones_guardadas").insert({
    sala_id: salaId,
    nombre: cancion.nombre,
    artista: cancion.artista,
    url_letra: cancion.url_letra,
  });

  if (error) {
    throw error;
  }
}

export async function reorderColaByDrag(
  supabase: SupabaseClient,
  items: ColaItem[],
  activeId: number,
  overId: number,
): Promise<OrdenUpdate[]> {
  const pendientes = items
    .filter((item) => item.estado === "pendiente")
    .sort((a, b) => a.orden - b.orden);

  const activeIndex = pendientes.findIndex((item) => item.id === activeId);
  const overIndex = pendientes.findIndex((item) => item.id === overId);

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return [];
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

  const updates: OrdenUpdate[] = reordered.map((item, index) => ({
    id: item.id,
    orden: anchorOrden + index + 1,
  }));

  await persistColaOrden(supabase, updates);

  return updates;
}
