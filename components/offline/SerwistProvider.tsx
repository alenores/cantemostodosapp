"use client";

import { hayConexion } from "@/lib/conexion";
import { warmOfflineCache } from "@/lib/offline/warm-offline-cache";
import { SerwistProvider as SerwistProviderBase } from "@serwist/turbopack/react";
import type { ReactNode } from "react";
import { useEffect } from "react";

type SerwistProviderProps = {
  children: ReactNode;
};

export default function SerwistProvider({ children }: SerwistProviderProps) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.ready.then((registration) => {
      if (process.env.NODE_ENV === "development") {
        void registration.update().catch(() => {});
      }
      if (hayConexion()) void warmOfflineCache();
    });
  }, []);

  return (
    <SerwistProviderBase swUrl="/serwist/sw.js">{children}</SerwistProviderBase>
  );
}
