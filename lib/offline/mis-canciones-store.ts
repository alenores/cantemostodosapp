import {
  getOfflineDb,
  isOfflineBrowser,
  type MiCancionLocalRecord,
} from "@/lib/offline/offline-db";
import type { UsuarioCancion } from "@/types";

function localKey(userId: string, id: number): string {
  return `${userId}:${id}`;
}

export async function getMisCancionesLocal(
  userId: string,
): Promise<UsuarioCancion[]> {
  if (!isOfflineBrowser()) return [];
  const db = await getOfflineDb();
  const rows = await db.getAllFromIndex("mis_canciones", "by-user", userId);
  return rows
    .map((row) => ({
      id: row.id,
      user_id: row.user_id,
      cancion_guardada_id: row.cancion_guardada_id,
      url_letra: row.url_letra,
      nombre: row.nombre,
      artista: row.artista,
      created_at: row.created_at,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export async function replaceMisCancionesLocal(
  userId: string,
  canciones: UsuarioCancion[],
): Promise<void> {
  if (!isOfflineBrowser()) return;
  const db = await getOfflineDb();
  const tx = db.transaction("mis_canciones", "readwrite");
  const store = tx.objectStore("mis_canciones");
  const existing = await store.index("by-user").getAllKeys(userId);

  await Promise.all(existing.map((key) => store.delete(key)));

  for (const cancion of canciones) {
    const record: MiCancionLocalRecord = {
      ...cancion,
      local_key: localKey(userId, cancion.id),
      owner_user_id: userId,
    };
    await store.put(record);
  }

  await tx.done;
}

export async function putMiCancionLocal(
  userId: string,
  cancion: UsuarioCancion,
): Promise<void> {
  if (!isOfflineBrowser()) return;
  const db = await getOfflineDb();
  await db.put("mis_canciones", {
    ...cancion,
    local_key: localKey(userId, cancion.id),
    owner_user_id: userId,
  });
}

export async function deleteMiCancionLocal(
  userId: string,
  id: number,
): Promise<void> {
  if (!isOfflineBrowser()) return;
  const db = await getOfflineDb();
  await db.delete("mis_canciones", localKey(userId, id));
}
