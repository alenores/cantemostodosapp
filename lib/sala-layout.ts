export const COLA_BAR_HEIGHT_PX = 60;
export const COLA_AVISO_SHOW_DELAY_MS = 400;
/** Pausa tras tap en Sig. antes de cerrar la cola y mostrar la letra */
export const COLA_FINALIZE_BUTTON_MS = 180;
export const SALA_HEADER_HEIGHT_PX = 56;
/** Extra translateY al cerrar: oculta sombra/redondeo que asomaba sobre la letra activa */
export const COLA_PANEL_CLOSED_EXTRA_PX = 32;
/** Título + márgenes en la sección de letra activa (modo embed) */
export const LETRA_ACTIVE_CHROME_PX = 88;

/** Aire al final del scroll de letra en texto, además de la barra fija inferior */
export const LETRA_SCROLL_BOTTOM_EXTRA_PX = 16;

export const LETRA_SECTION_BOTTOM_PADDING = `calc(${COLA_BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + ${LETRA_SCROLL_BOTTOM_EXTRA_PX}px)`;

/** Solo la barra «En fila» — el iframe llega hasta ahí sin margen extra */
export const LETRA_EMBED_BOTTOM_PADDING = `calc(${COLA_BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`;

/** @deprecated Usar flex-1 + LETRA_EMBED_BOTTOM_PADDING en CancionActivaSection */
export const LETRA_EMBED_HEIGHT_CSS = `calc(100dvh - ${SALA_HEADER_HEIGHT_PX}px - ${LETRA_ACTIVE_CHROME_PX}px - ${COLA_BAR_HEIGHT_PX}px - env(safe-area-inset-bottom, 0px))`;

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
