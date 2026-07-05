/** Ancho de la barra lateral de navegación en escritorio (lg+). */
export const APP_SIDEBAR_WIDTH_PX = 260;

/** Ancho del panel de cola persistente en escritorio. */
export const COLA_DESKTOP_PANEL_WIDTH_PX = 340;

/** Ancho máximo del contenido en páginas de hub / listados. */
export const APP_CONTENT_MAX_WIDTH_PX = 1200;

/** Breakpoint mínimo para layout de escritorio (Tailwind lg). */
export const DESKTOP_MIN_WIDTH_PX = 1024;

export const APP_SIDEBAR_WIDTH_CSS = `${APP_SIDEBAR_WIDTH_PX}px`;
export const COLA_DESKTOP_PANEL_WIDTH_CSS = `${COLA_DESKTOP_PANEL_WIDTH_PX}px`;
export const APP_CONTENT_MAX_WIDTH_CSS = `${APP_CONTENT_MAX_WIDTH_PX}px`;

/** Padding inferior del main cuando hay footer móvil. */
export function getAppMainBottomPaddingCss(): string {
  return "var(--app-main-bottom-padding, 0px)";
}

/** Padding derecho del main cuando hay panel de cola en escritorio. */
export function getAppMainColaPaddingCss(): string {
  return "var(--app-main-cola-padding, 0px)";
}
