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
export const APP_FOOTER_HEIGHT_PX = 56;
/** Fila de avatares / presencia encima del footer en modo control. */
export const SALA_PRESENCE_BAR_HEIGHT_PX = 44;
export const SALA_FLOAT_CONTROLS_GAP_PX = 16;
/** Margen lateral del panel modal de cola. */
export const COLA_MODAL_HORIZONTAL_INSET_PX = 12;
/** Margen superior del panel modal de cola (sin contar safe-area). */
export const COLA_MODAL_TOP_INSET_PX = 48;
/** Aire inferior del modal; el panel tapa el footer (z-50) para ganar altura de lista. */
export const COLA_MODAL_BOTTOM_INSET_PX = 12;
/** Reserva al final del scroll de letra para los botones flotantes (Sig., Cola, Expandir). */
export const SALA_LETRA_FLOAT_RESERVE_PX = 144;
/** Aire entre el borde inferior del contenedor de letra y la fila de avatares (modo control). */
export const SALA_LETRA_PRESENCE_GAP_PX = 1;
/** Solape de la letra en texto sobre la barra de cola (recupera altura visible). */
export const LETRA_TEXT_COLA_OVERLAP_PX = 28;

export function getSalaFloatControlsBottomCss(presenceBarVisible: boolean): string {
  const presenceInset = presenceBarVisible ? SALA_PRESENCE_BAR_HEIGHT_PX : 0;
  return `calc(${APP_FOOTER_HEIGHT_PX}px + ${presenceInset}px + ${SALA_FLOAT_CONTROLS_GAP_PX}px + env(safe-area-inset-bottom, 0px))`;
}

export function getColaModalBottomCss(): string {
  return `calc(${COLA_MODAL_BOTTOM_INSET_PX}px + env(safe-area-inset-bottom, 0px))`;
}

export function getSalaMainFooterPaddingCss(): string {
  return `calc(${APP_FOOTER_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`;
}

function letraFloatScrollEndPx(): number {
  return Math.max(0, SALA_LETRA_FLOAT_RESERVE_PX - LETRA_TEXT_COLA_OVERLAP_PX + 6);
}

export function getLetraSectionBottomPadding(): string {
  return `${SALA_LETRA_PRESENCE_GAP_PX}px`;
}

export function getLetraSectionTextBottomPadding(): string {
  return `${SALA_LETRA_PRESENCE_GAP_PX}px`;
}

export function getLetraTextScrollEndPadding(): string {
  return `${letraFloatScrollEndPx()}px`;
}

export function getLetraEmbedBottomPadding(): string {
  return `${SALA_LETRA_PRESENCE_GAP_PX}px`;
}
/** Extra translateY al cerrar: oculta sombra/redondeo que asomaba sobre la letra activa */
export const COLA_PANEL_CLOSED_EXTRA_PX = 32;
/** Título + márgenes en la sección de letra activa (modo embed) */
export const LETRA_ACTIVE_CHROME_PX = 88;

/** Aire al final del scroll de letra en texto, además de la barra fija inferior */
export const LETRA_SCROLL_BOTTOM_EXTRA_PX = 16;

/** Margen lateral mínimo de la letra en modo lectura (aprovechar ancho de pantalla). */
export const LETRA_MODO_LECTURA_HORIZONTAL_PADDING_PX = 6;

export function getLetraModoLecturaHorizontalPadding(): string {
  return `max(${LETRA_MODO_LECTURA_HORIZONTAL_PADDING_PX}px, env(safe-area-inset-left, 0px))`;
}

export function getLetraModoLecturaHorizontalPaddingRight(): string {
  return `max(${LETRA_MODO_LECTURA_HORIZONTAL_PADDING_PX}px, env(safe-area-inset-right, 0px))`;
}

/** Cromo superior en modo lectura (chip de canción + botón de controles). */
export const LECTURA_TOP_CHROME_INSET_PX = 6;
export const LECTURA_TOP_CHROME_HEIGHT_PX = 36;
export const LECTURA_TOP_CHROME_SIDE_PX = 16;
export const LECTURA_FAB_MENU_GAP_PX = 8;
/** Auto-scroll pegado al borde inferior para no tapar la letra. */
export const LECTURA_AUTO_SCROLL_BOTTOM_PX = 8;

export function getLecturaTopChromeTopCss(): string {
  return `calc(${LECTURA_TOP_CHROME_INSET_PX}px + env(safe-area-inset-top, 0px))`;
}

export function getLecturaFabMenuTopCss(): string {
  return `calc(${LECTURA_TOP_CHROME_INSET_PX}px + env(safe-area-inset-top, 0px) + ${LECTURA_TOP_CHROME_HEIGHT_PX}px + ${LECTURA_FAB_MENU_GAP_PX}px)`;
}

export function getLecturaAutoScrollBottomCss(): string {
  return `calc(${LECTURA_AUTO_SCROLL_BOTTOM_PX}px + env(safe-area-inset-bottom, 0px))`;
}

export const LETRA_SECTION_BOTTOM_PADDING = `calc(${COLA_BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + ${LETRA_SCROLL_BOTTOM_EXTRA_PX}px)`;

export const LETRA_SECTION_TEXT_BOTTOM_PADDING = `calc(${COLA_BAR_HEIGHT_PX - LETRA_TEXT_COLA_OVERLAP_PX}px + env(safe-area-inset-bottom, 0px))`;

/** Aire interno al final del scroll para que la última línea no quede bajo la barra. */
export const LETRA_TEXT_SCROLL_END_PADDING = `calc(${COLA_BAR_HEIGHT_PX - LETRA_TEXT_COLA_OVERLAP_PX + 6}px + env(safe-area-inset-bottom, 0px))`;

/** Reserva espacio para la barra; el overlap deja que tape sutilmente el borde del iframe */
export const LETRA_EMBED_BOTTOM_PADDING = `calc(${COLA_BAR_HEIGHT_PX - COLA_BAR_WEBVIEW_OVERLAP_PX}px + env(safe-area-inset-bottom, 0px))`;

/** Recorte superior del iframe embebido por sitio (calibrar en móvil). */
export const CIFRACLUB_EMBED_TOP_CLIP_PX = 450;
export const ACORDESDCANCIONES_EMBED_TOP_CLIP_PX = 200;

/** Recorte inferior del iframe (propagandas y barra flotante de Cifra Club). Calibrar en móvil. */
export const LETRA_EMBED_BOTTOM_CLIP_PX = 160;

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
