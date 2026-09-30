"use client";

import { useEffect, useRef } from "react";

const SWIPE_CLOSE_MIN_PX = 70;

/**
 * Cierra un panel al deslizar el dedo hacia abajo: desde la cabecera, o desde
 * la lista cuando ya está arriba de todo (sin nada más para scrollear).
 * El panel lleva `data-swipe-close-panel` y su lista `data-swipe-close-scroll`.
 * `isBlocked` evita cerrar mientras se arrastra una canción.
 */
export function useSwipeDownToClose(
  enabled: boolean,
  onClose: () => void,
  isBlocked?: () => boolean,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const isBlockedRef = useRef(isBlocked);
  isBlockedRef.current = isBlocked;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let startX = 0;
    let startY = 0;
    let tracking = false;

    function onTouchStart(event: TouchEvent) {
      tracking = false;
      if (event.touches.length !== 1) {
        return;
      }

      const target = event.target as Element | null;
      if (!target?.closest("[data-swipe-close-panel]")) {
        return;
      }

      const scroller = target.closest("[data-swipe-close-scroll]");
      if (scroller && scroller.scrollTop > 0) {
        return;
      }

      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      tracking = true;
    }

    function onTouchMove(event: TouchEvent) {
      if (!tracking) {
        return;
      }

      if (isBlockedRef.current?.()) {
        tracking = false;
        return;
      }

      const dy = event.touches[0].clientY - startY;
      const dx = event.touches[0].clientX - startX;

      if (dy < -10) {
        tracking = false;
        return;
      }

      if (dy >= SWIPE_CLOSE_MIN_PX && dy > Math.abs(dx) * 1.5) {
        tracking = false;
        onCloseRef.current();
      }
    }

    function onTouchEnd() {
      tracking = false;
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled]);
}
