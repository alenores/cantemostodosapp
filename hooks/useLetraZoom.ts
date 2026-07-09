"use client";

import {
  clampLetraZoomLevel,
  getLetraZoomFactor,
  LETRA_ZOOM_DEFAULT_LEVEL,
  type LetraZoomLevel,
} from "@/lib/letra-zoom";
import { triggerHaptic } from "@/lib/haptic";
import { useCallback, useEffect, useState } from "react";

export function useLetraZoom(contentKey: string | null) {
  const [level, setLevel] = useState<LetraZoomLevel>(LETRA_ZOOM_DEFAULT_LEVEL);

  useEffect(() => {
    setLevel(LETRA_ZOOM_DEFAULT_LEVEL);
  }, [contentKey]);

  const decrease = useCallback(() => {
    setLevel((current) => {
      const next = clampLetraZoomLevel(current - 1);

      if (next !== current) {
        triggerHaptic();
      }

      return next;
    });
  }, []);

  const increase = useCallback(() => {
    setLevel((current) => {
      const next = clampLetraZoomLevel(current + 1);

      if (next !== current) {
        triggerHaptic();
      }

      return next;
    });
  }, []);

  return {
    level,
    factor: getLetraZoomFactor(level),
    decrease,
    increase,
  };
}
