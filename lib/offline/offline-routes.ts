import { OFFLINE_SHELL_URLS } from "@/lib/offline/shell-urls";

/** No son pantallas para navegar: arranque, aviso sin señal e inicio de sesión. */
const NO_NAVEGABLES = new Set<string>(["/pwa-boot.html", "/~offline", "/auth/login"]);

/** Rutas principales disponibles offline (con prefetch o visita previa con WiFi). */
export const OFFLINE_NAVIGABLE_PATHS = new Set<string>([
  ...OFFLINE_SHELL_URLS.filter((path) => path !== "/auth/login"),
  // Direcciones viejas del cancionero: redirigen a las nuevas.
  "/cancionero",
  "/cancionero/global",
]);

export function isOfflineNavigableRoute(href: string): boolean {
  try {
    const path = new URL(href, "https://local.app").pathname;
    return OFFLINE_NAVIGABLE_PATHS.has(path);
  } catch {
    return false;
  }
}

export const OFFLINE_PREFETCH_ROUTES = OFFLINE_SHELL_URLS.filter(
  (path) => !NO_NAVEGABLES.has(path),
);
