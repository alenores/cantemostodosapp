export const COLA_BAR_HEIGHT_PX = 60;
export const COLA_AVISO_SHOW_DELAY_MS = 400;
export const SALA_HEADER_HEIGHT_PX = 56;
/** Extra translateY al cerrar: oculta sombra/redondeo que asomaba sobre la letra activa */
export const COLA_PANEL_CLOSED_EXTRA_PX = 32;
/** Título + márgenes en la sección de letra activa (modo embed) */
export const LETRA_ACTIVE_CHROME_PX = 88;

/**
 * Margen bajo la letra (barra + panel + aire). Ajustado en inspector DevTools (~106px).
 * padding-bottom: calc(60px + safe-area + 106px)
 */
export const LETRA_SCROLL_BOTTOM_EXTRA_PX = 106;

export const LETRA_SECTION_BOTTOM_PADDING = `calc(${COLA_BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + ${LETRA_SCROLL_BOTTOM_EXTRA_PX}px)`;

export const LETRA_EMBED_HEIGHT_CSS = `calc(100dvh - ${SALA_HEADER_HEIGHT_PX}px - ${LETRA_ACTIVE_CHROME_PX}px - ${COLA_BAR_HEIGHT_PX}px - ${LETRA_SCROLL_BOTTOM_EXTRA_PX}px - env(safe-area-inset-bottom, 0px))`;

export function getColaOpenHeight(
  viewportHeight: number,
  expanded: boolean,
): number {
  const topReservePx = expanded ? 48 : 72;

  return viewportHeight - COLA_BAR_HEIGHT_PX - topReservePx;
}

export function getColaPanelClosedY(contentHeight: number): number {
  return contentHeight + COLA_PANEL_CLOSED_EXTRA_PX;
}
