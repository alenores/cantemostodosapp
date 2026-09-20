"use client";

import { syncCancionesPractica } from "@/lib/canciones-practica";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

/** Descarga la práctica privada y envía cambios locales al volver la conexión. */
export default function CancionesPracticaSyncRunner() {
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function scheduleSync() {
      if (!navigator.onLine) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void syncCancionesPractica(supabase).catch(() => undefined);
      }, 350);
    }

    scheduleSync();
    window.addEventListener("online", scheduleSync);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") scheduleSync();
    });

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("online", scheduleSync);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}

