"use client";

import { getActiveUserId } from "@/lib/auth/offline-user";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

/**
 * ¿Hay una cuenta activa? `null` mientras se averigua; `false` para invitados.
 * Sin señal usa la última cuenta recordada, igual que el resto de la app.
 */
export function useHaySesion(): boolean | null {
  const supabase = useMemo(() => createClient(), []);
  const [haySesion, setHaySesion] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    function cargar() {
      void getActiveUserId(supabase)
        .then((userId) => {
          if (active) setHaySesion(userId !== null);
        })
        .catch(() => {});
    }

    cargar();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // Fuera del callback: consultar la sesión dentro de él puede trabar Supabase.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        window.setTimeout(cargar, 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return haySesion;
}
