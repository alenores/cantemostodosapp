import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { EstadoCola, Sala, UsuarioActivo } from "@/types";

export const OFFLINE_DB_NAME = "cantemostodos-offline";
export const OFFLINE_DB_VERSION = 3;

export type CancioneroLocalRecord = {
  id: number;
  nombre: string;
  artista: string | null;
  letra: string | null;
  url_letra: string;
  updated_at: string;
  tiene_cifrado_avanzado?: boolean;
  user_id?: string | null;
};

export type CancioneroLocalMeta = {
  lastRemoteUpdatedAt: string | null;
  lastRemoteCount: number;
  syncedAt: string | null;
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
      },
    });
  }

  return dbPromise;
}
