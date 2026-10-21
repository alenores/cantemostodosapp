"use client";

import {
  asegurarAutores,
  getAutor,
  suscribirAutores,
  versionAutores,
  type Autor,
} from "@/lib/offline/autores";
import { useEffect, useSyncExternalStore } from "react";

/** Nombre y foto actuales de un usuario, a partir de su id. */
export function useAutor(id: string | null | undefined): Autor | null {
  useSyncExternalStore(suscribirAutores, versionAutores, () => 0);

  useEffect(() => {
    if (id) asegurarAutores([id]);
  }, [id]);

  return getAutor(id);
}
