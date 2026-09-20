"use client";

import { useStartNavigation } from "@/components/ui/NavigationProgress";
import { isOfflineNavigableRoute } from "@/lib/offline/offline-routes";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useNavigateWithProgress() {
  const router = useRouter();
  const startNavigation = useStartNavigation();

  return useCallback(
    (href: string) => {
      startNavigation();

      if (!navigator.onLine && isOfflineNavigableRoute(href)) {
        window.location.assign(href);
        return;
      }

      router.push(href);
    },
    [router, startNavigation],
  );
}
