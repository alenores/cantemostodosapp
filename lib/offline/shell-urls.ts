/**
 * Pantallas que deben abrir sin internet. **Lista única** (2026-10-02): la usan el service worker
 * (`app/sw.ts`), el guardado de pantallas (`warm-offline-cache.ts`) y la navegación sin señal
 * (`offline-routes.ts`). Antes eran tres listas a mano y ya no coincidían (faltaba el editor de
 * canciones en la que se actualiza sola). Pantalla nueva que deba abrir sin señal → acá y en
 * `APP_SHELL_PATHS` de `app/sw.ts`.
 *
 * Sin `@/` en los imports: este archivo también entra en el service worker.
 */
export const OFFLINE_SHELL_URLS = [
  "/pwa-boot.html",
  "/",
  "/individual",
  "/canciones",
  "/canciones/cancionero",
  "/canciones/favoritas",
  "/canciones/editor",
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
