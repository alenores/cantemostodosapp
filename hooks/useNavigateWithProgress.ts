"use client";

import { useStartNavigation } from "@/components/ui/NavigationProgress";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useNavigateWithProgress() {
  const router = useRouter();
  const startNavigation = useStartNavigation();

  return useCallback(
    (href: string) => {
      startNavigation();
      router.push(href);
    },
    [router, startNavigation],
  );
}
