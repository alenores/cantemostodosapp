const PWA_INSTALLED_KEY = "pwa-installed-v1";

/** Persiste aunque el usuario vuelva a Safari; prueba de «abrió desde ícono». */
export const PWA_EVER_STANDALONE_KEY = "pwa-ever-standalone-v1";

/** PWA abierta desde icono de inicio (no pestaña del navegador). */
export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;

  const byDisplayMode = window.matchMedia("(display-mode: standalone)").matches;
  const byNavigatorStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

  return byDisplayMode || byNavigatorStandalone;
}

export function markEverOpenedStandalone(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PWA_EVER_STANDALONE_KEY, "1");
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function hasEverOpenedStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PWA_EVER_STANDALONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPwaInstalled(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PWA_INSTALLED_KEY, "1");
    markEverOpenedStandalone();
  } catch {
    // Ignore quota / private mode errors.
  }
}

function clearStalePwaInstalledFlag(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PWA_INSTALLED_KEY);
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function isPwaInstalled(): boolean {
  if (isStandaloneMode()) {
    markPwaInstalled();
    return true;
  }
  clearStalePwaInstalledFlag();
  return false;
}

export function subscribePwaInstalled(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const refresh = () => {
    if (isStandaloneMode()) {
      markPwaInstalled();
    } else {
      clearStalePwaInstalledFlag();
    }
    onStoreChange();
  };

  refresh();

  const displayModeQuery = window.matchMedia("(display-mode: standalone)");
  displayModeQuery.addEventListener("change", refresh);
  window.addEventListener("appinstalled", () => {
    markPwaInstalled();
    onStoreChange();
  });

  return () => {
    displayModeQuery.removeEventListener("change", refresh);
  };
}

export function getPwaInstalledSnapshot(): boolean {
  return isPwaInstalled();
}

export function getPwaInstalledServerSnapshot(): boolean {
  return false;
}

export function isIphoneForPwaInstall(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipod/.test(ua);
}

export function isIosForPwaOpenFromHome(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipod|ipad/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export function isMobileBrowser(): boolean {
  return isIphoneForPwaInstall() || isIosForPwaOpenFromHome() || isAndroidDevice();
}

export function isLikelyInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /whatsapp|instagram|fban|fbav|fb_iab|line\//.test(ua);
}
