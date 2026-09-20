"use client";

import { rememberActiveUserForOffline } from "@/lib/auth/offline-user";
import { getMisCanciones } from "@/lib/mis-canciones";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo } from "react";

export default function MisCancionesSyncRunner() {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (cancelled || !navigator.onLine) return;
      try {
        await rememberActiveUserForOffline(supabase);
        await getMisCanciones(supabase);
      } catch {
        // La copia anterior sigue disponible si falla una sincronización.
      }
    }

    void sync();
    window.addEventListener("online", sync);

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        window.setTimeout(() => void sync(), 0);
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener("online", sync);
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  return null;
}
