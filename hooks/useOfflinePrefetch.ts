"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OFFLINE_PREFETCH_ROUTES } from "@/lib/offline/offline-routes";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useOfflinePrefetch(): void {
  const online = useOnlineStatus();
  const router = useRouter();

  useEffect(() => {
    if (!online) {
      return;
    }

    for (const route of OFFLINE_PREFETCH_ROUTES) {
      router.prefetch(route);
    }

    for (const route of OFFLINE_PREFETCH_ROUTES) {
      void fetch(route, { credentials: "include" }).catch(() => {
        // El prefetch de Next + SW cubren la mayoría de casos.
      });
    }
  }, [online, router]);
}
