import {
  hasEverOpenedStandalone,
  isIosForPwaOpenFromHome,
  isStandaloneMode,
} from "@/lib/pwa-platform";

const PWA_ON_DEVICE_SESSION_KEY = "pwa-on-device-session-v1";
const PWA_ON_DEVICE_CONFIRMED_KEY = "pwa-on-device-confirmed-v1";
const PWA_INSTALL_FEEDBACK_UNTIL_KEY = "pwa-install-feedback-until-v1";

export const INSTALL_FEEDBACK_DELAY_MS = 5500;

export const PWA_ON_DEVICE_CHANGED_EVENT = "pwa-on-device-changed";

type RelatedApplication = {
  platform: string;
  url?: string;
  id?: string;
};

type NavigatorWithRelatedApps = Navigator & {
  getInstalledRelatedApps?: () => Promise<RelatedApplication[]>;
};

export function beginInstallFeedbackCooldown(
  durationMs: number = INSTALL_FEEDBACK_DELAY_MS,
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      PWA_INSTALL_FEEDBACK_UNTIL_KEY,
      String(Date.now() + durationMs),
    );
  } catch {
    // Ignore private mode / quota errors.
  }
}

export function clearInstallFeedbackCooldown(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PWA_INSTALL_FEEDBACK_UNTIL_KEY);
  } catch {
    // Ignore private mode / quota errors.
  }
}

export function getInstallFeedbackRemainingMs(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.sessionStorage.getItem(PWA_INSTALL_FEEDBACK_UNTIL_KEY);
    const until = raw ? Number(raw) : NaN;
    if (!Number.isFinite(until)) return 0;
    return Math.max(0, until - Date.now());
  } catch {
    return 0;
  }
}

export function isInstallFeedbackCooldownActive(): boolean {
  return getInstallFeedbackRemainingMs() > 0;
}

export function markPwaOnDeviceFromInstallEvent(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PWA_ON_DEVICE_SESSION_KEY, "1");
  } catch {
    // Ignore private mode / quota errors.
  }
}

function markPwaOnDeviceConfirmedByApi(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PWA_ON_DEVICE_CONFIRMED_KEY, "1");
  } catch {
    // Ignore private mode / quota errors.
  }
}

export function clearPwaOnDeviceMarks(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PWA_ON_DEVICE_SESSION_KEY);
    window.localStorage.removeItem(PWA_ON_DEVICE_CONFIRMED_KEY);
  } catch {
    // Ignore private mode / quota errors.
  }
}

function hasPwaOnDeviceSessionMark(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(PWA_ON_DEVICE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function hasPwaOnDeviceConfirmedMark(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PWA_ON_DEVICE_CONFIRMED_KEY) === "1";
  } catch {
    return false;
  }
}

function isRelatedWebApp(app: RelatedApplication): boolean {
  if (app.platform === "webapp") return true;
  if (app.platform !== "play" || !app.url) return false;

  try {
    const relatedOrigin = new URL(app.url).origin;
    return relatedOrigin === window.location.origin;
  } catch {
    return false;
  }
}

async function queryInstalledRelatedApps(): Promise<boolean | null> {
  if (typeof navigator === "undefined") return null;

  const getInstalledRelatedApps = (
    navigator as NavigatorWithRelatedApps
  ).getInstalledRelatedApps;

  if (!getInstalledRelatedApps) return null;

  try {
    const apps = await getInstalledRelatedApps();
    return apps.some(isRelatedWebApp);
  } catch {
    return null;
  }
}

async function resolveAndroidPwaOnDeviceInBrowser(): Promise<boolean> {
  const byApi = await queryInstalledRelatedApps();

  if (byApi === true) {
    markPwaOnDeviceConfirmedByApi();
    return true;
  }

  if (byApi === false) {
    clearPwaOnDeviceMarks();
    return false;
  }

  return hasPwaOnDeviceSessionMark() || hasPwaOnDeviceConfirmedMark();
}

function resolveIosPwaOnDeviceInBrowser(): boolean {
  return hasEverOpenedStandalone();
}

export async function resolvePwaOnDeviceInBrowser(): Promise<boolean> {
  if (typeof window === "undefined" || isStandaloneMode()) {
    return false;
  }

  if (isInstallFeedbackCooldownActive()) {
    return false;
  }

  if (isIosForPwaOpenFromHome()) {
    return resolveIosPwaOnDeviceInBrowser();
  }

  return resolveAndroidPwaOnDeviceInBrowser();
}

export function notifyPwaOnDeviceChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PWA_ON_DEVICE_CHANGED_EVENT));
}

export function subscribePwaOnDeviceInBrowser(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onAppInstalled = () => {
    void resolvePwaOnDeviceInBrowser().then(onStoreChange);
  };

  window.addEventListener("appinstalled", onAppInstalled);
  window.addEventListener(PWA_ON_DEVICE_CHANGED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("appinstalled", onAppInstalled);
    window.removeEventListener(PWA_ON_DEVICE_CHANGED_EVENT, onStoreChange);
  };
}
