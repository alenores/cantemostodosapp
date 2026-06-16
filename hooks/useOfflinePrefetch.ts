"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OFFLINE_PREFETCH_ROUTES } from "@/lib/offline/offline-routes";
import { warmOfflineCache } from "@/lib/offline/warm-offline-cache";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useOfflinePrefetch(): void {
  const online = useOnlineStatus();
  const router = useRouter();

  useEffect(() => {
    if (!online) {
      return;
    }

    void warmOfflineCache();

    for (const route of OFFLINE_PREFETCH_ROUTES) {
      router.prefetch(route);
    }
  }, [online, router]);
}
