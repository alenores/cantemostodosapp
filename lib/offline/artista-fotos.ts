import type { Artista } from "@/types";
import {
  getOfflineDb,
  isOfflineBrowser,
  type ArtistaFotoLocalRecord,
} from "@/lib/offline/offline-db";
import type { SupabaseClient } from "@supabase/supabase-js";

export const ARTISTAS_FOTOS_EVENT = "artistas-fotos-guardadas";

const TAMANO_MAX = 128;
const EN_PARALELO = 6;

let enCurso: Promise<void> | null = null;

function avisar() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ARTISTAS_FOTOS_EVENT));
}

export async function leerArtistasFotos(): Promise<ArtistaFotoLocalRecord[]> {
  if (!isOfflineBrowser()) return [];
  const db = await getOfflineDb();
  return db.getAll("artistas_fotos");
}

/** Arma la lista que usa el cancionero. Las fotos salen de la copia guardada. */
export function artistasConFotoLocal(
  filas: ArtistaFotoLocalRecord[],
): { artistas: Artista[]; revoke: () => void } {
  const urls: string[] = [];
  const artistas = filas.map((fila) => {
    let avatar_url: string | null = null;
    if (fila.blob) {
      avatar_url = URL.createObjectURL(fila.blob);
      urls.push(avatar_url);
    }
    return { id: fila.id, nombre: fila.nombre, avatar_url };
  });
  return {
    artistas,
    revoke: () => {
      for (const url of urls) URL.revokeObjectURL(url);
    },
  };
}

async function traerArtistas(supabase: SupabaseClient): Promise<ArtistaFotoLocalRecord[]> {
  const filas: ArtistaFotoLocalRecord[] = [];
  const pagina = 500;
  for (let desde = 0; ; desde += pagina) {
    const { data, error } = await supabase
      .from("artistas")
      .select("id, nombre, avatar_url")
      .order("id", { ascending: true })
      .range(desde, desde + pagina - 1);
    if (error) throw error;
    const lote = data ?? [];
    filas.push(
      ...lote.map((fila) => ({
        id: fila.id,
        nombre: fila.nombre,
        avatar_url: fila.avatar_url,
        blob: null,
      })),
    );
    if (lote.length < pagina) break;
  }
  return filas;
}

async function achicar(blob: Blob): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return blob;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(blob);
    const lado = Math.max(bitmap.width, bitmap.height);
    if (lado <= TAMANO_MAX && blob.type === "image/webp") return blob;
    const escala = lado > TAMANO_MAX ? TAMANO_MAX / lado : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const chica = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.8);
    });
    return chica ?? blob;
  } catch {
    return blob;
  } finally {
    bitmap?.close();
  }
}

async function bajarFoto(url: string): Promise<Blob | null> {
  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) return null;
    const blob = await respuesta.blob();
    if (!blob.type.startsWith("image/")) return null;
    return achicar(blob);
  } catch {
    return null;
  }
}

async function guardarArtistasFotos(filas: ArtistaFotoLocalRecord[], borrar: string[]) {
  const db = await getOfflineDb();
  const tx = db.transaction("artistas_fotos", "readwrite");
  for (const fila of filas) await tx.store.put(fila);
  for (const id of borrar) await tx.store.delete(id);
  await tx.done;
}

async function sincronizar(supabase: SupabaseClient): Promise<void> {
  if (!isOfflineBrowser()) return;
  const [remotos, locales] = await Promise.all([
    traerArtistas(supabase),
    leerArtistasFotos(),
  ]);
  const localPorId = new Map(locales.map((fila) => [fila.id, fila]));
  const siguientes: ArtistaFotoLocalRecord[] = [];
  const pendientes: { indice: number; url: string }[] = [];

  for (const remoto of remotos) {
    const local = localPorId.get(remoto.id);
    const sirve =
      local &&
      !local.incompleta &&
      local.avatar_url === remoto.avatar_url &&
      (local.blob || !remoto.avatar_url);
    if (sirve) {
      siguientes.push({ ...local, nombre: remoto.nombre });
      continue;
    }
    if (!remoto.avatar_url) {
      siguientes.push({ ...remoto, blob: null, incompleta: false });
      continue;
    }
    const indice = siguientes.length;
    siguientes.push({
      id: remoto.id,
      nombre: remoto.nombre,
      avatar_url: local?.avatar_url ?? null,
      blob: local?.blob ?? null,
      incompleta: true,
    });
    pendientes.push({ indice, url: remoto.avatar_url });
  }

  for (let desde = 0; desde < pendientes.length; desde += EN_PARALELO) {
    const lote = pendientes.slice(desde, desde + EN_PARALELO);
    const fotos = await Promise.all(lote.map((item) => bajarFoto(item.url)));
    lote.forEach((item, i) => {
      const blob = fotos[i];
      if (!blob) return;
      siguientes[item.indice] = {
        ...siguientes[item.indice],
        avatar_url: item.url,
        blob,
        incompleta: false,
      };
    });
  }

  const idsRemotos = new Set(remotos.map((fila) => fila.id));
  const borrar = locales.filter((fila) => !idsRemotos.has(fila.id)).map((fila) => fila.id);
  const aGuardar = siguientes.filter((fila) => {
    const local = localPorId.get(fila.id);
    return (
      !local ||
      local.nombre !== fila.nombre ||
      local.avatar_url !== fila.avatar_url ||
      Boolean(local.incompleta) !== Boolean(fila.incompleta) ||
      local.blob !== fila.blob
    );
  });
  if (aGuardar.length === 0 && borrar.length === 0) return;

  await guardarArtistasFotos(aGuardar, borrar);
  avisar();
}

/** Baja las fotos que faltan o cambiaron. Si ya están, no vuelve a bajarlas. */
export function syncArtistaFotos(supabase: SupabaseClient): Promise<void> {
  if (enCurso) return enCurso;
  enCurso = sincronizar(supabase).finally(() => {
    enCurso = null;
  });
  return enCurso;
}
