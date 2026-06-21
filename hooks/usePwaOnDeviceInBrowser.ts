"use client";

import { useEffect, useState } from "react";
import { isStandaloneMode } from "@/lib/pwa-platform";
import {
  getInstallFeedbackRemainingMs,
  resolvePwaOnDeviceInBrowser,
  subscribePwaOnDeviceInBrowser,
} from "@/lib/pwa-on-device";

export function usePwaOnDeviceInBrowser(isInstalledMode: boolean) {
  const [pwaOnDeviceInBrowser, setPwaOnDeviceInBrowser] = useState<boolean | null>(
    () => {
      if (typeof window === "undefined" || isInstalledMode || isStandaloneMode()) {
        return false;
      }
      return null;
    },
  );

  useEffect(() => {
    if (isInstalledMode) {
      setPwaOnDeviceInBrowser(false);
      return;
    }

    let cancelled = false;
    let cooldownTimer: number | undefined;

    const refresh = () => {
      void resolvePwaOnDeviceInBrowser().then((result) => {
        if (cancelled) return;
        setPwaOnDeviceInBrowser(result);

        if (cooldownTimer !== undefined) {
          window.clearTimeout(cooldownTimer);
          cooldownTimer = undefined;
        }

        const remaining = getInstallFeedbackRemainingMs();
        if (remaining > 0) {
          cooldownTimer = window.setTimeout(refresh, remaining + 32);
        }
      });
    };

    refresh();
    const unsubscribe = subscribePwaOnDeviceInBrowser(refresh);

    return () => {
      cancelled = true;
      unsubscribe();
      if (cooldownTimer !== undefined) {
        window.clearTimeout(cooldownTimer);
      }
    };
  }, [isInstalledMode]);

  return pwaOnDeviceInBrowser;
}
