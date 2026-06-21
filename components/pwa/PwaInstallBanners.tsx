"use client";

import AndroidInAppBrowserInstallHelp from "@/components/pwa/AndroidInAppBrowserInstallHelp";
import AndroidInstallHero from "@/components/pwa/AndroidInstallHero";
import AndroidOpenFromHomeHelp from "@/components/pwa/AndroidOpenFromHomeHelp";
import IosOpenFromHomeHelp from "@/components/pwa/IosOpenFromHomeHelp";
import IosPwaInstallHelp from "@/components/pwa/IosPwaInstallHelp";
import { usePwaOnDeviceInBrowser } from "@/hooks/usePwaOnDeviceInBrowser";
import {
  getPwaInstalledServerSnapshot,
  getPwaInstalledSnapshot,
  isIphoneForPwaInstall,
  isLikelyInAppBrowser,
  isMobileBrowser,
  isPwaInstalled,
  markPwaInstalled,
  subscribePwaInstalled,
} from "@/lib/pwa-platform";
import { useEffect, useState, useSyncExternalStore } from "react";

export default function PwaInstallBanners() {
  const isInstalledMode = useSyncExternalStore(
    subscribePwaInstalled,
    getPwaInstalledSnapshot,
    getPwaInstalledServerSnapshot,
  );
  const pwaOnDeviceInBrowser = usePwaOnDeviceInBrowser(isInstalledMode);
  const [installPlatform, setInstallPlatform] = useState<"iphone" | "android" | null>(
    () => {
      if (typeof window === "undefined") return null;
      if (isPwaInstalled()) return null;
      return isIphoneForPwaInstall() ? "iphone" : "android";
    },
  );
  const [isInAppBrowser, setIsInAppBrowser] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileBrowser());
  }, []);

  useEffect(() => {
    if (isInstalledMode) markPwaInstalled();
  }, [isInstalledMode]);

  useEffect(() => {
    if (isInstalledMode) {
      setInstallPlatform(null);
      return;
    }
    setInstallPlatform(isIphoneForPwaInstall() ? "iphone" : "android");
  }, [isInstalledMode]);

  useEffect(() => {
    setIsInAppBrowser(isLikelyInAppBrowser());
  }, []);

  if (!isMobile || isInstalledMode) {
    return null;
  }

  const showBrowserInstall = !isInstalledMode;
  const openFromHomeConfirmed = pwaOnDeviceInBrowser === true;
  const showOpenFromHomeHelp = showBrowserInstall && openFromHomeConfirmed;

  const showIosOpenFromHomeHelp =
    showOpenFromHomeHelp && installPlatform === "iphone";

  const showAndroidOpenFromHomeHelp =
    showOpenFromHomeHelp && installPlatform === "android";

  const showIosInstallHelp =
    showBrowserInstall &&
    installPlatform === "iphone" &&
    !openFromHomeConfirmed &&
    pwaOnDeviceInBrowser !== null;

  const showAndroidInstall =
    showBrowserInstall &&
    installPlatform === "android" &&
    isInAppBrowser === false &&
    !openFromHomeConfirmed &&
    pwaOnDeviceInBrowser !== null;

  const showAndroidInAppInstall =
    showBrowserInstall &&
    installPlatform === "android" &&
    isInAppBrowser === true &&
    !openFromHomeConfirmed &&
    pwaOnDeviceInBrowser !== null;

  if (pwaOnDeviceInBrowser === null && !showOpenFromHomeHelp) {
    return null;
  }

  if (showIosOpenFromHomeHelp) {
    return <IosOpenFromHomeHelp inAppBrowser={isInAppBrowser === true} />;
  }

  if (showAndroidOpenFromHomeHelp) {
    return <AndroidOpenFromHomeHelp />;
  }

  if (showIosInstallHelp) {
    return <IosPwaInstallHelp />;
  }

  if (showAndroidInAppInstall) {
    return <AndroidInAppBrowserInstallHelp />;
  }

  if (showAndroidInstall) {
    return <AndroidInstallHero />;
  }

  return null;
}
