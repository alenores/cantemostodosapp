"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  CANCIONERO_TOTAL_EVENT,
  guardarTotalCancionero,
  leerTotalCancionero,
} from "@/lib/cancionero-total";
import { getCancioneroLocalMeta } from "@/lib/offline/cancionero-store";

function seguirTotal(avisar: () => void) {
  window.addEventListener(CANCIONERO_TOTAL_EVENT, avisar);
  return () => window.removeEventListener(CANCIONERO_TOTAL_EVENT, avisar);
}

/** La última cantidad guardada. No pide internet. */
export function useTotalCancionero(): number | null {
  const total = useSyncExternalStore(seguirTotal, leerTotalCancionero, () => null);

  useEffect(() => {
    if (leerTotalCancionero() != null) return;
    void getCancioneroLocalMeta()
      .then((meta) => guardarTotalCancionero(meta.lastRemoteCount))
      .catch(() => {});
  }, []);

  return total;
}
