"use client";

import { useEffect, useState } from "react";

const DESKTOP_MIN_WIDTH_PX = 1024;

export function useIsDesktop(minWidth = DESKTOP_MIN_WIDTH_PX): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`);

    function update() {
      setIsDesktop(mediaQuery.matches);
    }

    update();
    mediaQuery.addEventListener("change", update);

    return () => {
      mediaQuery.removeEventListener("change", update);
    };
  }, [minWidth]);

  return isDesktop;
}
