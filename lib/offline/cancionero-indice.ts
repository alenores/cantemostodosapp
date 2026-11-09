import type {
  CancioneroIndiceRecord,
  CancioneroLocalMeta,
  CancioneroLocalRecord,
} from "@/lib/offline/offline-db";

export function fechaIsoCancionero(value: string | null | undefined): string | null {
  if (!value) return null;
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? null : time.toISOString();
}

/** Las copias antiguas pueden tener la fecha correcta pero solo la letra. */
export function cancionLocalEstaCompleta(local: CancioneroLocalRecord): boolean {
  if (typeof local.tiene_cifrado_avanzado !== "boolean") return false;
  if (local.artista_id === undefined) return false;
  if (local.cifrado === undefined || local.compas_config === undefined) return false;
  if (!local.tiene_cifrado_avanzado) return true;
  // Edición avanzada: hace falta el objeto de acordes (puede estar vacío, no null).
  return local.cifrado !== null && Array.isArray(local.cifrado.acordes);
}

/** Lo único que la revisión necesita de cada canción. Sin letra ni acordes. */
export function filaIndiceCancion(local: CancioneroLocalRecord): CancioneroIndiceRecord {
  return {
    id: local.id,
    updated_at: local.updated_at,
    completa: cancionLocalEstaCompleta(local),
  };
}

/**
 * La lista chica sirve cuando ya se armó y hay una ficha por cada canción guardada.
 * Si no, hay que armarla de nuevo: no se puede dar por al día un celular a medias.
 */
export function indiceSirve(
  indiceListo: boolean,
  indiceCount: number,
  cancionesCount: number,
): boolean {
  return indiceListo && indiceCount === cancionesCount;
}

export function faltaDescargarCancion(
  remote: { updated_at: string },
  local?: Pick<CancioneroIndiceRecord, "updated_at" | "completa">,
): boolean {
  return !local
    || fechaIsoCancionero(remote.updated_at) !== fechaIsoCancionero(local.updated_at)
    || !local.completa;
}

type SnapshotRevision = { count: number; maxUpdatedAt: string | null };

export function revisionYaEstaAlDia(
  meta: CancioneroLocalMeta,
  snapshot: SnapshotRevision,
  indice: Pick<CancioneroIndiceRecord, "completa">[],
  contentVersionEsperada: number,
): boolean {
  return Boolean(meta.syncedAt)
    && meta.contentVersion === contentVersionEsperada
    && meta.lastRemoteCount === snapshot.count
    && indice.length === snapshot.count
    && fechaIsoCancionero(meta.lastRemoteUpdatedAt) === snapshot.maxUpdatedAt
    && indice.every((row) => row.completa);
}

export type ClaseRevision = "reconstruir" | "al-dia" | "comparar";

export function claseDeRevision(entrada: {
  indiceListo: boolean;
  cancionesCount: number;
  indice: CancioneroIndiceRecord[];
  meta: CancioneroLocalMeta;
  snapshot: SnapshotRevision;
  contentVersionEsperada: number;
}): ClaseRevision {
  if (!indiceSirve(entrada.indiceListo, entrada.indice.length, entrada.cancionesCount)) {
    return "reconstruir";
  }
  if (revisionYaEstaAlDia(
    entrada.meta,
    entrada.snapshot,
    entrada.indice,
    entrada.contentVersionEsperada,
  )) {
    return "al-dia";
  }
  return "comparar";
}
