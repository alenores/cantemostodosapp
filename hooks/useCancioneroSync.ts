"use client";

import { dispatchCancioneroSyncFinished } from "@/lib/offline/cancionero-events";
import { syncCancioneroLocal } from "@/lib/offline/cancionero-sync";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef } from "react";

async function runCancioneroSync(): Promise<void> {
  const supabase = createClient();

  try {
    const result = await syncCancioneroLocal(supabase);

    if (result.status === "synced") {
      console.info(
        `[cancionero-sync] Copia local actualizada (${result.count} canciones)`,
      );
    }
  } catch (error) {
    console.warn("[cancionero-sync] Error al sincronizar:", error);
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
