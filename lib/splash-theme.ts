/** Color de fondo unificado: PWA nativa, splash, theme-color y --bg-app */
export const APP_SHELL_BG = "#232323";

export const SPLASH_MIN_VISIBLE_MS = 600;
export const SPLASH_MAX_VISIBLE_MS = 8000;
export const SPLASH_FADE_OUT_MS = 300;

export const APP_READY_EVENT = "cantemos:app-ready";

export function markAppReady() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(APP_READY_EVENT));
  }
}
