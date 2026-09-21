"use client";

import { APP_READY_EVENT, SPLASH_MAX_VISIBLE_MS } from "@/lib/splash-theme";
import { useEffect } from "react";

/** Retira el skeleton inicial al estar lista la pantalla, sin espera mínima. */
export default function SplashScreen() {
  useEffect(() => {
    function dismiss() {
      const skeleton = document.getElementById("inline-splash");
      if (skeleton) {
        skeleton.style.display = "none";
        skeleton.setAttribute("aria-hidden", "true");
      }
      document.documentElement.classList.remove("splash-active");
    }
    window.addEventListener(APP_READY_EVENT, dismiss);
    if (document.documentElement.dataset.appReady === "true") dismiss();
    const timer = window.setTimeout(dismiss, SPLASH_MAX_VISIBLE_MS);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(APP_READY_EVENT, dismiss);
    };
  }, []);
  return null;
}
