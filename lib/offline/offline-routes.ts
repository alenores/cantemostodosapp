/** Rutas principales disponibles offline (con prefetch o visita previa con WiFi). */
export const OFFLINE_NAVIGABLE_PATHS = new Set([
  "/",
  "/individual",
  "/salas",
  "/cancionero",
  "/cancionero/global",
  "/canciones/cancionero",
  "/~offline",
  "/pwa-boot.html",
]);

export function isOfflineNavigableRoute(href: string): boolean {
  try {
    const path = new URL(href, "https://local.app").pathname;
    return OFFLINE_NAVIGABLE_PATHS.has(path);
  } catch {
    return false;
  }
}

export const OFFLINE_PREFETCH_ROUTES = [
  "/",
  "/individual",
  "/canciones/cancionero",
  "/salas",
] as const;
