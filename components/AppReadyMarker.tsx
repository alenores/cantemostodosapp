"use client";

import { markAppReady } from "@/lib/splash-theme";
import { useEffect } from "react";

/** Marca que la pantalla útil terminó de montarse (datos + UI). */
export default function AppReadyMarker() {
  useEffect(() => {
    markAppReady();
  }, []);

  return null;
}
