"use client";

import {
  getAliasBusqueda,
  recargarAliasBusqueda,
  suscribirAliasBusqueda,
  type AliasBusqueda,
} from "@/lib/artistas-alias-busqueda";
import { hayConexion } from "@/lib/conexion";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useSyncExternalStore } from "react";

const SIN_ALIAS: AliasBusqueda = new Map();
let cargaPedida = false;

/** Otros nombres de artistas para filtrar búsquedas; se actualiza una vez por sesión. */
export function useAliasBusqueda(): AliasBusqueda {
  const alias = useSyncExternalStore(
    suscribirAliasBusqueda,
    getAliasBusqueda,
    () => SIN_ALIAS,
  );

  useEffect(() => {
    if (cargaPedida || !hayConexion()) return;
    cargaPedida = true;
    void recargarAliasBusqueda(createClient());
  }, []);

  return alias;
}
