"use client";

import { warmOfflineCache } from "@/lib/offline/warm-offline-cache";
import { useEffect } from "react";

export default function OfflineWarmRunner() {
  useEffect(() => {
    void warmOfflineCache();

    function handleInstalled() {
      void warmOfflineCache();
    }

    function handleVisible() {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void warmOfflineCache();
      }
    }

    window.addEventListener("appinstalled", handleInstalled);
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      window.removeEventListener("appinstalled", handleInstalled);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, []);

  return null;
}
