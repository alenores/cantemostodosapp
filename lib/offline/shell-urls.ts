/** Pantallas que deben abrir sin internet al tocar el ícono. */
export const OFFLINE_SHELL_URLS = [
  "/pwa-boot.html",
  "/",
  "/individual",
  "/canciones",
  "/canciones/cancionero",
  "/practica",
  "/salas",
  "/~offline",
  "/auth/login",
  "/practica/entrenador-canciones",
  "/practica/entrenador-canciones/editor",
  "/practica/entrenador-canciones/ver",
] as const;

export const OFFLINE_SHELL_CACHE = "app-shell-offline-v1";

export const OFFLINE_SHELL_FALLBACK_ORDER = [
  "/",
  "/salas",
  "/pwa-boot.html",
  "/~offline",
] as const;
