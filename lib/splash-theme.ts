/** Color de fondo unificado: PWA nativa, splash, theme-color y --bg-app */
export const APP_SHELL_BG = "#232323";

export const SPLASH_MIN_VISIBLE_MS = 600;
export const SPLASH_MAX_VISIBLE_MS = 8000;
export const SPLASH_FADE_OUT_MS = 300;

export const APP_READY_EVENT = "cantemos:app-ready";

/** Se ejecuta antes de pintar. Una carga interna puede servir una pantalla guardada completa. */
export const PREPARAR_PRESENTACION_ARRANQUE = `
  (function () {
    var ruta = window.location.pathname;
    var navegacion = window.performance.getEntriesByType("navigation")[0];
    var referencia = document.referrer ? new URL(document.referrer) : null;
    var veniaDeLaApp = referencia && referencia.origin === window.location.origin &&
      referencia.pathname !== "/pwa-boot.html";
    var yaAbierta = false;

    try {
      var clave = "cantemos-presentacion-v1";
      yaAbierta = window.sessionStorage.getItem(clave) === "1";
      window.sessionStorage.setItem(clave, "1");
    } catch {}

    if ((ruta === "/" || ruta === "/pwa-boot.html") &&
        !yaAbierta && !veniaDeLaApp &&
        (!navegacion || navegacion.type === "navigate")) {
      document.documentElement.classList.add("splash-active");
    }
  })();
`;

export function markAppReady() {
  if (typeof window !== "undefined") {
    document.documentElement.dataset.appReady = "true";
    window.dispatchEvent(new CustomEvent(APP_READY_EVENT));
  }
}
