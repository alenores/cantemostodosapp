"use client";

import { dispatchCancioneroSyncFinished } from "@/lib/offline/cancionero-events";
import { syncCancioneroLocal } from "@/lib/offline/cancionero-sync";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef } from "react";

async function runCancioneroSync(): Promise<void> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return;
  }

  try {
    const result = await syncCancioneroLocal(supabase);

    if (result.status === "synced") {
      console.info(
        `[cancionero-sync] Copia local actualizada (${result.count} canciones)`,
      );
    }
  } finally {
    dispatchCancioneroSyncFinished();
  }
}

export function useCancioneroSync(): void {
  const syncingRef = useRef(false);

  useEffect(() => {
    async function syncSafely() {
      if (syncingRef.current || !navigator.onLine) {
        return;
      }

      syncingRef.current = true;

      try {
        await runCancioneroSync();
      } catch (error) {
        console.warn("[cancionero-sync] Error al sincronizar:", error);
      } finally {
        syncingRef.current = false;
      }
    }

    void syncSafely();

    function handleOnline() {
      void syncSafely();
    }

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);
}
