/** Pantallas que deben abrir sin internet al tocar el ícono. */
export const OFFLINE_SHELL_URLS = [
  "/pwa-boot.html",
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
  "/~offline",
  "/auth/login",
  "/practica/entrenador-canciones",
  "/practica/entrenador-canciones/editor",
  "/practica/entrenador-canciones/ver",
  "/herramientas/afinador",
] as const;

export const OFFLINE_SHELL_CACHE = "app-shell-offline-v2";

export const OFFLINE_SHELL_FALLBACK_ORDER = [
  "/",
  "/salas",
  "/pwa-boot.html",
  "/~offline",
] as const;
