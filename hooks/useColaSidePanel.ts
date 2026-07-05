"use client";

import { DESKTOP_MIN_WIDTH_PX } from "@/lib/app-layout";
import { useEffect, useState } from "react";

/** true cuando la fila se muestra como panel lateral fijo (lg+, alineado al sidebar). */
export function useColaSidePanel(
  minWidth = DESKTOP_MIN_WIDTH_PX,
): boolean {
  const [sidePanel, setSidePanel] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`);

    function update() {
      setSidePanel(mediaQuery.matches);
    }

    update();
    mediaQuery.addEventListener("change", update);

    return () => {
      mediaQuery.removeEventListener("change", update);
    };
  }, [minWidth]);

  return sidePanel;
}
