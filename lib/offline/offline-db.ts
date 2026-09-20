import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { EstadoCola, Sala, UsuarioActivo } from "@/types";
import type { CifradoData, CompasConfig, NotaIndex } from "@/lib/cifrado";
import type { ModoTonal } from "@/lib/cifrado-escala";
import type { Anotacion } from "@/lib/anotaciones-practica";

export const OFFLINE_DB_NAME = "cantemostodos-offline";
export const OFFLINE_DB_VERSION = 4;

export type CancioneroLocalRecord = {
  id: number;
  nombre: string;
  artista: string | null;
  letra: string | null;
  url_letra: string;
  updated_at: string;
  tiene_cifrado_avanzado?: boolean;
  user_id?: string | null;
  cifrado?: CifradoData | null;
  compas_config?: CompasConfig | null;
  tonalidad_default?: NotaIndex | null;
  modo_tonal_default?: ModoTonal | null;
  bpm_default?: number | null;
};

export type CancioneroLocalMeta = {
  lastRemoteUpdatedAt: string | null;
  lastRemoteCount: number;
  syncedAt: string | null;
  contentVersion: number;
};

export type ColaLocalRecord = {
  localId: number;
  salaId: number;
  nombre: string;
  artista: string | null;
  url_letra: string;
  letra_texto: string | null;
  estado: EstadoCola;
  orden: number;
};

type MetaRow = CancioneroLocalMeta & { id: "sync" };

export type AppSnapshotRecord = {
  id: "current";
  usuario: UsuarioActivo;
  salas: Pick<Sala, "id" | "nombre" | "descripcion" | "avatar_url">[];
  cancioneroTotal?: number;
  savedAt: string;
};

export type CancionPracticaLocalRecord = {
  local_key: string;
  local_id: number;
  remote_id: number | null;
  owner_user_id: string;
  origen_cancion_id: number | null;
  nombre: string;
  artista: string | null;
  letra: string | null;
  cifrado: CifradoData | null;
  compas_config: CompasConfig | null;
  tonalidad_default: NotaIndex | null;
  modo_tonal_default: ModoTonal;
  bpm_default: number | null;
  tiene_cifrado_avanzado: boolean;
  nota_general: string | null;
  anotaciones: Anotacion[];
  dominio: "no_visto" | "practicando" | "dominado" | null;
  created_at: string;
  updated_at: string;
  remote_updated_at: string | null;
  sync_state: "synced" | "pending-upsert" | "pending-delete";
};

export interface OfflineDB extends DBSchema {
  canciones: {
    key: number;
    value: CancioneroLocalRecord;
    indexes: { "by-nombre": string };
  };
  meta: {
    key: "sync";
    value: MetaRow;
  };
  cola_local: {
    key: number;
    value: ColaLocalRecord;
    indexes: { "by-sala": number };
  };
  app_snapshot: {
    key: "current";
    value: AppSnapshotRecord;
  };
  canciones_practica: {
    key: string;
    value: CancionPracticaLocalRecord;
    indexes: { "by-user": string };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

export function isOfflineBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

export function getOfflineDb(): Promise<IDBPDatabase<OfflineDB>> {
  if (!isOfflineBrowser()) {
    return Promise.reject(new Error("IndexedDB no disponible fuera del navegador"));
  }

  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const canciones = db.createObjectStore("canciones", { keyPath: "id" });
          canciones.createIndex("by-nombre", "nombre");
          db.createObjectStore("meta", { keyPath: "id" });
        }

        if (oldVersion < 2 && !db.objectStoreNames.contains("cola_local")) {
          const colaLocal = db.createObjectStore("cola_local", {
            keyPath: "localId",
          });
          colaLocal.createIndex("by-sala", "salaId");
        }

        if (oldVersion < 3 && !db.objectStoreNames.contains("app_snapshot")) {
          db.createObjectStore("app_snapshot", { keyPath: "id" });
        }

        if (oldVersion < 4 && !db.objectStoreNames.contains("canciones_practica")) {
          const practica = db.createObjectStore("canciones_practica", {
            keyPath: "local_key",
          });
          practica.createIndex("by-user", "owner_user_id");
        }
      },
    });
  }

  return dbPromise;
}
