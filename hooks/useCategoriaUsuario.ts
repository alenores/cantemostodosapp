"use client";

import { getActiveUserId } from "@/lib/auth/offline-user";
import { createClient } from "@/lib/supabase/client";
import {
  leerCategoriaGuardada,
  obtenerCategoriaUsuario,
  olvidarCategoriaRecordada,
  recordarCategoriaEnCookie,
  type CategoriaUsuario,
} from "@/lib/usuarios-categorias";
import { useEffect, useMemo, useState } from "react";

/**
 * Categoría de la cuenta activa (dueño / amigos / público). `null` mientras
 * carga, sin sesión o si todavía no se conoce.
 */
export function useCategoriaUsuario(): CategoriaUsuario | null {
  const supabase = useMemo(() => createClient(), []);
  const [categoria, setCategoria] = useState<CategoriaUsuario | null>(null);

  useEffect(() => {
    let active = true;
    let version = 0;

    async function cargar(refrescar = false) {
      const current = ++version;
      const userId = await getActiveUserId(supabase);
      if (!active || current !== version) return;
      if (!userId) {
        setCategoria(null);
        return;
      }

      const conocida = leerCategoriaGuardada(userId);
      if (conocida && !refrescar) {
        recordarCategoriaEnCookie(userId, conocida);
        setCategoria(conocida);
        return;
      }

      const actual = await obtenerCategoriaUsuario(supabase, userId, { refrescar });
      if (active && current === version) setCategoria(actual);
    }

    void cargar().catch(() => {});
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // Fuera del callback: consultar la sesión dentro de él puede trabar Supabase.
      if (event === "SIGNED_OUT") {
        olvidarCategoriaRecordada();
        window.setTimeout(() => void cargar().catch(() => {}), 0);
        return;
      }
      if (event === "SIGNED_IN") {
        window.setTimeout(() => void cargar(true).catch(() => {}), 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return categoria;
}
