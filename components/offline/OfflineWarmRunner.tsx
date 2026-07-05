"use client";

import { warmOfflineCache } from "@/lib/offline/warm-offline-cache";
import { useEffect } from "react";

function scheduleIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 5000 });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(callback, 2000);
  return () => window.clearTimeout(id);
}

export default function OfflineWarmRunner() {
  useEffect(() => {
    const cancelWarm = scheduleIdle(() => {
      void warmOfflineCache();
    });

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
      cancelWarm();
      window.removeEventListener("appinstalled", handleInstalled);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, []);

  return null;
}
