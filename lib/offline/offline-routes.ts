/** Rutas principales disponibles offline (con prefetch o visita previa con WiFi). */
export const OFFLINE_NAVIGABLE_PATHS = new Set([
  "/",
  "/individual",
  "/salas",
  "/cancionero",
  "/cancionero/global",
  "/canciones",
  "/canciones/cancionero",
  "/canciones/favoritas",
  "/practica",
  "/practica/metronomo",
  "/practica/entrenador-vocal",
  "/practica/compositor",
  "/practica/entrenador-canciones",
  "/practica/entrenador-canciones/editor",
  "/practica/entrenador-canciones/ver",
  "/herramientas/afinador",
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
  "/canciones",
  "/canciones/cancionero",
  "/canciones/favoritas",
  "/practica",
  "/practica/metronomo",
  "/practica/entrenador-vocal",
  "/practica/compositor",
  "/salas",
  "/practica/entrenador-canciones",
  "/practica/entrenador-canciones/editor",
  "/practica/entrenador-canciones/ver",
  "/herramientas/afinador",
] as const;
