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
/** Pausa tras tap en Sig. antes de avanzar (alinea con el cierre animado del sheet). */
export const COLA_FINALIZE_BUTTON_MS = 300;
/** Duración del slide hacia abajo al cerrar el sheet de cola. */
export const COLA_SHEET_EXIT_MS = 350;
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
export const SALA_LETRA_PRESENCE_GAP_PX = 10;
/** Contorno del contenedor de letra en modo control (Individual y Salas). */
export const CONTROL_LETRA_SHELL_CLASS =
  "overflow-hidden rounded-[12px] border-2 border-accent";
/** Inset horizontal del contenedor de letra en modo control (cada lado). */
export const CONTROL_LETRA_HORIZONTAL_INSET = "5%";
/** Aire entre el borde inferior del contenedor de letra y la etiqueta de origen. */
export const CONTROL_LETRA_ORIGEN_GAP_PX = 6;
/** Separador bajo origen/acciones (antes de presencia / pie). */
export const CONTROL_LETRA_SEPARATOR_GAP_PX = 4;
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
  return "var(--app-main-bottom-padding, calc(56px + env(safe-area-inset-bottom, 0px)))";
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

/** Insets compartidos del encabezado en modo control (Individual y Salas). */
export const CONTROL_HEADER_HORIZONTAL_INSET_PX = 12;
export const CONTROL_HEADER_TOP_INSET_PX = 10;
export const CONTROL_HEADER_BOTTOM_INSET_PX = 8;
export const CONTROL_HEADER_ACTION_SIZE_PX = 36;

export function getControlCantarHorizontalPaddingStyle(): {
  paddingLeft: string;
  paddingRight: string;
} {
  return {
    paddingLeft: `max(${CONTROL_HEADER_HORIZONTAL_INSET_PX}px, env(safe-area-inset-left, 0px))`,
    paddingRight: `max(${CONTROL_HEADER_HORIZONTAL_INSET_PX}px, env(safe-area-inset-right, 0px))`,
  };
}

export function getControlHeaderPaddingStyle(): {
  paddingLeft: string;
  paddingRight: string;
  paddingTop: string;
  paddingBottom: string;
} {
  return {
    ...getControlCantarHorizontalPaddingStyle(),
    paddingTop: `calc(${CONTROL_HEADER_TOP_INSET_PX}px + env(safe-area-inset-top, 0px))`,
    paddingBottom: `${CONTROL_HEADER_BOTTOM_INSET_PX}px`,
  };
}

/** Encabezado dentro de una section que ya aplica getControlCantarHorizontalPaddingStyle. */
export function getControlHeaderVerticalPaddingStyle(): {
  paddingTop: string;
  paddingBottom: string;
} {
  return {
    paddingTop: `calc(${CONTROL_HEADER_TOP_INSET_PX}px + env(safe-area-inset-top, 0px))`,
    paddingBottom: `${CONTROL_HEADER_BOTTOM_INSET_PX}px`,
  };
}

/** Aire entre el borde superior y el contenedor de letra en Home (solo lupa). */
export const HOME_SEARCH_CHROME_HEIGHT_PX =
  CONTROL_HEADER_TOP_INSET_PX +
  CONTROL_HEADER_ACTION_SIZE_PX +
  CONTROL_HEADER_BOTTOM_INSET_PX;

export function getHomeSearchChromeHeightCss(): string {
  return `calc(${HOME_SEARCH_CHROME_HEIGHT_PX}px + env(safe-area-inset-top, 0px))`;
}

/** Cromo superior en modo lectura (chip de canción + botón de controles). */
export const LECTURA_TOP_CHROME_INSET_PX = 6;
export const LECTURA_TOP_CHROME_HEIGHT_PX = 36;
export const LECTURA_TOP_CHROME_SIDE_PX = 16;
export const LECTURA_TOP_CHROME_BUTTON_SIZE_PX = 36;
export const LECTURA_FAB_MENU_GAP_PX = 8;
/** Aire entre el botón de controles y el aviso de cola en modo lectura. */
export const LECTURA_COLA_AVISO_GAP_PX = 8;
/** Duración de la salida del aviso de cola. */
export const COLA_AVISO_EXIT_MS = 360;
/** @deprecated Usar COLA_AVISO_EXIT_MS */
export const LECTURA_COLA_AVISO_EXIT_MS = COLA_AVISO_EXIT_MS;
/** Auto-scroll pegado al borde inferior para no tapar la letra. */
export const LECTURA_AUTO_SCROLL_BOTTOM_PX = 8;

export function getLecturaTopChromeTopCss(): string {
  return `calc(${LECTURA_TOP_CHROME_INSET_PX}px + env(safe-area-inset-top, 0px))`;
}

/** Ancho máximo del chip: un poco más que antes, sin ocupar todo el ancho hasta el botón. */
export function getLecturaTopChipMaxWidthCss(
  reservarColaLateral = false,
): string {
  const colaReservePx = reservarColaLateral
    ? "var(--cola-desktop-width, 340px)"
    : "0px";
  const reservedPx =
    LECTURA_TOP_CHROME_BUTTON_SIZE_PX +
    LECTURA_FAB_MENU_GAP_PX +
    LECTURA_TOP_CHROME_SIDE_PX +
    LETRA_MODO_LECTURA_HORIZONTAL_PADDING_PX +
    4;
  return `min(80vw, calc(100vw - ${reservedPx}px - ${colaReservePx} - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))`;
}

/** Inset derecho de controles fijos en modo lectura (evita tapar la fila lateral en escritorio). */
export function getLecturaFixedRightCss(reservarColaLateral = false): string {
  if (reservarColaLateral) {
    return `max(${LECTURA_TOP_CHROME_SIDE_PX}px, calc(var(--cola-desktop-width, 340px) + ${LECTURA_TOP_CHROME_SIDE_PX}px), env(safe-area-inset-right, 0px))`;
  }

  return `max(${LECTURA_TOP_CHROME_SIDE_PX}px, env(safe-area-inset-right, 0px))`;
}

export function getLecturaFabMenuTopCss(): string {
  return `calc(${LECTURA_TOP_CHROME_INSET_PX}px + env(safe-area-inset-top, 0px) + ${LECTURA_TOP_CHROME_HEIGHT_PX}px + ${LECTURA_FAB_MENU_GAP_PX}px)`;
}

/**
 * Espacio al inicio del scroll de letra en modo lectura (móvil):
 * deja la primera línea debajo del chip fijo; al scrollear sube con la letra.
 * En `lg+` el chip está oculto — no aplicar (usar `lg:hidden` en el spacer).
 */
export function getLecturaLetraScrollStartPaddingCss(): string {
  return getLecturaFabMenuTopCss();
}

export function getLecturaColaAvisoTopCss(): string {
  return `calc(${LECTURA_TOP_CHROME_INSET_PX}px + env(safe-area-inset-top, 0px) + ${LECTURA_TOP_CHROME_HEIGHT_PX}px + ${LECTURA_COLA_AVISO_GAP_PX}px)`;
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

/** Escala horizontal del iframe Cifra Club (tapar márgenes blancos del sitio). */
export const CIFRACLUB_EMBED_FILL_SCALE_X = 1.04;

/** Recorte superior del iframe embebido por sitio (calibrar en móvil). */
export const CIFRACLUB_EMBED_TOP_CLIP_PX = 450;
export const ACORDESDCANCIONES_EMBED_TOP_CLIP_PX = 750;

/** Tope del auto-scroll visual en embeds (marginTop acumulado, calibrar en móvil). */
export const CIFRACLUB_EMBED_MAX_VISUAL_SCROLL_PX = 12000;

/** Recorte inferior del iframe (propagandas y controles flotantes). Igual en control y lectura. */
export const CIFRACLUB_EMBED_BOTTOM_CLIP_PX = 260;
/** @deprecated Usar CIFRACLUB_EMBED_BOTTOM_CLIP_PX (mismo valor en ambos modos). */
export const CIFRACLUB_EMBED_BOTTOM_CLIP_MODO_LECTURA_PX =
  CIFRACLUB_EMBED_BOTTOM_CLIP_PX;
export const ACORDESDCANCIONES_EMBED_BOTTOM_CLIP_PX = 160;

/** @deprecated Usar CIFRACLUB_EMBED_BOTTOM_CLIP_PX */
export const LETRA_EMBED_BOTTOM_CLIP_PX = CIFRACLUB_EMBED_BOTTOM_CLIP_PX;

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
