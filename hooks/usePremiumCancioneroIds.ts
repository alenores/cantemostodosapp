"use client";

import { CANCIONERO_SYNC_EVENT } from "@/lib/offline/cancionero-events";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import { useCallback, useEffect, useState } from "react";

export function usePremiumCancioneroIds(): ReadonlySet<number> {
  const [premiumIds, setPremiumIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const refresh = useCallback(async () => {
    const canciones = await getCancioneroLocalAsCancionero();
    setPremiumIds(
      new Set(
        canciones
          .filter((cancion) => cancion.tiene_cifrado_avanzado)
          .map((cancion) => cancion.id),
      ),
    );
  }, []);

  useEffect(() => {
    void refresh();

    function handleSyncFinished() {
      void refresh();
    }

    window.addEventListener(CANCIONERO_SYNC_EVENT, handleSyncFinished);

    return () => {
      window.removeEventListener(CANCIONERO_SYNC_EVENT, handleSyncFinished);
    };
  }, [refresh]);

  return premiumIds;
}
