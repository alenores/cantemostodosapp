"use client";

import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import { useEffect } from "react";

/** Evita que el scroll del documento se mueva detrás de overlays modales. */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return;
    }

    return acquireBodyScrollLock();
  }, [locked]);
}
