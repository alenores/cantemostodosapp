"use client";

import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { useEffect } from "react";

export default function DesktopHomeRedirect() {
  const isDesktop = useIsDesktop();
  const navigateWithProgress = useNavigateWithProgress();

  useEffect(() => {
    if (isDesktop) {
      navigateWithProgress("/individual");
    }
  }, [isDesktop, navigateWithProgress]);

  return null;
}
