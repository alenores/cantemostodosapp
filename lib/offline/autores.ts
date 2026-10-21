import { EVENTO_CONEXION, hayConexion } from "@/lib/conexion";
import {
  getOfflineDb,
  isOfflineBrowser,
  type AutorLocalRecord,
} from "@/lib/offline/offline-db";
import { createClient } from "@/lib/supabase/client";

/**
 * Nombre y foto de quien cargó, validó o sumó una canción.
 * Las canciones guardan solo el id del usuario; el nombre y la foto viven en `perfiles_publicos`
 * y en el celular en una lista aparte (`autores`). Cambiar la foto actualiza esta lista,
 * nunca las canciones: el Cancionero descargado no se vuelve a bajar.
 *
 * Con señal, cada usuario se pide una vez por apertura de la app (así llega una foto nueva);
 * sin señal se usa lo guardado.
 */

export type Autor = Pick<AutorLocalRecord, "id" | "nombre" | "avatar_url">;

const LOTE = 100;

const autores = new Map<string, AutorLocalRecord>();
const pedidosEnEstaApertura = new Set<string>();
const pendientes = new Set<string>();
const oyentes = new Set<() => void>();
let version = 0;
let cargaLocal: Promise<void> | null = null;
let temporizador: ReturnType<typeof setTimeout> | null = null;
let escuchandoConexion = false;

function avisar() {
  version += 1;
  for (const oyente of oyentes) oyente();
}

function cargarLocal(): Promise<void> {
  if (cargaLocal) return cargaLocal;
  cargaLocal = (async () => {
    if (!isOfflineBrowser()) return;
    try {
      const db = await getOfflineDb();
      const filas = await db.getAll("autores");
      let cambio = false;
      for (const fila of filas) {
        if (!autores.has(fila.id)) {
          autores.set(fila.id, fila);
          cambio = true;
        }
      }
      if (cambio) avisar();
    } catch {
      // Sin la lista guardada, las tarjetas muestran iniciales hasta que llegue la señal.
    }
  })();
  return cargaLocal;
}

async function guardarLocal(filas: AutorLocalRecord[]) {
  if (!isOfflineBrowser() || filas.length === 0) return;
  const db = await getOfflineDb();
  const tx = db.transaction("autores", "readwrite");
  for (const fila of filas) await tx.store.put(fila);
  await tx.done;
}

async function traer(ids: string[]) {
  const supabase = createClient();
  const nuevos: AutorLocalRecord[] = [];
  for (let desde = 0; desde < ids.length; desde += LOTE) {
    const lote = ids.slice(desde, desde + LOTE);
    const { data, error } = await supabase
      .from("perfiles_publicos")
      .select("id, nombre, avatar_url, updated_at")
      .in("id", lote);
    if (error) throw error;
    for (const id of lote) pedidosEnEstaApertura.add(id);
    for (const fila of data ?? []) {
      const actual = autores.get(fila.id);
      if (
        actual &&
        actual.nombre === fila.nombre &&
        actual.avatar_url === fila.avatar_url &&
        actual.updated_at === fila.updated_at
      ) {
        continue;
      }
      autores.set(fila.id, fila);
      nuevos.push(fila);
    }
  }
  if (nuevos.length > 0) {
    avisar();
    await guardarLocal(nuevos);
  }
}

function escucharConexion() {
  if (escuchandoConexion || typeof window === "undefined") return;
  escuchandoConexion = true;
  // Lo que quedó pendiente sin señal se pide al volver.
  window.addEventListener(EVENTO_CONEXION, programar);
  window.addEventListener("online", programar);
}

function programar() {
  if (temporizador || pendientes.size === 0) return;
  temporizador = setTimeout(() => {
    temporizador = null;
    void vaciarPendientes();
  }, 50);
}

async function vaciarPendientes() {
  await cargarLocal();
  if (!hayConexion() || pendientes.size === 0) return;
  const ids = [...pendientes];
  pendientes.clear();
  try {
    await traer(ids);
  } catch {
    // Quedan para el próximo intento con señal; mientras, se ve lo guardado.
    for (const id of ids) pendientes.add(id);
  }
}

/** Pide los usuarios que todavía no se consultaron en esta apertura. Sin red, quedan anotados. */
export function asegurarAutores(ids: Iterable<string | null | undefined>): void {
  if (typeof window === "undefined") return;
  escucharConexion();
  void cargarLocal();
  for (const id of ids) {
    if (id && !pedidosEnEstaApertura.has(id)) pendientes.add(id);
  }
  programar();
}

/** Vuelve a pedir un usuario aunque ya se haya consultado (ej.: después de cambiar el perfil). */
export async function refrescarAutor(id: string): Promise<void> {
  pedidosEnEstaApertura.delete(id);
  pendientes.delete(id);
  if (!hayConexion()) {
    pendientes.add(id);
    return;
  }
  try {
    await traer([id]);
  } catch {
    pendientes.add(id);
  }
}

export function getAutor(id: string | null | undefined): Autor | null {
  if (!id) return null;
  return autores.get(id) ?? null;
}

export function suscribirAutores(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function versionAutores(): number {
  return version;
}
