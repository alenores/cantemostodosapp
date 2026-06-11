/** Altura útil de la fila de controles (sin el aire extra inferior). */
export const COLA_BAR_CONTENT_HEIGHT_PX = 66;
/** +20 % de altura total: banda gris entre la pastilla y los controles. */
export const COLA_BAR_EXTRA_HEIGHT_PX = Math.round(COLA_BAR_CONTENT_HEIGHT_PX * 0.2);
/** Aire visible bajo Próxima / Fila (zona gris, sin contar safe-area). */
export const COLA_BAR_CONTROLS_BOTTOM_INSET_PX = 16;
/** Altura del bloque pastilla + controles (sin margen inferior ni safe-area). */
export const COLA_BAR_INNER_HEIGHT_PX =
  COLA_BAR_CONTENT_HEIGHT_PX + COLA_BAR_EXTRA_HEIGHT_PX;
/** Altura total de la barra hasta el margen inferior (sin safe-area). */
export const COLA_BAR_HEIGHT_PX =
  COLA_BAR_INNER_HEIGHT_PX + COLA_BAR_CONTROLS_BOTTOM_INSET_PX;
/** Margen inferior de controles + safe-area en PWA. */
export const COLA_BAR_CONTROLS_BOTTOM_PADDING = `calc(${COLA_BAR_CONTROLS_BOTTOM_INSET_PX}px + env(safe-area-inset-bottom, 0px))`;
/** Altura completa de la barra fija desde el borde de pantalla. */
export const COLA_BAR_TOTAL_HEIGHT_CSS = `calc(${COLA_BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`;
/** Offset para apilar paneles encima de la barra. */
export const COLA_BAR_STACK_OFFSET_CSS = COLA_BAR_TOTAL_HEIGHT_CSS;
/** Margen lateral de la sheet y la barra (equivale a Tailwind left-2 / right-2). */
export const COLA_BAR_HORIZONTAL_INSET_PX = 8;
export const COLA_SHEET_HORIZONTAL_STYLE = {
  left: COLA_BAR_HORIZONTAL_INSET_PX,
  right: COLA_BAR_HORIZONTAL_INSET_PX,
} as const;
export function getColaPanelOpenHeightCss(contentHeightPx: number): string {
  return `calc(${contentHeightPx}px + ${COLA_BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`;
}
/** Cuánto la barra tapa el borde inferior del iframe (más alto = el embed baja más). */
export const COLA_BAR_WEBVIEW_OVERLAP_PX = 22;
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

/** Reserva espacio para la barra; el overlap deja que tape sutilmente el borde del iframe */
export const LETRA_EMBED_BOTTOM_PADDING = `calc(${COLA_BAR_HEIGHT_PX - COLA_BAR_WEBVIEW_OVERLAP_PX}px + env(safe-area-inset-bottom, 0px))`;

/** Simula scroll inicial en iframe embebido (Cifra Club activa; preview internet). Calibrar en móvil. */
export const LETRA_EMBED_INITIAL_OFFSET_PX = 280;

/** @deprecated Usar LETRA_EMBED_INITIAL_OFFSET_PX */
export const CIFRACLUB_EMBED_INITIAL_OFFSET_PX = LETRA_EMBED_INITIAL_OFFSET_PX;

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
