export const COLA_BAR_HEIGHT_PX = 60;
export const COLA_AVISO_SHOW_DELAY_MS = 400;
export const SALA_HEADER_HEIGHT_PX = 56;
/** Extra translateY al cerrar: oculta sombra/redondeo que asomaba sobre la letra activa */
export const COLA_PANEL_CLOSED_EXTRA_PX = 32;
/** Título + márgenes sobre el iframe de letra activa */
export const LETRA_ACTIVE_CHROME_PX = 108;

export const LETRA_ACTIVE_HEIGHT_CSS = `calc(100dvh - ${
  SALA_HEADER_HEIGHT_PX + COLA_BAR_HEIGHT_PX + LETRA_ACTIVE_CHROME_PX
}px)`;

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
